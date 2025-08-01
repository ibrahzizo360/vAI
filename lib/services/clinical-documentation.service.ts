import { MedicalNoteTemplate, GeneratedMedicalNote, PatientInfo, EncounterInfo, MedicalNoteTemplateService } from '../templates/medical-note-templates'

export interface ClinicalAnalysisResult {
  suggested_template: string
  confidence: number
  patient_info: PatientInfo
  encounter_info: EncounterInfo
  structured_note: GeneratedMedicalNote
  key_findings: {
    symptoms: string[]
    examinations: string[]
    medications: string[]
    procedures: string[]
    diagnoses: string[]
    plans: string[]
  }
  medical_terminology: {
    term: string
    context: string
    normalized: string
  }[]
  timestamps: {
    section: string
    time_mentioned: string
    content: string
  }[]
  follow_up_items: {
    item: string
    priority: 'high' | 'medium' | 'low'
    due_date?: string
  }[]
}

export class ClinicalDocumentationService {
  
  static async analyzeTranscriptForDocumentation(
    transcript: string,
    patientInfo?: Partial<PatientInfo>,
    encounterType?: string
  ): Promise<ClinicalAnalysisResult> {
    
    // Analyze transcript to determine appropriate template
    const templateAnalysis = this.analyzeTemplateNeeds(transcript, encounterType)
    const template = MedicalNoteTemplateService.getTemplateById(templateAnalysis.templateId)
    
    if (!template) {
      throw new Error('Could not determine appropriate medical note template')
    }

    // Extract medical information from transcript
    const medicalExtraction = this.extractMedicalInformation(transcript)
    
    // Generate encounter info
    const encounterInfo = this.generateEncounterInfo(transcript, templateAnalysis.encounterType)
    
    // Create structured note
    const structuredNote = this.generateStructuredNote(
      transcript,
      template,
      patientInfo || {},
      encounterInfo,
      medicalExtraction
    )

    return {
      suggested_template: template.id,
      confidence: templateAnalysis.confidence,
      patient_info: { ...patientInfo } as PatientInfo,
      encounter_info: encounterInfo,
      structured_note: structuredNote,
      key_findings: medicalExtraction.findings,
      medical_terminology: medicalExtraction.terminology,
      timestamps: medicalExtraction.timestamps,
      follow_up_items: medicalExtraction.followUpItems
    }
  }

  private static analyzeTemplateNeeds(transcript: string, encounterType?: string): {
    templateId: string,
    encounterType: string,
    confidence: number
  } {
    const lowerTranscript = transcript.toLowerCase()
    
    // Neurosurgery indicators
    const neuroTerms = ['gcs', 'icp', 'craniotomy', 'hydrocephalus', 'evd', 'brain', 'neurological', 'pupil', 'motor']
    const neuroScore = neuroTerms.filter(term => lowerTranscript.includes(term)).length
    
    // Meeting indicators
    const meetingTerms = ['family', 'goals of care', 'prognosis', 'decision', 'meeting', 'discuss']
    const meetingScore = meetingTerms.filter(term => lowerTranscript.includes(term)).length
    
    // Enhanced consultation indicators
    const consultTerms = [
      'new patient', 'referral', 'consult', 'chief complaint', 'history',
      'good morning', 'good afternoon', 'good evening', 'how are you feeling',
      'what brings you', 'experiencing', 'symptoms', 'bothering me',
      'came in', 'doctor', 'let me ask', 'order', 'assessment', 'important to',
      'consider', 'baseline', 'determine if', 'i\'m glad you came in',
      'not to ignore', 'better understand', 'condition', 'ask you a few questions',
      'have you noticed', 'any history', 'family', 'based on your symptoms',
      'i\'d like to order', 'help us determine'
    ]
    const consultScore = consultTerms.filter(term => lowerTranscript.includes(term)).length
    
    // Round indicators
    const roundTerms = ['post-op', 'daily', 'overnight', 'stable', 'improving', 'plan for today']
    const roundScore = roundTerms.filter(term => lowerTranscript.includes(term)).length

    // Determine template based on scores and context
    if (meetingScore >= 2) {
      return { templateId: 'family_meeting', encounterType: 'family_meeting', confidence: 0.8 + (meetingScore * 0.05) }
    }
    
    // Enhanced consultation detection
    if (consultScore >= 3) {
      if (neuroScore >= 1) {
        return { templateId: 'neuro_consult', encounterType: 'consult', confidence: 0.8 + (consultScore * 0.02) }
      }
      return { templateId: 'neuro_consult', encounterType: 'consult', confidence: 0.75 + (consultScore * 0.02) }
    }
    
    if (neuroScore >= 2 && roundScore >= 1) {
      return { templateId: 'neuro_rounds', encounterType: 'rounds', confidence: 0.7 + (neuroScore * 0.03) }
    }
    
    if (encounterType === 'rounds' || roundScore >= 2) {
      return { templateId: 'progress_note', encounterType: 'rounds', confidence: 0.6 }
    }

    // Better default - if we have consultation indicators, default to consult
    if (consultScore >= 1) {
      return { templateId: 'neuro_consult', encounterType: 'consult', confidence: 0.6 }
    }

    // Final fallback
    return { templateId: 'progress_note', encounterType: 'rounds', confidence: 0.5 }
  }

