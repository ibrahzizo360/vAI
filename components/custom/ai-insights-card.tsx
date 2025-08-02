import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, Bot, Lightbulb } from "lucide-react"
import { Button } from "../ui/button"

interface AiInsightsCardProps {
  missingFields: string[]
  structuredSynopsis: string
}

export function AiInsightsCard({ missingFields, structuredSynopsis }: AiInsightsCardProps) {
  return (
<Card className="bg-white shadow-sm border border-gray-200">
  <CardHeader className="p-4 sm:p-6">
    <CardTitle className="text-primary flex items-center gap-2 text-base sm:text-lg">
      <Bot className="h-4 w-4 sm:h-5 sm:w-5" />
      AI Clinical Insights
    </CardTitle>
  </CardHeader>
  
  <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
    {/* Missing Documentation Section */}
    <div className="space-y-2">
      <h3 className="text-sm sm:text-base font-medium text-gray-700 flex items-center">
        <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-2"></span>
        Missing Documentation
      </h3>
      <ul className="space-y-1 pl-4 text-sm sm:text-base">
        <li className="flex items-start text-gray-600">
          <span className="text-amber-500 mr-2">•</span>
          Post-op imaging report
        </li>
        <li className="flex items-start text-gray-600">
          <span className="text-amber-500 mr-2">•</span>
          Discharge summary
        </li>
      </ul>
    </div>

    {/* Structured Case Synopsis */}
    <div className="space-y-2">
      <h3 className="text-sm sm:text-base font-medium text-gray-700 flex items-center">
        <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
        Structured Case Synopsis
      </h3>
      <div className="bg-gray-50 p-3 rounded-md border border-gray-100 text-xs sm:text-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 sm:gap-y-2">
          <div className="flex flex-wrap">
            <span className="font-medium text-gray-600 min-w-[80px]">Patient:</span>
            <span className="ml-0 sm:ml-2">Aman</span>
          </div>
          <div className="flex flex-wrap">
            <span className="font-medium text-gray-600 min-w-[80px]">MRN:</span>
            <span className="ml-0 sm:ml-2">NSG8724</span>
          </div>
          <div className="flex flex-wrap">
            <span className="font-medium text-gray-600 min-w-[80px]">Diagnosis:</span>
            <span className="ml-0 sm:ml-2">Neurosurgical condition</span>
          </div>
          <div className="flex flex-wrap">
            <span className="font-medium text-gray-600 min-w-[80px]">Status:</span>
            <span className="ml-0 sm:ml-2 text-green-600">Active</span>
          </div>
          <div className="flex flex-wrap">
            <span className="font-medium text-gray-600 min-w-[80px]">Location:</span>
            <span className="ml-0 sm:ml-2">Neurosurgery Ward</span>
          </div>
          <div className="flex flex-wrap">
            <span className="font-medium text-gray-600 min-w-[80px]">Procedures:</span>
            <span className="ml-0 sm:ml-2 text-gray-500">None</span>
          </div>
          <div className="flex flex-wrap">
            <span className="font-medium text-gray-600 min-w-[80px]">Notes:</span>
            <span className="ml-0 sm:ml-2">1</span>
          </div>
        </div>
      </div>
    </div>

    {/* Suggested Actions */}
    <div className="space-y-2">
      <h3 className="text-sm sm:text-base font-medium text-gray-700 flex items-center">
        <span className="inline-block w-2 h-2 rounded-full bg-purple-500 mr-2"></span>
        Suggested Actions
      </h3>
      <div className="flex flex-wrap gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="text-xs sm:text-sm px-2 sm:px-3 py-1 h-auto"
        >
          Request Imaging
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="text-xs sm:text-sm px-2 sm:px-3 py-1 h-auto"
        >
          Start Discharge
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="text-xs sm:text-sm px-2 sm:px-3 py-1 h-auto"
        >
          Add Procedure
        </Button>
      </div>
    </div>
  </CardContent>
</Card>
  )
}
