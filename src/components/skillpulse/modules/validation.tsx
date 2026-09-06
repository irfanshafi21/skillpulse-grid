'use client'

// SkillPulse Grid — Employer Validation Quorum module (SIH26134, PRD §3.5)
// Lets verified employers / domain experts confirm, reject, or qualify detected
// demand signals before they can drive curriculum change, via a weighted,
// auditable, immutable promotion mechanism.

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  ShieldCheck,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  Clock,
  AlertTriangle,
  Building2,
  CheckCircle2,
  XCircle,
  Download,
  Users,
  Scale,
  Calendar,
  Bell,
  RefreshCw,
  FileSearch,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFetch } from '@/lib/skillpulse/useFetch'
import { EvidenceDrawer } from '@/components/skillpulse/evidence-drawer'
import {
  CountUp,
  AnimatedBar,
  Stagger,
  StaggerItem,
} from '@/lib/skillpulse/motion'
import { toast } from 'sonner'
import { useI18n } from '@/lib/skillpulse/i18n'

// ─── Types ────────────────────────────────────────────────────────────────

type ValidationStatus = 'Open' | 'Promoted' | 'Rejected' | 'Expired'
type ResponseType = 'Confirm' | 'Reject' | 'Qualify'

interface SkillRef {
  id: string
  uri: string
  preferredLabel: string
  isEmerging?: boolean
  isDeclining?: boolean
}

interface ValidationResponseRow {
  id: string
  employer: string
  employerOrgId: string
  weight: number
  responseType: ResponseType
  reasonCode: string | null
  comment: string | null
  respondedAt: string
}

interface ValidationSummary {
  confirm: number
  reject: number
  qualify: number
  distinctOrgs: number
  weightedScore: number
  positiveRatio: number
  topOrgConcentration: number
  concentrationFlag: boolean
  meetsQuorum: boolean
}

interface ValidationRequestItem {
  id: string
  skill: SkillRef
  district: string | null
  sector: string
  message: string
  status: ValidationStatus
  threshold: number
  minOrganizations: number
  positiveRatioThreshold: number
  deadline: string
  createdAt: string
  responses: ValidationResponseRow[]
  summary: ValidationSummary
}

interface ValidationListResponse {
  count: number
  items: ValidationRequestItem[]
}

// ─── Constants ────────────────────────────────────────────────────────────

const STATUS_TABS: { id: 'All' | ValidationStatus; label: string }[] = [
  { id: 'All', label: 'All' },
  { id: 'Open', label: 'Open' },
  { id: 'Promoted', label: 'Promoted' },
  { id: 'Rejected', label: 'Rejected' },
  { id: 'Expired', label: 'Expired' },
]

// Semantic status colors: Promoted=teal, Rejected=rose, Open=amber, Expired=slate.
const STATUS_BADGE_CLASS: Record<ValidationStatus, string> = {
  Promoted: 'bg-teal-500/10 text-teal-700 border-teal-500/30 dark:text-teal-300',
  Rejected: 'bg-rose-500/10 text-rose-700 border-rose-500/30 dark:text-rose-300',
  Open: 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300',
  Expired: 'bg-slate-500/10 text-slate-700 border-slate-500/30 dark:text-slate-300',
}

const EMPLOYERS: { id: string; name: string }[] = [
  { id: 'emp_0001', name: 'Persistent Systems' },
  { id: 'emp_0002', name: 'TCS Digital' },
  { id: 'emp_0003', name: 'Infosys BPM' },
  { id: 'emp_0004', name: 'Wipro Digital' },
  { id: 'emp_0005', name: 'ZS Associates' },
  { id: 'emp_0006', name: 'Cognizant India' },
  { id: 'emp_0007', name: 'Capgemini Tech' },
  { id: 'emp_0008', name: 'Birlasoft' },
]

const REASON_CODES: { code: string; label: string; hint: string }[] = [
  { code: 'POSTING_VOLUME_TOO_LOW', label: 'Posting volume too low', hint: 'Demand is too thin to warrant curriculum action.' },
  { code: 'RELEVANCE_GAP', label: 'Relevance gap', hint: 'Skill does not match the role profile.' },
  { code: 'OBSOLETE_SKILL', label: 'Obsolete skill', hint: 'Demand is legacy / being phased out.' },
  { code: 'ROLE_SPECIFIC_ONLY', label: 'Role-specific only', hint: 'Relevant only to a narrow senior role, not entry-level.' },
  { code: 'OTHER', label: 'Other', hint: 'Add a comment to explain.' },
]

