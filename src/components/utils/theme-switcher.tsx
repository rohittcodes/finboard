"use client"

import { useEffect, useState, useRef } from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export function ModeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const createRipple = (event: React.MouseEvent, newTheme: string) => {
    if (!buttonRef.current) return

    const button = buttonRef.current
    const rect = button.getBoundingClientRect()
    const size = Math.max(window.innerWidth, window.innerHeight) * 2
    
    const ripple = document.createElement('div')
    ripple.className = `theme-ripple ${newTheme === 'dark' ? 'dark-ripple' : 'light-ripple'}`
    ripple.style.width = ripple.style.height = `${size}px`
    ripple.style.left = `${rect.left + rect.width / 2 - size / 2}px`
    ripple.style.top = `${rect.top + rect.height / 2 - size / 2}px`
    
    document.body.appendChild(ripple)
    
    setTimeout(() => {
      if (document.body.contains(ripple)) {
        document.body.removeChild(ripple)
      }
    }, 600)
  }

  const toggleTheme = (event: React.MouseEvent) => {
    const newTheme = theme === "dark" ? "light" : "dark"
    createRipple(event, newTheme)
    
    setTimeout(() => {
      setTheme(newTheme)
    }, 50)
  }

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" disabled>
        <div className="h-[1.2rem] w-[1.2rem]" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    )
  }

  return (
    <Button 
      ref={buttonRef}
      variant="outline" 
      size="icon" 
      onClick={toggleTheme}
      className="relative cursor-pointer overflow-hidden transition-all duration-300 ease-in-out hover:scale-105 active:scale-95"
    >
      <div className="relative">
        <Sun className="h-[1.2rem] w-[1.2rem] transition-all duration-500 ease-in-out scale-100 rotate-0 dark:scale-0 dark:-rotate-90" />
        <Moon className="absolute inset-0 h-[1.2rem] w-[1.2rem] transition-all duration-500 ease-in-out scale-0 rotate-90 dark:scale-100 dark:rotate-0" />
      </div>
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
