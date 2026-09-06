'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  History,
  Search,
  Download,
  ShieldAlert,
  Clock,
  User,
  Activity,
  ChevronDown,
  ChevronRight,
  FileJson,
  Database,
  Filter,
  ScrollText,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFetch } from '@/lib/skillpulse/useFetch'
import {
  Stagger,
  StaggerItem,
  CountUp,
} from '@/lib/skillpulse/motion'
import { useI18n } from '@/lib/skillpulse/i18n'

// ─── Types ────────────────────────────────────────────────────────────────

interface AuditEntry {
  id: string
  actor: string
  action: string
  entityType: string
  entityId: string
  payload: Record<string, unknown> | string | unknown
  createdAt: string
}

interface AuditResponse {
  count: number
  items: AuditEntry[]
}

// ─── Action palette ─────────────────────────────────────────────────────────
// Category rules:
//   signal.*            → teal
//   validation.promoted / *.promoted → teal
//   validation.rejected / *.rejected → rose
//   validation.* (other)             → amber
//   recommendation.accepted / .start / .complete → primary (teal)
//   recommendation.rejected           → rose
//   recommendation.* (other)          → primary
//   fallback                         → slate

type ActionTone = 'teal' | 'amber' | 'rose' | 'primary' | 'slate'

interface ToneMeta {
  badge: string
  dot: string
  bar: string
}

const TONE_META: Record<ActionTone, ToneMeta> = {
  teal: {
    badge:
      'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30 rounded-full',
    dot: 'bg-teal-500',
    bar: 'border-l-teal-500',
  },
  amber: {
    badge:
      'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 rounded-full',
    dot: 'bg-amber-500',
    bar: 'border-l-amber-500',
  },
  rose: {
    badge:
      'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 rounded-full',
    dot: 'bg-rose-500',
    bar: 'border-l-rose-500',
  },
  primary: {
    badge:
      'bg-primary/10 text-primary border-primary/30 rounded-full',
    dot: 'bg-primary',
    bar: 'border-l-primary',
  },
  slate: {
    badge:
      'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30 rounded-full',
    dot: 'bg-slate-500',
    bar: 'border-l-slate-500',
  },
}

function toneForAction(action: string): ActionTone {
  const a = action.toLowerCase()
  if (a.endsWith('.rejected') || a.includes('rejected')) return 'rose'
  if (a.endsWith('.promoted') || a.includes('promoted')) return 'teal'
  if (a.endsWith('.accepted') || a.includes('accepted')) return 'teal'
  if (a.endsWith('.complete') || a.endsWith('.start')) return 'teal'
  if (a.startsWith('signal.')) return 'teal'
  if (a.startsWith('validation.')) return 'amber'
  if (a.startsWith('recommendation.')) return 'primary'
  if (a.startsWith('taxonomy.')) return 'primary'
  if (a.startsWith('admin.')) return 'amber'
  return 'slate'
}

function categoryLabel(action: string): string {
  const i = action.indexOf('.')
  return i === -1 ? 'system' : action.slice(0, i)
}

// ─── Filter option sets ─────────────────────────────────────────────────────

const ACTION_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All actions' },
  { value: 'signal.ingested', label: 'signal.ingested' },
  { value: 'validation.promoted', label: 'validation.promoted' },
  { value: 'validation.rejected', label: 'validation.rejected' },
  { value: 'validation.confirm', label: 'validation.confirm' },
  { value: 'validation.qualify', label: 'validation.qualify' },
  { value: 'recommendation.accepted', label: 'recommendation.accepted' },
  { value: 'recommendation.rejected', label: 'recommendation.rejected' },
  { value: 'recommendation.start', label: 'recommendation.start' },
  { value: 'recommendation.complete', label: 'recommendation.complete' },
]

const ENTITY_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All entity types' },
  { value: 'Recommendation', label: 'Recommendation' },
  { value: 'ValidationRequest', label: 'ValidationRequest' },
  { value: 'DemandSignal', label: 'DemandSignal' },
]

const LIMIT_OPTIONS = [
  { value: '50', label: '50' },
  { value: '100', label: '100' },
  { value: '200', label: '200 (max)' },
]

// ─── Small helpers ──────────────────────────────────────────────────────────

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function relativeTime(iso: string): string {
  const d = new Date(iso).getTime()
  if (Number.isNaN(d)) return ''
  const diff = Date.now() - d
  if (diff < 0) return 'just now'
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24)
  if (days < 30) return `${days}d ago`
  return formatTimestamp(iso)
}

function payloadToString(p: unknown): string {
  if (typeof p === 'string') return p
  try {
    return JSON.stringify(p, null, 2)
  } catch {
    return String(p ?? '')
  }
}

