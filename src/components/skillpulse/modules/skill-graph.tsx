'use client'

import { useMemo, useState, type ReactNode } from 'react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Progress } from '@/components/ui/progress'
import { motion, type Variants } from 'framer-motion'
import {
  Share2,
  Search,
  Network,
  GitBranch,
  BookOpen,
  ChevronRight,
  AlertTriangle,
  Circle,
  CircleDot,
  Plus,
  Minus,
  Lock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFetch } from '@/lib/skillpulse/useFetch'
import { useI18n } from '@/lib/skillpulse/i18n'
import {
  Stagger,
  StaggerItem,
  CountUp,
  staggerItem,
} from '@/lib/skillpulse/motion'

// ─── Catalog of taxonomy versions known to this prototype ──────────────────
// (In production this would be fetched from a /api/taxonomies endpoint.)
// Seed produces tx_0001 = current ESCO v1.2.0 + India-ext-0.3, tx_0000 = previous.
const TAXONOMY_CATALOG = [
  { id: 'tx_0001', version: 'ESCO v1.2.0 + India-ext-0.3', isCurrent: true },
  { id: 'tx_0000', version: 'ESCO v1.1.0 + India-ext-0.1', isCurrent: false },
]

const NODE_BUDGET = 300

// ─── Legend configuration (compact pill-based) ─────────────────────────────
// Solid color dots + tinted background pills. Placed at the top-right of the
// results area for at-a-glance decoding of the skill graph.
const LEGEND_ITEMS = [
  { dot: 'bg-primary', label: 'Essential', pill: 'bg-primary/10' },
  { dot: 'bg-muted-foreground/60', label: 'Optional', pill: 'bg-muted/60' },
  { dot: 'bg-amber-500', label: 'Emerging', pill: 'bg-amber-500/10' },
  { dot: 'bg-slate-400', label: 'Declining', pill: 'bg-slate-500/10' },
]

// ─── Types (mirrors the API contract) ──────────────────────────────────────
interface SkillNode {
  id: string
  uri: string
  label: string
  proficiency: number // 1..5 (ESCO skill level)
  essential: boolean
  isEmerging: boolean
  isDeclining: boolean
}
interface OccupationNode {
  id: string
  uri: string
  code: string
  label: string
  sector: string
  skills: SkillNode[]
  courseCount: number
  courses: { id: string; code: string; name: string }[]
}
interface GraphData {
  taxonomy: { id: string; version: string; isCurrent: boolean }
  occupations: OccupationNode[]
  skillCount: number
}
interface DiffSummary {
  from: { id: string; version: string; releaseDate?: string }
  to: { id: string; version: string; releaseDate?: string }
  summary: { added: number; removed: number; unchanged: number }
  added: { id: string; uri: string; label: string }[]
  removed: { id: string; uri: string; label: string }[]
}

