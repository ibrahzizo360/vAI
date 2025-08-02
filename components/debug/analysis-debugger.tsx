"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, TestTube, Bug } from "lucide-react"

interface AnalysisResult {
  suggested_template: string
  confidence: number
  patient_info: any
  encounter_info: any
  structured_note: any
  key_findings: any
  medical_terminology: any[]
  timestamps: any[]
  follow_up_items: any[]
}

export function AnalysisDebugger() {
  const [transcript, setTranscript] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    if (!transcript.trim()) return

    setIsAnalyzing(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/analyze-transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript: transcript.trim()
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('Analysis result:', data)
      setResult(data.clinical_documentation || data)
    } catch (err) {
      console.error('Analysis error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const renderJson = (obj: any, title: string) => (
    <div className="space-y-2">
      <h4 className="font-semibold text-sm">{title}</h4>
      <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-64">
        {JSON.stringify(obj, null, 2)}
      </pre>
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Bug className="h-6 w-6 text-orange-600" />
        <h1 className="text-2xl font-bold">Clinical Analysis Debugger</h1>
        <Badge variant="destructive">DEBUG ONLY</Badge>
      </div>

      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Test Transcript
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Paste your transcript here for analysis testing..."
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={8}
            className="min-h-[200px]"
          />
          <div className="flex items-center gap-4">
            <Button 
              onClick={handleAnalyze}
              disabled={!transcript.trim() || isAnalyzing}
              className="flex items-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <TestTube className="h-4 w-4" />
                  Analyze Transcript
                </>
              )}
            </Button>
            {transcript.trim() && (
              <span className="text-sm text-gray-500">
                {transcript.trim().split(' ').length} words
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-red-800">
              <h3 className="font-semibold mb-2">Analysis Error:</h3>
              <p className="text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

    {/* Results Section */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
            <div className="flex items-center gap-4 text-sm">
              <Badge variant="outline">
                Template: {result.suggested_template}
              </Badge>
              <Badge variant="outline">
                Confidence: {(result.confidence * 100).toFixed(1)}%
              </Badge>
              {result.encounter_info?.type && (
                <Badge variant="outline">
                  Type: {result.encounter_info.type}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="structured" className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="structured">Structured Note</TabsTrigger>
                <TabsTrigger value="findings">Key Findings</TabsTrigger>
                <TabsTrigger value="encounter">Encounter Info</TabsTrigger>
                <TabsTrigger value="patient">Patient Info</TabsTrigger>
                <TabsTrigger value="terminology">Terminology</TabsTrigger>
                <TabsTrigger value="raw">Raw JSON</TabsTrigger>
              </TabsList>

              <TabsContent value="structured" className="space-y-4">
                {result.structured_note?.sections ? (
                  <div className="space-y-4">
                    <h3 className="font-semibold">Template: {result.structured_note.template_name}</h3>
                    {Object.entries(result.structured_note.sections).map(([sectionId, content]) => (
                      <div key={sectionId} className="border rounded p-4">
                        <h4 className="font-medium text-sm mb-2 capitalize">
                          {sectionId.replace(/_/g, ' ')}
                        </h4>
                        <div className="text-sm bg-gray-50 p-3 rounded">
                          {String(content)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No structured note generated</p>
                )}
              </TabsContent>

              <TabsContent value="findings" className="space-y-4">
                {result.key_findings ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(result.key_findings).map(([category, items]) => (
                      <div key={category} className="border rounded p-4">
                        <h4 className="font-medium text-sm mb-2 capitalize">
                          {category}
                        </h4>
                        <div className="space-y-1">
                          {Array.isArray(items) && items.length > 0 ? (
                            items.map((item, idx) => (
                              <Badge key={idx} variant="secondary" className="mr-1 mb-1">
                                {item}
                              </Badge>
                            ))
                          ) : (
                            <em className="text-gray-500 text-xs">None found</em>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No key findings extracted</p>
                )}
              </TabsContent>

              <TabsContent value="encounter">
                {result.encounter_info ? (
                  renderJson(result.encounter_info, "Encounter Information")
                ) : (
                  <p className="text-gray-500 italic">No encounter info extracted</p>
                )}
              </TabsContent>

              <TabsContent value="patient">
                {result.patient_info ? (
                  renderJson(result.patient_info, "Patient Information")
                ) : (
                  <p className="text-gray-500 italic">No patient info extracted</p>
                )}
              </TabsContent>

              <TabsContent value="terminology">
                {result.medical_terminology?.length > 0 ? (
                  <div className="space-y-3">
                    {result.medical_terminology.map((term, idx) => (
                      <div key={idx} className="border rounded p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">{term.term}</Badge>
                          <span className="text-sm text-gray-600">→</span>
                          <span className="text-sm font-medium">{term.normalized}</span>
                        </div>
                        <p className="text-xs text-gray-600">{term.context}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No medical terminology extracted</p>
                )}
              </TabsContent>

              <TabsContent value="raw">
                {renderJson(result, "Complete Analysis Result")}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Sample Transcripts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sample Test Cases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Chest Pain Consult</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTranscript("Good morning, Mr. Johnson. How are you feeling today? Good morning, doctor. I've been experiencing some pain in my chest and shortness of breath. It's been bothering me for a few weeks now. I'm glad you came in. It's important not to ignore any chest-related symptoms. Let me ask you a few questions to better understand your condition. Have you noticed if these symptoms occur during any specific activities or times of the day? Yes. I've noticed that it happens mostly when I push myself physically, like when I'm climbing stairs or walking fast. All right. Do you have any history of heart disease in your family? Not that I'm aware of. My parents and siblings don't have any heart-related issues. Based on your symptoms and their relation to physical activity, it's important to consider your heart health. I'd like to order an electrocardiogram, also called ECG, to get a baseline assessment of your heart's electrical activity. It will help us determine if any abnormalities are present.")}
              >
                Load Sample
              </Button>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Stomach Pain</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTranscript("Hello, what's up, how are you doing? Please, I'm not fine, my stomach. Why is your stomach paining? I ate something which I was not supposed to eat, I'm sure. Hello?")}
              >
                Load Sample
              </Button>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">Coordination Issues</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTranscript("Hello, good evening. What's your name? My name is Hama. Hello, Hama. Why are you here? What's your name? Please, doctor. When I work, I'm not able to coordinate well. Okay.")}
              >
                Load Sample
              </Button>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">Neuro Rounds</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTranscript("Patient presented with a GCS 13/15, pupils equal and reactive to light. No signs of hydrocephalus. Discussed the posterior fossa tumor with the family. Plan for immediate MRI and then craniotomy. EVD placement considered if ICP rises. Patient is currently on Dexamethasone 4mg BID.")}
              >
                Load Sample
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}