  private static extractMedicalInformation(transcript: string) {
    const findings = {
      symptoms: [] as string[],
      examinations: [] as string[],
      medications: [] as string[],
      procedures: [] as string[],
      diagnoses: [] as string[],
      plans: [] as string[]
    }

    const terminology: { term: string, context: string, normalized: string }[] = []
    const timestamps: { section: string, time_mentioned: string, content: string }[] = []
    const followUpItems: { item: string, priority: 'high' | 'medium' | 'low', due_date?: string }[] = []

    const lowerTranscript = transcript.toLowerCase()

    // Enhanced symptom extraction for conversational transcripts
    const sentences = transcript.split(/[.!?]/).map(s => s.trim()).filter(s => s.length > 0)
    
    sentences.forEach(sentence => {
      const lowerSentence = sentence.toLowerCase()
      
      // Direct symptom mentions with "experiencing", "having", "feeling"
      const experiencingMatch = sentence.match(/(?:experiencing|having|feeling)\s+(?:some\s+)?([^.,!?]+)/gi)
      if (experiencingMatch) {
        experiencingMatch.forEach(match => {
          const symptom = match.replace(/^(experiencing|having|feeling)\s+(?:some\s+)?/i, '').trim()
          if (symptom.length > 2 && symptom.length < 50) {
            findings.symptoms.push(this.normalizeText(symptom))
          }
        })
      }
      
      // Pain mentions with location
      const painMatches = [
        sentence.match(/(?:pain|ache|aching|hurt|hurting)\s+in\s+(?:my\s+|the\s+)?([^.,!?]+)/gi),
        sentence.match(/([^.,!?\s]+)\s+(?:pain|ache)/gi),
        sentence.match(/chest\s+pain|back\s+pain|head\s+pain|stomach\s+pain|abdominal\s+pain/gi)
      ].flat().filter(Boolean)
      
      if (painMatches) {
        painMatches.forEach(match => {
          if (match && typeof match === 'string') {
            findings.symptoms.push(this.normalizeText(match.trim()))
          }
        })
      }
      
      // Breathing-related symptoms
      if (lowerSentence.includes('breath') || lowerSentence.includes('breathing')) {
        const breathingSymptoms = [
          'shortness of breath', 'difficulty breathing', 'trouble breathing',
          'can\'t breathe', 'hard to breathe', 'breathing problems'
        ]
        breathingSymptoms.forEach(symptom => {
          if (lowerSentence.includes(symptom)) {
            findings.symptoms.push(this.normalizeText(symptom))
          }
        })
      }
      
      // Activity-related symptoms
      if (lowerSentence.includes('when i') || lowerSentence.includes('happens when')) {
        const activityMatch = sentence.match(/(?:when i|happens when)([^.,!?]+)/gi)
        if (activityMatch) {
          activityMatch.forEach(match => {
            const context = match.replace(/^(when i|happens when)\s*/i, '').trim()
            if (context.length > 0) {
              findings.symptoms.push(`Symptoms occur ${context}`)
            }
          })
        }
      }
      
      // Duration mentions
      const durationMatch = sentence.match(/(?:for|been)\s+(?:about\s+)?(\w+\s+(?:weeks?|months?|days?|years?))/gi)
      if (durationMatch) {
        durationMatch.forEach(match => {
          const duration = match.replace(/^(?:for|been)\s+(?:about\s+)?/i, '').trim()
          findings.symptoms.push(`Symptoms present for ${duration}`)
        })
      }
    })
    
    // Additional pattern-based extraction
    const additionalPatterns = [
      /bothering me/gi,
      /nausea|vomiting|weakness|numbness|confusion|dizziness|fatigue|tired/gi,
      /not feeling well/gi
    ]
    
    additionalPatterns.forEach(pattern => {
      const matches = transcript.match(pattern)
      if (matches) {
        findings.symptoms.push(...matches.map(m => this.normalizeText(m)))
      }
    })
    
    // Remove duplicates and clean up
    findings.symptoms = [...new Set(findings.symptoms)]
      .filter(symptom => symptom.length > 2 && symptom.length < 100)
      .filter(symptom => !symptom.toLowerCase().includes('today') && !symptom.toLowerCase().includes('some pain$'))
      .map(symptom => symptom.charAt(0).toUpperCase() + symptom.slice(1))

    // Extract examinations and procedures
    const examPatterns = [
      /gcs\s*\d+|glasgow coma scale/gi,
      /pupils?\s*(equal|reactive|dilated|fixed)/gi,
      /motor\s*\d+\/\d+|strength\s*\d+\/\d+/gi,
      /alert|oriented|responsive|follows commands/gi,
      /electrocardiogram|ecg|ekg/gi,
      /baseline assessment|electrical activity/gi
    ]
    
    examPatterns.forEach(pattern => {
      const matches = transcript.match(pattern)
      if (matches) {
        findings.examinations.push(...matches.map(m => this.normalizeText(m)))
      }
    })
    
    // Extract procedures mentioned - improved patterns
    const procedurePatterns = [
      // Direct procedure ordering
      /(?:order|ordering|get|obtain)\s+(?:an?\s+)?([\w\s-]+?)(?:\s+to|\s*,|\.|$)/gi,
      /i'd like to order\s+([^.,!?]+)/gi,
      /let's (?:order|get|do)\s+(?:an?\s+)?([\w\s-]+)/gi,
      
      // Specific medical procedures and tests
      /electrocardiogram|ecg|ekg/gi,
      /mri|magnetic resonance imaging/gi,
      /ct scan|computed tomography/gi,
      /x-ray|radiograph/gi,
      /blood test|lab work|laboratory/gi,
      /ultrasound|sonogram/gi,
      /biopsy|endoscopy|colonoscopy/gi,
      /stress test|cardiac catheterization/gi
    ]
    
    procedurePatterns.forEach(pattern => {
      const matches = [...transcript.matchAll(pattern)]
      matches.forEach(match => {
        if (match[1]) {
          // Clean up captured group
          const procedure = match[1].trim().replace(/\s+/g, ' ')
          if (procedure.length > 2 && procedure.length < 80) {
            findings.procedures.push(this.normalizeText(procedure))
          }
        } else if (match[0]) {
          // Direct match (like ECG, MRI, etc.)
          const procedure = match[0].trim()
          if (procedure.length > 2) {
            findings.procedures.push(this.normalizeText(procedure))
          }
        }
      })
    })
    
    // Look for procedure mentions in context
    sentences.forEach(sentence => {
      const lowerSentence = sentence.toLowerCase()
      
      // "baseline assessment" type procedures
      if (lowerSentence.includes('baseline') || lowerSentence.includes('assessment')) {
        const assessmentMatch = sentence.match(/(?:baseline|assessment)\s+(?:of\s+)?([^.,!?]+)/gi)
        if (assessmentMatch) {
          assessmentMatch.forEach(match => {
            const assessment = match.replace(/^(?:baseline|assessment)\s+(?:of\s+)?/i, '').trim()
            if (assessment.length > 3 && assessment.length < 50 && !assessment.includes('assessment')) {
              findings.procedures.push(`Assessment of ${assessment}`)
            }
          })
        }
      }
    })
    
    // Remove duplicates and clean up procedures
    findings.procedures = [...new Set(findings.procedures)]
      .filter(proc => proc.length > 2)
      .map(proc => proc.charAt(0).toUpperCase() + proc.slice(1))

    // Extract medications
    const medicationPattern = /(?:medication|medicine|drug|prescription|taking|prescribed)\s+(\w+)/gi
    let match
    while ((match = medicationPattern.exec(transcript)) !== null) {
      findings.medications.push(this.normalizeText(match[1]))
    }

    // Extract medical terminology
    const medicalTerms = {
      'gcs': 'Glasgow Coma Scale',
      'icp': 'Intracranial Pressure',
      'evd': 'External Ventricular Drain',
      'ct': 'Computed Tomography',
      'mri': 'Magnetic Resonance Imaging',
      'bp': 'Blood Pressure',
      'hr': 'Heart Rate',
      'ecg': 'Electrocardiogram',
      'ekg': 'Electrocardiogram'
    }

    Object.entries(medicalTerms).forEach(([abbrev, full]) => {
      const regex = new RegExp(`\\b${abbrev}\\b`, 'gi')
      const matches = transcript.match(regex)
      if (matches) {
        const context = this.extractContext(transcript, abbrev)
        terminology.push({
          term: abbrev.toUpperCase(),
          context: context,
          normalized: full
        })
      }
    })

    // Extract follow-up items
    const followUpPatterns = [
      /follow.?up|return|appointment|check|monitor|repeat/gi,
      /continue|stop|discontinue|change|adjust/gi
    ]

    followUpPatterns.forEach(pattern => {
      const matches = transcript.match(pattern)
      if (matches) {
        matches.forEach(match => {
          followUpItems.push({
            item: this.extractFollowUpContext(transcript, match),
            priority: 'medium'
          })
        })
      }
    })

    return {
      findings,
      terminology,
      timestamps,
      followUpItems
    }
  }

