'use client'

// SkillPulse Grid — Curriculum Mirror (HERO module, SIH26134)
// Compares an existing course against live, validated demand, bucketing every
// demanded skill into Match / Missing / Emerging / Declining / LowPriority,
// and generating a scored, evidence-linked action plan with an Alignment
// Score that ships with a visible, reproducible formula breakdown.

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  CountUp,
  AnimatedBar,
  Stagger,
  StaggerItem,
  fadeVariants,
} from '@/lib/skillpulse/motion'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  GitCompareArrows,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  FileText,
  Calculator,
  Gauge,
  Target,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity,
  Building2,
  Scale,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFetch } from '@/lib/skillpulse/useFetch'
import {
  BucketBadge,
  PriorityBadge,
  StatusBadge,
  ValidationBadge,
} from '@/components/skillpulse/badges'
import { EvidenceDrawer } from '@/components/skillpulse/evidence-drawer'
import { BUCKETS, type Bucket } from '@/lib/skillpulse/types'
import { useI18n } from '@/lib/skillpulse/i18n'
import { toast } from 'sonner'

// ─── Static data ──────────────────────────────────────────────────────────

const COURSES: { id: string; label: string; tag?: string }[] = [
  {
    id: 'course_0001',
    label: 'CTS-FSD-101 — Full-Stack Developer Diploma (ITI Pune Hadapsar)',
    tag: 'Hero',
  },
  { id: 'course_0002', label: 'CTS-ML-201 — Machine Learning Engineer' },
  { id: 'course_0003', label: 'CTS-DEV-301 — Cloud & DevOps Engineer' },
  { id: 'course_0004', label: 'CTS-DA-401 — Data Analyst Bootcamp' },
  { id: 'course_0005', label: 'CTS-QA-501 — QA Automation Engineer' },
  {
    id: 'course_0006',
    label: 'CTS-LEG-601 — Legacy Web Developer (declining skills focus)',
  },
]

const REJECT_REASONS: {
  code: string
  label: string
  hint: string
}[] = [
  {
    code: 'POSTING_VOLUME_TOO_LOW',
    label: 'Posting volume too low',
    hint: 'Demand signal below quorum / volume threshold',
  },
  {
    code: 'RELEVANCE_GAP',
    label: 'Relevance gap',
    hint: 'Skill is tangential to the target occupation',
  },
  {
    code: 'OBSOLETE_SKILL',
    label: 'Obsolete skill',
    hint: 'Skill is being phased out of the curriculum',
  },
  {
    code: 'OTHER',
    label: 'Other',
    hint: 'Provide a comment below for the audit log',
  },
]

// ─── Types (mirror the API contract) ───────────────────────────────────────

interface Recommendation {
  id: string
  actionType: string
  priorityBand: string
  suggestedOwner: string | null
  rationale: string | null
  status: string
  rejectionReason: string | null
  evidenceIds: string[]
}

interface MirrorItem {
  skillId: string
  skillLabel: string
  skillUri: string
  bucket: Bucket
  essential: boolean
  isEmerging: boolean
  isDeclining: boolean
  taughtProficiency: number
  demandedProficiency: number
  emphasisHours: number
  moduleId: string | null
  demandSignalId: string | null
  postingCount: number
  sourceCount: number
  trendLabel: 'Emerging' | 'Declining' | 'Stable'
  confidence: number
  validationState:
    | 'Detected'
    | 'Pending'
    | 'Validated'
    | 'Rejected'
    | 'NeedsReview'
  promotionScore: number
  recommendation: Recommendation | null
}

interface AlignmentFormula {
  weightedMatched: number
  weightedDemanded: number
  essentialWeight: number
  optionalWeight: number
  proficiencyCloseness: string
  finalScale: number
}

interface MirrorData {
  course: {
    id: string
    code: string
    name: string
    institution: string | null
    durationMonths: number
    occupation: { id: string; label: string; code: string } | null
    district: { id: string; name: string; lgdCode: string } | null
    sector: { name: string; code: string }
    moduleCount: number
  }
  alignment: {
    alignment: number
    formula: AlignmentFormula
    counts: {
      match: number
      missing: number
      emerging: number
      declining: number
      lowPriority: number
    }
  }
  performance: { durationMs: number; targetMs: number; meetsTarget: boolean }
  items: MirrorItem[]
  recommendations: Recommendation[]
}

// ─── Main component ────────────────────────────────────────────────────────

