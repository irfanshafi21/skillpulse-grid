'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/skillpulse/i18n'
import {
  BUCKETS,
  PRIORITY_COLORS,
  TREND_COLORS,
  VALIDATION_BADGE,
  ACTION_STATUS_COLORS,
  type Bucket,
  type TrendLabel,
  type ValidationState,
} from '@/lib/skillpulse/types'

export function BucketBadge({ bucket, className }: { bucket: Bucket; className?: string }) {
  const { t } = useI18n()
  const meta = BUCKETS[bucket]
  const label = (t.buckets as any)[bucket] ?? meta.label
  return (
    <Badge variant="outline" className={cn('border gap-1.5 font-medium', meta.color, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
      {label}
    </Badge>
  )
}

export function TrendBadge({ trend }: { trend: TrendLabel }) {
  const { t } = useI18n()
  const label = (t.trends as any)[trend] ?? trend
  return <span className={cn('text-xs font-semibold', TREND_COLORS[trend])}>{label}</span>
}

export function ValidationBadge({ state }: { state: ValidationState }) {
  const { t } = useI18n()
  const meta = VALIDATION_BADGE[state]
  const label = (t.validationStates as any)[state] ?? meta.label
  return (
    <Badge variant="outline" className={cn('border font-medium', meta.color, 'rounded-full')}>
      {label}
    </Badge>
  )
}

export function PriorityBadge({ band }: { band: string }) {
  const cls = PRIORITY_COLORS[band] ?? PRIORITY_COLORS.P3
  return (
    <Badge variant="outline" className={cn('border font-semibold', cls)}>{band}</Badge>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n()
  const cls = ACTION_STATUS_COLORS[status] ?? ACTION_STATUS_COLORS.Proposed
  // Try to translate the status (Proposed/Accepted/Rejected/InProgress/Completed)
  const key = status === 'InProgress' ? 'inProgress' : status.charAt(0).toLowerCase() + status.slice(1)
  const label = (t.actions as any)[key] ?? status
  return (
    <Badge variant="outline" className={cn('border', cls)}>{label}</Badge>
  )
}
