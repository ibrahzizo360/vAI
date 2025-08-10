"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Sidebar } from "@/components/custom/sidebar"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Send,
  Bot,
  User as UserIcon,
  MessageSquare,
  Loader2,
  AlertCircle,
  Brain,
  BarChart3,
  Stethoscope,
  BookOpen,
  Lightbulb,
  TrendingUp
} from "lucide-react"
import { toast } from "sonner"

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface SystemStats {
  patients: {
    total: number
    active: number
    inactive: number
  }
  clinical_notes: {
    total: number
    recent_7_days: number
  }
  insights: {
    common_diagnoses: Array<{ _id: string; count: number }>
    encounter_types: Array<{ _id: string; count: number }>
  }
  last_updated: string
}

const SUGGESTED_PROMPTS = [
  {
    category: "Clinical Decision Support",
    icon: Stethoscope,
    prompts: [
      "What are the key differential diagnoses for chest pain in a 45-year-old patient?",
      "When should I consider ordering a CT scan for abdominal pain?",
      "What are the current guidelines for hypertension management?",
      "How do I evaluate a patient with suspected sepsis?"
    ]
  },
  {
    category: "Best Practices",
    icon: Lightbulb,
    prompts: [
      "What are best practices for documenting patient encounters?",
      "How can I improve patient communication during consultations?",
      "What should I include in a comprehensive discharge summary?",
      "How to effectively manage time during patient rounds?"
    ]
  },
  {
    category: "System Insights",
    icon: TrendingUp,
    prompts: [
      "What patterns do you see in our recent patient diagnoses?",
      "How has our clinical documentation been trending lately?",
      "What are the most common encounter types in our system?",
      "Can you analyze our recent clinical activity?"
    ]
  },
  {
    category: "Medical Knowledge",
    icon: BookOpen,
    prompts: [
      "Explain the pathophysiology of diabetic ketoacidosis",
      "What are the latest treatment options for heart failure?",
      "How do I interpret abnormal liver function tests?",
      "What are the contraindications for MRI imaging?"
    ]
  }
]

export default function SystemChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null)
  const [includeSystemContext, setIncludeSystemContext] = useState(true)
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchSystemStats()
    initializeWelcomeMessage()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchSystemStats = async () => {
    try {
      const response = await fetch('/api/chat?include_stats=true')
      if (response.ok) {
        const stats = await response.json()
        setSystemStats(stats)
      }
    } catch (error) {
      console.error('Failed to fetch system stats:', error)
    } finally {
      setIsLoadingStats(false)
    }
  }

  const initializeWelcomeMessage = () => {
    const welcomeMessage: ChatMessage = {
      role: 'assistant',
      content: `Welcome to the vAI Medical AI Assistant! 🏥

I'm here to help you with:
• **Clinical Decision Support** - Differential diagnoses, treatment guidelines, and protocols
• **Medical Knowledge** - Pathophysiology, pharmacology, and evidence-based medicine
• **Best Practices** - Documentation tips, patient communication, and workflow optimization
• **System Insights** - Analytics and patterns from your clinical data (when enabled)

You can ask me anything from complex medical questions to practical clinical scenarios. I'll provide evidence-based responses to support your clinical practice.

How can I assist you today?`,
      timestamp: new Date().toISOString()
    }
    setMessages([welcomeMessage])
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputMessage.trim()
    if (!textToSend || isLoading) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: textToSend,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage("")
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: textToSend,
          conversation_history: messages,
          include_system_context: includeSystemContext
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

  const clearChat = () => {
    setMessages([])
    initializeWelcomeMessage()
  }

  return (
    <div className="relative flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6 pb-20 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <Brain className="h-8 w-8 text-purple-600" />
                AI Medical Assistant
              </h1>
              <p className="text-gray-600 max-w-2xl">
                Your intelligent assistant for clinical decision support, medical knowledge, and system insights.
                Ask questions about diagnoses, treatments, best practices, or get insights from your clinical data.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={includeSystemContext}
                  onCheckedChange={setIncludeSystemContext}
                  id="system-context"
                />
                <label htmlFor="system-context" className="text-sm font-medium">
                  Include System Data
                </label>
              </div>
              <Button variant="outline" onClick={clearChat}>
                Clear Chat
              </Button>
            </div>
          </div>
        </div>

        {/* System Stats */}
        {systemStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Patients</p>
                    <p className="text-2xl font-bold">{systemStats.patients.total}</p>
                  </div>
                  <UserIcon className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Patients</p>
                    <p className="text-2xl font-bold text-green-600">{systemStats.patients.active}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Clinical Notes</p>
                    <p className="text-2xl font-bold">{systemStats.clinical_notes.total}</p>
                  </div>
                  <MessageSquare className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Recent Notes</p>
                    <p className="text-2xl font-bold text-orange-600">{systemStats.clinical_notes.recent_7_days}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Suggested Prompts */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Suggested Questions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {SUGGESTED_PROMPTS.map((category, categoryIndex) => (
                  <div key={categoryIndex}>
                    <div className="flex items-center gap-2 mb-2">
                      <category.icon className="h-4 w-4 text-gray-500" />
                      <h4 className="font-medium text-sm text-gray-700">{category.category}</h4>
                    </div>
                    <div className="space-y-1">
                      {category.prompts.slice(0, 2).map((prompt, promptIndex) => (
                        <button
                          key={promptIndex}
                          onClick={() => sendMessage(prompt)}
                          className="text-left text-xs text-gray-600 hover:text-purple-600 hover:bg-purple-50 p-2 rounded transition-colors w-full"
                          disabled={isLoading}
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Chat Interface */}
          <div className="lg:col-span-3">
            <Card className="h-[calc(100vh-400px)] flex flex-col">
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-3 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
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
                      <div className={`rounded-lg p-4 ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">
                          {message.content}
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
                    <div className="flex gap-3 max-w-[85%]">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="bg-gray-100 rounded-lg p-4">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-gray-600">AI is analyzing...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me about medical knowledge, clinical decisions, or system insights..."
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button 
                    onClick={() => sendMessage()} 
                    disabled={!inputMessage.trim() || isLoading}
                    className="px-6"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Ask about diagnoses, treatments, best practices, or enable system data for clinical insights.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}