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
  Stethoscope,
  BookOpen,
  Lightbulb
} from "lucide-react"
import { toast } from "sonner"
import { MarkdownRenderer } from "@/components/custom/markdown-renderer"

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
    icon: Brain,
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
      content: `# Welcome to the vAI Medical AI Assistant! 🏥

I'm here to help you with:

• **Clinical Decision Support** - Differential diagnoses, treatment guidelines, and protocols
• **Medical Knowledge** - Pathophysiology, pharmacology, and evidence-based medicine  
• **Best Practices** - Documentation tips, patient communication, and workflow optimization
• **System Insights** - Analytics and patterns from your clinical data (when enabled)

> You can ask me anything from complex medical questions to practical clinical scenarios. I'll provide evidence-based responses to support your clinical practice.

**How can I assist you today?**`,
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
      <main className="flex-1 md:ml-20 p-4 md:p-6 pb-24 md:pb-6 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 mb-4 md:mb-6">
          <div className="flex flex-col gap-4">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <Brain className="h-6 w-6 md:h-8 md:w-8 text-purple-600" />
                AI Medical Assistant
              </h1>
              <p className="text-sm md:text-base text-gray-600">
                Your intelligent assistant for clinical decision support, medical knowledge, and system insights.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
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
              <Button variant="outline" onClick={clearChat} size="sm">
                Clear Chat
              </Button>
            </div>
          </div>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
          {/* Suggested Prompts */}
          <div className="lg:col-span-1 space-y-4 order-2 lg:order-1">
            <Card className="lg:sticky lg:top-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-base md:text-lg flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 md:h-5 md:w-5" />
                  Suggested Questions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {SUGGESTED_PROMPTS.map((category, categoryIndex) => (
                  <div key={categoryIndex}>
                    <div className="flex items-center gap-2 mb-2">
                      <category.icon className="h-3 w-3 md:h-4 md:w-4 text-gray-500" />
                      <h4 className="font-medium text-xs md:text-sm text-gray-700">{category.category}</h4>
                    </div>
                    <div className="space-y-1">
                      {category.prompts.slice(0, 2).map((prompt, promptIndex) => (
                        <button
                          key={promptIndex}
                          onClick={() => sendMessage(prompt)}
                          className="text-left text-xs text-gray-600 hover:text-purple-600 hover:bg-purple-50 p-2 rounded transition-colors w-full line-clamp-2"
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
          <div className="lg:col-span-3 order-1 lg:order-2">
            <Card className="h-[calc(100vh-280px)] md:h-[calc(100vh-200px)] flex flex-col">
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-3 md:space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-2 md:gap-3 max-w-[90%] md:max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
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
              <div className="border-t p-3 md:p-4">
                <div className="flex gap-2">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me about medical knowledge..."
                    disabled={isLoading}
                    className="flex-1 text-sm md:text-base"
                  />
                  <Button 
                    onClick={() => sendMessage()} 
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