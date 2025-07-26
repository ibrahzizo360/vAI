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
    
    // Consultation indicators
    const consultTerms = ['new patient', 'referral', 'consult', 'chief complaint', 'history']
    const consultScore = consultTerms.filter(term => lowerTranscript.includes(term)).length
    
    // Round indicators
    const roundTerms = ['post-op', 'daily', 'overnight', 'stable', 'improving', 'plan for today']
    const roundScore = roundTerms.filter(term => lowerTranscript.includes(term)).length

    // Determine template based on scores and context
    if (meetingScore >= 2) {
      return { templateId: 'family_meeting', encounterType: 'family_meeting', confidence: 0.8 + (meetingScore * 0.05) }
    }
    
    if (consultScore >= 2 && neuroScore >= 1) {
      return { templateId: 'neuro_consult', encounterType: 'consult', confidence: 0.75 + (consultScore * 0.05) }
    }
    
    if (neuroScore >= 2 && roundScore >= 1) {
      return { templateId: 'neuro_rounds', encounterType: 'rounds', confidence: 0.7 + (neuroScore * 0.03) }
    }
    
    if (encounterType === 'rounds' || roundScore >= 2) {
      return { templateId: 'progress_note', encounterType: 'rounds', confidence: 0.6 }
    }

    // Default to progress note
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

    // Extract symptoms
    const symptomPatterns = [
      /headache|pain|nausea|vomiting|weakness|numbness|confusion|dizziness/gi,
      /not feeling well|tired|fatigue|difficulty/gi
    ]
    
    symptomPatterns.forEach(pattern => {
      const matches = transcript.match(pattern)
      if (matches) {
        findings.symptoms.push(...matches.map(m => this.normalizeText(m)))
      }
    })

    // Extract examinations
    const examPatterns = [
      /gcs\s*\d+|glasgow coma scale/gi,
      /pupils?\s*(equal|reactive|dilated|fixed)/gi,
      /motor\s*\d+\/\d+|strength\s*\d+\/\d+/gi,
      /alert|oriented|responsive|follows commands/gi
    ]
    
    examPatterns.forEach(pattern => {
      const matches = transcript.match(pattern)
      if (matches) {
        findings.examinations.push(...matches.map(m => this.normalizeText(m)))
      }
    })

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
      'hr': 'Heart Rate'
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
    const now = new Date()
    
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
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0].substring(0, 5),
      type: encounterType as any,
      location: this.extractLocation(transcript),
      duration_minutes: duration,
      providers: providers.length > 0 ? providers : ['Provider']
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
    const symptoms = medicalExtraction.findings.symptoms
    if (symptoms.length > 0) {
      return `Patient reports: ${symptoms.join(', ')}.`
    }
    
    // Fallback to finding patient statements
    const patientStatements = transcript.match(/patient (says|reports|states|complains)[^.]+\./gi)
    if (patientStatements) {
      return patientStatements.join(' ')
    }
    
    return 'Patient assessment documented during encounter.'
  }

  private static extractObjective(transcript: string, medicalExtraction: any): string {
    const exams = medicalExtraction.findings.examinations
    if (exams.length > 0) {
      return `Examination findings: ${exams.join(', ')}.`
    }
    return 'Physical examination findings documented.'
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
    
    return 'Neurological examination documented.'
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
    
    return 'Assessment and plan discussed during encounter.'
  }

  private static extractChiefComplaint(transcript: string): string {
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
    
    return 'Chief complaint discussed.'
  }

  private static extractHPI(transcript: string): string {
    // Extract history of present illness content
    return 'History of present illness documented during encounter.'
  }

  private static extractAttendees(transcript: string): string {
    const attendees = []
    const familyPattern = /family|mother|father|spouse|daughter|son|brother|sister/gi
    const providerPattern = /doctor|dr\.|nurse|social worker|chaplain/gi
    
    const familyMatches = transcript.match(familyPattern)
    const providerMatches = transcript.match(providerPattern)
    
    if (familyMatches) attendees.push(...familyMatches)
    if (providerMatches) attendees.push(...providerMatches)
    
    return attendees.length > 0 ? [...new Set(attendees)].join(', ') : 'Meeting attendees documented'
  }

  private static extractDiscussionTopics(transcript: string): string {
    const topics = []
    if (transcript.toLowerCase().includes('prognosis')) topics.push('Prognosis discussion')
    if (transcript.toLowerCase().includes('treatment')) topics.push('Treatment options')
    if (transcript.toLowerCase().includes('goals')) topics.push('Goals of care')
    
    return topics.length > 0 ? topics.join('\n') : 'Discussion topics documented'
  }

  private static extractRelevantContent(transcript: string, sectionId: string): string {
    return `Content for ${sectionId} extracted from transcript.`
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
    return match ? match[0] : 'Clinical setting'
  }
}