  private static generateEncounterInfo(transcript: string, encounterType: string): EncounterInfo {
    // Try to extract date from transcript
    const datePattern = /(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|january|february|march|april|may|june|july|august|september|october|november|december)/gi
    const dateMatch = transcript.match(datePattern)
    
    // Try to extract time from transcript
    const timePattern = /(\d{1,2}:\d{2}(?:\s*(?:am|pm))?)/gi
    const timeMatch = transcript.match(timePattern)
    
    // Try to extract duration from transcript
    const durationMatch = transcript.match(/(\d+)\s*minutes?/i)
    const duration = durationMatch ? parseInt(durationMatch[1]) : undefined

    // Extract providers mentioned
    const providerPattern = /dr\.?\s+(\w+)|doctor\s+(\w+)|attending|resident/gi
    const providers: string[] = []
    let match
    while ((match = providerPattern.exec(transcript)) !== null) {
      const provider = match[1] || match[2] || match[0]
      if (provider && !providers.includes(provider)) {
        providers.push(provider)
      }
    }

    return {
      date: dateMatch ? dateMatch[0] : '',
      time: timeMatch ? timeMatch[0] : '',
      type: encounterType as any,
      location: this.extractLocation(transcript),
      duration_minutes: duration,
      providers: providers.length > 0 ? providers : []
    }
  }

