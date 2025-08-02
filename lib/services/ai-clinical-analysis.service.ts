import { ClinicalAnalysisResult } from './clinical-documentation.service'

export interface AIAnalysisPrompt {
  transcript: string
}

export interface AIAnalysisResponse {
  encounter_type: 'rounds' | 'consult' | 'family_meeting' | 'procedure' | 'discharge'
  confidence: number
  patient_info: {
    name?: string
    age?: number
    gender?: 'M' | 'F'
    chief_complaint?: string
  }
  encounter_info: {
    date?: string
    time?: string
    location?: string
    providers: string[]
    duration_estimate?: number
  }
  clinical_sections: {
    subjective?: string
    objective?: string
    assessment_plan?: string
    neuro_exam?: string
    chief_complaint?: string
    hpi?: string
    current_status?: string
    investigations?: string
    clinical_insights?: string
    management_plan?: string
    patient_family_communication?: string
    follow_up_plan?: string
  }
  key_findings: {
    symptoms: string[]
    examinations: string[]
    medications: string[]
    procedures: string[]
    diagnoses: string[]
    plans: string[]
  }
  medical_terminology: Array<{
    term: string
    context: string
    normalized: string
  }>
  follow_up_items: Array<{
    item: string
    priority: 'high' | 'medium' | 'low'
    due_date?: string
    assigned_to?: string
  }>
  timestamps: Array<{
    section: string
    time_mentioned: string
    content: string
  }>
}

export class AIClinicalAnalysisService {
  private static readonly ANALYSIS_PROMPT = `
You are an expert medical AI assistant specializing in clinical documentation for neurosustical patients. Analyze the provided medical transcript and extract comprehensive clinical information.

CONTEXT: This transcript is from a clinical encounter (could be rounds, consultation, family meeting, procedure, etc.). Extract and structure all relevant medical information.

IMPORTANT INSTRUCTIONS:
1. Be precise and use proper medical terminology
2. Only extract information that is explicitly mentioned or clearly implied
3. If information is not available, leave fields empty rather than guessing
4. Focus on neurosurgical contexts when relevant
5. Maintain professional medical language in all sections

Please analyze the transcript and provide a structured JSON response with the following format:

{
  "encounter_type": "rounds|consult|family_meeting|procedure|discharge",
  "confidence": 0.0-1.0,
  "patient_info": {
    "name": "extracted patient name if mentioned",
    "age": "extracted age if mentioned", 
    "gender": "M|F if mentioned",
    "chief_complaint": "main reason for visit/concern"
  },
  "encounter_info": {
    "date": "extracted date if mentioned",
    "time": "extracted time if mentioned", 
    "location": "ICU|ward|clinic|OR etc if mentioned",
    "providers": ["list of doctors/providers mentioned"],
    "duration_estimate": "estimated duration in minutes based on content"
  },
  "clinical_sections": {
    "subjective": "patient's symptoms, complaints, history as reported",
    "objective": "physical examination findings, vital signs, test results",
    "assessment_plan": "clinical assessment and treatment plan",
    "neuro_exam": "neurological examination findings if mentioned",
    "chief_complaint": "primary reason for encounter",
    "hpi": "history of present illness",
    "current_status": "current clinical status",
    "investigations": "tests, imaging, labs mentioned",
    "clinical_insights": "clinical reasoning and insights",
    "management_plan": "treatment and management approach",
    "patient_family_communication": "communication with patient/family",
    "follow_up_plan": "follow-up instructions and plans"
  },
  "key_findings": {
    "symptoms": ["list of symptoms mentioned"],
    "examinations": ["list of physical findings and exam results"],
    "medications": ["list of medications mentioned"],
    "procedures": ["list of procedures mentioned or planned"],
    "diagnoses": ["list of diagnoses mentioned"],
    "plans": ["list of treatment plans and interventions"]
  },
  "medical_terminology": [
    {
      "term": "medical term found",
      "context": "context it was used in",
      "normalized": "standardized medical term"
    }
  ],
  "follow_up_items": [
    {
      "item": "follow-up action needed",
      "priority": "high|medium|low",
      "due_date": "if mentioned",
      "assigned_to": "if mentioned"
    }
  ],
  "timestamps": [
    {
      "section": "which section this relates to",
      "time_mentioned": "time reference if any",
      "content": "relevant content"
    }
  ]
}

TRANSCRIPT TO ANALYZE:
`;

