'use client'

import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

// ─── Shared Framer Motion variants ──────────────────────────────────────────

export const fadeVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
  exit: { opacity: 0 },
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 280, damping: 28, mass: 0.6 },
  },
  exit: { opacity: 0, y: -8 },
}

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 25 },
  },
}

// ─── Page transition wrapper ────────────────────────────────────────────────

export function PageTransition({ children, k }: { children: React.ReactNode; k: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={k}
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={fadeVariants}
        transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Motion card wrapper with hover lift ─────────────────────────────────────

export function MotionCard({
  children,
  className,
  delay = 0,
  hover = true,
  onClick,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  hover?: boolean
  onClick?: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.32, 0.72, 0, 1] }}
      whileHover={hover ? { y: -2, transition: { duration: 0.18 } } : undefined}
      className={cn(className)}
      onClick={onClick}
    >
      {children}
    </motion.div>
  )
}

// ─── Animated number count-up ─────────────────────────────────────────────────

export function CountUp({
  value,
  duration = 0.9,
  className,
  suffix = '',
  delay = 0,
}: {
  value: number
  duration?: number
  className?: string
  suffix?: string
  delay?: number
}) {
  const [display, setDisplay] = useState(0)
  const prevRef = useRef(0)
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) {
      // animate from previous value to new value
      const start = prevRef.current
      const delta = value - start
      if (delta === 0) return
      const startTime = performance.now() + delay * 1000
      let raf = 0
      const tick = (now: number) => {
        if (now < startTime) {
          raf = requestAnimationFrame(tick)
          return
        }
        const t = Math.min(1, (now - startTime) / (duration * 1000))
        const eased = 1 - Math.pow(1 - t, 3) // ease-out cubic
        setDisplay(Math.round(start + delta * eased))
        if (t < 1) raf = requestAnimationFrame(tick)
        else prevRef.current = value
      }
      raf = requestAnimationFrame(tick)
      return () => cancelAnimationFrame(raf)
    }
    // First render — schedule the count-up
    startedRef.current = true
    const startTime = performance.now() + delay * 1000
    let raf = 0
    const startVal = 0
    const delta = value - startVal
    const tick = (now: number) => {
      if (now < startTime) {
        raf = requestAnimationFrame(tick)
        return
      }
      const t = Math.min(1, (now - startTime) / (duration * 1000))
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(startVal + delta * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
      else prevRef.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration, delay])

  return (
    <span className={cn('tabular-nums', className)}>
      {display.toLocaleString()}
      {suffix}
    </span>
  )
}

// ─── Animated progress bar that fills on mount ────────────────────────────────

export function AnimatedBar({
  value,
  className,
  delay = 0,
  colorClass,
}: {
  value: number
  className?: string
  delay?: number
  colorClass?: string
}) {
  return (
    <div className={cn('relative w-full overflow-hidden rounded-full bg-muted', className)}>
      <motion.div
        className={cn('h-full rounded-full', colorClass ?? 'bg-primary')}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ duration: 0.9, delay, ease: [0.32, 0.72, 0, 1] }}
      />
    </div>
  )
}

// ─── Stagger container ───────────────────────────────────────────────────────

export function Stagger({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: 0.05, delayChildren: delay },
        },
      }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div
      className={className}
      variants={staggerItem}
    >
      {children}
    </motion.div>
  )
}