  private static generateStructuredNote(
    transcript: string,
    template: MedicalNoteTemplate,
    patientInfo: Partial<PatientInfo>,
    encounterInfo: EncounterInfo,
    medicalExtraction: any
  ): GeneratedMedicalNote {
    
    const sections: { [sectionId: string]: string } = {}
    
    template.sections.forEach(section => {
      sections[section.id] = this.generateSectionContent(
        section.id,
        transcript,
        medicalExtraction,
        template
      )
    })

    return {
      template_id: template.id,
      template_name: template.name,
      patient: patientInfo as PatientInfo,
      encounter: encounterInfo,
      sections,
      created_at: new Date().toISOString(),
      last_modified: new Date().toISOString(),
      status: 'draft'
    }
  }

  private static generateSectionContent(
    sectionId: string,
    transcript: string,
    medicalExtraction: any,
    template: MedicalNoteTemplate
  ): string {
    const lowerTranscript = transcript.toLowerCase()
    
    switch (sectionId) {
      case 'subjective':
        return this.extractSubjective(transcript, medicalExtraction)
      
      case 'objective':
        return this.extractObjective(transcript, medicalExtraction)
      
      case 'neuro_exam':
        return this.extractNeuroExam(transcript, medicalExtraction)
      
      case 'assessment_plan':
      case 'impression_plan':
        return this.extractAssessmentPlan(transcript, medicalExtraction)
      
      case 'chief_complaint':
        return this.extractChiefComplaint(transcript)
      
      case 'hpi':
        return this.extractHPI(transcript)
        
      case 'attendees':
        return this.extractAttendees(transcript)
        
      case 'discussion_topics':
        return this.extractDiscussionTopics(transcript)
      
      default:
        return this.extractRelevantContent(transcript, sectionId)
    }
  }

