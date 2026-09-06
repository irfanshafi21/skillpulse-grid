'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Radar, Cpu, ShieldCheck, GitCompareArrows, Map, ListChecks, FileText,
  CheckCircle2, XCircle, Clock, AlertCircle,
} from 'lucide-react'

// Signature vertical timeline showing the 7-stage evidence flow.
// Used in the Evidence Drawer and Dashboard to visualize how a signal becomes
// a recommendation — the core value proposition of SkillPulse Grid.

export interface TimelineStage {
  id: string
  label: string
  status: 'complete' | 'pending' | 'rejected' | 'current' | 'skipped'
  detail?: string
  timestamp?: string
}

const STAGE_ICONS: Record<string, any> = {
  detect: Radar,
  understand: Cpu,
  validate: ShieldCheck,
  compare: GitCompareArrows,
  localize: Map,
  recommend: ListChecks,
  trace: FileText,
}

const STATUS_META: Record<TimelineStage['status'], { color: string; bg: string; ring: string; icon?: any }> = {
  complete: { color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-500/15', ring: 'ring-teal-500/30' },
  pending: { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/15', ring: 'ring-amber-500/30', icon: Clock },
  rejected: { color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/15', ring: 'ring-rose-500/30', icon: XCircle },
  current: { color: 'text-primary', bg: 'bg-primary/15', ring: 'ring-primary/40', icon: AlertCircle },
  skipped: { color: 'text-muted-foreground', bg: 'bg-muted', ring: 'ring-border' },
}

export function EvidenceFlowTimeline({ stages }: { stages: TimelineStage[] }) {
  return (
    <div className="relative">
      {/* Vertical connecting line */}
      <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-primary/40 via-border to-border" />

      <div className="space-y-3">
        {stages.map((stage, i) => {
          const Icon = STAGE_ICONS[stage.id] ?? FileText
          const meta = STATUS_META[stage.status]
          const StatusIcon = meta.icon
          const isLast = i === stages.length - 1

          return (
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
              className="relative flex items-start gap-3"
            >
              {/* Node */}
              <div className={cn(
                'relative z-10 flex items-center justify-center h-8 w-8 rounded-full ring-2 flex-shrink-0',
                meta.bg, meta.ring
              )}>
                <Icon className={cn('h-4 w-4', meta.color)} />
                {StatusIcon && (
                  <div className={cn('absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-background flex items-center justify-center ring-1 ring-border')}>
                    <StatusIcon className={cn('h-2.5 w-2.5', meta.color)} />
                  </div>
                )}
                {stage.status === 'current' && (
                  <motion.div
                    className={cn('absolute inset-0 rounded-full', meta.bg)}
                    animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-1 pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn('text-xs font-semibold uppercase tracking-wide', meta.color)}>
                    {stage.label}
                  </span>
                  <span className={cn(
                    'text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-full',
                    meta.bg, meta.color
                  )}>
                    {stage.status}
                  </span>
                  {stage.timestamp && (
                    <span className="text-[10px] text-muted-foreground tabular-nums">{stage.timestamp}</span>
                  )}
                </div>
                {stage.detail && (
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{stage.detail}</p>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