const RESPONSE_OPTIONS: {
  value: ResponseType
  label: string
  hint: string
  color: string
  icon: typeof ThumbsUp
}[] = [
  {
    value: 'Confirm',
    label: 'Confirm',
    hint: 'Yes — we see this demand in our hiring pipeline.',
    color: 'text-teal-600 dark:text-teal-400',
    icon: ThumbsUp,
  },
  {
    value: 'Reject',
    label: 'Reject',
    hint: 'No — demand is inflated, obsolete, or irrelevant.',
    color: 'text-rose-600 dark:text-rose-400',
    icon: ThumbsDown,
  },
  {
    value: 'Qualify',
    label: 'Qualify',
    hint: 'Only in specific contexts / role levels.',
    color: 'text-amber-600 dark:text-amber-400',
    icon: HelpCircle,
  },
]

// 14-day response window. Reminders fire at day 7 and day 12 from createdAt.
const RESPONSE_WINDOW_DAYS = 14
const REMINDER_DAYS = [7, 12]

// ─── Helpers ─────────────────────────────────────────────────────────────

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

function daysUntilDeadline(deadlineIso: string): number {
  const now = new Date()
  const d = new Date(deadlineIso)
  return daysBetween(now, d)
}

function daysSince(createdAtIso: string): number {
  const now = new Date()
  return daysBetween(new Date(createdAtIso), now)
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  })
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`
}

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n * 100)))
}

function reminderFlags(createdAtIso: string): { fired: number[]; nextAt: number | null } {
  const elapsed = daysSince(createdAtIso)
  const fired = REMINDER_DAYS.filter((d) => elapsed >= d).sort((a, b) => a - b)
  const next = REMINDER_DAYS.filter((d) => elapsed < d).sort((a, b) => a - b)[0] ?? null
  return { fired, nextAt: next }
}

// Pick a quorum-bar fill color: violet when threshold met, amber when close
// (≥ 50% of target), rose when failing badly (< 50%).
function quorumBarColor(meets: boolean, current: number, target: number): string {
  if (meets) return 'bg-primary'
  const ratio = target > 0 ? current / target : 0
  if (ratio >= 0.5) return 'bg-amber-500'
  return 'bg-rose-500'
}

// Build a CSV audit trail for a single validation request.
function buildAuditCsv(req: ValidationRequestItem): string {
  const header = [
    'responseId',
    'requestId',
    'skill',
    'skillUri',
    'district',
    'sector',
    'employer',
    'employerOrgId',
    'employerWeight',
    'responseType',
    'reasonCode',
    'comment',
    'respondedAt',
    'requestStatus',
    'threshold',
    'minOrganizations',
    'positiveRatioThreshold',
    'summaryConfirm',
    'summaryReject',
    'summaryQualify',
    'summaryDistinctOrgs',
    'summaryWeightedScore',
    'summaryPositiveRatio',
    'summaryTopOrgConcentration',
    'summaryConcentrationFlag',
    'summaryMeetsQuorum',
    'deadline',
    'createdAt',
  ]
  const rows = [header.join(',')]
  const base = [
    req.id,
    csv(req.skill.preferredLabel),
    csv(req.skill.uri),
    csv(req.district ?? ''),
    csv(req.sector),
    req.status,
    req.threshold,
    req.minOrganizations,
    req.positiveRatioThreshold,
    req.summary.confirm,
    req.summary.reject,
    req.summary.qualify,
    req.summary.distinctOrgs,
    req.summary.weightedScore,
    req.summary.positiveRatio,
    req.summary.topOrgConcentration,
    req.summary.concentrationFlag,
    req.summary.meetsQuorum,
    csv(req.deadline),
    csv(req.createdAt),
  ]
  if (req.responses.length === 0) {
    rows.push(base.join(','))
  } else {
    for (const r of req.responses) {
      rows.push(
        [
          r.id,
          ...base.slice(0, 5),
          csv(r.employer),
          csv(r.employerOrgId),
          r.weight,
          r.responseType,
          csv(r.reasonCode ?? ''),
          csv(r.comment ?? ''),
          csv(r.respondedAt),
          ...base.slice(5),
        ].join(',')
      )
    }
  }
  return rows.join('\n')
}

function csv(s: string): string {
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ─── Component ───────────────────────────────────────────────────────────

export function ValidationQuorum() {
  const { t } = useI18n()
  const [statusFilter, setStatusFilter] = useState<'All' | ValidationStatus>('All')
  const [evidenceId, setEvidenceId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [respondTarget, setRespondTarget] = useState<ValidationRequestItem | null>(null)

  const url = useMemo(() => {
    const qs = statusFilter === 'All' ? '' : `?status=${statusFilter}`
    return `/api/validations${qs}`
  }, [statusFilter])

  const { data, loading, error } = useFetch<ValidationListResponse>(url, [refreshKey])

  const items = data?.items ?? []

  // KPIs across all items (not just filtered) — but we only have the filtered
  // payload available; fall back to filtered items for the summary tiles.
  const stats = useMemo(() => {
    const total = items.length
    const promoted = items.filter((i) => i.status === 'Promoted').length
    const rejected = items.filter((i) => i.status === 'Rejected').length
    const pending = items.filter((i) => i.status === 'Open' || i.status === 'Expired').length
    return { total, promoted, rejected, pending }
  }, [items])

  return (
    <div className="space-y-8">
      {/* ─── Heading hero ─── */}
      <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/8 via-accent/5 to-background shadow-soft hover:shadow-soft-lg transition-shadow duration-300">
        {/* Decorative gradient orbs */}
        <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-amber-400/10 blur-3xl" />
        <CardHeader className="relative">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-3xl font-bold">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-soft">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <span className="text-gradient">{(t.validation as any)?.title ?? 'Employer Validation Quorum'}</span>
              </CardTitle>
              <CardDescription className="text-sm">
                {(t.validation as any)?.subtitle ?? 'Real employers confirm detected demand before it can drive curriculum change.'}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 dark:text-primary gap-1 rounded-full">
                <Clock className="h-3 w-3" /> 14-day window
              </Badge>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300 gap-1 rounded-full">
                <Scale className="h-3 w-3" /> {(t.validation as any)?.weightedThreshold ?? 'Weighted threshold'} 2.0
              </Badge>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 dark:text-primary gap-1 rounded-full">
                <Users className="h-3 w-3" /> ≥ 3 distinct orgs
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* ─── Status filter + KPI tiles (staggered) ─── */}
      <Stagger className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <StaggerItem className="lg:col-span-4">
          <Card className="border border-border/60 shadow-soft hover:shadow-soft-lg transition-shadow duration-300 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <FileSearch className="h-3.5 w-3.5" /> {(t.validation as any)?.statusFilter ?? 'Status filter'}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as 'All' | ValidationStatus)}
              >
                <SelectTrigger className="w-full border-border hover:border-primary/40 transition-colors">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_TABS.map((tab) => {
                    const label =
                      tab.id === 'All' ? (t.validation as any)?.all ?? 'All'
                        : tab.id === 'Open' ? (t.validation as any)?.open ?? 'Open'
                        : tab.id === 'Promoted' ? (t.validation as any)?.promoted ?? 'Promoted'
                        : tab.id === 'Rejected' ? (t.validation as any)?.rejected ?? 'Rejected'
                        : tab.id === 'Expired' ? (t.validation as any)?.expired ?? 'Expired'
                        : tab.label
                    return (
                      <SelectItem key={tab.id} value={tab.id}>
                        {label}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Showing {items.length} request{items.length === 1 ? '' : 's'}
                {statusFilter !== 'All' ? ` with status ${statusFilter}` : ' across all statuses'}.
              </p>
            </CardContent>
          </Card>
        </StaggerItem>

        <StaggerItem className="lg:col-span-2">
          <KpiTile
            label={(t.validation as any)?.total ?? 'Total'}
            value={stats.total}
            icon={ShieldCheck}
            color="text-slate-700 dark:text-slate-300"
            dot="bg-slate-400"
          />
        </StaggerItem>
        <StaggerItem className="lg:col-span-2">
          <KpiTile
            label={(t.validation as any)?.promoted ?? 'Promoted'}
            value={stats.promoted}
            icon={CheckCircle2}
            color="text-teal-700 dark:text-teal-300"
            dot="bg-teal-500"
          />
        </StaggerItem>
        <StaggerItem className="lg:col-span-2">
          <KpiTile
            label={(t.validation as any)?.rejected ?? 'Rejected'}
            value={stats.rejected}
            icon={XCircle}
            color="text-rose-700 dark:text-rose-300"
            dot="bg-rose-500"
          />
        </StaggerItem>
        <StaggerItem className="lg:col-span-2">
          <KpiTile
            label={(t.validation as any)?.pending ?? 'Pending'}
            value={stats.pending}
            icon={Clock}
            color="text-amber-700 dark:text-amber-300"
            dot="bg-amber-500"
          />
        </StaggerItem>
      </Stagger>

      {/* ─── Validation request list ─── */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-lg shadow-soft" />
          ))}
        </div>
      ) : error ? (
        <Card className="border border-rose-500/40 shadow-soft hover:shadow-soft-lg transition-shadow duration-300">
          <CardContent className="py-10 text-center text-sm text-rose-700 dark:text-rose-300">
            <AlertTriangle className="mx-auto h-6 w-6 mb-2" />
            Failed to load validation requests: {error}
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card className="border-dashed border-border/60 shadow-soft">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            <ShieldCheck className="mx-auto h-8 w-8 mb-2 opacity-40" />
            No validation requests match this filter.
          </CardContent>
        </Card>
      ) : (
        <Stagger
          key={statusFilter}
          className="max-h-[700px] overflow-y-auto custom-scroll space-y-4 pr-1"
        >
          {items.map((req) => (
            <StaggerItem key={req.id}>
              <ValidationRequestCard
                req={req}
                onRespond={() => setRespondTarget(req)}
                onEvidence={() => setEvidenceId(req.id)}
              />
            </StaggerItem>
          ))}
        </Stagger>
      )}

      {/* ─── Respond dialog ─── */}
      <RespondDialog
        target={respondTarget}
        onClose={() => setRespondTarget(null)}
        onSubmitted={() => {
          setRespondTarget(null)
          setRefreshKey((k) => k + 1)
        }}
      />

      {/* ─── Evidence drawer (rendered once, at end) ─── */}
      <EvidenceDrawer evidenceId={evidenceId} onClose={() => setEvidenceId(null)} />
    </div>
  )
}

// ─── KPI tile ─────────────────────────────────────────────────────────────

function KpiTile({
  label,
  value,
  icon: Icon,
  color,
  dot,
  className,
}: {
  label: string
  value: number
  icon: typeof ShieldCheck
  color: string
  dot: string
  className?: string
}) {
  return (
    <Card className={cn('relative overflow-hidden border border-border/60 shadow-soft hover:shadow-soft-lg transition-shadow duration-300 h-full', className)}>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          <Icon className={cn('h-4 w-4', color)} />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold">
            <CountUp value={value} />
          </span>
          <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Validation request card ─────────────────────────────────────────────

function ValidationRequestCard({
  req,
  onRespond,
  onEvidence,
}: {
  req: ValidationRequestItem
  onRespond: () => void
  onEvidence: () => void
}) {
  const { t } = useI18n()
  const daysLeft = daysUntilDeadline(req.deadline)
  const elapsed = daysSince(req.createdAt)
  const reminders = reminderFlags(req.createdAt)
  const expired = req.status === 'Expired' || daysLeft < 0
  const s = req.summary

  const meetsOrgs = s.distinctOrgs >= req.minOrganizations
  const meetsScore = s.weightedScore >= req.threshold
  const meetsRatio = s.positiveRatio >= req.positiveRatioThreshold

  // Deadline color escalation: teal (>3d) → amber (1–3d) → rose (<1d) → slate (expired).
  // Pulse the clock when <3 days remain (and not yet expired).
  const deadlineUrgent = !expired && daysLeft < 3
  const deadlineClass = expired
    ? 'bg-slate-500/10 text-slate-700 border-slate-500/40 dark:text-slate-300'
    : daysLeft < 1
    ? 'bg-rose-500/15 text-rose-700 border-rose-500/40 dark:text-rose-300'
    : daysLeft <= 3
    ? 'bg-amber-500/15 text-amber-700 border-amber-500/40 dark:text-amber-300'
    : 'bg-teal-500/15 text-teal-800 border-teal-500/40 dark:text-teal-200'

  return (
    <Card
      className={cn(
        'overflow-hidden border border-border/60 shadow-soft hover:shadow-soft-lg transition-shadow duration-300',
        req.status === 'Promoted' && 'border-teal-500/50',
        req.status === 'Rejected' && 'border-rose-500/50',
        req.status === 'Open' && 'border-amber-500/50',
        req.status === 'Expired' && 'border-slate-500/50',
      )}
    >
      <CardHeader className="pb-3">
        {/* Header row: skill + badges + deadline */}
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">{req.skill.preferredLabel}</CardTitle>
              {req.skill.isEmerging && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300 rounded-full">
                  Emerging
                </Badge>
              )}
              {req.skill.isDeclining && (
                <Badge variant="outline" className="bg-slate-500/10 text-slate-700 border-slate-500/30 dark:text-slate-300 rounded-full">
                  Declining
                </Badge>
              )}
              <Badge
                variant="outline"
                className={cn('border font-semibold rounded-full', STATUS_BADGE_CLASS[req.status])}
              >
                {req.status}
              </Badge>
              {s.meetsQuorum && (
                <Badge variant="outline" className="bg-teal-500/10 text-teal-700 border-teal-500/30 dark:text-teal-300 gap-1 rounded-full">
                  <CheckCircle2 className="h-3 w-3" /> {(t.validation as any)?.quorumMet ?? 'Quorum met'}
                </Badge>
              )}
            </div>
            <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-3 w-3" /> {req.sector}
              </span>
              {req.district && (
                <span className="inline-flex items-center gap-1">
                  <span className="text-muted-foreground">·</span> {req.district}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <code className="rounded bg-muted px-1 py-0.5 text-[10px]">{req.skill.uri}</code>
              </span>
            </CardDescription>
          </div>

          {/* Deadline countdown */}
          <div className="flex flex-col items-end gap-1">
            <div
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium',
                deadlineClass,
              )}
            >
              <Clock className={cn('h-3 w-3', deadlineUrgent && 'animate-soft-pulse')} />
              {expired
                ? `Expired ${Math.abs(daysLeft)}d ago`
                : `${daysLeft}d left`}
            </div>
            <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" /> {(t.validation as any)?.deadline ?? 'Deadline'} {formatDate(req.deadline)}
            </span>
          </div>
        </div>

        {/* Reminder badges */}
        {reminders.fired.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {reminders.fired.map((d) => (
              <Badge
                key={d}
                variant="outline"
                className="bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300 gap-1 rounded-full"
              >
                <Bell className="h-3 w-3" /> Day-{d} reminder sent
              </Badge>
            ))}
            {reminders.nextAt && (
              <span className="text-[10px] text-muted-foreground">
                Next reminder at day {reminders.nextAt}
              </span>
            )}
          </div>
        )}
        {!reminders.fired.length && reminders.nextAt && (
          <div className="pt-1">
            <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
              <Bell className="h-3 w-3" /> {(t.validation as any)?.reminderAt ?? 'Reminder at day'} {reminders.nextAt} · {(t.validation as any)?.window ?? 'window'} {RESPONSE_WINDOW_DAYS}d · {(t.validation as any)?.elapsed ?? 'elapsed'} {elapsed}d
            </span>
          </div>
        )}

        {/* Concentration flag warning */}
        {s.concentrationFlag && (
          <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/15 p-3 text-amber-800 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 animate-soft-pulse text-amber-600 dark:text-amber-400" />
            <div className="text-xs leading-relaxed">
              <span className="font-bold">{(t.validation as any)?.concentrationWarning ?? 'Single-organization concentration > 50%'}</span>{' '}
              Top org share: <span className="font-bold">{pct(s.topOrgConcentration)}</span> of weighted score.
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* Quorum summary grid — strict 3-col layout, consistent heights */}
        <div className="grid grid-cols-3 gap-2">
          <SummaryTile
            label={(t.validation as any)?.confirm ?? 'Confirm'}
            value={s.confirm}
            icon={<ThumbsUp className="h-3 w-3 text-teal-500" />}
            color="text-teal-700 dark:text-teal-300"
          />
          <SummaryTile
            label={(t.validation as any)?.reject ?? 'Reject'}
            value={s.reject}
            icon={<ThumbsDown className="h-3 w-3 text-rose-500" />}
            color="text-rose-700 dark:text-rose-300"
          />
          <SummaryTile
            label={(t.validation as any)?.qualify ?? 'Qualify'}
            value={s.qualify}
            icon={<HelpCircle className="h-3 w-3 text-amber-500" />}
            color="text-amber-700 dark:text-amber-300"
          />
        </div>

        {/* Quorum progress bars (violet when met, amber when close, rose when failing) */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <QuorumBar
            label={(t.validation as any)?.distinctOrgs ?? 'Distinct orgs'}
            current={s.distinctOrgs}
            target={req.minOrganizations}
            meets={meetsOrgs}
            display={`${s.distinctOrgs} / ${req.minOrganizations}`}
            delay={0.05}
          />
          <QuorumBar
            label={(t.validation as any)?.weightedScore ?? 'Weighted score'}
            current={Math.max(0, s.weightedScore)}
            target={req.threshold}
            meets={meetsScore}
            display={`${s.weightedScore.toFixed(2)} / ${req.threshold.toFixed(1)}`}
            delay={0.12}
            negative={s.weightedScore < 0}
          />
          <QuorumBar
            label={(t.validation as any)?.positiveRatio ?? 'Positive ratio'}
            current={s.positiveRatio}
            target={req.positiveRatioThreshold}
            meets={meetsRatio}
            display={`${pct(s.positiveRatio)} / ${pct(req.positiveRatioThreshold)}`}
            delay={0.19}
          />
        </div>

        <p className="text-xs text-muted-foreground italic">
          {req.message}
        </p>

        {/* Actions row */}
        <div className="flex flex-wrap items-center gap-2">
          {expired || req.status === 'Promoted' || req.status === 'Rejected' ? (
            <Button size="sm" variant="outline" disabled className="opacity-50 cursor-not-allowed">
              <ShieldCheck className="h-3.5 w-3.5" />
              {(t.validation as any)?.respond ?? 'Respond'}
            </Button>
          ) : (
            <Button size="sm" onClick={onRespond}>
              <ShieldCheck className="h-3.5 w-3.5" />
              {(t.validation as any)?.respond ?? 'Respond'}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onEvidence}>
            <FileSearch className="h-3.5 w-3.5" />
            {(t.observatory as any)?.viewEvidence ?? 'View evidence'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const csvContent = buildAuditCsv(req)
              const safeName = req.skill.preferredLabel.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
              downloadCsv(`skillpulse-audit-${req.id}-${safeName}.csv`, csvContent)
              toast.success('Audit trail exported', {
                description: `${req.responses.length} response${req.responses.length === 1 ? '' : 's'} · CSV ready`,
              })
            }}
          >
            <Download className="h-3.5 w-3.5" />
            {(t.validation as any)?.downloadAudit ?? 'Download audit'}
          </Button>
          {expired && (
            <span className="text-[11px] text-slate-500 inline-flex items-center gap-1">
              <XCircle className="h-3 w-3" /> {(t.validation as any)?.responseWindowClosed ?? 'Response window closed'}
            </span>
          )}
        </div>

        <Separator />

        {/* Responses history accordion */}
        <Accordion type="single" collapsible>
          <AccordionItem value="responses" className="border-b-0">
            <AccordionTrigger className="py-2 text-sm hover:no-underline hover:bg-accent/10 rounded-md px-2 -mx-2 transition-colors">
              <span className="inline-flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-primary" />
                {(t.validation as any)?.responses ?? 'Responses'}
                <Badge variant="secondary" className="text-[10px] py-0 px-1.5 rounded-full">
                  {req.responses.length}
                </Badge>
              </span>
            </AccordionTrigger>
            <AccordionContent className="bg-muted/30 rounded-lg p-3 mt-1">
              {req.responses.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  No responses yet. Be the first to confirm, reject, or qualify this demand signal.
                </p>
              ) : (
                <div className="space-y-2">
                  {req.responses.map((r) => (
                    <ResponseRow key={r.id} r={r} />
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────

function SummaryTile({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  color: string
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-3 shadow-soft h-full flex flex-col items-center text-center">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1">
        {icon}
        {label}
      </span>
      <div className={cn('text-lg font-bold tabular-nums mt-2', color)}>
        {typeof value === 'number' ? <CountUp value={value} /> : value}
      </div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">target {sub}</div>}
    </div>
  )
}

function QuorumBar({
  label,
  current,
  target,
  display,
  meets,
  delay = 0,
  negative = false,
}: {
  label: string
  current: number
  target: number
  display: string
  meets: boolean
  delay?: number
  negative?: boolean
}) {
  const pctVal = target > 0 ? clampPct(current / target) : 0
  const colorClass = quorumBarColor(meets, current, target)
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] text-muted-foreground font-medium">
        {label}:{' '}
        <span className={cn('font-semibold tabular-nums', negative && 'font-bold text-rose-700 dark:text-rose-300')}>
          {display}
        </span>
      </div>
      <AnimatedBar value={pctVal} className="h-1.5" colorClass={colorClass} delay={delay} />
    </div>
  )
}

function ResponseRow({ r }: { r: ValidationResponseRow }) {
  const Icon =
    r.responseType === 'Confirm'
      ? ThumbsUp
      : r.responseType === 'Reject'
      ? ThumbsDown
      : HelpCircle
  const color =
    r.responseType === 'Confirm'
      ? 'text-teal-600 dark:text-teal-400'
      : r.responseType === 'Reject'
      ? 'text-rose-600 dark:text-rose-400'
      : 'text-amber-600 dark:text-amber-400'
  return (
    <div className="rounded-md border bg-card p-2.5 text-xs shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-3.5 w-3.5', color)} />
          <span className="font-semibold">{r.employer}</span>
          <span className="text-[10px] text-muted-foreground">{r.employerOrgId}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className={cn('border font-medium rounded-full', color)}>
            {r.responseType}
          </Badge>
          <Badge variant="outline" className="text-[10px] py-0 px-1 gap-1 rounded-full">
            <Scale className="h-3 w-3" /> w={r.weight}
          </Badge>
        </div>
      </div>
      {r.reasonCode && (
        <div className="mt-1.5">
          <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-muted/50 rounded-full">
            {r.reasonCode}
          </Badge>
        </div>
      )}
      {r.comment && (
        <p className="mt-1.5 italic text-muted-foreground leading-relaxed">&ldquo;{r.comment}&rdquo;</p>
      )}
      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
        <Clock className="h-3 w-3" /> {formatDateTime(r.respondedAt)}
      </div>
    </div>
  )
}

// ─── Respond dialog ──────────────────────────────────────────────────────

function RespondDialog({
  target,
  onClose,
  onSubmitted,
}: {
  target: ValidationRequestItem | null
  onClose: () => void
  onSubmitted: () => void
}) {
  const { t } = useI18n()
  const [employerId, setEmployerId] = useState<string>('')
  const [responseType, setResponseType] = useState<ResponseType>('Confirm')
  const [reasonCode, setReasonCode] = useState<string>('NONE')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Reset form whenever target changes.
  useEffect(() => {
    if (target) {
      setEmployerId('')
      setResponseType('Confirm')
      setReasonCode('NONE')
      setComment('')
      setSubmitting(false)
    }
  }, [target])

  const showReason = responseType !== 'Confirm'

  async function submit() {
    if (!target) return
    if (!employerId) {
      toast.error('Select an employer before submitting')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/validations/${target.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employerId,
          responseType,
          reasonCode: reasonCode === 'NONE' ? undefined : reasonCode,
          comment: comment.trim() || undefined,
        }),
      })
      const json = await res.json().catch(() => ({ error: 'Invalid response' }))
      if (!res.ok || !json.ok) {
        throw new Error(json.error || `HTTP ${res.status}`)
      }
      const summary = json.summary ?? {}
      const newStatus = summary.newStatus ?? target.status
      const demandState = summary.demandState ?? ''
      toast.success(`Response recorded: ${responseType}`, {
        description: `Status → ${newStatus}${
          demandState ? ` · demand → ${demandState}` : ''
        }${
          summary.meetsQuorum
            ? ' · quorum met'
            : summary.concentrationFlag
            ? ' · concentration flagged'
            : ''
        }`,
      })
      onSubmitted()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      toast.error('Failed to submit response', { description: msg })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-soft">
              <ShieldCheck className="h-4 w-4" />
            </span>
            Respond to validation request
          </DialogTitle>
          <DialogDescription className="text-xs">
            {target && (
              <>
                Your response is recorded immutably with your employer weight and
                timestamped into the audit trail. Skill:{' '}
                <span className="font-semibold text-foreground">
                  {target.skill.preferredLabel}
                </span>
                {' '}({target.sector}{target.district ? ` · ${target.district}` : ''}).
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Response type RadioGroup */}
          <div>
            <Label className="text-xs mb-2 block">Response</Label>
            <RadioGroup
              value={responseType}
              onValueChange={(v) => {
                setResponseType(v as ResponseType)
                if (v === 'Confirm') setReasonCode('NONE')
              }}
            >
              {RESPONSE_OPTIONS.map((opt) => {
                const Icon = opt.icon
                return (
                  <motion.div
                    key={opt.value}
                    whileHover={{ x: 2 }}
                    className={cn(
                      'flex items-start gap-2 rounded-md border p-2.5 transition-colors hover:bg-accent/10',
                      responseType === opt.value && 'border-primary/50 bg-primary/5'
                    )}
                  >
                    <RadioGroupItem
                      value={opt.value}
                      id={`resp-${opt.value}`}
                      className="mt-0.5"
                    />
                    <Label
                      htmlFor={`resp-${opt.value}`}
                      className="flex-1 cursor-pointer flex flex-col"
                    >
                      <span className={cn('inline-flex items-center gap-1.5 text-sm font-medium', opt.color)}>
                        <Icon className="h-3.5 w-3.5" />
                        {opt.value === 'Confirm' ? (t.validation as any)?.confirm ?? 'Confirm' : opt.value === 'Reject' ? (t.validation as any)?.reject ?? 'Reject' : opt.value === 'Qualify' ? (t.validation as any)?.qualify ?? 'Qualify' : opt.label}
                      </span>
                      <span className="block text-[11px] text-muted-foreground mt-0.5">
                        {opt.hint}
                      </span>
                    </Label>
                  </motion.div>
                )
              })}
            </RadioGroup>
          </div>

          {/* Employer Select */}
          <div className="space-y-1.5">
            <Label htmlFor="employer" className="text-xs">
              Employer <span className="text-rose-500">*</span>
            </Label>
            <Select value={employerId} onValueChange={setEmployerId}>
              <SelectTrigger id="employer" className="w-full">
                <SelectValue placeholder={(t.validation as any)?.selectEmployer ?? 'Select employer'} />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYERS.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                      {e.name}
                      <code className="text-[10px] text-muted-foreground">{e.id}</code>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reason code Select (optional, hidden for Confirm) */}
          {showReason && (
            <div className="space-y-1.5">
              <Label htmlFor="reason" className="text-xs">
                {(t.validation as any)?.reasonCode ?? 'Reason Code'} <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Select value={reasonCode} onValueChange={setReasonCode}>
                <SelectTrigger id="reason" className="w-full">
                  <SelectValue placeholder="Pick a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">— None —</SelectItem>
                  {REASON_CODES.map((r) => (
                    <SelectItem key={r.code} value={r.code}>
                      <span className="flex flex-col">
                        <span className="text-sm">{r.label}</span>
                        <span className="text-[10px] text-muted-foreground">{r.code}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Comment Textarea */}
          <div className="space-y-1.5">
            <Label htmlFor="comment" className="text-xs">
              {(t.validation as any)?.comment ?? 'Comment'} <span className="text-muted-foreground">(optional, audited)</span>
            </Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a note for the audit trail…"
              className="min-h-[72px] text-sm"
              maxLength={500}
            />
            <span className="text-[10px] text-muted-foreground block text-right">
              {comment.length}/500
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={submit}
            disabled={submitting || !employerId}
            className="bg-primary text-primary-foreground shadow-soft hover:shadow-soft-lg hover:bg-primary/90 transition-shadow duration-300"
          >
            {submitting ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                <ShieldCheck className="h-3.5 w-3.5" />
                {(t.validation as any)?.submit ?? 'Submit response'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
