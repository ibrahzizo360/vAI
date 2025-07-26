import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Mic } from "lucide-react"

export function FloatingRecordButton() {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <Link href="/record" passHref>
        <Button
          className="h-20 w-20 rounded-full bg-primary text-white shadow-lg hover:bg-primary/90 transition-colors duration-200"
          aria-label="Start new recording"
        >
          <Mic className="h-10 w-10" />
        </Button>
      </Link>
    </div>
  )
}
