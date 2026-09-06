'use client'

// SkillPulse Grid — Action Plans + Candidate Readiness modules (SIH26134)
// Two sibling modules sharing one file:
//   1. ActionPlans         — for training providers / curriculum designers / government
//   2. CandidateReadiness  — for candidates / students
//
// Action Plans turns Curriculum-Mirror recommendations into owned, trackable work
// (Proposed → Accepted → InProgress → Completed | Rejected), grouped by course
// with priority band, suggested owner, rationale and evidence links.
//
// Candidate Readiness shows a personalised readiness %, a skill-by-skill demanded
// vs assessed proficiency view, a priority learning sequence, and an honest
// district/sector demand context with a prominent "no employment guarantee"
// disclaimer (per PRD §3.6).

import { useMemo, useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { motion } from 'framer-motion'
import {
  ListChecks,
  GraduationCap,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  User,
  AlertTriangle,
  Trophy,
  BookOpen,
  Target,
  TrendingUp,
  ChevronRight,
  Download,
  Activity,
  MapPin,
  Building2,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  CircleDot,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFetch } from '@/lib/skillpulse/useFetch'
import {
  CountUp,
  AnimatedBar,
  Stagger,
  StaggerItem,
} from '@/lib/skillpulse/motion'
import {
  BucketBadge,
  PriorityBadge,
  StatusBadge,
} from '@/components/skillpulse/badges'
import { EvidenceDrawer } from '@/components/skillpulse/evidence-drawer'
import { type Bucket } from '@/lib/skillpulse/types'
import { toast } from 'sonner'
import { useI18n } from '@/lib/skillpulse/i18n'

// ─── Static reference data ──────────────────────────────────────────────────
// Static list of seeded courses drives the course filter dropdown. The API
// response also carries full course info per group; we just need IDs/labels
// here to populate the Select regardless of which filter is currently applied.

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

const REJECT_REASONS: { code: string; label: string; hint: string }[] = [
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

const STATUS_ORDER = [
  'Proposed',
  'Accepted',
  'Rejected',
  'InProgress',
  'Completed',
] as const

const STATUS_CHIP_META: Record<
  string,
  { dot: string; color: string; icon: typeof Clock }
> = {
  Proposed: {
    dot: 'bg-slate-400',
    color:
      'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30',
    icon: Clock,
  },
  Accepted: {
    dot: 'bg-teal-500',
    color:
      'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30',
    icon: CheckCircle2,
  },
  Rejected: {
    dot: 'bg-rose-500',
    color:
      'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
    icon: XCircle,
  },
  InProgress: {
    dot: 'bg-amber-500',
    color:
      'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
    icon: Activity,
  },
  Completed: {
    dot: 'bg-violet-500',
    color:
      'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30',
    icon: Trophy,
  },
}

// ─── Types (mirror the API contract) ──────────────────────────────────────────

interface ActionsCourse {
  id: string
  code: string
  name: string
  duration: number
  occupationId: string | null
  sectorId: string
  institution: string
  districtId: string | null
  createdAt: string
  occupation: {
    id: string
    preferredLabel: string
    code: string
    uri: string
  } | null
  district: {
    id: string
    name: string
    lgdCode: string
    stateName: string
  } | null
}

interface ActionItem {
  id: string
  skillId: string | null
  skillLabel: string
  bucket: Bucket
  actionType: string
  priorityBand: string
  suggestedOwner: string
  rationale: string
  status: string
  rejectionReason: string | null
  evidenceIds: string[]
  demandSignalId: string | null
}

interface ActionGroup {
  course: ActionsCourse
  items: ActionItem[]
}

interface ActionsData {
  count: number
  byStatus: Record<string, number>
  groups: ActionGroup[]
}

interface CandidateInfo {
  id: string
  name: string
  occupation: { id: string; label: string; code: string }
  district: string
}

interface CandidateSkill {
  skillId: string
  label: string
  uri: string
  essential: boolean
  isEmerging: boolean
  isDeclining: boolean
  demandedProficiency: number
  assessedProficiency: number
  gap: number
  readiness: number
}

interface LearningStep {
  rank: number
  skillId: string
  label: string
  uri: string
  current: number
  target: number
  gap: number
  essential: boolean
  isEmerging: boolean
}

interface CandidateContext {
  districtName: string
  signalsForOccupation: number
  disclaimer: string
}

interface CandidateData {
  candidate: CandidateInfo
  overallReadiness: number
  totalSkills: number
  matchedSkills: number
  gapSkills: number
  items: CandidateSkill[]
  learningSequence: LearningStep[]
  context: CandidateContext
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function OwnerIconDisplay({ owner }: { owner: string }) {
  const lc = (owner || '').toLowerCase()
  let Icon = User
  if (lc.includes('provider') || lc.includes('trainer')) Icon = Building2
  else if (lc.includes('designer') || lc.includes('curriculum')) Icon = BookOpen
  else if (lc.includes('employer') || lc.includes('industry')) Icon = ShieldCheck
  else if (lc.includes('government') || lc.includes('govt')) Icon = Target
  return <Icon className="h-3 w-3" />
}

function csvEscape(s: string | null | undefined): string {
  if (s == null) return ''
  const str = String(s)
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

function exportActionsCsv(groups: ActionGroup[]): void {
  const headers = [
    'Course Code',
    'Course Name',
    'Occupation',
    'District',
    'Skill',
    'Bucket',
    'Priority',
    'Action Type',
    'Owner',
    'Status',
    'Rejection Reason',
    'Rationale',
  ]
  const rows: string[][] = [headers]
  for (const g of groups) {
    for (const it of g.items) {
      rows.push([
        g.course.code,
        g.course.name,
        g.course.occupation?.preferredLabel ?? '',
        g.course.district?.name ?? '',
        it.skillLabel,
        it.bucket,
        it.priorityBand,
        it.actionType,
        it.suggestedOwner ?? '',
        it.status,
        it.rejectionReason ?? '',
        it.rationale ?? '',
      ])
    }
  }
  const csv = rows.map((r) => r.map(csvEscape).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `skillpulse-action-plans-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  toast.success('Action plans exported', {
    description: `${rows.length - 1} recommendations → CSV`,
  })
}

function readinessColor(v: number): string {
  if (v >= 70) return 'text-teal-600 dark:text-teal-400'
  if (v >= 40) return 'text-amber-600 dark:text-amber-400'
  return 'text-rose-600 dark:text-rose-400'
}

function readinessHex(v: number): string {
  if (v >= 70) return '#10b981'
  if (v >= 40) return '#f59e0b'
  return '#f43f5e'
}

function readinessBarClass(v: number): string {
  if (v >= 70) return 'bg-teal-500'
  if (v >= 40) return 'bg-amber-500'
  return 'bg-rose-500'
}

function readinessLabel(v: number): string {
  if (v >= 70) return 'Market-ready'
  if (v >= 40) return 'Developing'
  return 'Significant gaps'
}

// Small horizontal L1..L5 proficiency dot row.
function ProficiencyDots({ level, max = 5 }: { level: number; max?: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`Proficiency level ${level} of ${max}`}
    >
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={cn(
            'h-2 w-2 rounded-full transition-colors',
            i < level ? 'bg-primary' : 'bg-muted-foreground/30'
          )}
        />
      ))}
      <span className="ml-1 text-[10px] font-semibold tabular-nums">
        L{level}
      </span>
    </span>
  )
}

// ─── Action Plans: main component ─────────────────────────────────────────────

export function ActionPlans() {
  const { t } = useI18n()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [courseFilter, setCourseFilter] = useState<string>('all')
  const [refreshKey, setRefreshKey] = useState(0)
  const [evidenceId, setEvidenceId] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<{
    recId: string
    skillLabel: string
  } | null>(null)
  const [rejectReason, setRejectReason] = useState<string>(
    'POSTING_VOLUME_TOO_LOW'
  )
  const [rejectComment, setRejectComment] = useState('')
  const [submitting, setSubmitting] = useState<string | null>(null)

  const qs = useMemo(() => {
    const p = new URLSearchParams()
    if (statusFilter !== 'all') p.set('status', statusFilter)
    if (courseFilter !== 'all') p.set('courseId', courseFilter)
    return p.toString()
  }, [statusFilter, courseFilter])

  const url = `/api/actions${qs ? `?${qs}` : ''}`
  const { data, error, loading } = useFetch<ActionsData>(url, [refreshKey])

  // Flat list (priority band → status → recency) for the "All actions" tab.
  const flatItems = useMemo<{ group: ActionGroup; item: ActionItem }[]>(() => {
    if (!data) return []
    const priorityRank: Record<string, number> = {
      P0: 0,
      P1: 1,
      P2: 2,
      P3: 3,
    }
    const statusRank: Record<string, number> = {
      Proposed: 0,
      Accepted: 1,
      InProgress: 2,
      Completed: 3,
      Rejected: 4,
    }
    const out: { group: ActionGroup; item: ActionItem }[] = []
    for (const g of data.groups) {
      for (const it of g.items) out.push({ group: g, item: it })
    }
    out.sort((a, b) => {
      const pr =
        (priorityRank[a.item.priorityBand] ?? 9) -
        (priorityRank[b.item.priorityBand] ?? 9)
      if (pr !== 0) return pr
      return (
        (statusRank[a.item.status] ?? 9) - (statusRank[b.item.status] ?? 9)
      )
    })
    return out
  }, [data])

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
        body: JSON.stringify({ action, reasonCode, actor: 'provider', comment }),
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
          description: `Reason: ${reasonCode} · audit-logged`,
        })
      } else if (action === 'start') {
        toast.success('Work started', {
          description: `Status → ${json.status}`,
        })
      } else {
        toast.success('Work completed', {
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

  function viewEvidence(item: ActionItem) {
    // Prefer the first explicit evidence id; fall back to the demand signal id
    // so users can always reach the underlying labour-market evidence.
    if (item.evidenceIds && item.evidenceIds.length > 0) {
      setEvidenceId(item.evidenceIds[0])
    } else if (item.demandSignalId) {
      setEvidenceId(item.demandSignalId)
    } else {
      toast.info('No evidence linked', {
        description: 'This recommendation has no underlying signal.',
      })
    }
  }

  function isActionable(
    item: ActionItem,
    action: 'accept' | 'start' | 'complete' | 'reject'
  ): boolean {
    const s = item.status
    if (action === 'accept') return s === 'Proposed'
    if (action === 'reject') return s === 'Proposed' || s === 'Accepted'
    if (action === 'start') return s === 'Accepted'
    if (action === 'complete') return s === 'InProgress'
    return false
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <Card className="relative border-primary/30 bg-gradient-to-br from-primary/5 via-accent/5 to-background overflow-hidden shadow-soft hover:shadow-soft-lg transition-shadow duration-300">
        <CardContent className="p-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary/15 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-amber-400/10 blur-3xl"
          />
          <div className="relative flex flex-col md:flex-row md:items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0 shadow-soft-lg">
              <ListChecks className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <h2 className="text-3xl font-bold tracking-tight">
                  <span className="text-gradient">{(t.actions as any)?.title ?? 'Action Plans'}</span>
                </h2>
                <Badge
                  variant="secondary"
                  className="text-[10px] uppercase tracking-wider bg-primary/10 text-primary"
                >
                  Trackable work
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {(t.actions as any)?.subtitle ?? 'Convert detected gaps into owned, trackable work — not just another report.'}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                size="sm"
                onClick={() => data && exportActionsCsv(data.groups)}
                disabled={!data || data.groups.length === 0}
                className="bg-primary text-primary-foreground shadow-soft hover:shadow-soft-lg hover:bg-primary/90 transition-shadow duration-300"
              >
                <Download className="h-4 w-4 mr-1.5" /> {(t.actions as any)?.exportCsv ?? 'Export CSV'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status chips — clickable filters */}
      <div className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Filter by status
        </div>
        <Stagger className="flex flex-wrap gap-2">
          <StaggerItem>
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              aria-pressed={statusFilter === 'all'}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                statusFilter === 'all'
                  ? 'border-primary bg-primary text-primary-foreground shadow-soft'
                  : 'border-border bg-muted hover:bg-accent'
              )}
            >
              <Sparkles className="h-3 w-3" />
              {(t.actions as any)?.allStatuses ?? 'All statuses'}
              {data && (
                <span className="rounded-full bg-background/30 px-1.5 py-0.5 text-[10px] font-semibold">
                  <CountUp value={data.count} />
                </span>
              )}
            </button>
          </StaggerItem>
          {STATUS_ORDER.map((s) => {
            const meta = STATUS_CHIP_META[s]
            const Icon = meta.icon
            const count = data?.byStatus[s] ?? 0
            const active = statusFilter === s
            const statusLabel =
              s === 'Proposed' ? (t.actions as any)?.proposed ?? 'Proposed'
                : s === 'Accepted' ? (t.actions as any)?.accepted ?? 'Accepted'
                : s === 'Rejected' ? (t.actions as any)?.rejected ?? 'Rejected'
                : s === 'InProgress' ? (t.actions as any)?.inProgress ?? 'In Progress'
                : s === 'Completed' ? (t.actions as any)?.completed ?? 'Completed'
                : s
            return (
              <StaggerItem key={s}>
                <button
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  aria-pressed={active}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                    active
                      ? 'border-primary bg-primary text-primary-foreground shadow-soft'
                      : 'border-border bg-muted hover:bg-accent'
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {statusLabel}
                  <span className="rounded-full bg-background/40 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
                    <CountUp value={count} />
                  </span>
                </button>
              </StaggerItem>
            )
          })}
        </Stagger>
      </div>

      {/* Filters bar */}
      <Card className="border border-border/60 shadow-soft hover:shadow-soft-lg transition-shadow duration-300">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Eye className="h-4 w-4" />
            View
          </div>
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className="h-9 w-[280px] text-xs">
                <SelectValue placeholder={(t.actions as any)?.allCourses ?? 'All courses'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  {(t.actions as any)?.allCourses ?? 'All courses'}
                </SelectItem>
                {COURSES.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(statusFilter !== 'all' || courseFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusFilter('all')
                  setCourseFilter('all')
                }}
              >
                <XCircle className="h-3.5 w-3.5 mr-1" /> Clear filters
              </Button>
            )}
          </div>
          {data && (
            <Badge variant="secondary" className="text-xs">
              {data.count} {data.count === 1 ? 'action' : 'actions'} matched
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Body */}
      {loading && <ActionsSkeleton />}

      {error && (
        <Card className="border-rose-500/30 shadow-soft">
          <CardContent className="p-4 text-sm text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Failed to load action plans:{' '}
            {error}
          </CardContent>
        </Card>
      )}

      {!loading && !error && data && data.groups.length === 0 && (
        <Card className="border border-border/60 shadow-soft">
          <CardContent className="p-8 flex flex-col items-center justify-center text-center text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 text-teal-500 mb-2" />
            <p className="text-sm font-medium">
              No recommendations match the current filters.
            </p>
            <p className="text-xs mt-1">
              Try clearing the status or course filter.
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && !error && data && data.groups.length > 0 && (
        <Tabs defaultValue="grouped" className="w-full">
          <TabsList className="mb-3">
            <TabsTrigger value="grouped" className="text-xs">
              <Building2 className="h-3.5 w-3.5 mr-1.5" />
              {(t.actions as any)?.byCourse ?? 'By course'} ({data.groups.length})
            </TabsTrigger>
            <TabsTrigger value="flat" className="text-xs">
              <ListChecks className="h-3.5 w-3.5 mr-1.5" />
              {(t.actions as any)?.allActions ?? 'All actions'} ({data.count})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="grouped" className="mt-0">
            <Accordion
              type="multiple"
              defaultValue={data.groups.map((g) => g.course.id)}
              className="space-y-3"
            >
              <Stagger className="space-y-3">
                {data.groups.map((g) => (
                  <StaggerItem key={g.course.id}>
                    <AccordionItem
                      value={g.course.id}
                      className="rounded-lg border border-border/60 bg-card overflow-hidden px-4 shadow-soft hover:shadow-soft-lg transition-shadow duration-300"
                    >
                      <AccordionTrigger className="hover:no-underline">
                        <CourseHeader group={g} />
                      </AccordionTrigger>
                      <AccordionContent className="pb-4 pt-0">
                        <div className="space-y-2">
                          {g.items.map((it) => (
                            <ActionRow
                              key={it.id}
                              item={it}
                              courseCode={g.course.code}
                              submitting={submitting === it.id}
                              onAccept={() => postAction(it.id, 'accept')}
                              onStart={() => postAction(it.id, 'start')}
                              onComplete={() => postAction(it.id, 'complete')}
                              onReject={() =>
                                openRejectDialog(it.id, it.skillLabel)
                              }
                              onViewEvidence={() => viewEvidence(it)}
                              canAccept={isActionable(it, 'accept')}
                              canStart={isActionable(it, 'start')}
                              canComplete={isActionable(it, 'complete')}
                              canReject={isActionable(it, 'reject')}
                            />
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </StaggerItem>
                ))}
              </Stagger>
            </Accordion>
          </TabsContent>

          <TabsContent value="flat" className="mt-0">
            <Card className="border border-border/60 shadow-soft hover:shadow-soft-lg transition-shadow duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-primary" />
                  All recommendations ({data.count})
                </CardTitle>
                <CardDescription className="text-xs">
                  Sorted by priority band, then status. Use the chips above to
                  filter by status.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[720px] overflow-y-auto custom-scroll pr-1">
                <Stagger className="space-y-2">
                  {flatItems.map(({ group, item }) => (
                    <StaggerItem key={item.id}>
                      <ActionRow
                        item={item}
                        courseCode={group.course.code}
                        submitting={submitting === item.id}
                        onAccept={() => postAction(item.id, 'accept')}
                        onStart={() => postAction(item.id, 'start')}
                        onComplete={() => postAction(item.id, 'complete')}
                        onReject={() =>
                          openRejectDialog(item.id, item.skillLabel)
                        }
                        onViewEvidence={() => viewEvidence(item)}
                        canAccept={isActionable(item, 'accept')}
                        canStart={isActionable(item, 'start')}
                        canComplete={isActionable(item, 'complete')}
                        canReject={isActionable(item, 'reject')}
                      />
                    </StaggerItem>
                  ))}
                </Stagger>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Reject dialog */}
      <Dialog
        open={!!rejectTarget}
        onOpenChange={(o) => !o && setRejectTarget(null)}
      >
        <DialogContent className="shadow-soft-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-rose-500" />
              Reject recommendation
            </DialogTitle>
            <DialogDescription>
              {rejectTarget && (
                <>
                  You are rejecting the recommendation for{' '}
                  <span className="font-medium text-foreground">
                    {rejectTarget.skillLabel}
                  </span>
                  . A reason code is required and will be written to the
                  append-only audit log.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Reason code <span className="text-rose-500">*</span>
              </Label>
              <RadioGroup
                value={rejectReason}
                onValueChange={setRejectReason}
                className="mt-2"
              >
                {REJECT_REASONS.map((r) => (
                  <motion.label
                    key={r.code}
                    htmlFor={`r-${r.code}`}
                    whileHover={{ x: 2 }}
                    className={cn(
                      'flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors',
                      rejectReason === r.code
                        ? 'border-primary bg-primary/5 shadow-soft'
                        : 'border-border hover:bg-accent'
                    )}
                  >
                    <RadioGroupItem
                      id={`r-${r.code}`}
                      value={r.code}
                      className="mt-0.5"
                    />
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">{r.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.hint}
                      </div>
                      <code className="text-[10px] text-muted-foreground">
                        {r.code}
                      </code>
                    </div>
                  </motion.label>
                ))}
              </RadioGroup>
            </div>
            <div>
              <Label
                htmlFor="reject-comment"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Comment (optional)
              </Label>
              <Textarea
                id="reject-comment"
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                placeholder="Add context for the audit log…"
                className="mt-2 min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={submitReject}
              disabled={submitting !== null}
            >
              {submitting ? (
                <Clock className="h-4 w-4 mr-1.5 animate-pulse" />
              ) : (
                <XCircle className="h-4 w-4 mr-1.5" />
              )}
              Reject &amp; audit-log
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shared evidence drawer */}
      <EvidenceDrawer
        evidenceId={evidenceId}
        onClose={() => setEvidenceId(null)}
      />
    </div>
  )
}

// ─── Action Plans: sub-components ────────────────────────────────────────────

function CourseHeader({ group }: { group: ActionGroup }) {
  const { t } = useI18n()
  const { course, items } = group
  const counts = items.reduce(
    (acc, it) => {
      acc[it.status] = (acc[it.status] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )
  const orderedStatuses = STATUS_ORDER.filter((s) => (counts[s] || 0) > 0)
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-3 w-full text-left">
      <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 shadow-soft">
        <Building2 className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap border-b border-border/60 pb-2">
          <code className="text-base font-bold font-mono text-primary">{course.code}</code>
          <h3 className="text-base font-bold truncate">{course.name}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
          {course.occupation && (
            <span className="inline-flex items-center gap-1">
              <Target className="h-3 w-3" />
              {course.occupation.preferredLabel}
            </span>
          )}
          {course.district && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {course.district.name}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            {course.institution}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {course.duration} mo
          </span>
          <span className="inline-flex items-center gap-1">
            <ListChecks className="h-3 w-3" />
            {items.length} recs
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
        {orderedStatuses.map((s) => {
          const n = counts[s] || 0
          const meta = STATUS_CHIP_META[s]
          const statusLabel =
            s === 'Proposed' ? (t.actions as any)?.proposed ?? 'Proposed'
              : s === 'Accepted' ? (t.actions as any)?.accepted ?? 'Accepted'
              : s === 'Rejected' ? (t.actions as any)?.rejected ?? 'Rejected'
              : s === 'InProgress' ? (t.actions as any)?.inProgress ?? 'In Progress'
              : s === 'Completed' ? (t.actions as any)?.completed ?? 'Completed'
              : s
          return (
            <span
              key={s}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium',
                meta.color
              )}
            >
              {n} {statusLabel}
            </span>
          )
        })}
      </div>
    </div>
  )
}

interface ActionRowProps {
  item: ActionItem
  courseCode?: string
  submitting: boolean
  onAccept: () => void
  onStart: () => void
  onComplete: () => void
  onReject: () => void
  onViewEvidence: () => void
  canAccept: boolean
  canStart: boolean
  canComplete: boolean
  canReject: boolean
}

function ActionRow({
  item,
  courseCode,
  submitting,
  onAccept,
  onStart,
  onComplete,
  onReject,
  onViewEvidence,
  canAccept,
  canStart,
  canComplete,
  canReject,
}: ActionRowProps) {
  const { t } = useI18n()
  const hasEvidence =
    (item.evidenceIds && item.evidenceIds.length > 0) || !!item.demandSignalId
  return (
    <motion.div
      whileHover={{ x: 2 }}
      className="rounded-md border border-border/60 bg-background/50 even:bg-muted/20 hover:bg-accent/10 hover:shadow-soft-lg transition-all duration-300 p-3 shadow-soft"
    >
      <div className="flex flex-col lg:flex-row lg:items-start gap-3">
        {/* Identity + meta */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {courseCode && (
              <code className="text-[10px] font-mono text-muted-foreground">
                {courseCode}
              </code>
            )}
            <h4 className="text-sm font-semibold">{item.skillLabel}</h4>
            <BucketBadge bucket={item.bucket} />
            <PriorityBadge band={item.priorityBand} />
            <StatusBadge status={item.status} />
          </div>
          {item.rationale && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              {item.rationale}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              <span className="font-medium">{item.actionType}</span>
            </span>
            {item.suggestedOwner && (
              <span className="inline-flex items-center gap-1">
                <OwnerIconDisplay owner={item.suggestedOwner || ''} />
                <span className="font-medium">{item.suggestedOwner}</span>
              </span>
            )}
            {item.rejectionReason && (
              <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
                <XCircle className="h-3 w-3" />
                <code className="text-[10px]">{item.rejectionReason}</code>
              </span>
            )}
            {hasEvidence && (
              <span className="inline-flex items-center gap-1 text-teal-600 dark:text-teal-400">
                <ShieldCheck className="h-3 w-3" />
                <span className="text-[10px]">
                  {item.evidenceIds.length || 1} evidence link
                  {(item.evidenceIds.length || 1) > 1 ? 's' : ''}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0 flex-wrap lg:justify-end">
          {canAccept && (
            <Button
              size="sm"
              className="h-7 text-xs bg-teal-500/15 text-teal-800 hover:bg-teal-500/25 border border-teal-500/40 dark:text-teal-300 transition-colors"
              onClick={onAccept}
              disabled={submitting}
            >
              {submitting ? (
                <Clock className="h-3 w-3 mr-1 animate-pulse" />
              ) : (
                <CheckCircle2 className="h-3 w-3 mr-1" />
              )}
              Accept
            </Button>
          )}
          {canStart && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border border-amber-500/30 dark:text-amber-300"
              onClick={onStart}
              disabled={submitting}
            >
              {submitting ? (
                <Clock className="h-3 w-3 mr-1 animate-pulse" />
              ) : (
                <Activity className="h-3 w-3 mr-1" />
              )}
              Start
            </Button>
          )}
          {canComplete && (
            <Button
              size="sm"
              className="h-7 text-xs bg-primary text-primary-foreground shadow-soft hover:bg-primary/90"
              onClick={onComplete}
              disabled={submitting}
            >
              {submitting ? (
                <Clock className="h-3 w-3 mr-1 animate-pulse" />
              ) : (
                <Trophy className="h-3 w-3 mr-1" />
              )}
              Complete
            </Button>
          )}
          {canReject && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs bg-rose-500/15 text-rose-800 hover:bg-rose-500/25 border border-rose-500/40 dark:text-rose-300 transition-colors"
              onClick={onReject}
              disabled={submitting}
            >
              <XCircle className="h-3 w-3 mr-1" />
              Reject
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={onViewEvidence}
            disabled={!hasEvidence}
            title={hasEvidence ? ((t.candidate as any)?.viewEvidenceTrail ?? 'View evidence trail') : ((t.candidate as any)?.noEvidenceLinked ?? 'No evidence linked')}
          >
            <Eye className="h-3 w-3 mr-1" />
            Evidence
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

function ActionsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }, (_, i) => (
        <Card key={i} className="border border-border/60 shadow-soft">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-md" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {Array.from({ length: 3 }, (_, j) => (
              <Skeleton key={j} className="h-20 w-full rounded-md" />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ─── Candidate Readiness: main component ─────────────────────────────────────

export function CandidateReadiness() {
  const { t } = useI18n()
  const { data, error, loading } = useFetch<CandidateData>('/api/candidate')

  return (
    <div className="space-y-8">
      {/* Header */}
      <Card className="relative border-primary/30 bg-gradient-to-br from-primary/5 via-accent/5 to-background overflow-hidden shadow-soft hover:shadow-soft-lg transition-shadow duration-300">
        <CardContent className="p-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary/15 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-amber-400/10 blur-3xl"
          />
          <div className="relative flex flex-col md:flex-row md:items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0 shadow-soft-lg">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <h2 className="text-3xl font-bold tracking-tight">
                  <span className="text-gradient">{(t.candidate as any)?.title ?? 'Candidate Readiness'}</span>
                </h2>
                <Badge
                  variant="secondary"
                  className="text-[10px] uppercase tracking-wider bg-primary/10 text-primary"
                >
                  Personalised
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {(t.candidate as any)?.subtitle ?? 'Personal market readiness, with honest district/sector demand context.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading && <CandidateSkeleton />}

      {error && (
        <Card className="border-rose-500/30 shadow-soft">
          <CardContent className="p-4 text-sm text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Failed to load candidate data:{' '}
            {error}
          </CardContent>
        </Card>
      )}

      {!loading && !error && data && (
        <>
          {/* Hero readiness row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
            <Card className="lg:col-span-1 border border-border/60 shadow-soft hover:shadow-soft-lg transition-shadow duration-300 h-full">
              <CardContent className="px-6 pb-6 flex flex-col items-center justify-start text-center h-full">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  {(t.candidate as any)?.overallReadiness ?? 'Overall Readiness'}
                </div>
                <ReadinessRing value={data.overallReadiness} size={160} />
                <div className="mt-3 text-xs text-muted-foreground leading-relaxed">
                  {(t.candidate as any)?.weightedByEssentiality ?? 'Weighted by essentiality'} ·{' '}
                  <span className="font-semibold text-foreground">
                    <CountUp value={data.matchedSkills} />/
                    <CountUp value={data.totalSkills} />
                  </span>{' '}
                  {(t.candidate as any)?.skillsMet ?? 'skills met'}
                </div>
              </CardContent>
            </Card>
            <Stagger className="lg:col-span-2 grid grid-cols-2 gap-4 items-stretch">
              <StaggerItem>
                <StatCard
                  icon={BookOpen}
                  label={(t.candidate as any)?.totalSkills ?? 'Total Skills'}
                  value={data.totalSkills}
                  hint={(t.candidate as any)?.hintDemandedByOccupation ?? 'Demanded by occupation'}
                  tone="slate"
                />
              </StaggerItem>
              <StaggerItem>
                <StatCard
                  icon={CheckCircle2}
                  label={(t.candidate as any)?.matchedSkills ?? 'Matched'}
                  value={data.matchedSkills}
                  hint={(t.candidate as any)?.hintAssessedGeDemanded ?? 'Assessed ≥ demanded'}
                  tone="teal"
                />
              </StaggerItem>
              <StaggerItem>
                <StatCard
                  icon={Target}
                  label={(t.candidate as any)?.gapSkills ?? 'Gaps'}
                  value={data.gapSkills}
                  hint={(t.candidate as any)?.hintBelowDemanded ?? 'Below demanded proficiency'}
                  tone="rose"
                />
              </StaggerItem>
              <StaggerItem>
                <StatCard
                  icon={Activity}
                  label={(t.candidate as any)?.localSignals ?? 'Local signals'}
                  value={data.context.signalsForOccupation}
                  hint={`Demand signals · ${data.context.districtName}`}
                  tone="amber"
                />
              </StaggerItem>
            </Stagger>
          </div>

          {/* Candidate info strip */}
          <Card className="border border-border/60 shadow-soft hover:shadow-soft-lg transition-shadow duration-300">
            <CardContent className="p-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-semibold">
                    {data.candidate.name}
                  </div>
                  <div className="text-muted-foreground">
                    Candidate ID ·{' '}
                    <code className="text-[10px]">{data.candidate.id}</code>
                  </div>
                </div>
              </div>
              <Separator
                orientation="vertical"
                className="hidden md:block h-8"
              />
              <div className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium">
                  {data.candidate.occupation.label}
                </span>
                <code className="text-[10px] text-muted-foreground">
                  {data.candidate.occupation.code}
                </code>
              </div>
              <Separator
                orientation="vertical"
                className="hidden md:block h-8"
              />
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium">{data.candidate.district}</span>
              </div>
            </CardContent>
          </Card>

          {/* Disclaimer banner — honest demand context (no employment guarantee) */}
          <div className="rounded-lg border border-amber-500/40 border-l-4 bg-amber-500/15 p-4 flex items-start gap-3 shadow-soft">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5 animate-soft-pulse" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                Honest demand context — no employment guarantee
              </div>
              <p className="text-xs text-amber-800/90 dark:text-amber-200/80 mt-0.5 leading-relaxed">
                {data.context.disclaimer}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
                <span className="inline-flex items-center gap-1 text-amber-800/80 dark:text-amber-200/70">
                  <Activity className="h-3 w-3" />
                  {data.context.signalsForOccupation} validated signals for{' '}
                  {data.candidate.occupation.label}
                </span>
                <span className="inline-flex items-center gap-1 text-amber-800/80 dark:text-amber-200/70">
                  <MapPin className="h-3 w-3" />
                  {data.context.districtName}
                </span>
                <span className="inline-flex items-center gap-1 text-amber-800/80 dark:text-amber-200/70">
                  <ShieldCheck className="h-3 w-3" />
                  Computed against ESCO-anchored demand only
                </span>
              </div>
            </div>
          </div>

          {/* Two-column body */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: skill-by-skill readiness */}
            <Card className="border border-border/60 shadow-soft hover:shadow-soft-lg transition-shadow duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Skill-by-skill readiness
                </CardTitle>
                <CardDescription className="text-xs">
                  Demanded vs assessed proficiency (L1–L5). Higher is better.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[640px] overflow-y-auto custom-scroll pr-1">
                <Stagger className="space-y-2">
                  {data.items.map((it) => (
                    <StaggerItem key={it.skillId}>
                      <SkillRow item={it} />
                    </StaggerItem>
                  ))}
                </Stagger>
              </CardContent>
            </Card>

            {/* Right: priority learning sequence */}
            <Card className="border border-border/60 shadow-soft hover:shadow-soft-lg transition-shadow duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  {(t.candidate as any)?.learningSequence ?? 'Priority learning sequence'}
                </CardTitle>
                <CardDescription className="text-xs">
                  Ordered by essentiality → emerging → gap size. Tackle the top
                  of the list first.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[640px] overflow-y-auto custom-scroll pr-1">
                {data.learningSequence.length === 0 ? (
                  <div className="text-center py-10 text-sm text-muted-foreground">
                    <Trophy className="h-8 w-8 text-teal-500 mx-auto mb-2" />
                    {(t.candidate as any)?.noGaps ?? 'No gaps — all skills at target proficiency!'}
                  </div>
                ) : (
                  <Stagger className="space-y-2">
                    {data.learningSequence.map((step) => (
                      <StaggerItem key={step.skillId}>
                        <LearningStepRow step={step} />
                      </StaggerItem>
                    ))}
                  </Stagger>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Candidate Readiness: sub-components ─────────────────────────────────────

function ReadinessRing({ value, size = 180 }: { value: number; size?: number }) {
  const { t } = useI18n()
  const stroke = 12
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (value / 100) * c
  const color = readinessHex(value)
  const label = readinessLabel(value)
  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Overall readiness ${value} percent — ${label}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="none"
          className="text-muted-foreground/15"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeLinecap="round"
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: [0.32, 0.72, 0, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-5xl font-bold tracking-tight tabular-nums leading-none"
          style={{ color }}
        >
          <CountUp value={value} suffix="%" />
        </span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
          {(t.candidate as any)?.readiness ?? 'readiness'}
        </span>
        <span
          className="text-xs mt-1.5 font-semibold"
          style={{ color }}
        >
          {label}
        </span>
      </div>
    </div>
  )
}

interface StatCardProps {
  icon: typeof BookOpen
  label: string
  value: number
  hint: string
  tone: 'teal' | 'rose' | 'amber' | 'slate' | 'violet'
}

function StatCard({ icon: Icon, label, value, hint, tone }: StatCardProps) {
  const tones: Record<StatCardProps['tone'], string> = {
    teal: 'text-teal-600 dark:text-teal-400 bg-teal-500/10',
    rose: 'text-rose-600 dark:text-rose-400 bg-rose-500/10',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
    slate: 'text-slate-600 dark:text-slate-400 bg-slate-500/10',
    violet: 'text-violet-600 dark:text-violet-400 bg-violet-500/10',
  }
  return (
    <Card className="border border-border/60 shadow-soft hover:shadow-soft-lg transition-shadow duration-300 h-full">
      <CardContent className="p-4 h-full">
        <div className="flex items-start justify-between gap-2 h-full">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </div>
            <div className="text-2xl font-bold tabular-nums mt-1">
              <CountUp value={value} />
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {hint}
            </div>
          </div>
          <div
            className={cn(
              'h-8 w-8 rounded-md flex items-center justify-center flex-shrink-0',
              tones[tone]
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SkillRow({ item }: { item: CandidateSkill }) {
  const { t } = useI18n()
  const pct = item.readiness
  const color = readinessColor(pct)
  return (
    <div className="rounded-md border border-border/60 bg-background/50 hover:bg-accent/10 hover:shadow-soft-lg transition-all duration-300 p-3 shadow-soft">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-semibold truncate">{item.label}</h4>
            {item.essential && (
              <Badge
                variant="outline"
                className="text-[10px] py-0 px-1 border-rose-500/30 text-rose-700 dark:text-rose-300 bg-rose-500/5"
              >
                Essential
              </Badge>
            )}
            {item.isEmerging && (
              <Badge
                variant="outline"
                className="text-[10px] py-0 px-1 border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/5"
              >
                <CircleDot className="h-2.5 w-2.5 mr-1" />
                Emerging
              </Badge>
            )}
            {item.isDeclining && (
              <Badge
                variant="outline"
                className="text-[10px] py-0 px-1 border-slate-500/30 text-slate-700 dark:text-slate-300 bg-slate-500/5"
              >
                Declining
              </Badge>
            )}
          </div>
          <code className="text-[10px] text-muted-foreground truncate block mt-0.5">
            {item.uri}
          </code>
        </div>
        <div className="flex-shrink-0 text-right">
          <div className={cn('text-lg font-bold tabular-nums', color)}>
            <CountUp value={pct} suffix="%" />
          </div>
          <div className="text-[10px] text-muted-foreground">{(t.candidate as any)?.readiness ?? 'readiness'}</div>
        </div>
      </div>
      {/* Demanded vs assessed */}
      <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground mb-2">
        <span className="inline-flex items-center gap-1">
          <Target className="h-3 w-3" />
          {(t.candidate as any)?.demanded ?? 'Demanded'}
          <ProficiencyDots level={item.demandedProficiency} />
        </span>
        <ArrowRight className="h-3 w-3" />
        <span className="inline-flex items-center gap-1">
          <GraduationCap className="h-3 w-3" />
          {(t.candidate as any)?.assessed ?? 'Assessed'}
          <ProficiencyDots level={item.assessedProficiency} />
        </span>
        {item.gap > 0 && (
          <span className="ml-auto inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
            <ChevronRight className="h-3 w-3" />
            {(t.candidate as any)?.gap ?? 'gap'} {item.gap}
          </span>
        )}
        {item.gap === 0 && (
          <span className="ml-auto inline-flex items-center gap-1 text-teal-600 dark:text-teal-400 font-medium">
            <CheckCircle2 className="h-3 w-3" />
            met
          </span>
        )}
      </div>
      <AnimatedBar
        value={pct}
        className="h-1.5"
        colorClass={readinessBarClass(pct)}
        delay={0.1}
      />
    </div>
  )
}

function LearningStepRow({ step }: { step: LearningStep }) {
  return (
    <motion.div
      whileHover={{ x: 4 }}
      className="rounded-md border border-border/60 bg-background/50 hover:bg-accent/10 hover:shadow-soft-lg transition-all duration-300 p-3 flex items-start gap-3 shadow-soft"
    >
      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-sm shadow-soft">
        {step.rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="text-sm font-semibold truncate">{step.label}</h4>
          {step.essential && (
            <Badge
              variant="outline"
              className="text-[10px] py-0 px-1 border-rose-500/30 text-rose-700 dark:text-rose-300 bg-rose-500/5"
            >
              Essential
            </Badge>
          )}
          {step.isEmerging && (
            <Badge
              variant="outline"
              className="text-[10px] py-0 px-1 border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/5"
            >
              <CircleDot className="h-2.5 w-2.5 mr-1" />
              Emerging
            </Badge>
          )}
        </div>
        <code className="text-[10px] text-muted-foreground truncate block mt-0.5">
          {step.uri}
        </code>
        <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <GraduationCap className="h-3 w-3" />
            <ProficiencyDots level={step.current} />
          </span>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <span className="inline-flex items-center gap-1 text-primary font-medium">
            <Target className="h-3 w-3" />
            <ProficiencyDots level={step.target} />
          </span>
          <Badge
            variant="outline"
            className="ml-auto text-[10px] py-0 px-1.5 border-rose-500/30 text-rose-700 dark:text-rose-300 bg-rose-500/5"
          >
            +{step.gap} level{step.gap > 1 ? 's' : ''} to close
          </Badge>
        </div>
      </div>
    </motion.div>
  )
}

function CandidateSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1 shadow-soft">
          <CardContent className="p-6 flex flex-col items-center">
            <Skeleton className="h-3 w-24 mb-3" />
            <Skeleton className="h-44 w-44 rounded-full" />
            <Skeleton className="h-3 w-32 mt-3" />
          </CardContent>
        </Card>
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Card key={i} className="shadow-soft">
              <CardContent className="p-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-8 w-16 mt-2" />
                <Skeleton className="h-2 w-full mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <Skeleton className="h-14 w-full rounded-lg" />
      <Skeleton className="h-20 w-full rounded-lg" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 2 }, (_, i) => (
          <Card key={i} className="shadow-soft">
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-3 w-3/4" />
            </CardHeader>
            <CardContent className="space-y-2">
              {Array.from({ length: 4 }, (_, j) => (
                <Skeleton key={j} className="h-24 w-full rounded-md" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
