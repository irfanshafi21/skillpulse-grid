'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip'
import { Slider } from '@/components/ui/slider'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RTooltip,
} from 'recharts'
import {
  Radar,
  Search,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MapPin,
  Briefcase,
  Activity,
  Building2,
  FileText,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Minus,
  Layers,
  Clock,
  Target,
  ListChecks,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFetch } from '@/lib/skillpulse/useFetch'
import { ValidationBadge, TrendBadge } from '@/components/skillpulse/badges'
import { EvidenceDrawer } from '@/components/skillpulse/evidence-drawer'
import type { TrendLabel, ValidationState } from '@/lib/skillpulse/types'
import { useI18n } from '@/lib/skillpulse/i18n'
import { motion } from 'framer-motion'
import {
  Stagger,
  StaggerItem,
  CountUp,
  AnimatedBar,
  fadeVariants,
  staggerContainer,
} from '@/lib/skillpulse/motion'

// ─── Types ────────────────────────────────────────────────────────────────

interface DemandSignalItem {
  id: string
  skillId: string
  skillLabel: string
  skillUri: string
  isEmerging: boolean
  isDeclining: boolean
  halfLifeYears: number | null
  occupation: string | null
  occupationId: string | null
  sector: string
  district: string | null
  districtId: string | null
  postingCount: number
  sourceCount: number
  trendSlope: number
  trendLabel: TrendLabel
  confidence: number
  validationState: ValidationState
  promotionScore: number | null
  periodStart: string
  periodEnd: string
}

interface DemandListResponse {
  count: number
  items: DemandSignalItem[]
}

type SortKey = 'postingCount' | 'confidence' | 'trendSlope'
type SortDir = 'asc' | 'desc'

// ─── Main component ───────────────────────────────────────────────────────

