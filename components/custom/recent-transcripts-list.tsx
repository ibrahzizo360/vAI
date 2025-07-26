import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Calendar, Tag } from "lucide-react"

interface Transcript {
  id: string
  patientId: string
  context: string
  date: string
  summary: string
}

interface RecentTranscriptsListProps {
  transcripts: Transcript[]
}

export function RecentTranscriptsList({ transcripts }: RecentTranscriptsListProps) {
  return (
    <div className="space-y-4">
      {transcripts.length === 0 ? (
        <p className="text-gray-600 text-center py-8">No recent transcripts. Start a new recording!</p>
      ) : (
        transcripts.map((transcript) => (
          <Card key={transcript.id} className="bg-white shadow-sm border border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-primary text-lg">{transcript.patientId}</h3>
                <span className="text-sm text-gray-600 flex items-center gap-1">
                  <Calendar className="h-4 w-4" /> {transcript.date}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-700 text-sm mb-2">
                <Tag className="h-4 w-4" />
                <span>{transcript.context}</span>
              </div>
              <p className="text-gray-800 text-sm line-clamp-2">{transcript.summary}</p>
              <Link href={`/review?id=${transcript.id}`} passHref>
                <Button
                  variant="link"
                  className="p-0 h-auto text-primary hover:underline mt-2"
                  aria-label={`Review transcript for ${transcript.patientId}`}
                >
                  Review Details <FileText className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
