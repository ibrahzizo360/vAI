import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Edit } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CaseDetailsSectionProps {
  title: string
  content: string
  placeholder?: string
}

export function CaseDetailsSection({ title, content, placeholder }: CaseDetailsSectionProps) {
  return (
    <Card className="bg-white shadow-sm border border-gray-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base md:text-lg font-semibold text-primary pr-2">{title}</CardTitle>
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-gray-500 hover:text-primary flex-shrink-0 h-8 w-8" 
          aria-label={`Edit ${title}`}
        >
          <Edit className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        {content ? (
          <div className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
            {content}
          </div>
        ) : (
          <p className="text-gray-500 text-sm italic">{placeholder || `No ${title.toLowerCase()} available.`}</p>
        )}
      </CardContent>
    </Card>
  )
}
