'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, TrendingUp, TrendingDown, ShieldCheck, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/skillpulse/i18n'

// A full-width live "signal pulse" bar that streams demand-signal events.
// Positioned below the header as a dedicated live-status row.
// This is the signature visual element that makes SkillPulse Grid feel ALIVE —
// you can see demand signals being detected, validated, and recommended in real time.

interface SignalEvent {
  id: string
  kind: 'detected' | 'validated' | 'emerging' | 'declining' | 'recommended'
  skill: string
  district?: string
  ts: number
}

const SKILLS = [
  'Generative AI & LLMs', 'Prompt Engineering', 'Python', 'React', 'TypeScript',
  'Docker', 'Kubernetes', 'MLOps', 'Vector Databases', 'SQL', 'JavaScript',
  'REST API Design', 'Cloud Computing', 'DevOps', 'Cybersecurity',
]
const DISTRICTS = ['Pune', 'Mumbai', 'Nagpur', 'Nashik', 'Thane', 'Aurangabad']

function randomEvent(): SignalEvent {
  const kinds: SignalEvent['kind'][] = ['detected', 'validated', 'emerging', 'recommended', 'declining']
  const kind = kinds[Math.floor(Math.random() * kinds.length)]
  return {
    id: Math.random().toString(36).slice(2),
    kind,
    skill: SKILLS[Math.floor(Math.random() * SKILLS.length)],
    district: DISTRICTS[Math.floor(Math.random() * DISTRICTS.length)],
    ts: Date.now(),
  }
}

const KIND_META: Record<SignalEvent['kind'], { icon: any; color: string; bg: string; label: string }> = {
  detected: { icon: Activity, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10', label: 'detected' },
  validated: { icon: ShieldCheck, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-500/10', label: 'validated' },
  emerging: { icon: TrendingUp, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', label: 'emerging' },
  declining: { icon: TrendingDown, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-500/10', label: 'declining' },
  recommended: { icon: Zap, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10', label: 'recommended' },
}

export function SignalPulseTicker() {
  const [events, setEvents] = useState<SignalEvent[]>([])
  const [pulse, setPulse] = useState(0)
  const counterRef = useRef(0)
  const { t } = useI18n()

  useEffect(() => {
    // Seed with a batch of events
    const seed = Array.from({ length: 8 }, () => randomEvent())
    setEvents(seed)
    counterRef.current = 8
    setPulse(8)

    // Stream new events every 3-5 seconds
    const interval = setInterval(() => {
      setEvents((prev) => {
        const next = [randomEvent(), ...prev].slice(0, 15)
        return next
      })
      counterRef.current += 1
      setPulse(counterRef.current)
    }, 3500)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="w-full border-b border-border/60 bg-card/60 backdrop-blur-xl">
      <div className="max-w-[1600px] mx-auto px-4 lg:px-6">
        <div className="flex items-center gap-3 h-9">
          {/* Live indicator */}
          <div className="flex items-center gap-1.5 flex-shrink-0 pr-3 border-r border-border/60">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-teal-500 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-500" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Demo feed</span>
          </div>

          {/* Ticker stream — horizontally scrollable (scrollbar hidden) */}
          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-x-auto no-scrollbar pb-0.5">
            <AnimatePresence mode="popLayout">
              {events.map((e, i) => {
                const meta = KIND_META[e.kind]
                const Icon = meta.icon
                return (
                  <motion.div
                    key={e.id}
                    layout
                    initial={{ opacity: 0, x: 20, scale: 0.9 }}
                    animate={{ opacity: i === 0 ? 1 : 0.6, x: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                    transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium whitespace-nowrap flex-shrink-0',
                      meta.bg, meta.color,
                      i === 0 && 'ring-1 ring-current/20 shadow-soft'
                    )}
                  >
                    <Icon className="h-3 w-3 flex-shrink-0" />
                    <span className="font-semibold">{e.skill}</span>
                    {e.district && <span className="opacity-60">· {e.district}</span>}
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>

          {/* Counter */}
          <div className="flex items-center gap-1.5 flex-shrink-0 pl-3 border-l border-border/60">
            <motion.span
              key={pulse}
              initial={{ scale: 1.3, color: 'var(--primary)' }}
              animate={{ scale: 1, color: 'var(--muted-foreground)' }}
              transition={{ duration: 0.4 }}
              className="text-xs font-bold tabular-nums"
            >
              {pulse}
            </motion.span>
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{t.ticker.signals}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
