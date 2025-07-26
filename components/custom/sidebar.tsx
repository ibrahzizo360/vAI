"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { Home, Clock, Users, Mic, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth >= 768) {
        setIsOpen(false)
      }
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  const navItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "Recent", href: "/history", icon: Clock },
    { name: "Patients", href: "/patients", icon: Users },
  ]

  const handleLinkClick = () => {
    if (isMobile) {
      setIsOpen(false)
    }
  }

  return (
    <>
      {/* Mobile Menu Button */}
      {isMobile && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 bg-white shadow-md md:hidden"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      )}

      {/* Overlay for mobile */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed left-0 top-0 
        ${isMobile && !isOpen ? '-translate-x-full' : 'translate-x-0'}
        w-20 md:w-20 bg-[#E4F2FF] text-black h-full min-h-screen
        flex flex-col items-center p-4 shadow-lg transition-transform duration-300 ease-in-out z-50
      `}>
        <div className="flex flex-col items-center gap-2 mb-8 mt-2">
          <Mic className="h-8 w-8 text-primary" />
          <h2 className="text-sm font-bold text-primary">vAI</h2>
        </div>
        <nav className="flex flex-col space-y-4 w-full">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex flex-col items-center gap-1 p-2 text-xs font-medium rounded-md hover:bg-primary/10 transition-colors duration-200 group"
              aria-label={item.name}
              onClick={handleLinkClick}
            >
              <item.icon className="h-6 w-6 text-black group-hover:text-primary" />
              <span className="text-[10px] text-center leading-3 mt-1 group-hover:text-primary">
                {item.name}
              </span>
            </Link>
          ))}
        </nav>
      </aside>
    </>
  )
}
