import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, Lightbulb } from "lucide-react"

interface AiInsightsCardProps {
  missingFields: string[]
  structuredSynopsis: string
}

export function AiInsightsCard({ missingFields, structuredSynopsis }: AiInsightsCardProps) {
  return (
    <Card className="bg-white shadow-sm border border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-primary">AI Insights</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {missingFields.length > 0 && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-md flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm">Missing Fields Detected:</h4>
              <ul className="list-disc list-inside text-xs">
                {missingFields.map((field, index) => (
                  <li key={index}>{field}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div>
          <h4 className="font-semibold text-sm text-primary flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4" /> Structured Case Synopsis
          </h4>
          <div className="bg-gray-50 p-3 rounded-md border border-gray-200 text-gray-800 text-xs">
            <div className="whitespace-pre-wrap font-mono leading-relaxed">
              {structuredSynopsis.trim()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
