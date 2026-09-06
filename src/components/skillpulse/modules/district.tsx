'use client'

import { useMemo, useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip'
import { motion } from 'framer-motion'
import {
  Map,
  MapPin,
  Building2,
  AlertTriangle,
  Flame,
  Layers,
  GraduationCap,
  Users,
  Gauge,
  TrendingUp,
  TrendingDown,
  Activity,
  ShieldCheck,
  Clock,
  ArrowRight,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFetch } from '@/lib/skillpulse/useFetch'
import { TrendBadge } from '@/components/skillpulse/badges'
import {
  CountUp,
  AnimatedBar,
  Stagger,
  StaggerItem,
  fadeVariants,
} from '@/lib/skillpulse/motion'
import { useI18n } from '@/lib/skillpulse/i18n'

// ─── Types ────────────────────────────────────────────────────────────────

interface TopSkill {
  id: string
  label: string
  uri: string
  postingCount: number
  isEmerging?: boolean
  isDeclining?: boolean
}

interface DistrictSummary {
  id: string
  lgdCode: string
  name: string
  state: string
  coverage: number // 0..1
  postingCount: number
  demandSignalCount: number
  totalPostings: number
  avgConfidence: number
  mismatch: number // 0..100
  topSkills: TopSkill[]
}

interface DistrictListResponse {
  districts: DistrictSummary[]
}

interface TopOccupation {
  id: string
  label: string
  code: string
  postingCount: number
  confidence: number
}

interface MissingSkill {
  id: string
  label: string
  uri: string
  postingCount: number
  isEmerging: boolean
  isDeclining: boolean
  trendLabel: 'Emerging' | 'Declining' | 'Stable'
}

interface LocalCourse {
  id: string
  code: string
  name: string
  durationMonths: number
  occupation: string | null
  moduleCount: number
  skillCount: number
}

interface DistrictDetail {
  district: {
    id: string
    lgdCode: string
    name: string
    state: string
    coverage: number
  }
  metrics: {
    postingCount: number
    demandSignalCount: number
    organizationCount: number
    courseCount: number
  }
  topOccupations: TopOccupation[]
  topMissingSkills: MissingSkill[]
  localCourses: LocalCourse[]
  coverageIndicator: {
    sourceOrganizations: number
    sourcesRequired: number
    sufficient: boolean
    coveragePct: number
  }
}

// ─── Mismatch severity helpers ─────────────────────────────────────────────

type Severity = 'low' | 'medium' | 'high'

function severityFor(mismatch: number): Severity {
  if (mismatch < 34) return 'low'
  if (mismatch < 67) return 'medium'
  return 'high'
}

const SEVERITY_META: Record<
  Severity,
  {
    label: string
    // Card surface tint + border + hover
    card: string
    // Coloured left border (border-l-4)
    borderL: string
    // Tag for the % chip
    chip: string
    // Dot
    dot: string
    // Legend swatch
    swatch: string
  }
> = {
  low: {
    label: 'Low',
    card: 'bg-teal-500/20 border-teal-500/40 hover:border-teal-500/60 hover:bg-teal-500/25',
    borderL: 'border-l-teal-500',
    chip: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30',
    dot: 'bg-teal-500',
    swatch: 'bg-teal-500',
  },
  medium: {
    label: 'Medium',
    card: 'bg-amber-500/20 border-amber-500/40 hover:border-amber-500/60 hover:bg-amber-500/25',
    borderL: 'border-l-amber-500',
    chip: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    dot: 'bg-amber-500',
    swatch: 'bg-amber-500',
  },
  high: {
    label: 'High',
    card: 'bg-rose-500/20 border-rose-500/40 hover:border-rose-500/60 hover:bg-rose-500/25',
    borderL: 'border-l-rose-500',
    chip: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
    dot: 'bg-rose-500',
    swatch: 'bg-rose-500',
  },
}

function confidenceLabel(c: number): string {
  if (c >= 0.75) return 'High'
  if (c >= 0.5) return 'Medium'
  return 'Low'
}

function confidenceColor(c: number): string {
  if (c >= 0.75) return 'text-teal-600 dark:text-teal-400'
  if (c >= 0.5) return 'text-amber-600 dark:text-amber-400'
  return 'text-rose-600 dark:text-rose-400'
}

// ─── Main component ───────────────────────────────────────────────────────

export function DistrictIntelligence({
  onOpenEvidence,
}: {
  onOpenEvidence?: (id: string) => void
}) {
  const { t } = useI18n()
  const { data, loading, error } = useFetch<DistrictListResponse>('/api/districts', [])
  const [openLgd, setOpenLgd] = useState<string | null>(null)

  const districts = data?.districts ?? []

  const summary = useMemo(() => {
    if (!districts.length) {
      return {
        total: 0,
        maxMismatch: null as DistrictSummary | null,
        avgCoverage: 0,
        lowestCoverage: null as DistrictSummary | null,
      }
    }
    const total = districts.length
    const avgCoverage =
      districts.reduce((acc, d) => acc + (d.coverage ?? 0), 0) / total
    const maxMismatch = [...districts].sort((a, b) => b.mismatch - a.mismatch)[0]
    const lowestCoverage = [...districts].sort(
      (a, b) => (a.coverage ?? 0) - (b.coverage ?? 0),
    )[0]
    return { total, maxMismatch, avgCoverage, lowestCoverage }
  }, [districts])

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-8">
        {/* Heading */}
        <div className="relative overflow-hidden">
          {/* Decorative gradient orbs */}
          <div className="absolute -top-12 -right-10 h-44 w-44 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
          <div className="absolute -top-4 -left-10 h-32 w-32 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 right-24 h-24 w-24 rounded-full bg-fuchsia-400/10 blur-3xl pointer-events-none" />

          <div className="relative flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shadow-soft">
                  <Map className="h-5 w-5 text-primary" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight">
                  <span className="text-gradient">{t.district.title}</span>
                </h1>
              </div>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
                {t.district.subtitle}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className="gap-1.5 border-primary/30 text-primary"
              >
                <Clock className="h-3 w-3" /> Last 18 months
              </Badge>
              <Badge variant="secondary" className="gap-1.5">
                <MapPin className="h-3 w-3" /> Maharashtra · 12 districts
              </Badge>
              <Badge variant="outline" className="gap-1.5 border-primary/30 text-primary">
                <Layers className="h-3 w-3" /> IT-ITeS sector
              </Badge>
            </div>
          </div>
        </div>

        {/* Top metrics row */}
        <Stagger className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <StaggerItem>
            <MetricCard
              icon={Map}
              label="Districts in scope"
              value={loading ? null : summary.total}
              hint="LGD-coded, IT-ITeS"
              accent="violet"
              delay={0}
            />
          </StaggerItem>
          <StaggerItem>
            <MetricCard
              icon={Flame}
              label="Max mismatch district"
              value={loading || !summary.maxMismatch ? null : summary.maxMismatch.mismatch}
              suffix="%"
              sub={loading || !summary.maxMismatch ? undefined : summary.maxMismatch.name}
              hint="Highest demand × supply gap"
              accent="rose"
              delay={0.06}
            />
          </StaggerItem>
          <StaggerItem>
            <MetricCard
              icon={Gauge}
              label="Average coverage"
              value={loading ? null : Math.round(summary.avgCoverage * 100)}
              suffix="%"
              hint="Mean signal coverage"
              accent="teal"
              delay={0.12}
            />
          </StaggerItem>
          <StaggerItem>
            <MetricCard
              icon={AlertTriangle}
              label="Lowest-coverage district"
              value={
                loading || !summary.lowestCoverage
                  ? null
                  : Math.round((summary.lowestCoverage.coverage ?? 0) * 100)
              }
              suffix="%"
              sub={loading || !summary.lowestCoverage ? undefined : summary.lowestCoverage.name}
              hint="Needs more source orgs"
              accent="amber"
              delay={0.18}
            />
          </StaggerItem>
        </Stagger>

        {/* Heatmap */}
        <Card className="border border-border/60 shadow-soft hover:shadow-soft-lg transition-shadow duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Flame className="h-4 w-4 text-primary" /> Mismatch severity heatmap
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Demand × training-supply gap by district. Click any card to open the
                  drill-down — every metric carries its own coverage indicator.
                </CardDescription>
              </div>
              <Legend />
            </div>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="text-sm text-rose-600 dark:text-rose-400 rounded-md border border-rose-500/30 bg-rose-500/5 p-3">
                Failed to load districts: {error}
              </div>
            ) : loading ? (
              <HeatmapSkeleton />
            ) : districts.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">
                No districts in scope.
              </div>
            ) : (
              <Stagger className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {districts.map((d, i) => (
                  <StaggerItem key={d.id}>
                    <DistrictHeatCard
                      district={d}
                      index={i}
                      onClick={() => setOpenLgd(d.lgdCode)}
                    />
                  </StaggerItem>
                ))}
              </Stagger>
            )}
          </CardContent>
        </Card>

        {/* Drill-down sheet */}
        <DistrictDrillSheet
          lgdCode={openLgd}
          onClose={() => setOpenLgd(null)}
          onOpenEvidence={onOpenEvidence}
        />
      </div>
    </TooltipProvider>
  )
}