// CSV cell escaping per RFC 4180
function csvCell(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = typeof v === 'string' ? v : JSON.stringify(v)
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function buildCsv(entries: AuditEntry[]): string {
  const header = [
    'id',
    'createdAt',
    'actor',
    'action',
    'entityType',
    'entityId',
    'payload',
  ]
  const rows = entries.map((e) =>
    [
      csvCell(e.id),
      csvCell(e.createdAt),
      csvCell(e.actor),
      csvCell(e.action),
      csvCell(e.entityType),
      csvCell(e.entityId),
      csvCell(
        typeof e.payload === 'string' ? e.payload : JSON.stringify(e.payload),
      ),
    ].join(','),
  )
  return [header.join(','), ...rows].join('\n')
}

function exportCsv(entries: AuditEntry[]) {
  if (entries.length === 0) return
  const csv = buildCsv(entries)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `skillpulse-audit-trail-${stamp}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function ActionBadge({ action }: { action: string }) {
  const tone = toneForAction(action)
  const meta = TONE_META[tone]
  return (
    <Badge
      variant="outline"
      className={cn(
        'font-mono text-[11px] py-0 px-2 gap-1.5 whitespace-nowrap',
        meta.badge,
      )}
    >
      <span className={cn('inline-block size-1.5 rounded-full', meta.dot)} />
      {action}
    </Badge>
  )
}

function EntityTypeChip({ entityType }: { entityType: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      <Database className="size-3" />
      {entityType}
    </span>
  )
}

function EntrySkeletonRow() {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-3 rounded-full" />
        </div>
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="mt-3 h-4 w-full" />
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────

export function AuditTrail() {
  const { t } = useI18n()
  const [actorQuery, setActorQuery] = useState('')
  const [debouncedActor, setDebouncedActor] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [entityFilter, setEntityFilter] = useState<string>('all')
  const [limit, setLimit] = useState<string>('200')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Debounce actor search so we don't refilter on every keystroke feel janky
  useEffect(() => {
    const t = setTimeout(() => setDebouncedActor(actorQuery.trim()), 200)
    return () => clearTimeout(t)
  }, [actorQuery])

  // Build the API URL — note the actor filter is client-side (API does not
  // support an actor query parameter), so we fetch up to `limit` rows and
  // filter the displayed list locally.
  const apiUrl = useMemo(() => {
    const params = new URLSearchParams()
    params.set('limit', limit)
    if (actionFilter !== 'all') params.set('action', actionFilter)
    if (entityFilter !== 'all') params.set('entityType', entityFilter)
    return `/api/audit?${params.toString()}`
  }, [actionFilter, entityFilter, limit])

  const { data, error, loading } = useFetch<AuditResponse>(apiUrl, [
    actionFilter,
    entityFilter,
    limit,
  ])

  // Client-side actor filter + dedupe safety (API already returns desc).
  const visibleEntries = useMemo<AuditEntry[]>(() => {
    if (!data?.items) return []
    const q = debouncedActor.toLowerCase()
    if (!q) return data.items
    return data.items.filter((it) => it.actor.toLowerCase().includes(q))
  }, [data, debouncedActor])

  // Total returned by the API (before actor filter), used for the count badge.
  const serverCount = data?.count ?? 0
  const visibleCount = visibleEntries.length

  // Distinct actions actually present (so the dropdown reflects reality).
  const observedActions = useMemo(() => {
    const set = new Set<string>()
    for (const it of data?.items ?? []) set.add(it.action)
    return Array.from(set).sort()
  }, [data])

  return (
    <div className="space-y-8">
      {/* Heading */}
      <header className="relative overflow-hidden flex flex-col gap-1 rounded-xl">
        {/* Decorative gradient orbs */}
        <div className="absolute -top-12 -right-10 h-44 w-44 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        <div className="absolute -top-4 -left-10 h-32 w-32 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 right-24 h-24 w-24 rounded-full bg-fuchsia-400/10 blur-3xl pointer-events-none" />

        <div className="relative flex items-center gap-2">
          <span className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shadow-soft">
            <History className="size-5 text-primary" />
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            <span className="text-gradient">{(t.audit as any)?.title ?? 'Audit Trail'}</span>
          </h1>
        </div>
        <p className="relative text-sm text-muted-foreground mt-1.5">
          {(t.audit as any)?.subtitle ?? 'Append-only record of every system action — immutable and exportable.'}
        </p>
      </header>

      {/* Banner */}
      <Card className="border border-primary/20 bg-primary/5 shadow-soft">
        <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-4 text-primary animate-soft-pulse" />
            <span className="font-semibold text-sm text-primary">
              {(t.audit as any)?.banner ?? 'Append-only · immutable · exportable'}
            </span>
          </div>
          <Separator
            orientation="vertical"
            className="hidden sm:block h-4"
          />
          <span className="text-xs text-muted-foreground">
            Every validation event, recommendation state change, taxonomy update
            and admin action is recorded here permanently.
          </span>
        </CardContent>
      </Card>

      {/* Filters bar */}
      <Card className="glass rounded-xl border border-border/60 shadow-soft hover:shadow-soft-lg transition-shadow duration-300">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="size-4 text-primary" /> Filters
          </CardTitle>
          <CardDescription className="text-xs">
            Search by actor, filter by action or entity type, then export the
            resulting set to CSV.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Actor search */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">
                {(t.audit as any)?.actor ?? 'Actor'}
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={actorQuery}
                  onChange={(e) => setActorQuery(e.target.value)}
                  placeholder="Search actor (e.g. system, employer:*)"
                  className="pl-8 h-9"
                  aria-label="Filter by actor"
                />
              </div>
            </div>

            {/* Action filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">
                Action
              </label>
              <Select
                value={actionFilter}
                onValueChange={(v) => setActionFilter(v)}
              >
                <SelectTrigger className="w-full" aria-label="Filter by action">
                  <SelectValue placeholder={(t.audit as any)?.allActions ?? 'All actions'} />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_OPTIONS.map((o) => (
                    <SelectItem
                      key={o.value}
                      value={o.value}
                      className="font-mono"
                    >
                      {o.value === 'all' ? ((t.audit as any)?.allActions ?? 'All actions') : o.label}
                    </SelectItem>
                  ))}
                  {observedActions
                    .filter((a) => !ACTION_OPTIONS.some((o) => o.value === a))
                    .map((a) => (
                      <SelectItem
                        key={a}
                        value={a}
                        className="font-mono"
                      >
                        {a}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Entity type filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">
                {(t.audit as any)?.entityType ?? 'Entity type'}
              </label>
              <Select
                value={entityFilter}
                onValueChange={(v) => setEntityFilter(v)}
              >
                <SelectTrigger
                  className="w-full"
                  aria-label="Filter by entity type"
                >
                  <SelectValue placeholder={(t.audit as any)?.allEntityTypes ?? 'All entity types'} />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.value === 'all' ? ((t.audit as any)?.allEntityTypes ?? 'All entity types') : o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Limit */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">
                {(t.audit as any)?.resultLimit ?? 'Result limit'}
              </label>
              <Select value={limit} onValueChange={(v) => setLimit(v)}>
                <SelectTrigger className="w-full" aria-label="Result limit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LIMIT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Activity className="size-3.5" />
              <span>
                Showing{' '}
                <span className="font-semibold tabular-nums text-foreground">
                  <CountUp value={visibleCount} />
                </span>
                {debouncedActor ? ' (filtered)' : ''}
                {' of '}
                <span className="font-semibold tabular-nums text-foreground">
                  <CountUp value={serverCount} />
                </span>{' '}
                entries
              </span>
            </div>
            <Button
              size="sm"
              onClick={() => exportCsv(visibleEntries)}
              disabled={visibleEntries.length === 0}
              className="gap-1.5 bg-primary text-primary-foreground shadow-soft hover:bg-primary/90 hover:shadow-soft-lg transition-shadow duration-300"
            >
              <Download className="size-4" />
              {(t.audit as any)?.exportCsv ?? 'Export CSV'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error state */}
      {error && (
        <Card className="border-rose-500/40 bg-rose-500/[0.05] shadow-soft">
          <CardContent className="flex items-start gap-3 py-3">
            <AlertCircle className="size-4 mt-0.5 text-rose-600 dark:text-rose-400" />
            <div className="text-sm">
              <p className="font-medium text-rose-700 dark:text-rose-300">
                Failed to load audit log
              </p>
              <p className="text-xs text-muted-foreground font-mono break-all">
                {error}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List */}
      <Card className="border border-border/60 shadow-soft hover:shadow-soft-lg transition-shadow duration-300">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between gap-2 text-base">
            <span className="flex items-center gap-2">
              <ScrollText className="size-4 text-primary" />
              Entries
            </span>
            <span className="text-xs font-normal text-muted-foreground">
              Newest first
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="max-h-[700px] overflow-y-auto custom-scroll p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <EntrySkeletonRow key={i} />
              ))}
            </div>
          ) : visibleEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <History className="size-8 text-muted-foreground/50" />
              <p className="text-sm font-medium text-muted-foreground">
                No audit entries match the current filters.
              </p>
              <p className="text-xs text-muted-foreground">
                Adjust the filters above or increase the row limit.
              </p>
            </div>
          ) : (
            <Stagger className="max-h-[700px] overflow-y-auto custom-scroll p-4 space-y-3">
              {visibleEntries.map((entry) => {
                const isOpen = expandedId === entry.id
                const tone = toneForAction(entry.action)
                const toneMeta = TONE_META[tone]
                const payloadStr = payloadToString(entry.payload)
                const isStringPayload = typeof entry.payload === 'string'

                return (
                  <StaggerItem key={entry.id}>
                    <Collapsible
                      open={isOpen}
                      onOpenChange={(o) =>
                        setExpandedId(o ? entry.id : null)
                      }
                      asChild
                    >
                      <div
                        className={cn(
                          'group rounded-lg border border-border/60 bg-card p-4 shadow-soft transition-all duration-300',
                          'hover:border-primary/40 hover:bg-accent/30 hover:shadow-soft-lg',
                          isOpen && 'border-primary/40 shadow-soft-lg',
                        )}
                      >
                        {/* Header row */}
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex flex-wrap items-center gap-2">
                            <ActionBadge action={entry.action} />
                            <EntityTypeChip entityType={entry.entityType} />
                            <Badge
                              variant="secondary"
                              className="font-mono text-[10px] py-0 px-2 text-muted-foreground rounded-full"
                            >
                              {categoryLabel(entry.action)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-normal">
                            <Clock className="size-3.5" />
                            <span
                              className="tabular-nums"
                              title={formatTimestamp(entry.createdAt)}
                            >
                              {formatTimestamp(entry.createdAt)}
                            </span>
                            <span>
                              ({relativeTime(entry.createdAt)})
                            </span>
                          </div>
                        </div>

                        {/* Meta row */}
                        <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
                          <div className="flex items-center gap-1.5">
                            <User className="size-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">{(t.audit as any)?.actor ?? 'Actor'}</span>
                            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-medium text-foreground">
                              {entry.actor}
                            </code>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Database className="size-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">{(t.audit as any)?.entityType ?? 'Entity type'}</span>
                            <span className="font-medium text-foreground">
                              {entry.entityType}
                            </span>
                            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-medium text-foreground">
                              {entry.entityId || '—'}
                            </code>
                          </div>
                        </div>

                        {/* Trigger to expand JSON payload */}
                        <CollapsibleTrigger asChild>
                          <button
                            type="button"
                            className={cn(
                              'mt-2 flex w-full items-center gap-1.5 rounded-md border border-border/60 bg-muted/30 px-3 py-1.5 text-xs',
                              'transition-all hover:bg-muted/60 hover:border-primary/30',
                              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            )}
                            aria-expanded={isOpen}
                          >
                            {isOpen ? (
                              <ChevronDown className="size-3.5 text-primary transition-transform" />
                            ) : (
                              <ChevronRight className="size-3.5 text-primary transition-transform" />
                            )}
                            <FileJson className="size-3.5 text-primary" />
                            <span className="font-semibold text-foreground">
                              {(t.audit as any)?.payload ?? 'Payload'}
                            </span>
                            <span className="text-muted-foreground text-[10px]">
                              {isStringPayload ? '(string)' : '(JSON)'}
                            </span>
                            <span className="ml-auto flex items-center gap-1.5">
                              <span
                                className={cn(
                                  'inline-block size-1.5 rounded-full',
                                  toneMeta.dot,
                                )}
                              />
                              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                                {isOpen ? ((t.audit as any)?.collapse ?? 'Collapse') : ((t.audit as any)?.expand ?? 'Expand')}
                              </span>
                            </span>
                          </button>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <pre
                            className={cn(
                              'mt-2 max-h-80 overflow-auto custom-scroll rounded-md border border-border/50 border-l-2 bg-muted/50 p-3',
                              'text-xs leading-relaxed font-mono text-foreground',
                              toneMeta.bar,
                            )}
                          >
                            {payloadStr}
                          </pre>
                        </CollapsibleContent>

                        {/* Footer */}
                        <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                          <span className="font-mono">id: {entry.id}</span>
                          <span className="opacity-0 transition-opacity group-hover:opacity-100">
                            Immutable record
                          </span>
                        </div>
                      </div>
                    </Collapsible>
                  </StaggerItem>
                )
              })}
            </Stagger>
          )}
        </CardContent>
      </Card>

      {/* Footer note */}
      <p className="text-xs text-muted-foreground text-center pt-1">
        Audit entries are written by the system on every state-changing API
        call (validation, recommendation, taxonomy) and cannot be edited or
        deleted.
      </p>
    </div>
  )
}

export default AuditTrail
