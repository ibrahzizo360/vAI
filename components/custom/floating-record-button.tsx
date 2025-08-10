import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Mic } from "lucide-react"

export function FloatingRecordButton() {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <Link href="/record" passHref>
        <Button
          className="h-20 w-20 rounded-full bg-red-600 text-white shadow-xl hover:bg-red-700 hover:scale-105"
          aria-label="Start new recording"
        >
          <Mic className="h-10 w-10" />
        </Button>
      </Link>
    </div>
  )
}
