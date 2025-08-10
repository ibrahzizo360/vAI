"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Sidebar } from "@/components/custom/sidebar"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Send,
  Bot,
  User as UserIcon,
  FileText,
  Calendar,
  MessageSquare,
  Loader2,
  AlertCircle
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { fetchWithoutCache } from "@/lib/utils/cache"
import { MarkdownRenderer } from "@/components/custom/markdown-renderer"

interface PatientChatPageProps {
  params: {
    id: string
  }
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface PatientContext {
  patient: {
    name: string
    mrn: string
    age: number
    sex: string
    primary_diagnosis: string
    attending_physician: string
    status: string
  }
  clinical_notes_count: number
  last_updated: string
}

export default function PatientChatPage({ params }: PatientChatPageProps) {
  const patientId = params.id
  const [context, setContext] = useState<PatientContext | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingContext, setIsLoadingContext] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchPatientContext()
  }, [patientId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchPatientContext = async () => {
    try {
      setIsLoadingContext(true)
      const response = await fetchWithoutCache(`/api/patients/${patientId}/chat`)
      if (!response.ok) throw new Error('Failed to fetch patient context')
      const data = await response.json()
      setContext(data)
      
      // Add welcome message
      const welcomeMessage: ChatMessage = {
        role: 'assistant',
        content: `# Hello! I'm your AI assistant for **${data.patient.name}**

### Patient Information:
• **MRN:** ${data.patient.mrn}
• **Clinical Notes:** ${data.clinical_notes_count} available
• **Status:** ${data.patient.status}

### I can help you with:
• Finding specific patient information from clinical notes
• Identifying patterns and trends across encounters  
• Summarizing medical history and progress
• Highlighting follow-up items and concerns
• Organizing medications and vital signs

> What would you like to know about **${data.patient.name}**?`,
        timestamp: new Date().toISOString()
      }
      setMessages([welcomeMessage])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load patient data')
    } finally {
      setIsLoadingContext(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage("")
    setIsLoading(true)

    try {
      const response = await fetch(`/api/patients/${patientId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversation_history: messages
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      const data = await response.json()
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.message,
        timestamp: data.timestamp
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Chat error:', error)
      toast.error('Failed to send message. Please try again.')
      
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  if (isLoadingContext) {
    return (
      <div className="relative flex min-h-screen bg-secondary">
        <Sidebar />
        <div className="flex-1 md:ml-20 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto" />
            <p className="text-gray-600">Loading patient context...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !context) {
    return (
      <div className="relative flex min-h-screen bg-secondary">
        <Sidebar />
        <div className="flex-1 md:ml-20 flex items-center justify-center">
          <div className="text-center max-w-md">
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load patient data</h3>
            <p className="text-gray-500 text-sm mb-6">{error || 'Unknown error occurred'}</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={fetchPatientContext} variant="outline">
                <Loader2 className="h-4 w-4 mr-2" />
                Retry
              </Button>
              <Link href={`/patients/${patientId}`}>
                <Button variant="ghost">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Patient
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 md:ml-20 p-4 md:p-6 pb-24 md:pb-6 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 mb-4 md:mb-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Link href={`/patients/${patientId}`}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Back to Patient Details</span>
                  <span className="sm:hidden">Back</span>
                </Button>
              </Link>
              <Badge className={`bg-${context.patient.status === "Active" ? "green" : "gray"}-100 text-${context.patient.status === "Active" ? "green" : "gray"}-800`}>
                {context.patient.status}
              </Badge>
            </div>
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <MessageSquare className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
                AI Patient Chat
              </h1>
              <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 sm:gap-6 text-sm md:text-base text-gray-600">
                <div className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4" />
                  <span>{context.patient.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>MRN: {context.patient.mrn}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{context.clinical_notes_count} Clinical Notes</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-[calc(100vh-380px)] md:h-[calc(100vh-300px)] flex flex-col">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-3 md:space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-2 md:gap-3 max-w-[90%] md:max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.role === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-purple-100 text-purple-600'
                  }`}>
                    {message.role === 'user' ? (
                      <UserIcon className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                  <div className={`rounded-lg p-3 md:p-4 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <div className="text-sm leading-relaxed">
                      {message.role === 'assistant' ? (
                        <MarkdownRenderer content={message.content} />
                      ) : (
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      )}
                    </div>
                    <div className={`text-xs mt-2 ${
                      message.role === 'user' ? 'text-blue-200' : 'text-gray-500'
                    }`}>
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex gap-3 max-w-[80%]">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-gray-100 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-gray-600">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="border-t p-3 md:p-4">
            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Ask about ${context.patient.name}...`}
                disabled={isLoading}
                className="flex-1 text-sm md:text-base"
              />
              <Button 
                onClick={sendMessage} 
                disabled={!inputMessage.trim() || isLoading}
                size="sm"
                className="px-3 md:px-6"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2 hidden md:block">
              Ask about symptoms, medications, visit history, lab results, or any other patient details.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}