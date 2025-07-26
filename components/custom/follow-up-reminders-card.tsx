import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BellRing, CheckCircle2, Clock } from "lucide-react"

interface Reminder {
  id: string
  type: string
  description: string
  dueDate: string
}

interface FollowUpRemindersCardProps {
  reminders: Reminder[]
}

export function FollowUpRemindersCard({ reminders }: FollowUpRemindersCardProps) {
  return (
    <Card className="bg-white shadow-sm border border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-primary">Follow-up Reminders</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {reminders.length === 0 ? (
          <p className="text-gray-500 text-sm italic">No active reminders.</p>
        ) : (
          reminders.map((reminder) => (
            <div key={reminder.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-md border border-gray-100 hover:bg-gray-100 transition-colors">
              {reminder.dueDate === "ASAP" || new Date(reminder.dueDate) < new Date() ? (
                <BellRing className="h-4 w-4 md:h-5 md:w-5 text-red-500 flex-shrink-0 mt-0.5" />
              ) : (
                <Clock className="h-4 w-4 md:h-5 md:w-5 text-primary flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 text-sm leading-relaxed">{reminder.description}</p>
                <p className="text-xs text-gray-600 mt-1">
                  Due: {reminder.dueDate === "ASAP" ? "ASAP" : new Date(reminder.dueDate).toLocaleDateString()}
                </p>
              </div>
              <button 
                className="flex-shrink-0 text-gray-400 hover:text-green-600 transition-colors ml-2" 
                aria-label="Mark as done"
              >
                <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5" />
              </button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