export function CurriculumMirror() {
  const { t } = useI18n()
  const [courseId, setCourseId] = useState<string>('course_0001')
  const [refreshKey, setRefreshKey] = useState(0)
  const [evidenceId, setEvidenceId] = useState<string | null>(null)
  const [formulaOpen, setFormulaOpen] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<{
    recId: string
    skillLabel: string
  } | null>(null)
  const [rejectReason, setRejectReason] = useState<string>(
    'POSTING_VOLUME_TOO_LOW'
  )
  const [rejectComment, setRejectComment] = useState('')
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [tab, setTab] = useState<string>('all')

  const url = `/api/mirror?courseId=${encodeURIComponent(courseId)}`
  const { data, error, loading } = useFetch<MirrorData>(url, [refreshKey])

  async function postAction(
    recId: string,
    action: 'accept' | 'reject' | 'start' | 'complete',
    reasonCode?: string,
    comment?: string
  ) {
    setSubmitting(recId)
    try {
      const res = await fetch(`/api/mirror/${recId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          reasonCode,
          actor: 'provider',
          comment,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.ok) {
        throw new Error(json.error || `Failed to ${action} recommendation`)
      }
      if (action === 'accept') {
        toast.success('Recommendation accepted', {
          description: `Status → ${json.status}`,
        })
      } else if (action === 'reject') {
        toast.success('Recommendation rejected', {
          description: `Reason: ${reasonCode}`,
        })
      } else {
        toast.success(`Action: ${action}`, {
          description: `Status → ${json.status}`,
        })
      }
      setRefreshKey((k) => k + 1)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      toast.error(`Failed to ${action}`, { description: msg })
    } finally {
      setSubmitting(null)
    }
  }

  function handleAccept(recId: string, skillLabel: string) {
    postAction(recId, 'accept')
  }

  function openRejectDialog(recId: string, skillLabel: string) {
    setRejectTarget({ recId, skillLabel })
    setRejectReason('POSTING_VOLUME_TOO_LOW')
    setRejectComment('')
  }

  function submitReject() {
    if (!rejectTarget) return
    postAction(
      rejectTarget.recId,
      'reject',
      rejectReason,
      rejectComment || undefined
    )
    setRejectTarget(null)
  }

  function viewEvidence(item: MirrorItem) {
    // Prefer the recommendation id (per PRD §3.3). Fall back to the demand
    // signal id so users can always reach the underlying evidence.
    const id = item.recommendation?.id ?? item.demandSignalId
    if (id) setEvidenceId(id)
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-8">
        {/* Hero header */}
        <Card className="relative border border-border/60 bg-gradient-to-br from-primary/8 via-accent/5 to-background overflow-hidden shadow-soft hover:shadow-soft-lg transition-shadow duration-300">
          {/* Decorative gradient orbs */}
          <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />
          <CardContent className="relative p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0 shadow-soft-lg">
                <GitCompareArrows className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <h2 className="text-3xl font-bold tracking-tight text-foreground">
                    {t.mirror.title}
                  </h2>
                  <Badge
                    variant="secondary"
                    className="text-[10px] uppercase tracking-wider bg-primary/10 text-primary"
                  >
                    {t.mirror.heroFeature}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {t.mirror.subtitle}
                </p>
              </div>
              <div className="w-full md:w-96 flex-shrink-0">
                <Label className="text-xs mb-1.5 text-muted-foreground">
                  Compare a course
                </Label>
                <motion.div
                  className="w-full"
                  whileHover={{ y: -1 }}
                  transition={{ duration: 0.15 }}
                >
                  <Select value={courseId} onValueChange={setCourseId}>
                    <SelectTrigger className="w-full shadow-soft">
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      {COURSES.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <span className="text-xs">{c.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </motion.div>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading && <MirrorSkeleton />}

        {error && (
          <Card className="border border-rose-500/40 shadow-soft hover:shadow-soft-lg transition-shadow duration-300">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-rose-500 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="font-semibold text-rose-700 dark:text-rose-300">
                    Failed to load mirror
                  </div>
                  <div className="text-sm text-muted-foreground mt-1 break-words">
                    {error}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setRefreshKey((k) => k + 1)}
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {data && (
          <>
            {/* Course meta + performance badge */}
            <Card className="border border-border/60 shadow-soft hover:shadow-soft-lg transition-shadow duration-300">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center gap-3 text-sm">
                  <div className="flex items-center gap-2 flex-wrap">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-semibold">{data.course.code}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground truncate">
                      {data.course.name}
                    </span>
                  </div>
                  <Separator
                    orientation="vertical"
                    className="hidden md:block h-4 mx-1"
                  />
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {data.course.occupation?.label ?? '—'}
                    </span>
                    <span>·</span>
                    <span>{data.course.moduleCount} modules</span>
                    <span>·</span>
                    <span>{data.course.durationMonths} mo</span>
                    {data.course.district && (
                      <>
                        <span>·</span>
                        <span>{data.course.district.name}</span>
                      </>
                    )}
                  </div>
                  <div className="md:ml-auto flex items-center gap-2 flex-wrap">
                    <PerformanceBadge perf={data.performance} />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setRefreshKey((k) => k + 1)}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" /> {t.mirror.refresh}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Hero header: Alignment score + Bucket counts */}
            <div className="grid gap-4 lg:grid-cols-2">
              <AlignmentScoreCard
                alignment={data.alignment}
                onShowFormula={() => setFormulaOpen(true)}
              />
              <BucketCountsCard
                counts={data.alignment.counts}
                total={data.items.length}
              />
            </div>

            {/* Bucket legend */}
            <BucketLegend />

            {/* Items table */}
            <motion.div
              key={courseId}
              initial="hidden"
              animate="visible"
              variants={fadeVariants}
              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            >
              <Card className="border border-border/60 shadow-soft hover:shadow-soft-lg transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base font-bold">
                    <Target className="h-4 w-4 text-primary" /> Skill-by-skill
                    comparison
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {data.items.length} demanded skill
                    {data.items.length === 1 ? '' : 's'} bucketed against course
                    coverage. Each row links to validated demand evidence.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs value={tab} onValueChange={setTab}>
                    <TabsList className="mb-3 rounded-none border-b border-border bg-transparent p-0 h-9">
                      <TabsTrigger
                        value="all"
                        className="relative rounded-none border-0 bg-transparent px-3 shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                      >
                        {t.mirror.allSkills} ({data.items.length})
                        {tab === 'all' && (
                          <motion.div
                            layoutId="mirror-tab-underline"
                            className="absolute -bottom-px left-2 right-2 h-0.5 rounded-full bg-primary"
                            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                          />
                        )}
                      </TabsTrigger>
                      <TabsTrigger
                        value="byBucket"
                        className="relative rounded-none border-0 bg-transparent px-3 shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                      >
                        {t.mirror.byBucket}
                        {tab === 'byBucket' && (
                          <motion.div
                            layoutId="mirror-tab-underline"
                            className="absolute -bottom-px left-2 right-2 h-0.5 rounded-full bg-primary"
                            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                          />
                        )}
                      </TabsTrigger>
                      <TabsTrigger
                        value="actions"
                        className="relative rounded-none border-0 bg-transparent px-3 shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                      >
                        {t.mirror.actionPlan} (
                        {data.items.filter((i) => i.recommendation).length})
                        {tab === 'actions' && (
                          <motion.div
                            layoutId="mirror-tab-underline"
                            className="absolute -bottom-px left-2 right-2 h-0.5 rounded-full bg-primary"
                            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                          />
                        )}
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="all">
                      <ItemsTable
                        items={data.items}
                        submitting={submitting}
                        onAccept={handleAccept}
                        onReject={openRejectDialog}
                        onViewEvidence={viewEvidence}
                      />
                    </TabsContent>
                    <TabsContent value="byBucket">
                      <BucketAccordion
                        items={data.items}
                        submitting={submitting}
                        onAccept={handleAccept}
                        onReject={openRejectDialog}
                        onViewEvidence={viewEvidence}
                      />
                    </TabsContent>
                    <TabsContent value="actions">
                      <ItemsTable
                        items={data.items.filter((i) => i.recommendation)}
                        submitting={submitting}
                        onAccept={handleAccept}
                        onReject={openRejectDialog}
                        onViewEvidence={viewEvidence}
                        emptyHint="No recommendations have been generated for this course yet."
                      />
                    </TabsContent>
                  </Tabs>
                </CardContent>
                <CardFooter className="text-[11px] text-muted-foreground border-t pt-4">
                  Every recommendation links to at least one validated signal —
                  or is explicitly marked unvalidated via the demand-signal state.
                </CardFooter>
              </Card>
            </motion.div>
          </>
        )}

        <EvidenceDrawer
          evidenceId={evidenceId}
          onClose={() => setEvidenceId(null)}
        />

        {/* Formula breakdown dialog */}
        <Dialog open={formulaOpen} onOpenChange={setFormulaOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-primary" /> {t.mirror.alignmentScore}
                formula
              </DialogTitle>
              <DialogDescription className="text-xs">
                Reproducible from stored inputs — every bucket assignment and
                weight is auditable end-to-end.
              </DialogDescription>
            </DialogHeader>
            {data && <FormulaBreakdown alignment={data.alignment} />}
            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFormulaOpen(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject dialog */}
        <Dialog
          open={!!rejectTarget}
          onOpenChange={(o) => !o && setRejectTarget(null)}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-rose-500" /> Reject
                recommendation
              </DialogTitle>
              <DialogDescription className="text-xs">
                {rejectTarget && (
                  <>
                    Rejecting action for{' '}
                    <span className="font-semibold text-foreground">
                      {rejectTarget.skillLabel}
                    </span>
                    . The rejection reason is logged immutably to the audit
                    trail.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs mb-2">Reason code</Label>
                <RadioGroup
                  value={rejectReason}
                  onValueChange={setRejectReason}
                >
                  {REJECT_REASONS.map((r) => (
                    <div
                      key={r.code}
                      className="flex items-start gap-2 rounded-md border p-2.5 hover:bg-muted/40 transition-colors"
                    >
                      <RadioGroupItem
                        value={r.code}
                        id={`r-${r.code}`}
                        className="mt-0.5"
                      />
                      <Label
                        htmlFor={`r-${r.code}`}
                        className="flex-1 cursor-pointer flex flex-col"
                      >
                        <span className="text-sm font-medium">{r.label}</span>
                        <span className="block text-[11px] text-muted-foreground mt-0.5">
                          {r.hint}
                        </span>
                        <code className="text-[10px] text-muted-foreground mt-0.5">
                          {r.code}
                        </code>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              <div>
                <Label htmlFor="rejectComment" className="text-xs mb-1.5">
                  Comment (optional)
                </Label>
                <Textarea
                  id="rejectComment"
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                  placeholder="Add a note for the audit log…"
                  className="min-h-[80px] text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRejectTarget(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={submitReject}
                disabled={submitting === rejectTarget?.recId}
              >
                {submitting === rejectTarget?.recId ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Rejecting…
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3" />
                    {t.mirror.reject}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}

// ─── Performance badge ────────────────────────────────────────────────────

function PerformanceBadge({
  perf,
}: {
  perf: MirrorData['performance']
}) {
  const { t } = useI18n()
  const meets = perf.meetsTarget
  const seconds = (perf.durationMs / 1000).toFixed(2)
  const targetSec = (perf.targetMs / 1000).toFixed(0)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            'gap-1.5 font-medium cursor-default glass rounded-full',
            meets
              ? 'text-teal-800 border-teal-500/40 dark:text-teal-200'
              : 'text-rose-800 border-rose-500/40 dark:text-rose-200'
          )}
        >
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full animate-soft-pulse',
              meets ? 'bg-teal-500' : 'bg-rose-500'
            )}
            aria-hidden
          />
          <Clock className="h-3 w-3" />
          {t.mirror.comparedIn} {seconds}s · {t.mirror.target} {targetSec}s
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <span className="block text-xs">
          {meets
            ? `Within performance budget (${perf.durationMs}ms raw)`
            : `Exceeds performance budget — investigate (${perf.durationMs}ms raw)`}
        </span>
      </TooltipContent>
    </Tooltip>
  )
}

// ─── Alignment score card ─────────────────────────────────────────────────

function AlignmentScoreCard({
  alignment,
  onShowFormula,
}: {
  alignment: MirrorData['alignment']
  onShowFormula: () => void
}) {
  const { t } = useI18n()
  const score = alignment.alignment
  const finalScale = alignment.formula.finalScale || 100
  const percent = Math.min(100, (score / Math.max(1, finalScale)) * 100)
  // Ring stroke: violet for >=70, amber for 40-70, rose for <40
  const ringStroke =
    score >= 70 ? '#8b5cf6' : score >= 40 ? '#f59e0b' : '#f43f5e'
  const color =
    score >= 70
      ? 'text-violet-600 dark:text-violet-400'
      : score >= 40
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-rose-600 dark:text-rose-400'
  const label =
    score >= 70
      ? 'Strong alignment — course mirrors live demand'
      : score >= 40
        ? 'Partial alignment — review flagged buckets'
        : 'Critical gaps — overhaul recommended'

  // SVG ring geometry
  const RADIUS = 52
  const STROKE = 8
  const SIZE = (RADIUS + STROKE) * 2 // 120
  const CIRC = 2 * Math.PI * RADIUS

  return (
    <Card className="border border-border/60 shadow-soft hover:shadow-soft-lg transition-shadow duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4 h-7">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
            <Gauge className="h-3.5 w-3.5" /> {t.mirror.alignmentScore}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-primary hover:bg-primary/10"
            onClick={onShowFormula}
          >
            <Calculator className="h-3 w-3 mr-1" /> {t.mirror.showFormula}
          </Button>
        </div>
        <div className="flex items-start gap-6">
          {/* Circular progress ring with the score centred inside */}
          <div
            className="relative flex-shrink-0"
            style={{ width: SIZE, height: SIZE }}
          >
            <svg
              width={SIZE}
              height={SIZE}
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              className="-rotate-90"
              aria-hidden
            >
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                strokeWidth={STROKE}
                className="text-muted-foreground/15"
                stroke="currentColor"
              />
              <motion.circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={ringStroke}
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={CIRC}
                initial={{ strokeDashoffset: CIRC }}
                animate={{
                  strokeDashoffset: CIRC - (percent / 100) * CIRC,
                }}
                transition={{
                  duration: 1.2,
                  ease: [0.32, 0.72, 0, 1],
                  delay: 0.2,
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <CountUp
                value={score}
                className={cn(
                  'text-5xl font-bold tabular-nums tracking-tight leading-none',
                  color
                )}
              />
              <span className="text-[11px] text-muted-foreground mt-1">
                / {finalScale}
              </span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium leading-snug">{label}</div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md bg-muted/40 p-2">
                <div className="text-muted-foreground text-[10px] uppercase tracking-wide">
                  Matched (weighted)
                </div>
                <div className="font-semibold tabular-nums mt-0.5">
                  {alignment.formula.weightedMatched}
                </div>
              </div>
              <div className="rounded-md bg-muted/40 p-2">
                <div className="text-muted-foreground text-[10px] uppercase tracking-wide">
                  Demanded (weighted)
                </div>
                <div className="font-semibold tabular-nums mt-0.5">
                  {alignment.formula.weightedDemanded}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Bucket counts card ───────────────────────────────────────────────────

function BucketCountsCard({
  counts,
  total,
}: {
  counts: MirrorData['alignment']['counts']
  total: number
}) {
  const { t } = useI18n()
  const rows: { key: Bucket; label: string; n: number }[] = [
    { key: 'Match', label: 'Match', n: counts.match },
    { key: 'Missing', label: 'Missing', n: counts.missing },
    { key: 'Emerging', label: 'Emerging', n: counts.emerging },
    { key: 'Declining', label: 'Declining', n: counts.declining },
    { key: 'LowPriority', label: 'Low Priority', n: counts.lowPriority },
  ]
  return (
    <Card className="border border-border/60 shadow-soft hover:shadow-soft-lg transition-shadow duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4 h-7">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
            <Scale className="h-3.5 w-3.5" /> {t.mirror.bucketDistribution}
          </div>
          <span className="text-xs text-muted-foreground">
            {total} skill{total === 1 ? '' : 's'}
          </span>
        </div>
        <Stagger className="space-y-1">
          {rows.map((r) => {
            const meta = BUCKETS[r.key]
            const pct = total > 0 ? Math.round((r.n / total) * 100) : 0
            return (
              <StaggerItem key={r.key}>
                <motion.div
                  className="flex items-center gap-3 rounded-lg p-1.5 hover:bg-accent/10 transition-colors"
                  whileHover={{ y: -1 }}
                  transition={{ duration: 0.15 }}
                >
                  <span
                    className={cn(
                      'h-2.5 w-2.5 rounded-full flex-shrink-0',
                      meta.dot
                    )}
                  />
                  <span className="text-sm font-medium w-24 flex-shrink-0">
                    {(t.buckets as any)?.[r.key] ?? r.label}
                  </span>
                  <AnimatedBar
                    value={pct}
                    colorClass={meta.dot}
                    className="h-2 flex-1 min-w-[40px]"
                  />
                  <span className="text-xs font-semibold tabular-nums w-6 text-right">
                    {r.n}
                  </span>
                  <span className="text-[10px] text-muted-foreground tabular-nums w-9 text-right">
                    {pct}%
                  </span>
                </motion.div>
              </StaggerItem>
            )
          })}
        </Stagger>
      </CardContent>
    </Card>
  )
}

// ─── Bucket legend ────────────────────────────────────────────────────────

function BucketLegend() {
  const { t } = useI18n()
  const buckets: Bucket[] = [
    'Match',
    'Missing',
    'Emerging',
    'Declining',
    'LowPriority',
  ]
  return (
    <div className="flex flex-wrap gap-2">
      {buckets.map((b) => {
        const meta = BUCKETS[b]
        return (
          <Tooltip key={b}>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs cursor-help',
                  meta.color
                )}
              >
                <span
                  className={cn('h-1.5 w-1.5 rounded-full', meta.dot)}
                />
                {(t.buckets as any)?.[b] ?? meta.label}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[240px]">
              <span className="block text-xs">{(t.bucketDesc as any)?.[b] ?? meta.description}</span>
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}

// ─── Formula breakdown ────────────────────────────────────────────────────

function FormulaBreakdown({
  alignment,
}: {
  alignment: MirrorData['alignment']
}) {
  const f = alignment.formula
  return (
    <Stagger className="space-y-3 text-sm">
      <StaggerItem>
        <div className="rounded-md bg-muted/50 p-3 font-mono text-[11px] leading-relaxed overflow-x-auto">
          <div className="text-muted-foreground">
            # weights: essential × {f.essentialWeight}, optional ×{' '}
            {f.optionalWeight}
          </div>
          <div>
            weightedMatched = Σ
            <sub className="text-[9px]">Match</sub> weight ·
            proficiencyCloseness
          </div>
          <div>
            weightedDemanded = Σ
            <sub className="text-[9px]">all demanded</sub> weight
          </div>
          <div>proficiencyCloseness = {f.proficiencyCloseness}</div>
          <div className="mt-1 text-primary font-semibold">
            alignment = (weightedMatched / weightedDemanded) × {f.finalScale}
          </div>
        </div>
      </StaggerItem>
      <StaggerItem>
        <div className="grid grid-cols-2 gap-2">
          <FormulaStat label="weightedMatched" value={f.weightedMatched} />
          <FormulaStat label="weightedDemanded" value={f.weightedDemanded} />
          <FormulaStat label="Essential weight" value={f.essentialWeight} />
          <FormulaStat label="Optional weight" value={f.optionalWeight} />
        </div>
      </StaggerItem>
      <StaggerItem>
        <div className="flex items-center justify-between rounded-md border bg-primary/5 p-3">
          <span className="text-xs text-muted-foreground">
            Computed alignment
          </span>
          <span className="text-lg font-bold tabular-nums text-primary">
            {alignment.alignment} / {f.finalScale}
          </span>
        </div>
      </StaggerItem>
      <StaggerItem>
        <div className="grid grid-cols-5 gap-1 text-center">
          <FormulaStat label="Match" value={alignment.counts.match} />
          <FormulaStat label="Missing" value={alignment.counts.missing} />
          <FormulaStat label="Emerg." value={alignment.counts.emerging} />
          <FormulaStat label="Decl." value={alignment.counts.declining} />
          <FormulaStat label="LowPri" value={alignment.counts.lowPriority} />
        </div>
      </StaggerItem>
    </Stagger>
  )
}

function FormulaStat({
  label,
  value,
}: {
  label: string
  value: number | string
}) {
  return (
    <div className="rounded-md border bg-card p-2">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
        {label}
      </div>
      <div className="text-sm font-semibold tabular-nums mt-0.5">{value}</div>
    </div>
  )
}

// ─── Items table (grid-based) ─────────────────────────────────────────────

const COL_TEMPLATE =
  'minmax(180px,2.2fr) 100px 56px 92px 92px 56px 56px 48px 80px 104px 96px 88px 168px'

interface ItemHandlers {
  submitting: string | null
  onAccept: (recId: string, skillLabel: string) => void
  onReject: (recId: string, skillLabel: string) => void
  onViewEvidence: (item: MirrorItem) => void
}

function ItemsTable({
  items,
  submitting,
  onAccept,
  onReject,
  onViewEvidence,
  emptyHint,
}: ItemHandlers & { items: MirrorItem[]; emptyHint?: string }) {
  const { t } = useI18n()
  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        {emptyHint ?? 'No items to display.'}
      </div>
    )
  }
  return (
    <div className="rounded-md border max-h-[600px] overflow-y-auto custom-scroll overflow-x-auto">
      <div className="min-w-[1120px]">
        {/* Header */}
        <div
          className="sticky top-0 z-10 bg-muted/80 backdrop-blur grid gap-2 px-3 py-2 text-[10px] uppercase tracking-wider text-foreground/80 font-bold border-b border-border/60"
          style={{ gridTemplateColumns: COL_TEMPLATE }}
        >
          <div>Skill</div>
          <div>Bucket</div>
          <div>Pri</div>
          <div>{t.mirror.taught}</div>
          <div>{t.mirror.demanded}</div>
          <div className="text-right">Hrs</div>
          <div className="text-right">Posts</div>
          <div className="text-right">Src</div>
          <div>Trend</div>
          <div>Validation</div>
          <div>{t.mirror.actionType}</div>
          <div>{t.mirror.status}</div>
          <div className="text-right">Actions</div>
        </div>
        {/* Rows */}
        <div>
          {items.map((it) => (
            <ItemRow
              key={it.skillId}
              item={it}
              submitting={submitting}
              onAccept={onAccept}
              onReject={onReject}
              onViewEvidence={onViewEvidence}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function ItemRow({
  item,
  submitting,
  onAccept,
  onReject,
  onViewEvidence,
}: ItemHandlers & { item: MirrorItem }) {
  const rec = item.recommendation
  const hasRec = !!rec
  const busy = rec ? submitting === rec.id : false
  const isClosed =
    rec &&
    (rec.status === 'Accepted' ||
      rec.status === 'Rejected' ||
      rec.status === 'Completed')

  return (
    <div
      className="grid gap-2 px-4 py-3.5 text-sm items-center hover:bg-accent/10 transition-colors"
      style={{ gridTemplateColumns: COL_TEMPLATE }}
    >
      {/* Skill label */}
      <div className="min-w-0">
        <div className="font-medium truncate" title={item.skillLabel}>
          {item.skillLabel}
        </div>
        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
          {item.essential ? (
            <Badge
              variant="outline"
              className="text-[9px] py-0 px-1 border-primary/30 text-primary"
            >
              Essential
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-[9px] py-0 px-1 text-muted-foreground"
            >
              Optional
            </Badge>
          )}
          {item.isEmerging && (
            <BucketBadge bucket="Emerging" className="text-[9px] py-0 px-1 gap-1" />
          )}
          {item.isDeclining && (
            <BucketBadge bucket="Declining" className="text-[9px] py-0 px-1 gap-1" />
          )}
        </div>
      </div>
      {/* Bucket */}
      <div>
        <BucketBadge bucket={item.bucket} />
      </div>
      {/* Priority */}
      <div>
        {rec ? (
          <PriorityBadge band={rec.priorityBand} />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>
      {/* Taught proficiency */}
      <div className="flex flex-col items-start">
        <ProficiencyDots
          level={item.taughtProficiency}
          variant={item.taughtProficiency === 0 ? 'none' : 'taught'}
        />
      </div>
      {/* Demanded proficiency */}
      <div className="flex flex-col items-start">
        <ProficiencyDots level={item.demandedProficiency} variant="demanded" />
      </div>
      {/* Hours */}
      <div className="text-right tabular-nums text-xs">
        {item.emphasisHours}h
      </div>
      {/* Posts */}
      <div className="text-right tabular-nums text-xs">
        {item.postingCount}
      </div>
      {/* Sources */}
      <div className="text-right tabular-nums text-xs">
        {item.sourceCount}
      </div>
      {/* Trend */}
      <div>
        <TrendIcon trend={item.trendLabel} />
      </div>
      {/* Validation */}
      <div>
        <ValidationBadge state={item.validationState} />
      </div>
      {/* Action type */}
      <div>
        {rec ? (
          <Badge variant="secondary" className="text-[10px]">
            {rec.actionType}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>
      {/* Status */}
      <div>
        {rec ? (
          <StatusBadge status={rec.status} />
        ) : (
          <span className="text-[10px] text-muted-foreground">No action</span>
        )}
      </div>
      {/* Actions */}
      <div className="flex items-center justify-end gap-1">
        {hasRec ? (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-7 w-7 border-teal-500/40 bg-teal-500/15 text-teal-800 hover:bg-teal-500/25 hover:text-teal-800 dark:text-teal-200 dark:hover:text-teal-200"
                  onClick={() => onAccept(rec!.id, item.skillLabel)}
                  disabled={
                    busy ||
                    rec!.status === 'Accepted' ||
                    rec!.status === 'Completed'
                  }
                  aria-label="Accept recommendation"
                >
                  {busy ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {rec!.status === 'Accepted'
                  ? 'Already accepted'
                  : rec!.status === 'Completed'
                    ? 'Already completed'
                    : 'Accept recommendation'}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-7 w-7 border-rose-500/40 bg-rose-500/15 text-rose-800 hover:bg-rose-500/25 hover:text-rose-800 dark:text-rose-200 dark:hover:text-rose-200"
                  onClick={() => onReject(rec!.id, item.skillLabel)}
                  disabled={busy || rec!.status === 'Rejected'}
                  aria-label="Reject recommendation"
                >
                  <XCircle className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {rec!.status === 'Rejected'
                  ? 'Already rejected'
                  : 'Reject recommendation'}
              </TooltipContent>
            </Tooltip>
          </>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  disabled
                  aria-label="No recommendation to act on"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground/40" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>No recommendation to act on</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => onViewEvidence(item)}
              disabled={!item.recommendation && !item.demandSignalId}
              aria-label="View evidence"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {item.recommendation
              ? 'View recommendation evidence'
              : item.demandSignalId
                ? 'View demand-signal evidence'
                : 'No evidence available'}
          </TooltipContent>
        </Tooltip>
        {isClosed && (
          <span className="sr-only">Action closed: {rec!.status}</span>
        )}
      </div>
    </div>
  )
}

// ─── Bucket accordion (alternative view) ──────────────────────────────────

function BucketAccordion({
  items,
  submitting,
  onAccept,
  onReject,
  onViewEvidence,
}: ItemHandlers & { items: MirrorItem[] }) {
  const { t } = useI18n()
  const buckets: Bucket[] = [
    'Match',
    'Missing',
    'Emerging',
    'Declining',
    'LowPriority',
  ]
  return (
    <Accordion
      type="multiple"
      defaultValue={['Missing', 'Emerging']}
      className="w-full"
    >
      {buckets.map((b) => {
        const bucketItems = items.filter((i) => i.bucket === b)
        const meta = BUCKETS[b]
        return (
          <AccordionItem key={b} value={b}>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2 flex-1 pr-2">
                <span
                  className={cn('h-2.5 w-2.5 rounded-full', meta.dot)}
                />
                <span className="font-medium">{(t.buckets as any)?.[b] ?? meta.label}</span>
                <Badge
                  variant="secondary"
                  className={cn('text-[10px]', meta.color, 'border')}
                >
                  {bucketItems.length}
                </Badge>
                <span className="text-xs text-muted-foreground ml-2 hidden md:inline truncate">
                  {(t.bucketDesc as any)?.[b] ?? meta.description}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              {bucketItems.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  No skills in this bucket.
                </p>
              ) : (
                <div className="space-y-2 pt-1">
                  {bucketItems.map((it) => (
                    <ItemCompactRow
                      key={it.skillId}
                      item={it}
                      submitting={submitting}
                      onAccept={onAccept}
                      onReject={onReject}
                      onViewEvidence={onViewEvidence}
                    />
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}

function ItemCompactRow({
  item,
  submitting,
  onAccept,
  onReject,
  onViewEvidence,
}: ItemHandlers & { item: MirrorItem }) {
  const { t } = useI18n()
  const rec = item.recommendation
  const hasRec = !!rec
  const busy = rec ? submitting === rec.id : false
  return (
    <div className="rounded-md border p-3 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-start hover:bg-accent/10 transition-colors shadow-soft">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm truncate" title={item.skillLabel}>
            {item.skillLabel}
          </span>
          {item.essential && (
            <Badge
              variant="outline"
              className="text-[9px] py-0 px-1 border-primary/30 text-primary"
            >
              Essential
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap mt-1.5 text-xs text-muted-foreground">
          <BucketBadge bucket={item.bucket} />
          {rec && <PriorityBadge band={rec.priorityBand} />}
          <span aria-hidden>·</span>
          <span>{t.mirror.taught}</span>
          <ProficiencyDots
            level={item.taughtProficiency}
            variant={item.taughtProficiency === 0 ? 'none' : 'taught'}
          />
          <span aria-hidden>·</span>
          <span>{t.mirror.demanded}</span>
          <ProficiencyDots level={item.demandedProficiency} variant="demanded" />
          <span aria-hidden>·</span>
          <span>{item.emphasisHours}h</span>
          <span aria-hidden>·</span>
          <span>{item.postingCount} posts</span>
          <span aria-hidden>·</span>
          <span>{item.sourceCount} srcs</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap mt-1.5 text-xs">
          <TrendIcon trend={item.trendLabel} />
          <ValidationBadge state={item.validationState} />
          {rec && <StatusBadge status={rec.status} />}
          {rec && (
            <Badge variant="secondary" className="text-[10px]">
              {rec.actionType}
            </Badge>
          )}
        </div>
        {rec?.rationale && (
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            {rec.rationale}
          </p>
        )}
      </div>
      <div className="flex md:flex-col gap-1.5 md:items-stretch">
        {hasRec ? (
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-teal-500/40 bg-teal-500/15 text-teal-800 hover:bg-teal-500/25 hover:text-teal-800 dark:text-teal-200 dark:hover:text-teal-200"
              onClick={() => onAccept(rec!.id, item.skillLabel)}
              disabled={
                busy ||
                rec!.status === 'Accepted' ||
                rec!.status === 'Completed'
              }
            >
              {busy ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3 w-3" />
              )}
              {t.mirror.accept}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-rose-500/40 bg-rose-500/15 text-rose-800 hover:bg-rose-500/25 hover:text-rose-800 dark:text-rose-200 dark:hover:text-rose-200"
              onClick={() => onReject(rec!.id, item.skillLabel)}
              disabled={busy || rec!.status === 'Rejected'}
            >
              <XCircle className="h-3 w-3" />
              {t.mirror.reject}
            </Button>
          </>
        ) : (
          <span className="text-[10px] text-muted-foreground px-2 py-1.5 inline-flex items-center justify-center">
            No action
          </span>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={() => onViewEvidence(item)}
          disabled={!item.recommendation && !item.demandSignalId}
        >
          <Eye className="h-3 w-3" />
          {t.mirror.viewEvidence}
        </Button>
      </div>
    </div>
  )
}

// ─── Proficiency dots ─────────────────────────────────────────────────────

function ProficiencyDots({
  level,
  total = 5,
  variant = 'taught',
}: {
  level: number
  total?: number
  variant?: 'taught' | 'demanded' | 'none'
}) {
  const filled =
    variant === 'demanded' ? 'bg-amber-500' : 'bg-primary'
  const empty = 'bg-muted-foreground/25'
  return (
    <div
      className="flex items-center gap-1"
      aria-label={`Proficiency level ${level} of ${total}`}
      role="img"
    >
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            i < level ? filled : empty
          )}
        />
      ))}
      <span className="text-[10px] text-muted-foreground ml-1 tabular-nums">
        L{level}
      </span>
    </div>
  )
}

// ─── Trend icon ───────────────────────────────────────────────────────────

function TrendIcon({
  trend,
}: {
  trend: 'Emerging' | 'Declining' | 'Stable'
}) {
  if (trend === 'Emerging') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
        <TrendingUp className="h-3 w-3" />
        {trend}
      </span>
    )
  }
  if (trend === 'Declining') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400">
        <TrendingDown className="h-3 w-3" />
        {trend}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400">
      <Activity className="h-3 w-3" />
      {trend}
    </span>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────

function MirrorSkeleton() {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 mt-3" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-6 w-full" />
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}
