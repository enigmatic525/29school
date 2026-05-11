'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

export type Theme = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme: Theme
  resolved: 'light' | 'dark'
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export const THEME_STORAGE_KEY = '29-theme'

function applyResolved(theme: Theme): 'light' | 'dark' {
  const prefersDark = typeof window !== 'undefined'
    && window.matchMedia('(prefers-color-scheme: dark)').matches
  const resolved: 'light' | 'dark' =
    theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme
  if (typeof document !== 'undefined') {
    const root = document.documentElement
    root.classList.toggle('dark', resolved === 'dark')
  }
  return resolved
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')
  const [resolved, setResolved] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    let initial: Theme = 'light'
    try {
      const raw = localStorage.getItem(THEME_STORAGE_KEY)
      if (raw === 'light' || raw === 'dark' || raw === 'system') initial = raw
    } catch {}
    setThemeState(initial)
    setResolved(applyResolved(initial))

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      // Only react when explicitly in system mode
      try {
        const raw = localStorage.getItem(THEME_STORAGE_KEY)
        if (raw !== 'system') return
      } catch { return }
      setResolved(applyResolved('system'))
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    setResolved(applyResolved(t))
    try { localStorage.setItem(THEME_STORAGE_KEY, t) } catch {}
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

// Inline script that runs before paint to set the initial class on <html>
// and avoid a flash of the wrong theme.
export const themeInitScript = `
(function(){try{
  var k='${THEME_STORAGE_KEY}';
  var t=localStorage.getItem(k);
  if(t!=='light'&&t!=='dark'&&t!=='system') t='light';
  var d = t==='dark' || (t==='system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  var c = document.documentElement.classList;
  if(d) c.add('dark'); else c.remove('dark');
}catch(e){}})();
`.trim()
