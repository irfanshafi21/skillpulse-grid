'use client'

import { useI18n, LOCALE_META, type Locale } from '@/lib/skillpulse/i18n'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Globe } from 'lucide-react'

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n()

  return (
    <Select value={locale} onValueChange={(v: Locale) => setLocale(v)}>
      <SelectTrigger className="h-9 w-[130px] text-xs gap-1.5 flex-shrink-0" aria-label="Select language">
        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(LOCALE_META) as Locale[]).map((l) => (
          <SelectItem key={l} value={l} className="text-xs">
            <div className="flex items-center gap-2">
              <span className="text-base leading-none">{LOCALE_META[l].flag}</span>
              <span className="font-medium">{LOCALE_META[l].nativeLabel}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
