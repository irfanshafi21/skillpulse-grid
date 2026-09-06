'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import en from '@/locales/en'
import hi from '@/locales/hi'
import ta from '@/locales/ta'
import bn from '@/locales/bn'

export type Locale = 'en' | 'hi' | 'ta' | 'bn'

const messages: Record<Locale, typeof en> = { en, hi, ta, bn }

export const LOCALE_META: Record<Locale, { label: string; nativeLabel: string; flag: string }> = {
  en: { label: 'English', nativeLabel: 'English', flag: '🇮🇳' },
  hi: { label: 'Hindi', nativeLabel: 'हिन्दी', flag: '🇮🇳' },
  ta: { label: 'Tamil', nativeLabel: 'தமிழ்', flag: '🇮🇳' },
  bn: { label: 'Bengali', nativeLabel: 'বাংলা', flag: '🇮🇳' },
}

interface I18nContextValue {
  locale: Locale
  setLocale: (l: Locale) => void
  t: typeof en
  // True once the client has mounted and loaded the saved locale.
  // Components can use this to avoid hydration mismatches by rendering
  // a stable initial state until mounted.
  mounted: boolean
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'en',
  setLocale: () => {},
  t: en,
  mounted: false,
})

export function I18nProvider({ children }: { children: ReactNode }) {
  // Always start with 'en' on both server and client to avoid hydration mismatch.
  // The saved locale is loaded in useEffect (client-only, after hydration).
  const [locale, setLocaleState] = useState<Locale>('en')
  const [mounted, setMounted] = useState(false)

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    try {
      localStorage.setItem('skillpulse-locale', l)
    } catch {}
    if (typeof document !== 'undefined') {
      document.documentElement.lang = l
    }
  }, [])

  // Load saved locale on the client AFTER hydration to avoid SSR mismatch.
  useEffect(() => {
    setMounted(true)
    try {
      const saved = localStorage.getItem('skillpulse-locale') as Locale | null
      if (saved && messages[saved]) {
        setLocaleState(saved)
        if (typeof document !== 'undefined') {
          document.documentElement.lang = saved
        }
      }
    } catch {}
  }, [])

  return (
    <I18nContext.Provider value={{ locale, setLocale, t: messages[locale], mounted }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}