export function DemandObservatory() {
  const { t } = useI18n()
  const [q, setQ] = useState('')
  const [trendLabel, setTrendLabel] = useState<string>('all')
  const [validationState, setValidationState] = useState<string>('all')
  const [minConfidence, setMinConfidence] = useState(0)
  const [sortKey, setSortKey] = useState<SortKey>('postingCount')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [evidenceId, setEvidenceId] = useState<string | null>(null)

  // Debounce the search input lightly so we don't refetch on every keystroke
  const debouncedQ = useDebouncedValue(q, 250)

  const query = useMemo(() => {
    const p = new URLSearchParams()
    if (debouncedQ.trim()) p.set('q', debouncedQ.trim())
    if (trendLabel !== 'all') p.set('trendLabel', trendLabel)
    if (validationState !== 'all') p.set('validationState', validationState)
    p.set('minConfidence', String(minConfidence / 100))
    p.set('limit', '200')
    return p.toString()
  }, [debouncedQ, trendLabel, validationState, minConfidence])

  const url = `/api/demand?${query}`
  const { data, loading, error } = useFetch<DemandListResponse>(url, [query])

  const sortedItems = useMemo(() => {
    if (!data?.items) return []
    const arr = [...data.items]
    arr.sort((a, b) => {
      const av = a[sortKey] ?? 0
      const bv = b[sortKey] ?? 0
      return sortDir === 'asc' ? av - bv : bv - av
    })
    return arr
  }, [data, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  function exportCSV() {
    if (!sortedItems.length) return
    const headers = [
      'id',
      'skillLabel',
      'skillUri',
      'occupation',
      'district',
      'sector',
      'postingCount',
      'sourceCount',
      'trendSlope',
      'trendLabel',
      'confidence',
      'validationState',
      'promotionScore',
      'periodStart',
      'periodEnd',
    ]
    const rows = sortedItems.map((it) => [
      it.id,
      it.skillLabel,
      it.skillUri,
      it.occupation ?? '',
      it.district ?? '',
      it.sector,
      String(it.postingCount),
      String(it.sourceCount),
      String(it.trendSlope),
      it.trendLabel,
      String(it.confidence),
      it.validationState,
      it.promotionScore != null ? String(it.promotionScore) : '',
      it.periodStart,
      it.periodEnd,
    ])
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const u = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = u
    a.download = `skillpulse-demand-observatory-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(u)
  }

  return (
    <TooltipProvider>
      <div className="space-y-8">
        {/* Heading */}
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shadow-soft">
                <Radar className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">
                <span className="text-gradient">{t.observatory.title}</span>
              </h1>
            </div>
            <Badge
              variant="outline"
              className="gap-1.5 border-primary/30 text-primary font-medium"
            >
              <Clock className="h-3 w-3" /> Last 18 months
            </Badge>
            <Badge
              variant="outline"
              className="gap-1.5 border-border/60 text-muted-foreground font-medium"
            >
              <Layers className="h-3 w-3" /> IT-ITeS sector
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
            {t.observatory.desc}
          </p>
        </div>

        {/* Filters bar (scrolls with page) */}
        <Card className="glass shadow-soft rounded-xl border border-border/60 border-primary/20">
          <CardContent className="p-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {/* Search */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Skill search
                </label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={t.observatory.searchPlaceholder}
                    className="pl-8 h-9 text-sm"
                    aria-label={t.observatory.searchPlaceholder}
                  />
                </div>
              </div>

              {/* Trend */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Trend label
                </label>
                <Select value={trendLabel} onValueChange={setTrendLabel}>
                  <SelectTrigger className="h-9 w-full text-sm">
                    <SelectValue placeholder={t.observatory.allTrends} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.observatory.allTrends}</SelectItem>
                    <SelectItem value="Emerging">{(t.trends as any).Emerging}</SelectItem>
                    <SelectItem value="Stable">{(t.trends as any).Stable}</SelectItem>
                    <SelectItem value="Declining">{(t.trends as any).Declining}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Validation state */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Validation state
                </label>
                <Select
                  value={validationState}
                  onValueChange={setValidationState}
                >
                  <SelectTrigger className="h-9 w-full text-sm">
                    <SelectValue placeholder={t.observatory.allStates} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.observatory.allStates}</SelectItem>
                    <SelectItem value="Detected">{(t.validationStates as any).Detected}</SelectItem>
                    <SelectItem value="Pending">{(t.validationStates as any).Pending}</SelectItem>
                    <SelectItem value="Validated">{(t.validationStates as any).Validated}</SelectItem>
                    <SelectItem value="Rejected">{(t.validationStates as any).Rejected}</SelectItem>
                    <SelectItem value="NeedsReview">{(t.validationStates as any).NeedsReview}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Confidence slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                    {t.observatory.minConfidence}
                  </label>
                  <Badge
                    variant="outline"
                    className="text-xs tabular-nums font-bold bg-primary/15 text-primary border-primary/30 gap-1 px-2 py-0.5 rounded-full"
                  >
                    <Target className="h-3 w-3" />
                    {minConfidence}%
                  </Badge>
                </div>
                <div className="h-10 flex items-center rounded-md border border-input bg-background px-3 hover:border-primary/40 transition-colors">
                  <Slider
                    value={[minConfidence]}
                    onValueChange={(v) => setMinConfidence(v[0])}
                    min={0}
                    max={100}
                    step={5}
                    aria-label="Minimum confidence threshold"
                  />
                </div>
              </div>
            </div>

            {/* Sort + actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1 mr-1">
                  <ArrowUpDown className="h-3.5 w-3.5" /> Sort
                </span>
                <SortButton
                  active={sortKey === 'postingCount'}
                  dir={sortKey === 'postingCount' ? sortDir : undefined}
                  onClick={() => toggleSort('postingCount')}
                >
                  {t.observatory.postingCount}
                </SortButton>
                <SortButton
                  active={sortKey === 'confidence'}
                  dir={sortKey === 'confidence' ? sortDir : undefined}
                  onClick={() => toggleSort('confidence')}
                >
                  {t.observatory.confidence}
                </SortButton>
                <SortButton
                  active={sortKey === 'trendSlope'}
                  dir={sortKey === 'trendSlope' ? sortDir : undefined}
                  onClick={() => toggleSort('trendSlope')}
                >
                  {t.observatory.trendSlope}
                </SortButton>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs tabular-nums">
                  {data?.count ?? 0} signal{(data?.count ?? 0) === 1 ? '' : 's'}
                </Badge>
                <Button
                  size="sm"
                  className="text-xs h-8 bg-primary text-primary-foreground shadow-soft hover:shadow-soft-lg hover:bg-primary/90 transition-shadow duration-300"
                  onClick={exportCSV}
                  disabled={!sortedItems.length}
                >
                  <Download className="h-3.5 w-3.5 mr-1" />
                  {t.observatory.exportReport}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Body */}
        {error && (
          <Card className="border border-rose-500/30 shadow-soft">
            <CardContent className="p-4 text-sm text-rose-600 dark:text-rose-400">
              Failed to load signals: {error}
            </CardContent>
          </Card>
        )}

        {loading && <ObservatorySkeleton />}

        {!loading && !error && sortedItems.length === 0 && (
          <Card className="border border-border/60 shadow-soft">
            <CardContent className="p-10 text-center text-sm text-muted-foreground space-y-2">
              <Radar className="h-8 w-8 mx-auto opacity-30" />
              <p>No signals match the current filters.</p>
              <p className="text-xs">
                Try lowering the confidence threshold or clearing the trend / validation filters.
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && !error && sortedItems.length > 0 && (
          <Stagger className="grid gap-4 lg:grid-cols-2 items-stretch">
            {sortedItems.map((s) => (
              <StaggerItem key={s.id} className="h-full">
                <motion.div
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
                  className="h-full"
                >
                  <SignalCard
                    signal={s}
                    onClick={() => setSelectedId(s.id)}
                    onEvidence={() => setEvidenceId(s.id)}
                  />
                </motion.div>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>

      {/* Detail Sheet */}
      <DemandDetailDrawer
        signalId={selectedId}
        onClose={() => setSelectedId(null)}
        onEvidence={(id) => setEvidenceId(id)}
      />

      {/* Evidence Drawer */}
      <EvidenceDrawer
        evidenceId={evidenceId}
        onClose={() => setEvidenceId(null)}
      />
    </TooltipProvider>
  )
}

// ─── Debounce hook ───────────────────────────────────────────────────────

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(t)
  }, [value, delayMs])
  return debounced
}

// ─── Sort button ──────────────────────────────────────────────────────────

function SortButton({
  active,
  dir,
  onClick,
  children,
}: {
  active: boolean
  dir?: SortDir
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Button
      variant={active ? 'default' : 'outline'}
      size="sm"
      className={cn(
        'h-7 text-xs transition-all duration-200',
        active
          ? 'bg-primary hover:bg-primary/90 shadow-soft'
          : 'hover:bg-muted hover:border-primary/40'
      )}
      onClick={onClick}
    >
      {children}
      {active &&
        (dir === 'asc' ? (
          <ArrowUp className="h-3 w-3 ml-1" />
        ) : (
          <ArrowDown className="h-3 w-3 ml-1" />
        ))}
    </Button>
  )
}

// ─── Signal card ──────────────────────────────────────────────────────────

function SignalCard({
  signal,
  onClick,
  onEvidence,
}: {
  signal: DemandSignalItem
  onClick: () => void
  onEvidence: () => void
}) {
  const { t } = useI18n()
  const conf = Math.round(signal.confidence * 100)
  const TrendIcon =
    signal.trendLabel === 'Emerging'
      ? TrendingUp
      : signal.trendLabel === 'Declining'
        ? TrendingDown
        : Minus
  const trendColor =
    signal.trendLabel === 'Emerging'
      ? 'text-amber-500'
      : signal.trendLabel === 'Declining'
        ? 'text-rose-500'
        : 'text-teal-500'

  return (
    <Card
      className="cursor-pointer hover:border-primary/40 border border-border/60 shadow-soft hover:shadow-soft-lg transition-all duration-300 group h-full gap-4"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <CardHeader className="pb-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <span className="truncate">{signal.skillLabel}</span>
              {signal.isEmerging && (
                <Badge
                  variant="outline"
                  className="text-[9px] py-0 px-1 border-amber-500/30 text-amber-700 dark:text-amber-300 flex-shrink-0"
                >
                  Emerging
                </Badge>
              )}
              {signal.isDeclining && (
                <Badge
                  variant="outline"
                  className="text-[9px] py-0 px-1 border-slate-500/30 text-slate-700 dark:text-slate-300 flex-shrink-0"
                >
                  Declining
                </Badge>
              )}
            </CardTitle>
            <code className="text-[10px] text-muted-foreground block truncate">
              {signal.skillUri}
            </code>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <TrendIcon className={cn('h-3.5 w-3.5', trendColor)} />
            <TrendBadge trend={signal.trendLabel} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 flex-1">
        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground/70 mt-0.5">
          <span className="inline-flex items-center gap-1 min-w-0">
            <Briefcase className="h-3 w-3 flex-shrink-0" />
            <span className="truncate max-w-[160px]">
              {signal.occupation ?? '—'}
            </span>
          </span>
          <span className="inline-flex items-center gap-1 min-w-0">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate max-w-[140px]">
              {signal.district ?? 'National'}
            </span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Layers className="h-3 w-3 flex-shrink-0" />
            {signal.sector}
          </span>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 rounded-md border border-border/60 bg-muted/20 divide-x divide-border/40 overflow-hidden">
          <Stat
            icon={FileText}
            label={t.observatory.postings}
            value={<CountUp value={signal.postingCount} duration={0.8} />}
          />
          <Stat
            icon={Building2}
            label={t.observatory.sources}
            value={<CountUp value={signal.sourceCount} duration={0.8} delay={0.05} />}
          />
          <Stat
            icon={Activity}
            label={t.observatory.slope}
            value={signal.trendSlope.toFixed(2)}
          />
        </div>

        {/* Confidence bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t.observatory.confidence}</span>
            <span className="font-semibold tabular-nums">{conf}%</span>
          </div>
          <AnimatedBar value={conf} className="h-1.5" delay={0.1} />
        </div>

        {/* Footer: validation + promotion + evidence button */}
        <div className="flex items-center justify-between gap-2 pt-1 flex-wrap mt-auto">
          <div className="flex items-center gap-1.5 flex-wrap">
            <ValidationBadge state={signal.validationState} />
            {signal.promotionScore != null && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="text-[10px] border-primary/30 text-primary cursor-help"
                  >
                    <Target className="h-3 w-3 mr-1" />
                    {signal.promotionScore.toFixed(2)}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  Promotion score — higher means stronger, more validated signal
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={(e) => {
              e.stopPropagation()
              onEvidence()
            }}
          >
            <ShieldCheck className="h-3.5 w-3.5 mr-1" /> {t.observatory.viewEvidence}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="px-2.5 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        <Icon className="h-3 w-3 flex-shrink-0" />
        {label}
      </div>
      <div className="text-sm font-semibold tabular-nums mt-0.5">{value}</div>
    </div>
  )
}

// ─── Detail drawer ─────────────────────────────────────────────────────────

function DemandDetailDrawer({
  signalId,
  onClose,
  onEvidence,
}: {
  signalId: string | null
  onClose: () => void
  onEvidence: (id: string) => void
}) {
  const { data, loading, error } = useFetch<any>(
    signalId ? `/api/demand/${signalId}` : null,
    [signalId]
  )

  return (
    <Sheet open={!!signalId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-hidden p-0 flex flex-col h-full">
        <SheetHeader className="px-6 pt-6 pb-3 border-b flex-shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="truncate">
              {loading
                ? 'Loading signal…'
                : data
                  ? data.skill?.label ?? 'Signal detail'
                  : 'Signal detail'}
            </span>
          </SheetTitle>
          <SheetDescription className="text-xs">
            {data
              ? `${data.skill?.uri ?? ''} · ${data.sector?.name ?? ''}${
                  data.district ? ' · ' + data.district.name : ' · National'
                }`
              : 'Continuously-monitored labour-market demand signal.'}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 min-h-0 custom-scroll">
          <div className="px-6 py-4 space-y-8">
            {loading && <DetailSkeleton />}
            {error && (
              <div className="text-sm text-rose-600 dark:text-rose-400">
                Failed to load signal: {error}
              </div>
            )}
            {!loading && !error && data && (
              <DetailContent data={data} onEvidence={onEvidence} />
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

function DetailContent({
  data,
  onEvidence,
}: {
  data: any
  onEvidence: (id: string) => void
}) {
  const { t } = useI18n()
  const conf = Math.round((data.confidence ?? 0) * 100)
  const ts: { month: string; count: number }[] = data.timeSeries ?? []
  const postings: any[] = data.samplePostings ?? []
  const districts: any[] = data.contributingDistricts ?? []
  const occupations: any[] = data.linkedOccupations ?? []
  const validations: any[] = data.validationHistory ?? []
  const recs: any[] = data.recommendations ?? []

  return (
    <motion.div
      className="space-y-8"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      {/* Badges + meta */}
      <motion.div variants={fadeVariants} className="flex flex-wrap items-center gap-1.5">
        <TrendBadge trend={data.trendLabel} />
        <ValidationBadge state={data.validationState} />
        {data.skill?.isEmerging && (
          <Badge
            variant="outline"
            className="text-[10px] border-amber-500/30 text-amber-700 dark:text-amber-300"
          >
            Emerging
          </Badge>
        )}
        {data.skill?.isDeclining && (
          <Badge
            variant="outline"
            className="text-[10px] border-slate-500/30 text-slate-700 dark:text-slate-300"
          >
            Declining
          </Badge>
        )}
        {data.skill?.halfLifeYears != null && (
          <Badge variant="outline" className="text-[10px]">
            <Clock className="h-3 w-3 mr-1" /> Half-life{' '}
            {data.skill.halfLifeYears}y
          </Badge>
        )}
        {data.promotionScore != null && (
          <Badge
            variant="outline"
            className="text-[10px] border-primary/30 text-primary"
          >
            <Target className="h-3 w-3 mr-1" /> Promotion{' '}
            {Number(data.promotionScore).toFixed(2)}
          </Badge>
        )}
      </motion.div>

      {/* Stats */}
      <motion.div variants={fadeVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <DetailStat
          icon={FileText}
          label={t.observatory.postings}
          value={<CountUp value={Number(data.postingCount ?? 0)} duration={0.8} />}
        />
        <DetailStat
          icon={Building2}
          label="Source orgs"
          value={<CountUp value={Number(data.sourceCount ?? 0)} duration={0.8} delay={0.05} />}
        />
        <DetailStat
          icon={Activity}
          label={t.observatory.trendSlope}
          value={Number(data.trendSlope).toFixed(2)}
        />
        <DetailStat icon={Target} label={t.observatory.confidence} value={`${conf}%`} />
      </motion.div>

      {/* Confidence bar + period */}
      <motion.div variants={fadeVariants} className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Confidence score</span>
          <span className="font-semibold tabular-nums">{conf}%</span>
        </div>
        <AnimatedBar value={conf} className="h-1.5" delay={0.15} />
        <div className="text-[10px] text-muted-foreground">
          Window:{' '}
          {new Date(data.periodStart).toLocaleDateString()} →{' '}
          {new Date(data.periodEnd).toLocaleDateString()}
        </div>
      </motion.div>

      {/* Time series chart */}
      <motion.div variants={fadeVariants}>
        <Card className="border border-border/60 shadow-soft hover:shadow-soft-lg transition-shadow duration-300">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Demand time series
            </CardTitle>
            <CardDescription className="text-xs">
              Monthly posting counts that feed this signal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ts.length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center">
                No time-series data available.
              </p>
            ) : (
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={ts}
                    margin={{ top: 5, right: 8, left: -10, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 10 }}
                      stroke="var(--muted-foreground)"
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 10 }}
                      stroke="var(--muted-foreground)"
                    />
                    <RTooltip
                      contentStyle={{
                        background: 'var(--popover)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: 'var(--popover-foreground)',
                      }}
                      labelStyle={{ color: 'var(--muted-foreground)' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="var(--primary)"
                      strokeWidth={2}
                      dot={{ r: 3, fill: 'var(--primary)' }}
                      activeDot={{ r: 5 }}
                      name="Postings"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Sample postings */}
      <motion.div variants={fadeVariants}>
        <DetailSection
          icon={FileText}
          title={t.observatory.samplePostings}
          hint={`${postings.length} shown`}
        >
          {postings.length === 0 ? (
            <Empty />
          ) : (
            <div className="space-y-1.5 max-h-96 overflow-y-auto custom-scroll pr-1">
              {postings.map((p) => (
                <div
                  key={p.id}
                  className="rounded-md border border-border/60 bg-card p-2.5 text-xs hover:bg-muted/40 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <span className="font-medium truncate">{p.title}</span>
                    <span className="text-muted-foreground text-[10px] flex-shrink-0">
                      {new Date(p.postedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {p.employer ?? '—'}
                    </span>
                    <span className="text-[10px]">
                      conf {Math.round((p.confidence ?? 0) * 100)}%
                    </span>
                    {p.isDuplicate && (
                      <Badge
                        variant="outline"
                        className="text-[10px] py-0 px-1"
                      >
                        DUPLICATE
                      </Badge>
                    )}
                    {p.isNoisy && (
                      <Badge
                        variant="outline"
                        className="text-[10px] py-0 px-1"
                      >
                        NOISY
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DetailSection>
      </motion.div>

      {/* Contributing districts */}
      <motion.div variants={fadeVariants}>
        <DetailSection
          icon={MapPin}
          title={t.observatory.contributingDistricts}
          hint={`${districts.length} related signals`}
        >
          {districts.length === 0 ? (
            <Empty />
          ) : (
            <div className="space-y-1.5 max-h-96 overflow-y-auto custom-scroll pr-1">
              {districts.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-md border border-border/60 bg-card p-2 text-xs hover:bg-muted/40 hover:border-primary/30 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">
                      {d.name ?? 'National'}
                    </div>
                    {d.lgdCode && (
                      <div className="text-[10px] text-muted-foreground">
                        LGD {d.lgdCode}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <div className="font-semibold tabular-nums">
                        {d.postingCount}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        postings
                      </div>
                    </div>
                    <div className="text-right w-16">
                      <div className="font-semibold tabular-nums text-primary">
                        {Math.round((d.confidence ?? 0) * 100)}%
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        conf
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DetailSection>
      </motion.div>

      {/* Linked occupations */}
      <motion.div variants={fadeVariants}>
        <DetailSection
          icon={Briefcase}
          title={t.observatory.linkedOccupations}
          hint={`${occupations.length}`}
        >
          {occupations.length === 0 ? (
            <Empty />
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {occupations.map((o) => (
                <Badge
                  key={o.id}
                  variant="outline"
                  className="text-xs border-primary/30"
                >
                  <Briefcase className="h-3 w-3 mr-1" />
                  {o.label}
                  {o.code && (
                    <span className="ml-1 text-[10px] text-muted-foreground">
                      · {o.code}
                    </span>
                  )}
                </Badge>
              ))}
            </div>
          )}
        </DetailSection>
      </motion.div>

      {/* Validation history */}
      <motion.div variants={fadeVariants}>
        <DetailSection
          icon={ShieldCheck}
          title={t.observatory.validationHistory}
          hint={`${validations.length} responses`}
        >
          {validations.length === 0 ? (
            <Empty message="No employer validations recorded yet." />
          ) : (
            <div className="space-y-1.5 max-h-96 overflow-y-auto custom-scroll pr-1">
              {validations.map((v) => (
                <div
                  key={v.id}
                  className="rounded-md border border-border/60 bg-card p-2.5 text-xs hover:bg-muted/40 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <span className="font-medium truncate">
                      {v.employer ?? '—'}
                    </span>
                    <span className="text-muted-foreground text-[10px] flex-shrink-0">
                      {new Date(v.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {v.responseType === 'Confirm' && (
                      <ThumbsUp className="h-3 w-3 text-teal-500" />
                    )}
                    {v.responseType === 'Reject' && (
                      <ThumbsDown className="h-3 w-3 text-rose-500" />
                    )}
                    {v.responseType === 'Qualify' && (
                      <HelpCircle className="h-3 w-3 text-amber-500" />
                    )}
                    <span className="text-xs font-medium">
                      {v.responseType}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      weight {v.weight}
                    </span>
                    {v.reasonCode && (
                      <Badge
                        variant="outline"
                        className="text-[10px] py-0 px-1"
                      >
                        {v.reasonCode}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DetailSection>
      </motion.div>

      {/* Recommendations fed by this signal */}
      <motion.div variants={fadeVariants}>
        <DetailSection
          icon={ListChecks}
          title="Recommendations fed by this signal"
          hint={`${recs.length}`}
        >
          {recs.length === 0 ? (
            <Empty message="No curriculum recommendations are currently linked to this signal." />
          ) : (
            <div className="space-y-1.5">
              {recs.map((r) => (
                <div
                  key={r.id}
                  className="rounded-md border border-border/60 bg-card p-2.5 text-xs flex items-center justify-between gap-2 hover:bg-muted/40 hover:border-primary/30 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">
                      {r.course}{' '}
                      <span className="text-[10px] text-muted-foreground">
                        ({r.courseCode})
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {r.actionType} · {r.bucket}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] flex-shrink-0"
                  >
                    {r.priorityBand}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </DetailSection>
      </motion.div>

      {/* Open evidence button */}
      <motion.div variants={fadeVariants}>
        <Button
          variant="default"
          className="w-full bg-primary text-primary-foreground shadow-soft hover:shadow-soft-lg hover:bg-primary/90 transition-shadow duration-300"
          onClick={() => onEvidence(data.id)}
        >
          <ShieldCheck className="h-4 w-4 mr-1.5" /> {t.observatory.openEvidence}
          <ExternalLink className="h-3.5 w-3.5 ml-1" />
        </Button>
      </motion.div>
    </motion.div>
  )
}

function DetailSection({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">{title}</h3>
        {hint && (
          <span className="text-xs text-muted-foreground ml-auto">
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

function DetailStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="rounded-md border border-border/60 bg-card p-2.5 shadow-soft">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        <Icon className="h-3 w-3 flex-shrink-0" />
        {label}
      </div>
      <div className="text-sm font-semibold tabular-nums mt-0.5">
        {value}
      </div>
    </div>
  )
}

function Empty({ message }: { message?: string }) {
  return (
    <p className="text-xs text-muted-foreground italic py-2">
      {message ?? 'No data available.'}
    </p>
  )
}

// ─── Skeletons ────────────────────────────────────────────────────────────

function ObservatorySkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2 items-stretch">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="border border-border/60 shadow-soft">
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
            <div className="grid grid-cols-3 gap-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
            <Skeleton className="h-1.5 w-full" />
            <div className="flex justify-between">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-7 w-28" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-20 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
      <Skeleton className="h-1.5 w-full" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  )
}
