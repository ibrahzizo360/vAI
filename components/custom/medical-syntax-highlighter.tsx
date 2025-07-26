import type React from "react"

interface MedicalSyntaxHighlighterProps {
  text: string
}

export function MedicalSyntaxHighlighter({ text }: MedicalSyntaxHighlighterProps) {
  // Regex to find common medical terms and patterns
  const medicalTermsRegex = new RegExp(
    "GCS\\s\\d{1,2}/\\d{1,2}|" + // GCS 13/15
      "posterior fossa|hydrocephalus|craniotomy|EVD|ICP|Dexamethasone|MRI|CT scan|CSF|intracranial pressure|Glasgow Coma Scale",
    "gi", // Global, case-insensitive
  )

  const parts: React.ReactNode[] = []
  let lastIndex = 0

  text.replace(medicalTermsRegex, (match, offset) => {
    // Add the text before the match
    if (offset > lastIndex) {
      parts.push(text.substring(lastIndex, offset))
    }
    // Add the highlighted match
    parts.push(
      <span key={offset} className="font-semibold text-primary bg-primary/10 px-1 rounded-sm">
        {match}
      </span>,
    )
    lastIndex = offset + match.length
    return match // Return match to satisfy replace signature
  })

  // Add any remaining text after the last match
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }

  return <>{parts}</>
}
