"use client"

import { Volume2, Clock, Users, Mic, Play, Loader2 } from "lucide-react"
import { Sidebar } from "@/components/custom/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useState, useEffect } from "react"
import { fetchWithoutCache } from "@/lib/utils/cache"

interface DashboardStats {
  totalPatients: number
  recentNotes: number
  todayRecordings: number
  activePatients: number
}

export default function HomePage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [recentActivity, setRecentActivity] = useState<any[]>([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch patients and notes data in parallel
      const [patientsResponse, notesResponse] = await Promise.all([
        fetchWithoutCache('/api/patients'),
        fetchWithoutCache('/api/patients/*/notes?limit=10')
      ])

      if (patientsResponse.ok && notesResponse.ok) {
        const patientsData = await patientsResponse.json()
        const notesData = await notesResponse.json()

        // Calculate stats
        const totalPatients = patientsData.patients.length
        const activePatients = patientsData.patients.filter((p: any) => p.status === 'Active').length
        const recentNotes = notesData.notes.length
        const todayRecordings = notesData.notes.filter((note: any) => {
          const noteDate = new Date(note.encounter_date)
          const today = new Date()
          return noteDate.toDateString() === today.toDateString()
        }).length

        setStats({
          totalPatients,
          activePatients,
          recentNotes,
          todayRecordings
        })

        // Set recent activity from notes
        const activity = notesData.notes.slice(0, 3).map((note: any) => ({
          patient: note.patient.mrn,
          time: new Date(note.encounter_date).toLocaleDateString(),
          type: note.encounter_type
        }))
        setRecentActivity(activity)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const quickStats = [
    { 
      label: "Today's Notes", 
      value: loading ? "..." : stats?.todayRecordings.toString() || "0", 
      icon: Mic 
    },
    { 
      label: "Active Patients", 
      value: loading ? "..." : stats?.activePatients.toString() || "0", 
      icon: Users 
    },
    { 
      label: "Recent Notes", 
      value: loading ? "..." : stats?.recentNotes.toString() || "0", 
      icon: Clock 
    },
  ]

  return (
    <div className="relative flex min-h-screen bg-secondary">
      <Sidebar />
      <div className="flex-1 md:ml-20 flex flex-col">
        <header className="flex items-center justify-between p-4 bg-primary text-white shadow-md sticky top-0 z-10">
          <h1 className="text-xl font-bold ml-12 md:ml-0">vAI</h1>
        </header>
        <main className="flex-1 p-4 pb-28 max-w-6xl mx-auto w-full">
          {/* Voice Status Banner */}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-6 p-3 bg-green-50 rounded-lg border border-green-200">
            <Volume2 className="h-4 w-4 text-green-600" />
            <span className="text-green-600 font-medium">Listening for "Hey vAI"</span>
          </div>

          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-semibold text-primary mb-2">Dashboard</h2>
            <p className="text-gray-700 text-base md:text-lg">Welcome to your vAI dashboard. Start a new recording or view your history.</p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {quickStats.map((stat) => (
              <Card key={stat.label} className="bg-white shadow-sm border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <stat.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary">{stat.value}</p>
                      <p className="text-sm text-gray-600">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Actions */}
          <Card className="bg-white shadow-sm border border-gray-200 mb-6">
            <CardHeader>
              <CardTitle className="text-primary">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button
                  className="h-auto p-4 bg-primary hover:bg-primary/90 text-white flex flex-col items-center gap-2"
                  asChild
                >
                  <Link href="/patients">
                    <Users className="h-6 w-6" />
                    <span>View Patients</span>
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto p-4 border-primary text-primary hover:bg-primary/5 flex flex-col items-center gap-2"
                  asChild
                >
                  <Link href="/history">
                    <Clock className="h-6 w-6" />
                    <span>View History</span>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity Preview */}
          <Card className="bg-white shadow-sm border border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-primary">Recent Activity</CardTitle>
              <Button variant="link" asChild className="text-primary">
                <Link href="/history">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2 text-gray-600">Loading activity...</span>
                </div>
              ) : recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                      <div>
                        <p className="font-medium text-primary">{activity.patient}</p>
                        <p className="text-sm text-gray-600 capitalize">{activity.type.replace('_', ' ')}</p>
                      </div>
                      <span className="text-xs text-gray-500">{activity.time}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No recent activity</p>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
