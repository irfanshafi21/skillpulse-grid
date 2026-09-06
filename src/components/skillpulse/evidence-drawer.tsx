'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useFetch } from '@/lib/skillpulse/useFetch'
import { useI18n } from '@/lib/skillpulse/i18n'
import { ValidationBadge, BucketBadge, PriorityBadge } from '@/components/skillpulse/badges'
import { Stagger, StaggerItem, AnimatedBar } from '@/lib/skillpulse/motion'
import { EvidenceFlowTimeline } from '@/components/skillpulse/evidence-flow-timeline'
import { motion } from 'framer-motion'
import {
  ExternalLink,
  Building2,
  FileText,
  ShieldCheck,
  Activity,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface EvidenceDrawerProps {
  evidenceId: string | null
  onClose: () => void
}

export function EvidenceDrawer({ evidenceId, onClose }: EvidenceDrawerProps) {
  const { t } = useI18n()
  const { data, loading, error } = useFetch<any>(
    evidenceId ? `/api/evidence/${evidenceId}` : null,
    [evidenceId]
  )

  return (
    <Sheet open={!!evidenceId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-hidden p-0 flex flex-col h-full">
        <SheetHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-br from-primary/10 via-accent/5 to-background flex-shrink-0">
          <SheetTitle className="flex items-center gap-2 text-lg font-bold">
            <ShieldCheck className="h-5 w-5 text-primary animate-soft-pulse" />
            <span className="text-gradient">{t.evidence.title}</span>
          </SheetTitle>
          <SheetDescription className="text-xs">
            {t.evidence.desc}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 min-h-0 custom-scroll">
          <div className="px-6 py-4 space-y-4">
            {loading && <EvidenceSkeleton />}
            {error && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-4 flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
                <div className="text-sm text-rose-700 dark:text-rose-300">
                  <div className="font-semibold mb-0.5">Failed to load evidence</div>
                  <div className="text-xs text-rose-600/80 dark:text-rose-400/80">{error}</div>
                </div>
              </div>
            )}
            {!loading && !error && data && (
              <EvidenceContent data={data} />
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

function EvidenceContent({ data }: { data: any }) {
  if (data.kind === 'recommendation') return <RecommendationEvidence recommendation={data.recommendation} skill={data.skill} course={data.course} demandSignal={data.demandSignal} />
  if (data.kind === 'demandSignal') return <DemandSignalEvidence data={data.demandSignal} />
  if (data.kind === 'validationRequest') return <ValidationRequestEvidence data={data.validationRequest} />
  return (
    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
      Unknown evidence type
    </div>
  )
}

function SectionTitle({ icon: Icon, title, hint }: { icon: any; title: string; hint?: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-primary" />
      <h3 className="text-sm font-semibold text-gradient">{title}</h3>
      {hint && <span className="text-xs text-muted-foreground ml-auto font-mono">{hint}</span>}
    </div>
  )
}

function ReasonCode({ code }: { code: string }) {
  return (
    <span className="bg-muted text-muted-foreground font-mono text-[10px] rounded px-1.5 py-0.5">
      {code}
    </span>
  )
}

function ResponseTypePill({ type }: { type: string }) {
  const meta =
    type === 'Confirm'
      ? { Icon: ThumbsUp, cls: 'bg-teal-500/10 text-teal-700 dark:text-teal-400' }
      : type === 'Reject'
      ? { Icon: ThumbsDown, cls: 'bg-rose-500/10 text-rose-700 dark:text-rose-400' }
      : { Icon: HelpCircle, cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' }
  const { Icon, cls } = meta
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold', cls)}>
      <Icon className="h-3 w-3" />
      {type}
    </span>
  )
}

function RecommendationEvidence({ recommendation, skill, course, demandSignal }: any) {
  const { t } = useI18n()
  // Build the evidence flow timeline based on the recommendation's state
  const stages = [
    { id: 'detect', label: (t.dashboard as any)?.stageDetect ?? 'Detect', status: 'complete' as const, detail: `${(t.evidence as any)?.signalDetectedFor ?? 'Signal detected for'} ${skill.label}` },
    { id: 'understand', label: (t.dashboard as any)?.stageUnderstand ?? 'Understand', status: 'complete' as const, detail: `${(t.evidence as any)?.normalizedTo ?? 'Normalized to'} ${skill.uri}` },
    {
      id: 'validate',
      label: (t.dashboard as any)?.stageValidate ?? 'Validate',
      status: demandSignal?.validationState === 'Validated' ? 'complete' as const
        : demandSignal?.validationState === 'Rejected' ? 'rejected' as const
        : demandSignal?.validationState === 'Pending' ? 'current' as const
        : 'pending' as const,
      detail: demandSignal ? `${demandSignal.validationState} · ${demandSignal.sourceCount} ${(t.evidence as any)?.orgs ?? 'orgs'} · ${(t.evidence as any)?.score ?? 'score'} ${demandSignal.promotionScore?.toFixed(1)}` : ((t.evidence as any)?.noValidationRequest ?? 'No validation request'),
    },
    { id: 'compare', label: (t.dashboard as any)?.stageCompare ?? 'Compare', status: 'complete' as const, detail: `${(t.evidence as any)?.bucketedAs ?? 'Bucketed as'} ${recommendation.bucket}` },
    { id: 'recommend', label: (t.dashboard as any)?.stageRecommend ?? 'Recommend', status: recommendation.status === 'Accepted' ? 'complete' as const : recommendation.status === 'Rejected' ? 'rejected' as const : 'current' as const, detail: `${recommendation.actionType} · ${recommendation.priorityBand} · ${recommendation.status}` },
    { id: 'trace', label: (t.dashboard as any)?.stageTrace ?? 'Trace', status: 'complete' as const, detail: (t.evidence as any)?.evidenceTrailPreserved ?? 'Evidence trail preserved' },
  ]
  return (
    <Stagger className="space-y-4">
      <StaggerItem>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <BucketBadge bucket={recommendation.bucket} />
            <PriorityBadge band={recommendation.priorityBand} />
            <Badge variant="secondary" className="text-xs">{recommendation.actionType}</Badge>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{recommendation.rationale}</p>
        </div>
      </StaggerItem>
      <StaggerItem className="border-t border-border/40 pt-4 mt-4">
        <SectionTitle icon={Activity} title={t.evidence.evidenceFlow} hint={t.evidence.signalToRec} />
        <div className="mt-3">
          <EvidenceFlowTimeline stages={stages} />
        </div>
      </StaggerItem>
      <StaggerItem className="border-t border-border/40 pt-4 mt-4">
        <div className="space-y-2">
          <SectionTitle icon={FileText} title={t.evidence.skill} />
          <div className="grid grid-cols-1 gap-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.evidence.label}</span>
              <span className="font-medium">{skill.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.evidence.uri}</span>
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{skill.uri}</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.evidence.flags}</span>
              <span className="text-xs">
                {skill.isEmerging && `${t.trends.Emerging} `}
                {skill.isDeclining && `${t.trends.Declining} `}
                {!skill.isEmerging && !skill.isDeclining && t.trends.Stable}
              </span>
            </div>
          </div>
        </div>
      </StaggerItem>
      <StaggerItem className="border-t border-border/40 pt-4 mt-4">
        <div className="space-y-2">
          <SectionTitle icon={Building2} title={t.evidence.courseContext} />
          <div className="grid grid-cols-1 gap-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.evidence.code}</span>
              <span className="font-medium">{course.code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.evidence.name}</span>
              <span className="font-medium text-right">{course.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.evidence.occupation}</span>
              <span className="font-medium text-right">{course.occupation ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.evidence.district}</span>
              <span className="font-medium">{course.district}</span>
            </div>
          </div>
        </div>
      </StaggerItem>
      {demandSignal && (
        <StaggerItem className="border-t border-border/40 pt-4 mt-4">
          <DemandSignalEvidence data={demandSignal} embedded />
        </StaggerItem>
      )}
    </Stagger>
  )
}

function DemandSignalEvidence({ data, embedded = false }: { data: any; embedded?: boolean }) {
  const { t } = useI18n()
  return (
    <div className={cn('space-y-4', embedded && '')}>
      <div className="space-y-3">
        <SectionTitle
          icon={Activity}
          title={t.evidence.demandSignal}
          hint={data.id}
        />
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Stat label={t.observatory.postings} value={data.postingCount} />
          <Stat label={t.observatory.sources} value={data.sourceCount} />
          <Stat label={t.observatory.confidence} value={`${Math.round(data.confidence * 100)}%`} />
          <Stat label="Trend" value={data.trendLabel} />
          <Stat label={t.evidence.promotionScore} value={data.promotionScore?.toFixed(2) ?? '—'} />
          <Stat label={t.evidence.validationState} value={<ValidationBadge state={data.validationState} />} />
        </div>
      </div>
      {data.samplePostings && data.samplePostings.length > 0 && (
        <Stagger className="space-y-2 border-t border-border/40 pt-4 mt-4">
          <SectionTitle icon={FileText} title={t.evidence.samplePostings} hint={`${data.samplePostings.length} shown`} />
          <div className="space-y-1.5">
            {data.samplePostings.map((p: any) => (
              <motion.div
                key={p.id}
                whileHover={{ y: -1 }}
                transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
                className="rounded-md border border-border/60 bg-card p-2.5 text-xs shadow-soft hover:shadow-soft-lg hover:border-primary/30 transition-shadow duration-300"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{p.title}</span>
                  <span className="text-muted-foreground">{new Date(p.postedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" />{p.employer}</span>
                  <span className="text-[10px]">conf {(p.confidence * 100).toFixed(0)}%</span>
                  {p.isDuplicate && <Badge variant="outline" className="text-[10px] py-0 px-1">DUPLICATE</Badge>}
                  {p.isNoisy && <Badge variant="outline" className="text-[10px] py-0 px-1">NOISY</Badge>}
                </div>
              </motion.div>
            ))}
          </div>
        </Stagger>
      )}
      {data.validations && data.validations.length > 0 && (
        <div className="space-y-2 border-t border-border/40 pt-4 mt-4">
          <SectionTitle icon={ShieldCheck} title={t.evidence.employerValidations} hint={`${data.validations.length} responses`} />
          <div className="space-y-1.5">
            {data.validations.map((v: any) => (
              <motion.div
                key={v.id}
                whileHover={{ y: -1 }}
                transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
                className="rounded-md border border-border/60 bg-card p-2.5 text-xs shadow-soft hover:shadow-soft-lg hover:border-primary/30 transition-shadow duration-300"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{v.employer}</span>
                  <span className="text-muted-foreground">{new Date(v.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <ResponseTypePill type={v.responseType} />
                  <span className="text-[10px] text-muted-foreground">weight {v.weight}</span>
                  {v.reasonCode && <ReasonCode code={v.reasonCode} />}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
      {data.validationRequest && (
        <div className="border-t border-border/40 pt-4 mt-4">
          <ValidationRequestEvidence data={data.validationRequest} embedded />
        </div>
      )}
    </div>
  )
}

function ValidationRequestEvidence({ data, embedded = false }: { data: any; embedded?: boolean }) {
  const { t } = useI18n()
  const confirm = data.responses?.filter((r: any) => r.responseType === 'Confirm').length ?? 0
  const reject = data.responses?.filter((r: any) => r.responseType === 'Reject').length ?? 0
  const qualify = data.responses?.filter((r: any) => r.responseType === 'Qualify').length ?? 0
  const distinctOrgs = new Set(data.responses?.map((r: any) => r.employerOrgId)).size ?? 0
  const minOrg = data.minOrganizations ?? 3
  const meetsOrg = distinctOrgs >= minOrg
  const quorumPct = Math.min(100, (distinctOrgs / Math.max(1, minOrg)) * 100)

  return (
    <div className={cn('space-y-4', embedded && '')}>
      <div className="space-y-3">
        <SectionTitle icon={ShieldCheck} title={t.evidence.validationQuorum} hint={`Status: ${data.status}`} />
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Stat label={t.validation.confirm} value={confirm} icon={<ThumbsUp className="h-3 w-3 text-teal-500" />} />
          <Stat label={t.validation.reject} value={reject} icon={<ThumbsDown className="h-3 w-3 text-rose-500" />} />
          <Stat label={t.validation.qualify} value={qualify} icon={<HelpCircle className="h-3 w-3 text-amber-500" />} />
          <Stat
            label={t.validation.distinctOrgs}
            value={`${distinctOrgs} / ${minOrg}`}
            icon={meetsOrg ? undefined : <AlertTriangle className="h-3 w-3 text-amber-500" />}
          />
        </div>
      </div>
      <div className="space-y-1.5 border-t border-border/40 pt-4 mt-4">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
          <span>Quorum progress</span>
          <span className={cn('font-mono', meetsOrg ? 'text-teal-600 dark:text-teal-400' : 'text-amber-600 dark:text-amber-400')}>
            {Math.round(quorumPct)}%
          </span>
        </div>
        <AnimatedBar
          value={quorumPct}
          className="h-1.5"
          colorClass={meetsOrg ? 'bg-teal-500' : 'bg-amber-500'}
          delay={0.15}
        />
      </div>
      <div className="border-t border-border/40 pt-4 mt-4">
        <div className="rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
          {t.evidence.threshold}: <span className="font-semibold text-foreground">{data.threshold}</span> ·
          {t.evidence.positiveRatioThreshold}: <span className="font-semibold text-foreground">{(data.positiveRatioThreshold ?? 0.6) * 100}%</span> ·
          {t.evidence.deadline}: <span className="font-semibold text-foreground">{new Date(data.deadline).toLocaleDateString()}</span>
        </div>
      </div>
      {data.responses && data.responses.length > 0 && (
        <div className="space-y-1.5 border-t border-border/40 pt-4 mt-4">
          {data.responses.map((r: any) => (
            <motion.div
              key={r.id}
              whileHover={{ y: -1 }}
              transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
              className="rounded-md border border-border/60 bg-card p-2.5 text-xs shadow-soft hover:shadow-soft-lg hover:border-primary/30 transition-shadow duration-300"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium">{r.employer}</span>
                <span className="text-muted-foreground">{new Date(r.respondedAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <ResponseTypePill type={r.responseType} />
                {r.reasonCode && <ReasonCode code={r.reasonCode} />}
              </div>
              {r.comment && <p className="mt-1.5 text-muted-foreground italic">&ldquo;{r.comment}&rdquo;</p>}
            </motion.div>
          ))}
        </div>
      )}
      <div className="border-t border-border/40 pt-4 mt-4">
        <span className="inline-flex items-center gap-1 text-xs text-primary">
          <ExternalLink className="h-3 w-3" /> Open in Validation Quorum
        </span>
      </div>
    </div>
  )
}

function Stat({ label, value, icon }: { label: string; value: any; icon?: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border/60 bg-gradient-to-br from-card to-muted/20 p-2.5 shadow-soft hover:shadow-soft-lg transition-shadow duration-300">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
        {icon}{label}
      </div>
      <div className="text-lg font-bold tabular-nums mt-1">{value}</div>
    </div>
  )
}

function EvidenceSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20 shimmer" />
          <Skeleton className="h-5 w-12 shimmer" />
          <Skeleton className="h-5 w-24 shimmer" />
        </div>
        <Skeleton className="h-3 w-full shimmer" />
        <Skeleton className="h-3 w-4/5 shimmer" />
      </div>
      <Separator />
      <div className="space-y-2">
        <Skeleton className="h-4 w-32 shimmer" />
        <div className="grid grid-cols-1 gap-1.5">
          <Skeleton className="h-4 w-full shimmer" />
          <Skeleton className="h-4 w-full shimmer" />
          <Skeleton className="h-4 w-3/4 shimmer" />
        </div>
      </div>
      <Separator />
      <div className="space-y-2">
        <Skeleton className="h-4 w-40 shimmer" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-14 w-full shimmer rounded-md" />
          <Skeleton className="h-14 w-full shimmer rounded-md" />
          <Skeleton className="h-14 w-full shimmer rounded-md" />
          <Skeleton className="h-14 w-full shimmer rounded-md" />
        </div>
      </div>
      <Separator />
      <div className="space-y-2">
        <Skeleton className="h-4 w-36 shimmer" />
        <Skeleton className="h-16 w-full shimmer rounded-md" />
        <Skeleton className="h-16 w-full shimmer rounded-md" />
        <Skeleton className="h-16 w-full shimmer rounded-md" />
      </div>
    </div>
  )
}
