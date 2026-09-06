'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

// Animated mini sparkline showing "demand velocity" — a signature visual that
// shows the trend slope of each top demanded skill, making the dashboard feel
// like a live trading terminal rather than a static report.

interface DemandVelocitySparklineProps {
  data: number[] // 7-12 points
  width?: number
  height?: number
  color?: string // override
  className?: string
  fill?: boolean
}

export function DemandVelocitySparkline({
  data,
  width = 80,
  height = 24,
  color,
  className,
  fill = true,
}: DemandVelocitySparklineProps) {
  if (!data || data.length < 2) return null

  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const stepX = width / (data.length - 1)

  const points = data.map((v, i) => {
    const x = i * stepX
    const y = height - ((v - min) / range) * (height - 4) - 2
    return [x, y]
  })

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`

  // Determine trend color
  const isUp = data[data.length - 1] >= data[0]
  const stroke = color ?? (isUp ? '#f59e0b' : '#64748b') // amber for up (emerging), slate for down (declining)
  const fillId = `spark-${Math.random().toString(36).slice(2, 8)}`

  return (
    <svg width={width} height={height} className={cn('overflow-visible', className)}>
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.25} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      {fill && (
        <motion.path
          d={areaPath}
          fill={`url(#${fillId})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        />
      )}
      <motion.path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.0, ease: [0.32, 0.72, 0, 1] }}
      />
      {/* End dot */}
      <motion.circle
        cx={points[points.length - 1][0]}
        cy={points[points.length - 1][1]}
        r={2}
        fill={stroke}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.9, type: 'spring', stiffness: 300 }}
      />
    </svg>
  )
}
