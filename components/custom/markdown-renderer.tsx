import React from 'react'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  // Simple markdown parser for basic formatting
  const parseMarkdown = (text: string) => {
    let html = text
    
    // Handle headers
    html = html.replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mb-3 mt-4 text-gray-900">$1</h3>')
    html = html.replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mb-3 mt-5 text-gray-900">$1</h2>')
    html = html.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mb-4 mt-5 text-gray-900">$1</h1>')
    
    // Handle bold text
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    
    // Handle italic text
    html = html.replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
    
    // Handle inline code
    html = html.replace(/`(.+?)`/g, '<code class="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
    
    // Handle blockquotes
    html = html.replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-blue-500 bg-blue-50 pl-4 py-2 my-3 text-blue-900 italic">$1</blockquote>')
    
    // Handle bullet points (• character)
    html = html.replace(/^• (.+)$/gm, '<li class="ml-4 mb-1">$1</li>')
    
    // Handle numbered lists
    html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 mb-1 list-decimal">$1</li>')
    
    // Wrap consecutive list items
    html = html.replace(/(<li.*?>.*?<\/li>[\s\S]*?)(?=<li.*?>|$)/g, '<ul class="list-disc space-y-1 mb-3">$1</ul>')
    html = html.replace(/(<li.*?list-decimal.*?>.*?<\/li>[\s\S]*?)(?=<li.*?list-decimal|$)/g, '<ol class="list-decimal space-y-1 mb-3">$1</ol>')
    
    // Handle line breaks
    html = html.replace(/\n\n/g, '</p><p class="mb-3">')
    html = html.replace(/\n/g, '<br />')
    
    // Wrap in paragraph tags if not already wrapped
    if (!html.includes('<p>') && !html.includes('<h') && !html.includes('<ul>') && !html.includes('<blockquote>')) {
      html = `<p class="mb-3">${html}</p>`
    } else if (html.includes('</p><p')) {
      html = `<p class="mb-3">${html}</p>`
    }
    
    return html
  }

  return (
    <div 
      className={`prose prose-sm max-w-none ${className}`}
      dangerouslySetInnerHTML={{ 
        __html: parseMarkdown(content) 
      }}
    />
  )
}