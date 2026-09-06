'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

// Reusable animated confidence ring — a signature SkillPulse visual.
// Used in: Dashboard KPIs, Curriculum Mirror alignment score, Candidate readiness,
// Validation quorum progress, District coverage indicators.

interface ConfidenceRingProps {
  value: number // 0..100
  size?: number
  strokeWidth?: number
  label?: string
  sublabel?: string
  colorClass?: string // override color band
  showValue?: boolean
  className?: string
  delay?: number
}

function colorBand(v: number) {
  if (v >= 70) return { stroke: '#14b8a6', text: 'text-teal-600 dark:text-teal-400', label: 'Strong' } // teal
  if (v >= 40) return { stroke: '#f59e0b', text: 'text-amber-600 dark:text-amber-400', label: 'Developing' } // amber
  return { stroke: '#f43f5e', text: 'text-rose-600 dark:text-rose-400', label: 'At risk' } // rose
}

export function ConfidenceRing({
  value,
  size = 120,
  strokeWidth = 8,
  label,
  sublabel,
  colorClass,
  showValue = true,
  className,
  delay = 0,
}: ConfidenceRingProps) {
  const v = Math.max(0, Math.min(100, value))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (v / 100) * circumference
  const band = colorBand(v)
  const stroke = colorClass ?? band.stroke

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted-foreground/15"
        />
        {/* Animated progress */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, delay, ease: [0.32, 0.72, 0, 1] }}
        />
        {/* Glow dot at the end of the progress arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={strokeWidth / 2.5}
          fill={stroke}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 1, duration: 0.3 }}
          style={{
            transformOrigin: `${size / 2}px ${size / 2}px`,
            transform: `rotate(${(v / 100) * 360}deg) translateY(-${radius}px)`,
          }}
        />
      </svg>
      {showValue && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: delay + 0.4, type: 'spring', stiffness: 200 }}
            className={cn('font-bold tabular-nums leading-none', band.text)}
            style={{ fontSize: size * 0.22 }}
          >
            {Math.round(v)}
          </motion.span>
          {label && (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mt-0.5">{label}</span>
          )}
          {sublabel && (
            <span className={cn('text-[9px] font-medium', band.text)}>{sublabel}</span>
          )}
        </div>
      )}
    </div>
  )
}