// ─── Top metric card ───────────────────────────────────────────────────────

function MetricCard({
  icon: Icon,
  label,
  value,
  suffix,
  sub,
  hint,
  accent = 'default',
  delay = 0,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number | null
  suffix?: string
  sub?: string
  hint?: string
  accent?: 'default' | 'teal' | 'amber' | 'rose' | 'violet'
  delay?: number
}) {
  const accentMap: Record<string, string> = {
    default: 'text-muted-foreground',
    teal: 'text-teal-600 dark:text-teal-400',
    amber: 'text-amber-600 dark:text-amber-400',
    rose: 'text-rose-600 dark:text-rose-400',
    violet: 'text-violet-600 dark:text-violet-400',
  }
  const accentBgMap: Record<string, string> = {
    default: 'bg-muted/60',
    teal: 'bg-teal-500/10',
    amber: 'bg-amber-500/10',
    rose: 'bg-rose-500/10',
    violet: 'bg-violet-500/10',
  }
  return (
    <Card className="border border-border/60 overflow-hidden shadow-soft hover:shadow-soft-lg transition-shadow duration-300 h-full">
      <CardContent className="p-4 sm:p-5">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          {label}
        </span>
        <div className="flex items-center gap-3 mt-2">
          <div className="min-w-0 flex-1">
            {value === null ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-3xl font-bold tracking-tight tabular-nums leading-none">
                <CountUp value={value} suffix={suffix} delay={delay} />
              </div>
            )}
          </div>
          <div
            className={cn(
              'h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0',
              accentBgMap[accent],
            )}
          >
            <Icon className={cn('h-5 w-5', accentMap[accent])} />
          </div>
        </div>
        {sub && (
          <div className="text-xs text-muted-foreground font-medium truncate mt-2.5">{sub}</div>
        )}
        {hint && <div className="text-[10px] text-muted-foreground mt-1">{hint}</div>}
      </CardContent>
    </Card>
  )
}

