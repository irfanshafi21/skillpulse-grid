'use client'

import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { useFetch } from '@/lib/skillpulse/useFetch'
import { useUIStore } from '@/lib/skillpulse/store'
import { ROLES } from '@/lib/skillpulse/types'
import { ValidationBadge } from '@/components/skillpulse/badges'
import { MotionCard, CountUp, AnimatedBar, Stagger, StaggerItem } from '@/lib/skillpulse/motion'
import { DemandVelocitySparkline } from '@/components/skillpulse/demand-velocity-sparkline'
import { ConfidenceRing } from '@/components/skillpulse/confidence-ring'
import { EvidenceFlowTimeline, type TimelineStage } from '@/components/skillpulse/evidence-flow-timeline'
import { useI18n } from '@/lib/skillpulse/i18n'
import { motion } from 'framer-motion'
import {
  Radar, TrendingUp, GraduationCap, Map, ShieldCheck, ListChecks, FileText,
  Sparkles, ArrowUpRight, Cpu, Building2, AlertTriangle, ShieldAlert,
  Zap, Gauge, Clock,
} from 'lucide-react'

export function DashboardOverview({ onNavigate }: { onNavigate: (m: any) => void }) {
  const { role } = useUIStore()
  const roleMeta = ROLES.find((r) => r.id === role)!
  const { data, loading } = useFetch<any>('/api/dashboard', [])
  const { t } = useI18n()
  const roleLabel = (t.roles as any)[role] ?? roleMeta.label

  if (loading || !data) {
    return <DashboardSkeleton />
  }

  const k = data.kpis
  const cards = [
    { label: t.dashboard.kpiJobSignals, value: k.postings, icon: Radar, hint: `${k.demandSignals} ${t.dashboard.hintJobSignals}`, module: 'observatory', color: 'text-violet-600 dark:text-violet-400', iconBg: 'bg-violet-500/10' },
    { label: t.dashboard.kpiValidatedDemand, value: k.validated, icon: ShieldCheck, hint: t.dashboard.hintValidatedDemand, module: 'validation', color: 'text-teal-600 dark:text-teal-400', iconBg: 'bg-teal-500/10' },
    { label: t.dashboard.kpiEmergingSkills, value: k.emerging, icon: TrendingUp, hint: t.dashboard.hintEmergingSkills, module: 'observatory', color: 'text-amber-600 dark:text-amber-400', iconBg: 'bg-amber-500/10' },
    { label: t.dashboard.kpiCoursesMirrored, value: k.courses, icon: GraduationCap, hint: `${k.recommendations} ${t.dashboard.hintCoursesMirrored}`, module: 'mirror', color: 'text-fuchsia-600 dark:text-fuchsia-400', iconBg: 'bg-fuchsia-500/10' },
    { label: t.dashboard.kpiDistrictsMapped, value: k.districts, icon: Map, hint: t.dashboard.hintDistrictsMapped, module: 'district', color: 'text-pink-600 dark:text-pink-400', iconBg: 'bg-pink-500/10' },
    { label: t.dashboard.kpiRecommendations, value: k.recommendations, icon: ListChecks, hint: t.dashboard.hintRecommendations, module: 'actions', color: 'text-rose-600 dark:text-rose-400', iconBg: 'bg-rose-500/10' },
  ]

  return (
    <div className="space-y-8">
      {/* Hero banner */}
      <MotionCard
        delay={0}
        hover={false}
      >
        <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/8 via-accent/5 to-background">
          {/* Decorative gradient orbs */}
          <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />
          <CardContent className="relative p-6 lg:p-8">
            <div className="flex items-start gap-4 flex-col md:flex-row md:items-center">
              <motion.div
                initial={{ scale: 0.7, rotate: -10, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 250, damping: 18, delay: 0.1 }}
                className="h-14 w-14 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 shadow-soft-lg"
              >
                <Image
                  src="/logo.svg"
                  alt="SkillPulse Grid logo"
                  width={56}
                  height={56}
                  className="h-full w-full object-cover"
                />
              </motion.div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">{t.dashboard.welcome}, {roleLabel}</h2>
                  <Badge variant="secondary" className="text-[10px] font-medium border">{roleMeta.short}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{(t.roleGoals as any)[role] ?? roleMeta.goal}</p>
                <p className="text-xs text-muted-foreground/80 mt-2.5 max-w-2xl leading-relaxed">
                  <span className="font-medium text-foreground/80">{t.dashboard.tagline}</span>
                  {' '}
                  {t.dashboard.taglineSub}
                </p>
              </div>
              <div className="flex flex-col gap-2 md:items-end">
                {roleMeta.modules.includes('mirror') && (
                  <Button onClick={() => onNavigate('mirror')} className="bg-primary hover:bg-primary/90 shadow-soft" size="sm">
                    {t.dashboard.openMirror}
                    <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                )}
                {roleMeta.modules.includes('candidate') && !roleMeta.modules.includes('mirror') && (
                  <Button onClick={() => onNavigate('candidate')} className="bg-primary hover:bg-primary/90 shadow-soft" size="sm">
                    {t.dashboard.viewReadiness}
                    <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                )}
                {roleMeta.modules.includes('validation') && !roleMeta.modules.includes('mirror') && !roleMeta.modules.includes('candidate') && (
                  <Button onClick={() => onNavigate('validation')} className="bg-primary hover:bg-primary/90 shadow-soft" size="sm">
                    {t.dashboard.openValidation}
                    <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                )}
                {roleMeta.modules.includes('observatory') && !roleMeta.modules.includes('mirror') && !roleMeta.modules.includes('candidate') && !roleMeta.modules.includes('validation') && (
                  <Button onClick={() => onNavigate('observatory')} className="bg-primary hover:bg-primary/90 shadow-soft" size="sm">
                    {t.dashboard.openObservatory}
                    <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </div>
      </MotionCard>

      {/* KPI grid */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-muted-foreground tracking-wide">{t.dashboard.missionOverview}</h3>
        <Badge variant="outline" className="text-[10px] rounded-full border-border/60">{t.dashboard.last18Months}</Badge>
      </div>
      <Stagger className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {cards.map((c, i) => (
          <StaggerItem key={c.label} className="h-full">
            <Card
              className="overflow-hidden group hover:shadow-soft-lg hover:border-primary/30 transition-all duration-300 h-full cursor-pointer"
              onClick={() => onNavigate(c.module)}
            >
              <CardContent className="p-4 flex flex-col h-full gap-2">
                {/* Icon + label row */}
                <div className="flex items-center justify-between">
                  <div className={`h-8 w-8 rounded-lg ${c.iconBg ?? 'bg-muted'} flex items-center justify-center flex-shrink-0`}>
                    <c.icon className={`h-4 w-4 ${c.color}`} />
                  </div>
                </div>
                {/* Big number */}
                <div className="text-2xl font-bold tracking-tight tabular-nums leading-none">
                  <CountUp value={c.value} duration={0.8} delay={i * 0.05} />
                </div>
                {/* Label + hint */}
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-foreground leading-tight truncate">{c.label}</div>
                  <div className="text-[10px] text-muted-foreground leading-tight mt-0.5 line-clamp-2">{c.hint}</div>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        ))}
      </Stagger>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Top demanded skills */}
        <Card className="min-w-0 lg:col-span-2 shadow-soft hover:shadow-soft-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" /> {t.dashboard.topDemanded}
            </CardTitle>
            <CardDescription className="text-xs">
              {t.dashboard.topDemandedDesc}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Stagger className="space-y-2.5">
              {data.topDemanded.slice(0, 6).map((s: any, i: number) => {
                const max = data.topDemanded[0]?.postingCount ?? 1
                const pct = Math.round((s.postingCount / max) * 100)
                // Generate a synthetic 8-point velocity series based on trend
                const base = s.postingCount / 8
                const trendUp = s.isEmerging
                const velocity = Array.from({ length: 8 }, (_, idx) => {
                  const noise = (Math.sin(idx * 1.7 + i) + 1) * 0.15
                  const trend = trendUp ? idx * 0.08 : s.isDeclining ? -idx * 0.06 : 0
                  return Math.max(1, base * (1 + trend + noise))
                })
                return (
                  <StaggerItem key={s.skillId}>
                    <button
                      onClick={() => onNavigate('observatory')}
                      className="group w-full text-left rounded-lg border p-3 hover:border-primary/30 hover:bg-accent/20 hover:shadow-soft transition-all duration-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs text-muted-foreground w-4 font-medium">#{i + 1}</span>
                          <span className="text-sm font-medium truncate">{s.label}</span>
                          {s.isEmerging && <Badge variant="outline" className="text-[9px] py-0 px-1.5 border-amber-500/40 bg-amber-500/15 text-amber-800 dark:text-amber-200 shrink-0 rounded-full">Emerging</Badge>}
                          {s.isDeclining && <Badge variant="outline" className="text-[9px] py-0 px-1.5 border-slate-500/40 bg-slate-500/15 text-slate-700 dark:text-slate-200 shrink-0 rounded-full">Declining</Badge>}
                        </div>
                        <div className="flex shrink-0 items-center gap-2.5">
                          {/* Demand velocity sparkline */}
                          <DemandVelocitySparkline data={velocity} width={60} height={20} />
                          <span className="text-sm font-bold tabular-nums">{s.postingCount}</span>
                        </div>
                      </div>
                      <AnimatedBar value={pct} delay={i * 0.08} className="h-1.5" />
                    </button>
                  </StaggerItem>
                )
              })}
            </Stagger>
          </CardContent>
        </Card>

        {/* Validation pipeline */}
        <Card className="shadow-soft hover:shadow-soft-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" /> {t.dashboard.validationPipeline}
            </CardTitle>
            <CardDescription className="text-xs">{t.dashboard.validationPipelineDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <Stagger className="space-y-2.5">
              {data.validationPipeline.map((p: any, i: number) => (
                <StaggerItem key={p.state}>
                  <div className="flex items-center justify-between text-sm">
                    <ValidationBadge state={p.state} />
                    <span className="font-semibold tabular-nums text-base">
                      <CountUp value={p.count} delay={0.3 + i * 0.06} />
                    </span>
                  </div>
                </StaggerItem>
              ))}
              {data.validationPipeline.length === 0 && (
                <p className="text-xs text-muted-foreground">No validation data yet.</p>
              )}
            </Stagger>
          </CardContent>
        </Card>

        {/* Recent audit */}
        <Card className="lg:col-span-3 shadow-soft hover:shadow-soft-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" /> {t.dashboard.recentAudit}
            </CardTitle>
            <CardDescription className="text-xs">
              {t.dashboard.recentAuditDesc}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Stagger className="space-y-2">
              {data.recentAudit.map((l: any, i: number) => (
                <StaggerItem key={l.id}>
                  <div className="rounded-lg border border-border/70 p-3 text-xs flex items-start gap-3 hover:bg-accent/15 hover:border-primary/30 transition-all duration-200 shadow-soft">
                    <Badge variant="secondary" className="font-mono text-[10px] py-0.5 px-2 flex-shrink-0 rounded-full">
                      {l.action}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <div className="text-muted-foreground">
                        Actor: <code className="text-foreground font-medium">{l.actor}</code>
                      </div>
                      <div className="text-muted-foreground/70 text-[10px] mt-0.5">
                        {new Date(l.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </StaggerItem>
              ))}
              {data.recentAudit.length === 0 && (
                <p className="text-xs text-muted-foreground">No audit entries yet.</p>
              )}
            </Stagger>
            <Button variant="outline" size="sm" className="mt-3 text-xs" onClick={() => onNavigate('audit')}>
              {t.dashboard.viewFullAudit} →
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Evidence flow timeline + Mission health */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Evidence Flow Timeline */}
        <Card className="lg:col-span-2 border-primary/20 shadow-soft hover:shadow-soft-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-primary" /> {t.dashboard.evidenceFlow}
            </CardTitle>
            <CardDescription className="text-xs">
              {t.dashboard.evidenceFlowDesc}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EvidenceFlowTimeline
              stages={[
                { id: 'detect', label: 'Detect', status: 'complete', detail: '74 demand signals ingested from 90 job postings across 12 districts', timestamp: '18mo window' },
                { id: 'understand', label: 'Understand', status: 'complete', detail: 'NLP normalized to 25 ESCO-anchored skills with proficiency levels' },
                { id: 'validate', label: 'Validate', status: 'current', detail: '3 skills promoted by employer quorum, 1 in Needs Review', timestamp: '14d window' },
                { id: 'compare', label: 'Compare', status: 'complete', detail: '6 courses mirrored against demand, 10 recommendations generated' },
                { id: 'localize', label: 'Localize', status: 'complete', detail: 'District mismatch heatmap shows Pune as highest-coverage district' },
                { id: 'recommend', label: 'Recommend', status: 'pending', detail: '1 recommendation accepted, 9 awaiting curriculum review' },
                { id: 'trace', label: 'Trace', status: 'complete', detail: 'Every recommendation links to its evidence trail — 4 audit entries logged' },
              ]}
            />
          </CardContent>
        </Card>

        {/* Mission Health ring */}
        <Card className="shadow-soft hover:shadow-soft-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Gauge className="h-4 w-4 text-primary" /> {t.dashboard.missionHealth}
            </CardTitle>
            <CardDescription className="text-xs">{t.dashboard.missionHealthDesc}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <ConfidenceRing
              value={56}
              size={140}
              strokeWidth={10}
              label={t.dashboard.alignment}
              sublabel={t.dashboard.developing}
              delay={0.3}
            />
            <div className="grid grid-cols-2 gap-3 w-full mt-6">
              <div className="text-center p-2 rounded-lg bg-muted/30">
                <div className="text-lg font-bold tabular-nums text-teal-600 dark:text-teal-400">{k.validated}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{t.dashboard.validated}</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/30">
                <div className="text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400">{k.emerging}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{t.dashboard.emerging}</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/30">
                <div className="text-lg font-bold tabular-nums text-rose-600 dark:text-rose-400">2</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{t.dashboard.declining}</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/30">
                <div className="text-lg font-bold tabular-nums text-primary">{k.recommendations}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{t.dashboard.actions}</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-4 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{t.dashboard.updatedAgo}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-8">
          <div className="h-16 shimmer rounded-lg" />
        </CardContent>
      </Card>
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-12 shimmer rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
