"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { Home, Clock, Users, Mic, Brain } from "lucide-react"

export function Sidebar() {
  const [isMobile, setIsMobile] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  const navItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "Recent", href: "/history", icon: Clock },
    { name: "Patients", href: "/patients", icon: Users },
    { name: "AI Chat", href: "/chat", icon: Brain },
  ]

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  if (isMobile) {
    // Mobile bottom navigation
    return (
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden">
        <div className="flex justify-around items-center py-2 px-1">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center gap-1 p-2 min-w-0 flex-1 rounded-lg transition-colors duration-200 ${
                isActive(item.href)
                  ? 'text-primary bg-primary/5'
                  : 'text-gray-600 hover:text-primary hover:bg-primary/5'
              }`}
              aria-label={item.name}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span className="text-xs font-medium text-center leading-tight truncate w-full">
                {item.name}
              </span>
            </Link>
          ))}
        </div>
      </nav>
    )
  }

  // Desktop sidebar
  return (
    <aside className="fixed left-0 top-0 w-20 bg-[#E4F2FF] text-black h-full min-h-screen flex flex-col items-center p-4 shadow-lg z-50 hidden md:flex">
      <div className="flex flex-col items-center gap-2 mb-8 mt-2">
        <Mic className="h-8 w-8 text-primary" />
        <h2 className="text-sm font-bold text-primary">vAI</h2>
      </div>
      <nav className="flex flex-col space-y-4 w-full">
        {navItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={`flex flex-col items-center gap-1 p-2 text-xs font-medium rounded-md transition-colors duration-200 group ${
              isActive(item.href)
                ? 'bg-primary/10 text-primary'
                : 'hover:bg-primary/10 hover:text-primary'
            }`}
            aria-label={item.name}
          >
            <item.icon className={`h-6 w-6 ${isActive(item.href) ? 'text-primary' : 'text-black group-hover:text-primary'}`} />
            <span className={`text-[10px] text-center leading-3 mt-1 ${isActive(item.href) ? 'text-primary' : 'group-hover:text-primary'}`}>
              {item.name}
            </span>
          </Link>
        ))}
      </nav>
    </aside>
  )
}
