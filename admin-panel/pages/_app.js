import '../styles/globals.css'
import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export function useThemeContext() {
  return useContext(ThemeContext)
}

export default function App({ Component, pageProps }) {
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark') {
      setIsDark(true)
      document.documentElement.classList.add('dark')
    }
    setMounted(true)
  }, [])

  const toggle = () => {
    const newValue = !isDark
    setIsDark(newValue)
    if (newValue) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  if (!mounted) {
    return <div className="min-h-screen bg-white" />
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggle }}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <Component {...pageProps} />
      </div>
    </ThemeContext.Provider>
  )
}