export function SkillGraphExplorer() {
  const { t } = useI18n()
  const [taxonomyVersionId, setTaxonomyVersionId] = useState<string>('') // '' = current
  const [selectedOccupationId, setSelectedOccupationId] = useState<string>('')
  const [search, setSearch] = useState('')
  const [diffMode, setDiffMode] = useState(false)

  // ── Build the graph API URL ────────────────────────────────────────────
  const graphUrl = useMemo(() => {
    const params = new URLSearchParams()
    if (taxonomyVersionId) params.set('taxonomyVersionId', taxonomyVersionId)
    if (selectedOccupationId) params.set('occupationId', selectedOccupationId)
    if (search.trim()) params.set('q', search.trim())
    params.set('limit', String(NODE_BUDGET + 50))
    return `/api/graph?${params.toString()}`
  }, [taxonomyVersionId, selectedOccupationId, search])

  // ── Diff URL — compare against the "other" known taxonomy version ──────
  const diffUrl = useMemo(() => {
    if (!diffMode) return null
    const toId = taxonomyVersionId || TAXONOMY_CATALOG.find((t) => t.isCurrent)!.id
    const fromId = TAXONOMY_CATALOG.find((t) => t.id !== toId)?.id
    if (!fromId) return null
    return `/api/graph/diff?from=${fromId}&to=${toId}`
  }, [diffMode, taxonomyVersionId])

  const { data: graph, error, loading } = useFetch<GraphData>(graphUrl)
  const { data: diff, loading: diffLoading } = useFetch<DiffSummary>(diffUrl)

  // ── Total visible skills in the current view (for the 300-node budget) ─
  const visibleSkillCount = useMemo(() => {
    if (!graph) return 0
    return graph.occupations.reduce((acc, o) => acc + o.skills.length, 0)
  }, [graph])

  const overBudget = visibleSkillCount > NODE_BUDGET

  const occupations = graph?.occupations ?? []
  // Auto-clear stale occupation selection when switching taxonomies
  // (derive it instead of syncing via effect to avoid cascading renders).
  const selectedOccupation = selectedOccupationId
    ? occupations.find((o) => o.id === selectedOccupationId)
    : undefined
  const effectiveOccupationId = selectedOccupationId && !selectedOccupation
    ? ''
    : selectedOccupationId

  const diffDirectionLabel = useMemo(() => {
    if (!diff) return ''
    return `${diff.from.version} → ${diff.to.version}`
  }, [diff])

  return (
    <div className="space-y-8">
      {/* ── Heading ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden flex items-start justify-between gap-4 flex-wrap rounded-xl">
        {/* Decorative gradient orbs */}
        <div className="absolute -top-12 -right-10 h-44 w-44 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        <div className="absolute -top-4 -left-10 h-32 w-32 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 right-24 h-24 w-24 rounded-full bg-fuchsia-400/10 blur-3xl pointer-events-none" />

        <div className="relative min-w-0">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2.5">
            <span className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shadow-soft">
              <Share2 className="h-5 w-5 text-primary" />
            </span>
            <span className="text-gradient">{t.modules.graph}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            {t.moduleDesc.graph}
          </p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className="relative bg-muted/40 gap-1.5 cursor-help border-border/60 shadow-soft"
            >
              <Lock className="h-3 w-3" />
              Read-only
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="left">
            Read-only — edits via taxonomy admin workflow
          </TooltipContent>
        </Tooltip>
      </div>

      {/* ── Top control bar — grouped into distinct visual zones ─────────── */}
      <Card className="glass border border-border/60 rounded-xl shadow-soft hover:shadow-soft-lg transition-shadow duration-300">
        <CardContent className="p-4">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {/* Zone 1: Taxonomy version + Diff mode toggle (aligned together) */}
            <div className="bg-muted/30 rounded-lg p-3 border border-border/40 space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
                  <GitBranch className="h-3 w-3" /> Taxonomy version
                </label>
                <Select
                  value={taxonomyVersionId || '__current__'}
                  onValueChange={(v) =>
                    setTaxonomyVersionId(v === '__current__' ? '' : v)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Current version" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__current__">Current (auto)</SelectItem>
                    {TAXONOMY_CATALOG.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.version}
                        {t.isCurrent ? ' (current)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant={diffMode ? 'default' : 'outline'}
                  className={cn(
                    'h-8',
                    diffMode && 'bg-primary hover:bg-primary/90 shadow-soft',
                  )}
                  onClick={() => setDiffMode((v) => !v)}
                >
                  <GitBranch className="h-3.5 w-3.5 mr-1.5" />
                  {diffMode ? 'Diff mode ON' : 'Enable diff mode'}
                </Button>
                {diffMode && diff && (
                  <Badge variant="outline" className="text-[10px] font-mono ml-auto">
                    {diffDirectionLabel}
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Compare previous → current taxonomy to inspect added / removed skills.
              </p>
            </div>

            {/* Zone 2: Occupation + Search */}
            <div className="bg-muted/30 rounded-lg p-3 border border-border/40 space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
                  <Network className="h-3 w-3" /> Occupation
                </label>
                <Select
                  value={effectiveOccupationId || '__all__'}
                  onValueChange={(v) =>
                    setSelectedOccupationId(v === '__all__' ? '' : v)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All occupations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All occupations</SelectItem>
                    {occupations.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
                  <Search className="h-3 w-3" /> Search
                </label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    className="pl-8"
                    placeholder="Find occupation…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Zone 3: Skills in view + budget indicator */}
            <div className="bg-muted/30 rounded-lg p-3 border border-border/40 space-y-2.5">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
                <CircleDot className="h-3 w-3" /> Skills in view
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="secondary"
                      className={cn(
                        'gap-1.5 font-mono cursor-help',
                        overBudget
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                          : 'bg-teal-500/15 text-teal-700 dark:text-teal-300',
                      )}
                    >
                      <Network className="h-3 w-3" />
                      <CountUp value={visibleSkillCount} />
                      <span className="opacity-60">/ {NODE_BUDGET}</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    Visible node budget — explorer hard-stops above {NODE_BUDGET} skills.
                  </TooltipContent>
                </Tooltip>
                {graph?.taxonomy && (
                  <Badge variant="outline" className="gap-1 text-[10px]">
                    <GitBranch className="h-3 w-3" />
                    <span className="truncate max-w-[140px]">
                      {graph.taxonomy.version}
                    </span>
                  </Badge>
                )}
              </div>
              <Progress
                value={Math.min(100, (visibleSkillCount / NODE_BUDGET) * 100)}
                className={cn(
                  'h-1.5',
                  overBudget &&
                    '[&>[data-slot=progress-indicator]]:bg-amber-500',
                )}
              />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Hard-stops above {NODE_BUDGET} skills — filter or search to refine.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Budget warning banner (prominent amber) ─────────────────────── */}
      {overBudget && (
        <Card className="border border-amber-500/50 bg-amber-500/10 shadow-soft-lg">
          <CardContent className="p-4 flex items-start gap-3">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-amber-500/20">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 animate-soft-pulse" />
            </span>
            <div className="text-sm flex-1 min-w-0">
              <div className="font-semibold text-amber-900 dark:text-amber-200 text-sm">
                Visible node budget exceeded ({visibleSkillCount} &gt; {NODE_BUDGET})
              </div>
              <div className="text-xs text-amber-700 dark:text-amber-300 mt-1 leading-relaxed">
                Filter by occupation or refine the search to reduce the visible skill count
                before continuing to explore the graph.
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 flex-shrink-0"
              onClick={() => {
                setSelectedOccupationId('')
                setSearch('')
              }}
            >
              Clear filters
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Diff view (when enabled) ────────────────────────────────────── */}
      {diffMode && (
        <Card className="border border-primary/30 shadow-soft hover:shadow-soft-lg transition-shadow duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <GitBranch className="h-4 w-4 text-primary" />
              Taxonomy delta
              {diff && (
                <span className="text-xs text-muted-foreground font-normal ml-1">
                  {diffDirectionLabel}
                </span>
              )}
            </CardTitle>
            <CardDescription className="text-xs">
              Skill URIs present in one version but not the other (set-comparison on URI).
              Use this to inspect what changed when switching versions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {diffLoading || !diff ? (
              <DiffSkeleton />
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-3 mb-4">
                  <DiffStat label="Added" value={diff.summary.added} kind="added" />
                  <DiffStat
                    label="Removed"
                    value={diff.summary.removed}
                    kind="removed"
                  />
                  <DiffStat
                    label="Unchanged"
                    value={diff.summary.unchanged}
                    kind="unchanged"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <DiffList title="Added skills" items={diff.added} kind="added" />
                  <DiffList
                    title="Removed skills"
                    items={diff.removed}
                    kind="removed"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Error ──────────────────────────────────────────────────────── */}
      {error && (
        <Card className="border border-rose-500/40 bg-rose-500/5 shadow-soft">
          <CardContent className="p-3 text-sm text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            Failed to load skill graph: <code className="text-xs">{error}</code>
          </CardContent>
        </Card>
      )}

      {/* ── Main two-column layout ──────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Left: occupation list */}
        <Card className="lg:col-span-4 flex flex-col border border-border/60 shadow-soft hover:shadow-soft-lg transition-shadow duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base font-semibold">
              <span className="flex items-center gap-2">
                <Network className="h-4 w-4 text-primary" />
                Occupations
              </span>
              <Badge variant="secondary" className="text-[10px] font-mono">
                <CountUp value={occupations.length} />
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Pick an occupation to expand its skill neighbourhood.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-1 min-h-0">
            <ScrollArea className="h-[60vh] lg:h-[calc(100vh-22rem)] custom-scroll">
              <Stagger className="px-3 pb-3 space-y-2">
                {loading && !graph && <ListSkeleton />}
                {!loading && occupations.length === 0 && (
                  <div className="text-xs text-muted-foreground p-6 text-center">
                    No occupations match the current filters.
                  </div>
                )}
                {occupations.map((o) => {
                  const isSel = selectedOccupation?.id === o.id
                  const essentialCount = o.skills.filter((s) => s.essential).length
                  const emergingCount = o.skills.filter((s) => s.isEmerging).length
                  return (
                    <motion.button
                      key={o.id}
                      variants={staggerItem as Variants}
                      whileHover={{ x: 2 }}
                      onClick={() =>
                        setSelectedOccupationId(isSel ? '' : o.id)
                      }
                      className={cn(
                        'w-full text-left rounded-lg border p-3 transition-colors',
                        isSel
                          ? 'border-primary bg-primary text-primary-foreground shadow-soft'
                          : 'border-border/60 hover:bg-accent/10 hover:border-border',
                      )}
                      aria-pressed={isSel}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate flex items-center gap-1.5">
                            {isSel && (
                              <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
                            )}
                            <span className="truncate">{o.label}</span>
                          </div>
                          <div
                            className={cn(
                              'text-[10px] font-mono mt-1',
                              isSel
                                ? 'text-primary-foreground/80'
                                : 'text-muted-foreground',
                            )}
                          >
                            {o.code} · {o.sector}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] flex-shrink-0',
                            isSel &&
                              'border-primary-foreground/30 bg-primary-foreground/10',
                          )}
                        >
                          <CountUp value={o.skills.length} /> skills
                        </Badge>
                      </div>
                      <div
                        className={cn(
                          'mt-2.5 flex items-center gap-2.5 flex-wrap text-[10px]',
                          isSel
                            ? 'text-primary-foreground/80'
                            : 'text-muted-foreground',
                        )}
                      >
                        <span className="flex items-center gap-1">
                          <span
                            className={cn(
                              'h-2 w-2 rounded-full',
                              isSel ? 'bg-primary-foreground' : 'bg-primary',
                            )}
                          />
                          <CountUp value={essentialCount} /> essential
                        </span>
                        <span className="flex items-center gap-1">
                          <span
                            className={cn(
                              'h-2 w-2 rounded-full',
                              isSel
                                ? 'bg-primary-foreground/40'
                                : 'bg-muted-foreground/40',
                            )}
                          />
                          <CountUp value={o.skills.length - essentialCount} />{' '}
                          optional
                        </span>
                        {emergingCount > 0 && (
                          <span
                            className={cn(
                              'flex items-center gap-1',
                              isSel
                                ? 'text-amber-200'
                                : 'text-amber-700 dark:text-amber-300',
                            )}
                          >
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                            <CountUp value={emergingCount} /> emerging
                          </span>
                        )}
                        {o.courseCount > 0 && (
                          <span className="flex items-center gap-1 ml-auto">
                            <BookOpen className="h-2.5 w-2.5" />
                            <CountUp value={o.courseCount} /> course
                            {o.courseCount === 1 ? '' : 's'}
                          </span>
                        )}
                      </div>
                    </motion.button>
                  )
                })}
              </Stagger>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right: skill graph visualization + legend pills in header */}
        <Card className="lg:col-span-8 flex flex-col border border-border/60 shadow-soft hover:shadow-soft-lg transition-shadow duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base font-semibold gap-2 flex-wrap">
              <span className="flex items-center gap-2 min-w-0">
                <Share2 className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="truncate">
                  {selectedOccupation ? selectedOccupation.label : 'All occupations'}
                </span>
              </span>
              {selectedOccupation && (
                <Badge variant="outline" className="text-[10px] font-mono flex-shrink-0">
                  {selectedOccupation.code}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-start justify-between gap-3 flex-wrap mt-1">
              <CardDescription className="text-xs flex-1 min-w-[180px]">
                {selectedOccupation
                  ? `Skill graph anchored on ${selectedOccupation.label}.`
                  : 'Showing skills across all occupations in this taxonomy version.'}{' '}
                Essential vs optional are grouped within each occupation.
              </CardDescription>
              <LegendPills />
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            {loading && <GraphSkeleton />}
            {!loading && occupations.length === 0 && (
              <div className="text-xs text-muted-foreground p-8 text-center">
                Nothing to display — adjust filters or taxonomy version.
              </div>
            )}
            {!loading && occupations.length > 0 && (
              <Accordion
                type="multiple"
                defaultValue={
                  selectedOccupation
                    ? [selectedOccupation.id]
                    : occupations.slice(0, 1).map((o) => o.id)
                }
                className="w-full"
              >
                {(selectedOccupation ? [selectedOccupation] : occupations).map(
                  (o) => (
                    <AccordionItem key={o.id} value={o.id} className="border-b border-border/60">
                      <AccordionTrigger className="hover:no-underline hover:bg-accent/5 rounded-md px-2 -mx-2">
                        <div className="flex items-center gap-2 flex-1 pr-2">
                          <span className="font-medium text-sm truncate">
                            {o.label}
                          </span>
                          <Badge
                            variant="secondary"
                            className="text-[10px] flex-shrink-0"
                          >
                            <CountUp value={o.skills.length} /> skills
                          </Badge>
                          {o.skills.some((s) => s.isEmerging) && (
                            <Badge
                              variant="outline"
                              className="text-[9px] py-0 px-1 border-amber-500/40 text-amber-700 dark:text-amber-300 flex-shrink-0"
                            >
                              emerging
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <OccupationGraph occupation={o} />
                      </AccordionContent>
                    </AccordionItem>
                  )
                )}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function LegendPills() {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {LEGEND_ITEMS.map((item) => (
        <span
          key={item.label}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium text-foreground border border-border/40',
            item.pill,
          )}
        >
          <span className={cn('h-2 w-2 rounded-full flex-shrink-0', item.dot)} />
          {item.label}
        </span>
      ))}
    </div>
  )
}

function OccupationGraph({ occupation }: { occupation: OccupationNode }) {
  const essential = occupation.skills.filter((s) => s.essential)
  const optional = occupation.skills.filter((s) => !s.essential)

  return (
    <div className="space-y-4 pt-2">
      <SkillSection
        title="Essential skills"
        subtitle="Required for the role — anchored on ESCO essential flag."
        skills={essential}
      />
      <SkillSection
        title="Optional skills"
        subtitle="Recommended but not required — expandable neighbours."
        skills={optional}
      />
      {occupation.courses.length > 0 && (
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
          <div className="text-sm font-semibold uppercase tracking-wider text-foreground mb-2 flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-primary" />
            Linked courses
          </div>
          <div className="flex flex-wrap gap-1.5">
            {occupation.courses.map((c) => (
              <Badge
                key={c.id}
                variant="outline"
                className="text-[10px] font-mono"
              >
                {c.code} · {c.name}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SkillSection({
  title,
  subtitle,
  skills,
}: {
  title: string
  subtitle: string
  skills: SkillNode[]
}) {
  if (skills.length === 0) {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
        <div className="text-sm font-semibold uppercase tracking-wider text-foreground">
          {title}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          None in this occupation.
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border/60 bg-muted/10 p-3">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm font-semibold uppercase tracking-wider text-foreground">
            {title}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>
        </div>
        <Badge variant="outline" className="text-[10px] font-mono">
          {skills.length}
        </Badge>
      </div>
      <div className="space-y-1">
        {skills.map((s) => (
          <SkillRow key={s.id} skill={s} />
        ))}
      </div>
    </div>
  )
}

function SkillRow({ skill }: { skill: SkillNode }) {
  // Status icon:
  //  - Emerging → amber filled dot (CircleDot)
  //  - Declining → slate filled dot (CircleDot)
  //  - Essential → primary filled circle
  //  - Optional → open circle outline
  const isEmerging = skill.isEmerging
  const isDeclining = skill.isDeclining

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-accent/10 transition-colors cursor-default">
          {/* Status dot */}
          <span className="flex-shrink-0">
            {isEmerging ? (
              <CircleDot className="h-3.5 w-3.5 text-amber-500" />
            ) : isDeclining ? (
              <CircleDot className="h-3.5 w-3.5 text-slate-400" />
            ) : skill.essential ? (
              <Circle className="h-3.5 w-3.5 fill-primary text-primary" />
            ) : (
              <Circle className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </span>
          {/* Label + URI */}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">{skill.label}</div>
            <div className="text-[10px] text-muted-foreground font-mono truncate">
              {skill.uri}
            </div>
          </div>
          {/* Trend badges */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {isEmerging && (
              <Badge
                variant="outline"
                className="text-[9px] py-0 px-1 border-amber-500/40 text-amber-700 dark:text-amber-300"
              >
                Emerging
              </Badge>
            )}
            {isDeclining && (
              <Badge
                variant="outline"
                className="text-[9px] py-0 px-1 border-slate-500/40 text-slate-600 dark:text-slate-300"
              >
                Declining
              </Badge>
            )}
          </div>
          {/* Proficiency bar L1..L5 */}
          <ProficiencyBars level={skill.proficiency} essential={skill.essential} />
        </div>
      </TooltipTrigger>
      <TooltipContent side="top">
        <div className="text-xs space-y-0.5">
          <div className="font-semibold">{skill.label}</div>
          <div className="opacity-80">
            Proficiency L{skill.proficiency} ·{' '}
            {skill.essential ? 'Essential' : 'Optional'}
            {isEmerging && ' · Emerging'}
            {isDeclining && ' · Declining'}
          </div>
          <div className="opacity-80 font-mono text-[10px]">{skill.uri}</div>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

function ProficiencyBars({
  level,
  essential,
}: {
  level: number
  essential: boolean
}) {
  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => {
          const filled = i <= level
          return (
            <div
              key={i}
              className={cn(
                'h-2 w-5 rounded-sm transition-colors',
                filled
                  ? essential
                    ? 'bg-gradient-to-r from-primary to-primary/70'
                    : 'bg-primary/50'
                  : 'bg-muted-foreground/15',
              )}
              aria-label={`Level ${i}${filled ? ' reached' : ''}`}
            />
          )
        })}
      </div>
      <span className="text-xs font-mono font-semibold text-foreground w-7 text-right">
        L{level}
      </span>
    </div>
  )
}

function DiffStat({
  label,
  value,
  kind,
}: {
  label: string
  value: number
  kind: 'added' | 'removed' | 'unchanged'
}) {
  // Diff mode: added = teal, removed = rose, unchanged = slate — clear visual distinction.
  const colors: Record<'added' | 'removed' | 'unchanged', string> = {
    added: 'border-teal-500/40 text-teal-700 dark:text-teal-300 bg-teal-500/10',
    removed: 'border-rose-500/40 text-rose-700 dark:text-rose-300 bg-rose-500/10',
    unchanged:
      'border-slate-500/40 text-slate-700 dark:text-slate-300 bg-slate-500/10',
  }
  const Icon = kind === 'added' ? Plus : kind === 'removed' ? Minus : Circle
  return (
    <div className={cn('rounded-lg border p-3 shadow-soft', colors[kind])}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider font-semibold opacity-80">
          {label}
        </span>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="text-2xl font-bold tabular-nums mt-1">{value}</div>
    </div>
  )
}

function DiffList({
  title,
  items,
  kind,
}: {
  title: string
  items: { id: string; uri: string; label: string }[]
  kind: 'added' | 'removed'
}) {
  // Diff mode: added = teal dot, removed = rose dot — clear visual distinction.
  const isAdded = kind === 'added'
  const Icon = isAdded ? Plus : Minus
  const dotCls = isAdded ? 'bg-teal-500' : 'bg-rose-500'
  return (
    <div className="rounded-lg border border-border/60 bg-background p-3 shadow-soft">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold flex items-center gap-1.5">
          <Icon
            className={cn(
              'h-3.5 w-3.5',
              isAdded
                ? 'text-teal-600 dark:text-teal-400'
                : 'text-rose-600 dark:text-rose-400',
            )}
          />
          {title}
        </div>
        <Badge variant="outline" className="text-[10px] font-mono">
          {items.length}
        </Badge>
      </div>
      <ScrollArea className="max-h-56 custom-scroll">
        <Stagger className="space-y-1 pr-1">
          {items.length === 0 && (
            <div className="text-[10px] text-muted-foreground py-3 text-center">
              None in this comparison.
            </div>
          )}
          {items.map((s) => (
            <StaggerItem key={s.id}>
              <div className="flex items-center gap-2 rounded-md px-1.5 py-1.5 text-xs hover:bg-accent/10 transition-colors">
                <span
                  className={cn(
                    'h-2 w-2 rounded-full flex-shrink-0',
                    dotCls,
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{s.label}</div>
                  <div className="text-[10px] text-muted-foreground font-mono truncate">
                    {s.uri}
                  </div>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </ScrollArea>
    </div>
  )
}

// ─── Skeletons ───────────────────────────────────────────────────────────────

function ListSkeleton() {
  return (
    <div className="space-y-2 p-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-16 rounded-md bg-muted/40 animate-pulse" />
      ))}
    </div>
  )
}

function GraphSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-24 rounded-md bg-muted/40 animate-pulse" />
      ))}
    </div>
  )
}

function DiffSkeleton() {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 rounded-md bg-muted/40 animate-pulse" />
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-40 rounded-md bg-muted/40 animate-pulse" />
        ))}
      </div>
    </div>
  )
}