// ─── Legend ────────────────────────────────────────────────────────────────

function Legend() {
  const { t } = useI18n()
  const items: Severity[] = ['low', 'medium', 'high']
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border/60 glass shadow-soft px-3 py-1.5">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
        {t.district.mismatch}
      </span>
      <span className="h-3 w-px bg-border/60" />
      {items.map((s) => (
        <div key={s} className="flex items-center gap-1.5">
          <span
            className={cn(
              'h-2 w-2 rounded-full ring-2 ring-background',
              SEVERITY_META[s].swatch,
            )}
          />
          <span className="text-[11px] text-muted-foreground font-medium">
            {(t.district as any)?.[s] ?? SEVERITY_META[s].label}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Heatmap skeleton ──────────────────────────────────────────────────────

function HeatmapSkeleton() {
  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-3 space-y-2 shimmer">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  )
}

// ─── Heatmap card ──────────────────────────────────────────────────────────

function DistrictHeatCard({
  district,
  index,
  onClick,
}: {
  district: DistrictSummary
  index: number
  onClick: () => void
}) {
  const { t } = useI18n()
  const sev = severityFor(district.mismatch)
  const meta = SEVERITY_META[sev]
  const topSkill = district.topSkills?.[0]
  const coveragePct = Math.round((district.coverage ?? 0) * 100)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.button
          onClick={onClick}
          whileHover={{ y: -3, scale: 1.02, transition: { duration: 0.18 } }}
          className={cn(
            'group relative w-full h-full text-left rounded-lg border border-l-4 shadow-soft hover:shadow-soft-lg transition-shadow duration-300 p-3',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
            meta.card,
            meta.borderL,
          )}
          aria-label={`Open drill-down for ${district.name}`}
        >
          <div className="pl-1 space-y-1.5">
            {/* District identity — name + LGD code */}
            <div className="min-w-0">
              <div
                className="text-xs sm:text-sm font-semibold truncate leading-tight"
                title={district.name}
              >
                {district.name}
              </div>
              <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                LGD {district.lgdCode}
              </div>
            </div>

            {/* Mismatch % — prominent */}
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                {t.district.mismatch}
              </span>
              <Badge
                variant="outline"
                className={cn(
                  'text-xs font-bold tabular-nums py-0 px-1.5',
                  meta.chip,
                )}
              >
                {district.mismatch}%
              </Badge>
            </div>

            {/* Posting count + coverage */}
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Activity className="h-3 w-3" />
                <span className="font-semibold text-foreground tabular-nums">
                  <CountUp value={district.postingCount} delay={0.1 + index * 0.04} />
                </span>
                postings
              </span>
              <span className="inline-flex items-center gap-1">
                <Gauge className="h-3 w-3" />
                <span className="font-semibold text-foreground tabular-nums">{coveragePct}%</span>
              </span>
            </div>

            {/* Coverage bar */}
            <AnimatedBar
              value={coveragePct}
              delay={0.15 + index * 0.04}
              className="h-1"
              colorClass="bg-primary"
            />

            {/* Top demanded skill or empty state */}
            {topSkill ? (
              <div className="flex items-center gap-1 text-[10px] min-w-0">
                <span className="text-muted-foreground flex-shrink-0">Top:</span>
                <span className="font-medium truncate" title={topSkill.label}>
                  {topSkill.label}
                </span>
                {topSkill.isEmerging && (
                  <TrendingUp className="h-3 w-3 text-amber-500 flex-shrink-0" />
                )}
                {topSkill.isDeclining && (
                  <TrendingDown className="h-3 w-3 text-slate-500 flex-shrink-0" />
                )}
              </div>
            ) : (
              <div className="text-[10px] text-muted-foreground italic">
                {t.district.noSignals}
              </div>
            )}

            {/* Drill in CTA */}
            <div className="flex items-center justify-end gap-1 text-xs text-primary font-semibold pt-1 border-t border-border/40 mt-1.5">
              {t.district.drillIn}
              <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </motion.button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <div className="space-y-0.5">
          <div className="font-semibold">
            {district.name} · {district.state}
          </div>
          <div>
            {t.district.mismatch} <span className="font-mono">{district.mismatch}%</span> ({(t.district as any)?.[sev] ?? meta.label})
          </div>
          <div>
            {district.postingCount} postings · {district.demandSignalCount} signals · {coveragePct}% coverage
          </div>
          {district.avgConfidence > 0 && (
            <div>Avg confidence {Math.round(district.avgConfidence * 100)}%</div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

// ─── Drill-down sheet ──────────────────────────────────────────────────────

function DistrictDrillSheet({
  lgdCode,
  onClose,
  onOpenEvidence,
}: {
  lgdCode: string | null
  onClose: () => void
  onOpenEvidence?: (id: string) => void
}) {
  const { data, loading, error } = useFetch<DistrictDetail>(
    lgdCode ? `/api/districts/${lgdCode}` : null,
    [lgdCode],
  )

  return (
    <Sheet open={!!lgdCode} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-hidden p-0 flex flex-col h-full">
        <SheetHeader className="px-6 pt-6 pb-3 border-b flex-shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-primary" />
            {loading || !data ? 'District drill-down' : (
              <>
                {data.district.name}
                <Badge variant="secondary" className="text-[10px] font-mono ml-1">
                  LGD {data.district.lgdCode}
                </Badge>
              </>
            )}
          </SheetTitle>
          <SheetDescription className="text-xs">
            Demand heat, training supply, top demanded roles, missing skills, and source
            coverage for this district. Every metric is annotated with how many independent
            sources contributed.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0 custom-scroll">
          <div className="px-6 py-4 space-y-5">
            {error ? (
              <div className="text-sm text-rose-600 dark:text-rose-400 rounded-md border border-rose-500/30 bg-rose-500/5 p-3">
                Failed to load drill-down: {error}
              </div>
            ) : loading ? (
              <DrillSkeleton />
            ) : data ? (
              <DrillContent data={data} onOpenEvidence={onOpenEvidence} />
            ) : null}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

// ─── Drill-down content ────────────────────────────────────────────────────

function DrillContent({
  data,
  onOpenEvidence,
}: {
  data: DistrictDetail
  onOpenEvidence?: (id: string) => void
}) {
  const { t } = useI18n()
  const { district, metrics, coverageIndicator } = data
  const coveragePct = Math.round((district.coverage ?? 0) * 100)

  return (
    <div className="space-y-5">
      {/* District identity + coverage */}
      <motion.div
        variants={fadeVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
      >
        <div className="rounded-lg border border-border/60 bg-card shadow-soft p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold tracking-tight">{district.name}</h3>
                <Badge variant="outline" className="text-[10px] font-mono">
                  LGD {district.lgdCode}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {district.state}
              </div>
            </div>
            <CoverageChip pct={coveragePct} />
          </div>
          <div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
              <span>Signal coverage</span>
              <span className="font-semibold tabular-nums text-foreground">{coveragePct}%</span>
            </div>
            <AnimatedBar
              value={coveragePct}
              delay={0.1}
              className="h-1.5"
              colorClass="bg-primary"
            />
          </div>
        </div>
      </motion.div>

      {/* Metrics grid */}
      <motion.div
        variants={fadeVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.28, delay: 0.05, ease: [0.32, 0.72, 0, 1] }}
      >
        <SectionLabel icon={Activity} title="Demand heat" hint="Every metric annotated with source count" />
        <div className="grid grid-cols-2 gap-2 mt-2">
          <MetricTile
            icon={Activity}
            label="Job postings"
            value={metrics.postingCount}
            sourceNote={`from ${coverageIndicator.sourceOrganizations} source org${
              coverageIndicator.sourceOrganizations === 1 ? '' : 's'
            }`}
            sufficient={coverageIndicator.sufficient}
            delay={0.1}
          />
          <MetricTile
            icon={TrendingUp}
            label="Demand signals"
            value={metrics.demandSignalCount}
            sourceNote={`${coverageIndicator.sourceOrganizations}/${coverageIndicator.sourcesRequired} sources`}
            sufficient={coverageIndicator.sufficient}
            delay={0.15}
          />
          <MetricTile
            icon={Building2}
            label="Source orgs"
            value={metrics.organizationCount}
            sourceNote={`quorum ${coverageIndicator.sourcesRequired} required`}
            sufficient={coverageIndicator.sufficient}
            delay={0.2}
          />
          <MetricTile
            icon={GraduationCap}
            label="Local courses"
            value={metrics.courseCount}
            sourceNote="training supply"
            sufficient={metrics.courseCount > 0}
            delay={0.25}
          />
        </div>
      </motion.div>

      {/* Coverage indicator (sources) */}
      <motion.div
        variants={fadeVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.28, delay: 0.1, ease: [0.32, 0.72, 0, 1] }}
      >
        <div className="rounded-lg border border-border/60 bg-muted/30 shadow-soft p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold">{t.district.coverageIndicator}</h4>
            </div>
            {coverageIndicator.sufficient ? (
              <Badge
                variant="outline"
                className="border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300 text-[10px] gap-1.5"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-soft-pulse" />
                {t.district.sufficient}
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] gap-1.5"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-soft-pulse" />
                {t.district.insufficient}
              </Badge>
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>
              {t.district.sourceOrgs}:{' '}
              <span className="font-semibold text-foreground tabular-nums">
                <CountUp value={coverageIndicator.sourceOrganizations} delay={0.15} />
              </span>{' '}
              / {coverageIndicator.sourcesRequired} required
            </span>
            <span className="font-semibold tabular-nums text-foreground">
              {coverageIndicator.coveragePct}%
            </span>
          </div>
          <AnimatedBar
            value={coverageIndicator.coveragePct}
            delay={0.2}
            className="h-2"
            colorClass={
              coverageIndicator.sufficient ? 'bg-teal-500' : 'bg-amber-500'
            }
          />
          <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
            {coverageIndicator.sufficient
              ? 'Multiple independent employers corroborate demand in this district — signals may be promoted to validated status.'
              : 'Demand here rests on fewer than 3 independent sources — treat signals as detected, not validated. Add employer partnerships to lift coverage.'}
          </p>
        </div>
      </motion.div>

      {/* Top demanded occupations */}
      <motion.div
        variants={fadeVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.28, delay: 0.15, ease: [0.32, 0.72, 0, 1] }}
      >
        <SectionLabel
          icon={Users}
          title="Top demanded roles"
          hint="by posting volume"
        />
        <div className="mt-2 space-y-1.5">
          {data.topOccupations.length === 0 ? (
            <EmptyRow text="No occupation-level signals for this district." />
          ) : (
            <Stagger className="space-y-1.5">
              {data.topOccupations.map((o, i) => {
                const confPct = Math.round((o.confidence ?? 0) * 100)
                return (
                  <StaggerItem key={o.id}>
                    <div className="rounded-md border border-border/60 bg-card shadow-soft p-2.5 flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-5 tabular-nums">
                        #{i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate">{o.label}</span>
                          <code className="text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded">
                            {o.code}
                          </code>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-2">
                          <span className="inline-flex items-center gap-0.5">
                            <Activity className="h-2.5 w-2.5" />
                            <span className="font-semibold text-foreground tabular-nums">
                              <CountUp value={o.postingCount} delay={0.2 + i * 0.05} />
                            </span>{' '}
                            postings
                          </span>
                          <span className="text-muted-foreground">·</span>
                          <span className="inline-flex items-center gap-0.5">
                            <Gauge className="h-2.5 w-2.5" />
                            <span className={cn('font-semibold', confidenceColor(o.confidence))}>
                              {confPct}% {confidenceLabel(o.confidence)}
                            </span>
                          </span>
                        </div>
                      </div>
                      {onOpenEvidence && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[10px] text-primary"
                          onClick={() => onOpenEvidence(o.id)}
                        >
                          Evidence
                          <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </StaggerItem>
                )
              })}
            </Stagger>
          )}
        </div>
      </motion.div>

      {/* Top missing skills */}
      <motion.div
        variants={fadeVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.28, delay: 0.2, ease: [0.32, 0.72, 0, 1] }}
      >
        <SectionLabel
          icon={AlertTriangle}
          title={t.district.topMissingSkills}
          hint="demanded locally, not taught"
        />
        <div className="mt-2 space-y-1.5">
          {data.topMissingSkills.length === 0 ? (
            <EmptyRow text="No missing-skill gaps detected — local supply meets demand." />
          ) : (
            <Stagger className="space-y-1.5">
              {data.topMissingSkills.map((s, i) => (
                <StaggerItem key={s.id}>
                  <div className="rounded-md border border-border/60 bg-card shadow-soft p-2.5 flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{s.label}</span>
                        {s.isEmerging && (
                          <Badge
                            variant="outline"
                            className="text-[9px] py-0 px-1 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 gap-0.5"
                          >
                            <TrendingUp className="h-2.5 w-2.5" /> Emerging
                          </Badge>
                        )}
                        {s.isDeclining && (
                          <Badge
                            variant="outline"
                            className="text-[9px] py-0 px-1 border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300 gap-0.5"
                          >
                            <TrendingDown className="h-2.5 w-2.5" /> Declining
                          </Badge>
                        )}
                        <TrendBadge trend={s.trendLabel} />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                        <span className="inline-flex items-center gap-0.5">
                          <Activity className="h-2.5 w-2.5" />
                          <span className="font-semibold text-foreground tabular-nums">
                            <CountUp value={s.postingCount} delay={0.25 + i * 0.05} />
                          </span>{' '}
                          postings
                        </span>
                        <span className="text-muted-foreground">·</span>
                        <code className="bg-muted px-1 py-0.5 rounded truncate max-w-[160px]">
                          {s.uri}
                        </code>
                      </div>
                    </div>
                    {onOpenEvidence && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[10px] text-primary flex-shrink-0"
                        onClick={() => onOpenEvidence(s.id)}
                      >
                        Evidence
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </div>
      </motion.div>

      {/* Local courses */}
      <motion.div
        variants={fadeVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.28, delay: 0.25, ease: [0.32, 0.72, 0, 1] }}
      >
        <SectionLabel
          icon={GraduationCap}
          title={t.district.localCourses}
          hint={`${metrics.courseCount} course${metrics.courseCount === 1 ? '' : 's'} in district`}
        />
        <div className="mt-2 space-y-1.5">
          {data.localCourses.length === 0 ? (
            <EmptyRow text="No training provider courses mapped to this district yet." />
          ) : (
            <Stagger className="space-y-1.5">
              {data.localCourses.map((c, i) => (
                <StaggerItem key={c.id}>
                  <div className="rounded-md border border-border/60 bg-card shadow-soft p-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-[10px] font-mono bg-primary/10 text-primary px-1 py-0.5 rounded">
                        {c.code}
                      </code>
                      <span className="text-sm font-medium">{c.name}</span>
                    </div>
                    <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-muted-foreground">
                      <span>
                        Duration{' '}
                        <span className="font-semibold text-foreground tabular-nums">
                          <CountUp value={c.durationMonths} delay={0.3 + i * 0.05} />
                        </span>{' '}
                        mo
                      </span>
                      <span>
                        Modules{' '}
                        <span className="font-semibold text-foreground tabular-nums">
                          <CountUp value={c.moduleCount} delay={0.32 + i * 0.05} />
                        </span>
                      </span>
                      <span>
                        Skills{' '}
                        <span className="font-semibold text-foreground tabular-nums">
                          <CountUp value={c.skillCount} delay={0.34 + i * 0.05} />
                        </span>
                      </span>
                      <span className="truncate">
                        {c.occupation ?? '—'}
                      </span>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </div>
      </motion.div>

      <Separator />

      <motion.div
        variants={fadeVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.28, delay: 0.3, ease: [0.32, 0.72, 0, 1] }}
      >
        <div className="rounded-md bg-primary/5 border border-primary/20 p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary flex-shrink-0" />
            <span>
              Every figure above is sourced from{' '}
              <span className="font-semibold text-foreground">
                {coverageIndicator.sourceOrganizations} independent employer
                {coverageIndicator.sourceOrganizations === 1 ? '' : 's'}
              </span>{' '}
              and is traceable through the audit trail.
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Drill sub-components ─────────────────────────────────────────────────

function SectionLabel({
  icon: Icon,
  title,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  hint?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-primary" />
      <h4 className="text-sm font-semibold">{title}</h4>
      {hint && (
        <span className="text-[10px] text-muted-foreground ml-auto">{hint}</span>
      )}
    </div>
  )
}

function MetricTile({
  icon: Icon,
  label,
  value,
  sourceNote,
  sufficient,
  delay = 0,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number | string
  sourceNote: string
  sufficient: boolean
  delay?: number
}) {
  const isNumeric = typeof value === 'number'
  return (
    <div className="rounded-md border border-border/60 bg-card shadow-soft hover:shadow-soft-lg transition-shadow duration-300 p-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </span>
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="text-xl font-bold tabular-nums mt-1">
        {isNumeric ? <CountUp value={value} delay={delay} /> : value}
      </div>
      <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            sufficient ? 'bg-teal-500' : 'bg-amber-500',
          )}
        />
        <span>{sourceNote}</span>
      </div>
    </div>
  )
}

function CoverageChip({ pct }: { pct: number }) {
  const ok = pct >= 60
  const cls = ok
    ? 'border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300'
    : pct >= 30
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
      : 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
  const label = ok ? 'Covered' : pct >= 30 ? 'Partial' : 'Low'
  return (
    <Badge variant="outline" className={cn('text-[10px] gap-1', cls)}>
      <Gauge className="h-2.5 w-2.5" />
      {pct}% · {label}
    </Badge>
  )
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground text-center">
      {text}
    </div>
  )
}

// ─── Drill skeleton ────────────────────────────────────────────────────────

function DrillSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-20 w-full rounded-lg shimmer" />
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 shimmer" />
        ))}
      </div>
      <Skeleton className="h-24 w-full shimmer" />
      <div className="space-y-1.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 shimmer" />
        ))}
      </div>
      <div className="space-y-1.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 shimmer" />
        ))}
      </div>
    </div>
  )
}