  // Helper methods for content extraction
  private static extractSubjective(transcript: string, medicalExtraction: any): string {
    const sentences = transcript.split(/[.!?]/).map(s => s.trim()).filter(s => s.length > 0)
    const subjectiveElements = []
    
    // Look for patient's main complaints in early conversation
    for (let i = 0; i < Math.min(sentences.length, 8); i++) {
      const sentence = sentences[i]
      const lowerSentence = sentence.toLowerCase()
      
      // Patient describing symptoms
      if (lowerSentence.includes("i've been") || lowerSentence.includes("experiencing") || lowerSentence.includes("having")) {
        const symptomMatch = sentence.match(/(?:i've been|experiencing|having)\s+([^.,!?]+)/i)
        if (symptomMatch && symptomMatch[1].length < 100) {
          subjectiveElements.push(`Patient reports ${symptomMatch[1].trim()}`)
        }
      }
      
      // Duration mentions
      if (lowerSentence.includes("for") && (lowerSentence.includes("week") || lowerSentence.includes("month") || lowerSentence.includes("day"))) {
        const durationMatch = sentence.match(/for\s+([^.,!?]*(?:week|month|day)[^.,!?]*)/i)
        if (durationMatch) {
          subjectiveElements.push(`Duration: ${durationMatch[1].trim()}`)
        }
      }
      
      // Activity triggers
      if (lowerSentence.includes("when i") || lowerSentence.includes("happens when")) {
        const triggerMatch = sentence.match(/(?:when i|happens when)\s+([^.,!?]+)/i)
        if (triggerMatch) {
          subjectiveElements.push(`Occurs when ${triggerMatch[1].trim()}`)
        }
      }
    }
    
    // If we found specific elements, use them
    if (subjectiveElements.length > 0) {
      return subjectiveElements.join('. ') + '.'
    }
    
    // Fallback: use symptoms if available
    const symptoms = medicalExtraction.findings.symptoms
    if (symptoms.length > 0) {
      const mainSymptoms = symptoms.filter(s => !s.toLowerCase().includes('symptoms occur')).slice(0, 2)
      if (mainSymptoms.length > 0) {
        return `Patient reports ${mainSymptoms.join(' and ')}.`
      }
    }
    
    return ''
  }

  private static extractObjective(transcript: string, medicalExtraction: any): string {
    const exams = medicalExtraction.findings.examinations
    if (exams.length > 0) {
      return `Examination findings: ${exams.join(', ')}.`
    }
    // Return empty string instead of generic placeholder
    return ''
  }

  private static extractNeuroExam(transcript: string, medicalExtraction: any): string {
    const neuroFindings = medicalExtraction.findings.examinations.filter((exam: string) => 
      exam.toLowerCase().includes('gcs') || 
      exam.toLowerCase().includes('pupil') || 
      exam.toLowerCase().includes('motor') ||
      exam.toLowerCase().includes('alert')
    )
    
    if (neuroFindings.length > 0) {
      return neuroFindings.join('. ') + '.'
    }
    
    // Return empty string instead of generic placeholder
    return ''
  }

  private static extractAssessmentPlan(transcript: string, medicalExtraction: any): string {
    const plans = medicalExtraction.findings.plans
    if (plans.length > 0) {
      return plans.join('\n')
    }
    
    // Look for plan-related content
    const planContent = transcript.match(/plan[^.]+\./gi)
    if (planContent) {
      return planContent.join(' ')
    }
    
    // Return empty string instead of generic placeholder
    return ''
  }

  private static extractChiefComplaint(transcript: string): string {
    const lowerTranscript = transcript.toLowerCase()
    
    // Look for common chief complaint phrases
    const ccPatterns = [
      /chief complaint[^.]+\./gi,
      /here for[^.]+\./gi,
      /complains? of[^.]+\./gi
    ]
    
    for (const pattern of ccPatterns) {
      const match = transcript.match(pattern)
      if (match) {
        return match[0]
      }
    }
    
    // Look for "experiencing" or symptom descriptions early in conversation
    const sentences = transcript.split(/[.!?]/).map(s => s.trim()).filter(s => s.length > 0)
    
    for (let i = 0; i < Math.min(sentences.length, 5); i++) {
      const sentence = sentences[i]
      const lowerSentence = sentence.toLowerCase()
      
      if (lowerSentence.includes('experiencing') || lowerSentence.includes('been having')) {
        const symptomMatch = sentence.match(/(?:experiencing|been having)\s+([^.,!?]+)/i)
        if (symptomMatch) {
          return `Patient reports ${symptomMatch[1].trim()}`
        }
      }
      
      if (lowerSentence.includes('pain') && lowerSentence.includes('i')) {
        return sentence.trim()
      }
    }
    
    return ''
  }

  private static extractHPI(transcript: string): string {
    const sentences = transcript.split(/[.!?]/).map(s => s.trim()).filter(s => s.length > 0)
    const hpiElements = []
    
    // Look for duration/timing
    sentences.forEach(sentence => {
      const lowerSentence = sentence.toLowerCase()
      
      // Duration mentions
      if (lowerSentence.includes('for') && (lowerSentence.includes('weeks') || lowerSentence.includes('months') || lowerSentence.includes('days'))) {
        const durationMatch = sentence.match(/(?:for|been)\s+(?:about\s+)?([^.,!?]*(?:weeks?|months?|days?))/i)
        if (durationMatch) {
          hpiElements.push(`Duration: ${durationMatch[1].trim()}`)
        }
      }
      
      // Onset/triggers
      if (lowerSentence.includes('when') && (lowerSentence.includes('climbing') || lowerSentence.includes('walking') || lowerSentence.includes('physical'))) {
        const triggerMatch = sentence.match(/when\s+([^.,!?]+)/i)
        if (triggerMatch) {
          hpiElements.push(`Triggers: ${triggerMatch[1].trim()}`)
        }
      }
      
      // Quality/description of symptoms
      if (lowerSentence.includes('experiencing') || lowerSentence.includes('having')) {
        const symptomMatch = sentence.match(/(?:experiencing|having)\s+([^.,!?]+)/i)
        if (symptomMatch) {
          hpiElements.push(`Symptoms: ${symptomMatch[1].trim()}`)
        }
      }
    })
    
    return hpiElements.length > 0 ? hpiElements.join('. ') + '.' : ''
  }

  private static extractAttendees(transcript: string): string {
    const attendees = []
    const familyPattern = /family|mother|father|spouse|daughter|son|brother|sister/gi
    const providerPattern = /doctor|dr\.|nurse|social worker|chaplain/gi
    
    const familyMatches = transcript.match(familyPattern)
    const providerMatches = transcript.match(providerPattern)
    
    if (familyMatches) attendees.push(...familyMatches)
    if (providerMatches) attendees.push(...providerMatches)
    
    return attendees.length > 0 ? [...new Set(attendees)].join(', ') : ''
  }

  private static extractDiscussionTopics(transcript: string): string {
    const topics = []
    if (transcript.toLowerCase().includes('prognosis')) topics.push('Prognosis discussion')
    if (transcript.toLowerCase().includes('treatment')) topics.push('Treatment options')
    if (transcript.toLowerCase().includes('goals')) topics.push('Goals of care')
    
    return topics.length > 0 ? topics.join('\n') : ''
  }

  private static extractRelevantContent(transcript: string, sectionId: string): string {
    // Return empty string instead of generic placeholder
    return ''
  }

  // Utility methods
  private static normalizeText(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
  }

  private static extractContext(transcript: string, term: string): string {
    const sentences = transcript.split(/[.!?]/)
    const relevantSentence = sentences.find(sentence => 
      sentence.toLowerCase().includes(term.toLowerCase())
    )
    return relevantSentence ? relevantSentence.trim() : 'Mentioned in clinical context'
  }

  private static extractFollowUpContext(transcript: string, match: string): string {
    const sentences = transcript.split(/[.!?]/)
    const relevantSentence = sentences.find(sentence => 
      sentence.toLowerCase().includes(match.toLowerCase())
    )
    return relevantSentence ? relevantSentence.trim() : match
  }

  private static extractLocation(transcript: string): string {
    const locationPattern = /\b(icu|ward|er|emergency|clinic|room \d+)\b/gi
    const match = transcript.match(locationPattern)
    return match ? match[0] : ''
  }
}