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
import { toast } from "sonner"
import { Loader2, Edit } from "lucide-react"

const patientEditSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  dob: z.string().min(1, "Date of birth is required"),
  sex: z.enum(["M", "F", "Other"], {
    required_error: "Please select sex",
  }),
  primary_diagnosis: z.string().min(1, "Primary diagnosis is required"),
  admission_source: z.enum(["ER", "Transfer", "Elective", "ICU"], {
    required_error: "Please select admission source",
  }),
  current_location: z.string().min(1, "Current location is required"),
  attending_physician: z.string().min(1, "Attending physician is required"),
  resident_physician: z.string().optional(),
  room_number: z.string().optional(),
  secondary_diagnoses: z.string().optional(),
  past_medical_history: z.string().optional(),
  allergies: z.string().optional(),
  status: z.enum(["Active", "Discharged", "Transferred", "Deceased"], {
    required_error: "Please select status",
  }),
})

type PatientEditFormValues = z.infer<typeof patientEditSchema>

interface Patient {
  _id: string
  mrn: string
  name: string
  dob: string
  age: number
  sex: string
  primary_diagnosis: string
  secondary_diagnoses: string[]
  admission_date: string
  admission_source: string
  current_location: string
  attending_physician: string
  resident_physician?: string
  room_number?: string
  past_medical_history: string[]
  allergies: string[]
  status: string
}

interface EditPatientModalProps {
  open: boolean
  onClose: () => void
  patient: Patient | null
  onPatientUpdated: () => void
}

export function EditPatientModal({ open, onClose, patient, onPatientUpdated }: EditPatientModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<PatientEditFormValues>({
    resolver: zodResolver(patientEditSchema),
    defaultValues: {
      name: patient?.name || "",
      dob: patient?.dob ? new Date(patient.dob).toISOString().split('T')[0] : "",
      sex: (patient?.sex as "M" | "F" | "Other") || undefined,
      primary_diagnosis: patient?.primary_diagnosis || "",
      admission_source: (patient?.admission_source as "ER" | "Transfer" | "Elective" | "ICU") || undefined,
      current_location: patient?.current_location || "",
      attending_physician: patient?.attending_physician || "",
      resident_physician: patient?.resident_physician || "",
      room_number: patient?.room_number || "",
      secondary_diagnoses: patient?.secondary_diagnoses?.join(", ") || "",
      past_medical_history: patient?.past_medical_history?.join(", ") || "",
      allergies: patient?.allergies?.join(", ") || "",
      status: (patient?.status as "Active" | "Discharged" | "Transferred" | "Deceased") || undefined,
    },
  })

  // Reset form when patient changes
  useState(() => {
    if (patient) {
      form.reset({
        name: patient.name,
        dob: patient.dob ? new Date(patient.dob).toISOString().split('T')[0] : "",
        sex: patient.sex as "M" | "F" | "Other",
        primary_diagnosis: patient.primary_diagnosis,
        admission_source: patient.admission_source as "ER" | "Transfer" | "Elective" | "ICU",
        current_location: patient.current_location,
        attending_physician: patient.attending_physician,
        resident_physician: patient.resident_physician || "",
        room_number: patient.room_number || "",
        secondary_diagnoses: patient.secondary_diagnoses?.join(", ") || "",
        past_medical_history: patient.past_medical_history?.join(", ") || "",
        allergies: patient.allergies?.join(", ") || "",
        status: patient.status as "Active" | "Discharged" | "Transferred" | "Deceased",
      })
    }
  })

  const onSubmit = async (data: PatientEditFormValues) => {
    if (!patient) return

    setIsSubmitting(true)
    try {
      // Calculate age from date of birth
      const dob = new Date(data.dob)
      const today = new Date()
      let age = today.getFullYear() - dob.getFullYear()
      const monthDiff = today.getMonth() - dob.getMonth()
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--
      }

      const updates = {
        ...data,
        dob: dob,
        age: age,
        secondary_diagnoses: data.secondary_diagnoses
          ? data.secondary_diagnoses.split(",").map(d => d.trim()).filter(d => d)
          : [],
        past_medical_history: data.past_medical_history
          ? data.past_medical_history.split(",").map(h => h.trim()).filter(h => h)
          : [],
        allergies: data.allergies
          ? data.allergies.split(",").map(a => a.trim()).filter(a => a)
          : [],
      }

      const response = await fetch("/api/patients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "update_patient",
          patient_data: {
            patient_id: patient._id,
            updates: updates,
          },
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update patient")
      }

      const result = await response.json()
      
      toast.success(`Patient ${result.patient.name} updated successfully`)

      onClose()
      onPatientUpdated()
    } catch (error) {
      console.error("Error updating patient:", error)
      toast.error("Failed to update patient", {
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

  if (!patient) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Patient: {patient.name}
          </DialogTitle>
          <DialogDescription>
            Update patient information. MRN: {patient.mrn}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter patient full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dob"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sex"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sex *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select sex" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="M">Male</SelectItem>
                        <SelectItem value="F">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Discharged">Discharged</SelectItem>
                        <SelectItem value="Transferred">Transferred</SelectItem>
                        <SelectItem value="Deceased">Deceased</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="primary_diagnosis"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Primary Diagnosis *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter primary diagnosis" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="admission_source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admission Source *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ER">Emergency Room</SelectItem>
                        <SelectItem value="Transfer">Transfer</SelectItem>
                        <SelectItem value="Elective">Elective</SelectItem>
                        <SelectItem value="ICU">ICU</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="current_location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Location *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., ICU, Ward 5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="room_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 302A" {...field} />
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
                name="resident_physician"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resident Physician</FormLabel>
                    <FormControl>
                      <Input placeholder="Dr. Johnson" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="secondary_diagnoses"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Secondary Diagnoses</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter secondary diagnoses separated by commas" 
                        className="min-h-[60px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="past_medical_history"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Past Medical History</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter past medical history separated by commas" 
                        className="min-h-[60px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="allergies"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Allergies</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter allergies separated by commas" 
                        className="min-h-[60px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                    <Edit className="h-4 w-4 mr-2" />
                    Update Patient
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