  static async analyzeTranscript(transcript: string): Promise<AIAnalysisResponse> {
    try {
      // Import LiteLLM service dynamically to avoid circular dependency
      const { LiteLLMService } = await import('./litellm.service')
      
      const litellmService = new LiteLLMService()
      
      const fullPrompt = `${this.ANALYSIS_PROMPT}\n\n${transcript}`
      
      const response = await litellmService.chatCompletion([
        {
          role: 'user',
          content: fullPrompt
        }
      ], {
        model: 'claude-3-sonnet-20240229', // Use Claude for medical analysis
        temperature: 0.1, // Low temperature for consistent medical analysis
        max_tokens: 4000
      })

      // Parse JSON from AI response
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Invalid JSON response from AI')
      }

      const analysisResult = JSON.parse(jsonMatch[0])
      return this.validateAndCleanResponse(analysisResult)
    } catch (error) {
      console.error('AI Clinical Analysis failed:', error)
      throw new Error('Failed to analyze transcript with AI')
    }
  }

  private static validateAndCleanResponse(data: any): AIAnalysisResponse {
    // Ensure all required fields exist with defaults
    return {
      encounter_type: data.encounter_type || 'consult',
      confidence: Math.min(1.0, Math.max(0.0, data.confidence || 0.5)),
      patient_info: {
        name: data.patient_info?.name || undefined,
        age: data.patient_info?.age || undefined,
        gender: data.patient_info?.gender || undefined,
        chief_complaint: data.patient_info?.chief_complaint || undefined,
      },
      encounter_info: {
        date: data.encounter_info?.date || undefined,
        time: data.encounter_info?.time || undefined,
        location: data.encounter_info?.location || undefined,
        providers: Array.isArray(data.encounter_info?.providers) ? data.encounter_info.providers : [],
        duration_estimate: data.encounter_info?.duration_estimate || undefined,
      },
      clinical_sections: {
        subjective: data.clinical_sections?.subjective || undefined,
        objective: data.clinical_sections?.objective || undefined,
        assessment_plan: data.clinical_sections?.assessment_plan || undefined,
        neuro_exam: data.clinical_sections?.neuro_exam || undefined,
        chief_complaint: data.clinical_sections?.chief_complaint || undefined,
        hpi: data.clinical_sections?.hpi || undefined,
        current_status: data.clinical_sections?.current_status || undefined,
        investigations: data.clinical_sections?.investigations || undefined,
        clinical_insights: data.clinical_sections?.clinical_insights || undefined,
        management_plan: data.clinical_sections?.management_plan || undefined,
        patient_family_communication: data.clinical_sections?.patient_family_communication || undefined,
        follow_up_plan: data.clinical_sections?.follow_up_plan || undefined,
      },
      key_findings: {
        symptoms: Array.isArray(data.key_findings?.symptoms) ? data.key_findings.symptoms : [],
        examinations: Array.isArray(data.key_findings?.examinations) ? data.key_findings.examinations : [],
        medications: Array.isArray(data.key_findings?.medications) ? data.key_findings.medications : [],
        procedures: Array.isArray(data.key_findings?.procedures) ? data.key_findings.procedures : [],
        diagnoses: Array.isArray(data.key_findings?.diagnoses) ? data.key_findings.diagnoses : [],
        plans: Array.isArray(data.key_findings?.plans) ? data.key_findings.plans : [],
      },
      medical_terminology: Array.isArray(data.medical_terminology) ? data.medical_terminology : [],
      follow_up_items: Array.isArray(data.follow_up_items) ? data.follow_up_items : [],
      timestamps: Array.isArray(data.timestamps) ? data.timestamps : [],
    }
  }

  // Convert AI response to the existing ClinicalAnalysisResult format
  static convertToClinicalAnalysisResult(aiResponse: AIAnalysisResponse, templateId: string): ClinicalAnalysisResult {
    const { MedicalNoteTemplateService } = require('../templates/medical-note-templates')
    const template = MedicalNoteTemplateService.getTemplateById(templateId)
    
    return {
      suggested_template: templateId,
      confidence: aiResponse.confidence,
      encounter_info: {
        date: aiResponse.encounter_info.date || '',
        time: aiResponse.encounter_info.time || '',
        type: aiResponse.encounter_type,
        location: aiResponse.encounter_info.location || '',
        duration_minutes: aiResponse.encounter_info.duration_estimate,
        providers: aiResponse.encounter_info.providers
      },
      structured_note: {
        template_id: templateId,
        template_name: template?.name || 'AI Generated Note',
        patient: {
          name: aiResponse.patient_info.name,
          age: aiResponse.patient_info.age,
          sex: aiResponse.patient_info.gender,
        },
        encounter: {
          date: aiResponse.encounter_info.date || '',
          time: aiResponse.encounter_info.time || '',
          type: aiResponse.encounter_type,
          location: aiResponse.encounter_info.location || '',
          duration_minutes: aiResponse.encounter_info.duration_estimate,
          providers: aiResponse.encounter_info.providers
        },
        sections: this.mapClinicalSections(aiResponse.clinical_sections),
        created_at: new Date().toISOString(),
        last_modified: new Date().toISOString(),
        status: 'draft' as const
      },
      key_findings: aiResponse.key_findings,
      medical_terminology: aiResponse.medical_terminology,
      timestamps: aiResponse.timestamps,
      follow_up_items: aiResponse.follow_up_items
    }
  }

  private static mapClinicalSections(sections: AIAnalysisResponse['clinical_sections']): { [key: string]: string } {
    const mapped: { [key: string]: string } = {}
    
    Object.entries(sections).forEach(([key, value]) => {
      if (value && typeof value === 'string') {
        mapped[key] = value
      }
    })
    
    return mapped
  }
}