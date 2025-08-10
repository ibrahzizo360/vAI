"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { Loader2, Edit, FileText } from "lucide-react"

const noteEditSchema = z.object({
  encounter_date: z.string().min(1, "Encounter date is required"),
  encounter_time: z.string().optional(),
  encounter_type: z.enum(["rounds", "consult", "family_meeting", "procedure", "discharge", "emergency"], {
    required_error: "Please select encounter type",
  }),
  encounter_location: z.string().min(1, "Encounter location is required"),
  attending_physician: z.string().min(1, "Attending physician is required"),
  primary_provider: z.string().min(1, "Primary provider is required"),
  subjective: z.string().optional(),
  objective: z.string().optional(),
  assessment_plan: z.string().optional(),
  status: z.enum(["draft", "review", "complete", "signed", "amended"], {
    required_error: "Please select status",
  }),
})

type NoteEditFormValues = z.infer<typeof noteEditSchema>

interface ClinicalNote {
  _id: string
  encounter_date: string
  encounter_type: string
  encounter_location: string
  note_sections: Record<string, string>
  status: string
  primary_provider: string
  attending_physician: string
  completeness_score: number
}

interface EditNoteModalProps {
  open: boolean
  onClose: () => void
  note: ClinicalNote | null
  patientId: string
  onNoteUpdated: () => void
}

export function EditNoteModal({ open, onClose, note, patientId, onNoteUpdated }: EditNoteModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<NoteEditFormValues>({
    resolver: zodResolver(noteEditSchema),
    defaultValues: {
      encounter_date: note ? new Date(note.encounter_date).toISOString().split('T')[0] : "",
      encounter_time: note ? new Date(note.encounter_date).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : "",
      encounter_type: (note?.encounter_type as "rounds" | "consult" | "family_meeting" | "procedure" | "discharge" | "emergency") || undefined,
      encounter_location: note?.encounter_location || "",
      attending_physician: note?.attending_physician || "",
      primary_provider: note?.primary_provider || "",
      subjective: note?.note_sections?.subjective || "",
      objective: note?.note_sections?.objective || "",
      assessment_plan: note?.note_sections?.assessment_plan || "",
      status: (note?.status as "draft" | "review" | "complete" | "signed" | "amended") || undefined,
    },
  })

  // Reset form when note changes
  useState(() => {
    if (note) {
      form.reset({
        encounter_date: new Date(note.encounter_date).toISOString().split('T')[0],
        encounter_time: new Date(note.encounter_date).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        encounter_type: note.encounter_type as "rounds" | "consult" | "family_meeting" | "procedure" | "discharge" | "emergency",
        encounter_location: note.encounter_location,
        attending_physician: note.attending_physician,
        primary_provider: note.primary_provider,
        subjective: note.note_sections?.subjective || "",
        objective: note.note_sections?.objective || "",
        assessment_plan: note.note_sections?.assessment_plan || "",
        status: note.status as "draft" | "review" | "complete" | "signed" | "amended",
      })
    }
  })

  const onSubmit = async (data: NoteEditFormValues) => {
    if (!note) return

    setIsSubmitting(true)
    try {
      // Combine date and time for encounter_date
      const encounterDateTime = data.encounter_time 
        ? new Date(`${data.encounter_date}T${data.encounter_time}:00`)
        : new Date(data.encounter_date)

      const updates = {
        encounter_date: encounterDateTime,
        encounter_type: data.encounter_type,
        encounter_location: data.encounter_location,
        attending_physician: data.attending_physician,
        primary_provider: data.primary_provider,
        note_sections: {
          ...note.note_sections,
          subjective: data.subjective || "",
          objective: data.objective || "",
          assessment_plan: data.assessment_plan || "",
        },
        status: data.status,
      }

      const response = await fetch(`/api/patients/${patientId}/notes/${note._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update note")
      }

      const result = await response.json()
      
      toast.success("Clinical note updated successfully")

      onClose()
      onNoteUpdated()
    } catch (error) {
      console.error("Error updating note:", error)
      toast.error("Failed to update note", {
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
    }
  }

  const formatEncounterType = (type: string) => {
    const formatted = {
      rounds: "Ward Round",
      consult: "Consult",
      family_meeting: "Family Meeting",
      procedure: "Procedure",
      discharge: "Discharge",
      emergency: "Emergency",
    }
    return formatted[type as keyof typeof formatted] || type
  }

  if (!note) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Clinical Note
          </DialogTitle>
          <DialogDescription>
            Update the clinical note details and content.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Note Details</TabsTrigger>
                <TabsTrigger value="content">Note Content</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="encounter_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Encounter Date *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="encounter_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Encounter Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="encounter_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Encounter Type *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select encounter type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="rounds">Ward Round</SelectItem>
                            <SelectItem value="consult">Consult</SelectItem>
                            <SelectItem value="family_meeting">Family Meeting</SelectItem>
                            <SelectItem value="procedure">Procedure</SelectItem>
                            <SelectItem value="discharge">Discharge</SelectItem>
                            <SelectItem value="emergency">Emergency</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="encounter_location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Encounter Location *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., ICU, Room 302" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="attending_physician"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Attending Physician *</FormLabel>
                        <FormControl>
                          <Input placeholder="Dr. Smith" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="primary_provider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Provider *</FormLabel>
                        <FormControl>
                          <Input placeholder="Dr. Johnson" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Note Status *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="review">Under Review</SelectItem>
                            <SelectItem value="complete">Complete</SelectItem>
                            <SelectItem value="signed">Signed</SelectItem>
                            <SelectItem value="amended">Amended</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="content" className="space-y-4">
                <FormField
                  control={form.control}
                  name="subjective"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subjective</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Patient's subjective complaints, history of present illness..."
                          className="min-h-[120px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="objective"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Objective</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Physical examination findings, vital signs, lab results..."
                          className="min-h-[120px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assessment_plan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assessment & Plan</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Clinical assessment and treatment plan..."
                          className="min-h-[120px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-primary text-white hover:bg-primary/90"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Update Note
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}