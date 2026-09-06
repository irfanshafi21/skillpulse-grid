// SkillPulse Grid — shared types & domain constants

export type Role =
  | 'government'
  | 'provider'
  | 'designer'
  | 'employer'
  | 'candidate'
  | 'analyst'

export interface RoleMeta {
  id: Role
  label: string
  short: string
  description: string
  goal: string
  // Modules this role can access (least privilege)
  modules: ModuleId[]
  color: string // tailwind text color class
}

export const ROLES: RoleMeta[] = [
  {
    id: 'government',
    label: 'Government / Admin',
    short: 'Govt',
    description: 'Monitor national or state skilling performance',
    goal: 'All dashboards, districts, policies, users',
    modules: ['dashboard', 'observatory', 'graph', 'mirror', 'district', 'validation', 'actions', 'candidate', 'audit'],
    color: 'text-violet-600 dark:text-violet-400',
  },
  {
    id: 'provider',
    label: 'Training Provider',
    short: 'Provider',
    description: 'Improve courses based on live demand analytics',
    goal: 'Curriculum Mirror, Action Plans, local analytics',
    modules: ['dashboard', 'mirror', 'actions', 'observatory', 'district'],
    color: 'text-fuchsia-600 dark:text-fuchsia-400',
  },
  {
    id: 'designer',
    label: 'Curriculum Designer',
    short: 'Designer',
    description: 'Revise course content with evidence',
    goal: 'Skill gaps, syllabus recommendations, traceability',
    modules: ['dashboard', 'graph', 'mirror', 'actions', 'observatory'],
    color: 'text-purple-600 dark:text-purple-400',
  },
  {
    id: 'employer',
    label: 'Employer / Validator',
    short: 'Employer',
    description: 'Validate real industry requirements',
    goal: 'Survey responses, signal validation',
    modules: ['dashboard', 'validation'],
    color: 'text-rose-600 dark:text-rose-400',
  },
  {
    id: 'candidate',
    label: 'Candidate / Student',
    short: 'Candidate',
    description: 'Understand personal market readiness',
    goal: 'Role readiness, missing skills, learning actions',
    modules: ['dashboard', 'candidate'],
    color: 'text-amber-600 dark:text-amber-400',
  },
  {
    id: 'analyst',
    label: 'Analyst',
    short: 'Analyst',
    description: 'Study labour-market trends',
    goal: 'Demand Observatory, reports, exports',
    modules: ['dashboard', 'observatory', 'graph', 'district', 'audit'],
    color: 'text-pink-600 dark:text-pink-400',
  },
]

export type ModuleId =
  | 'dashboard'
  | 'observatory'
  | 'graph'
  | 'mirror'
  | 'district'
  | 'validation'
  | 'actions'
  | 'candidate'
  | 'audit'

export interface ModuleMeta {
  id: ModuleId
  label: string
  short: string
  description: string
  icon: string // lucide icon name
}

export const MODULES: ModuleMeta[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    short: 'Home',
    description: 'Mission-wide overview, KPIs, role landing',
    icon: 'LayoutDashboard',
  },
  {
    id: 'observatory',
    label: 'Demand Observatory',
    short: 'Observatory',
    description: 'Continuously monitor live job-demand signals',
    icon: 'Radar',
  },
  {
    id: 'graph',
    label: 'Skill Graph Explorer',
    short: 'Graph',
    description: 'Versioned occupation–skill–proficiency map',
    icon: 'Share2',
  },
  {
    id: 'mirror',
    label: 'Curriculum Mirror',
    short: 'Mirror',
    description: 'Hero: compare course vs validated demand',
    icon: 'GitCompareArrows',
  },
  {
    id: 'district',
    label: 'District Intelligence',
    short: 'District',
    description: 'Demand × supply mismatch heatmap + drill-down',
    icon: 'Map',
  },
  {
    id: 'validation',
    label: 'Validation Quorum',
    short: 'Quorum',
    description: 'Employer validation of demand signals',
    icon: 'ShieldCheck',
  },
  {
    id: 'actions',
    label: 'Action Plans',
    short: 'Actions',
    description: 'Convert gaps into owned, trackable work',
    icon: 'ListChecks',
  },
  {
    id: 'candidate',
    label: 'Candidate Readiness',
    short: 'Readiness',
    description: 'Personal readiness % + learning sequence',
    icon: 'GraduationCap',
  },
  {
    id: 'audit',
    label: 'Audit Trail',
    short: 'Audit',
    description: 'Append-only evidence of every system action',
    icon: 'History',
  },
]

// ─── Domain buckets ──────────────────────────────────────────────────────

export type Bucket =
  | 'Match'
  | 'Missing'
  | 'Emerging'
  | 'Declining'
  | 'LowPriority'

export const BUCKETS: Record<Bucket, {
  label: string
  color: string // tailwind bg/border/text
  dot: string
  description: string
}> = {
  Match: {
    label: 'Match',
    color: 'bg-teal-500/15 text-teal-800 border-teal-500/40 dark:text-teal-200',
    dot: 'bg-teal-500',
    description: 'Skill taught at adequate proficiency with stable demand',
  },
  Missing: {
    label: 'Missing',
    color: 'bg-rose-500/15 text-rose-800 border-rose-500/40 dark:text-rose-200',
    dot: 'bg-rose-500',
    description: 'Required skill not taught or taught below proficiency',
  },
  Emerging: {
    label: 'Emerging',
    color: 'bg-amber-500/15 text-amber-800 border-amber-500/40 dark:text-amber-200',
    dot: 'bg-amber-500',
    description: 'New skill with rising validated demand — not yet taught',
  },
  Declining: {
    label: 'Declining',
    color: 'bg-slate-500/15 text-slate-700 border-slate-500/40 dark:text-slate-200',
    dot: 'bg-slate-500',
    description: 'Demand is falling — reduce emphasis',
  },
  LowPriority: {
    label: 'Low Priority',
    color: 'bg-violet-500/15 text-violet-800 border-violet-500/40 dark:text-violet-200',
    dot: 'bg-violet-500',
    description: 'Optional skill — defer review',
  },
}

export type TrendLabel = 'Emerging' | 'Declining' | 'Stable'

export const TREND_COLORS: Record<TrendLabel, string> = {
  Emerging: 'text-amber-600 dark:text-amber-400',
  Declining: 'text-rose-600 dark:text-rose-400',
  Stable: 'text-teal-600 dark:text-teal-400',
}

export type ValidationState =
  | 'Detected'
  | 'Pending'
  | 'Validated'
  | 'Rejected'
  | 'NeedsReview'

export const VALIDATION_BADGE: Record<ValidationState, { color: string; label: string }> = {
  Detected: { color: 'bg-slate-500/15 text-slate-700 dark:text-slate-200', label: 'Detected' },
  Pending: { color: 'bg-amber-500/15 text-amber-800 dark:text-amber-200', label: 'Pending Quorum' },
  Validated: { color: 'bg-teal-500/15 text-teal-800 dark:text-teal-200', label: 'Validated' },
  Rejected: { color: 'bg-rose-500/15 text-rose-800 dark:text-rose-200', label: 'Rejected' },
  NeedsReview: { color: 'bg-orange-500/15 text-orange-800 dark:text-orange-200', label: 'Needs Review' },
}

export const PRIORITY_BANDS = ['P0', 'P1', 'P2', 'P3'] as const
export const PRIORITY_COLORS: Record<string, string> = {
  P0: 'bg-rose-500/15 text-rose-800 border-rose-500/40 dark:text-rose-200',
  P1: 'bg-amber-500/15 text-amber-800 border-amber-500/40 dark:text-amber-200',
  P2: 'bg-violet-500/15 text-violet-800 border-violet-500/40 dark:text-violet-200',
  P3: 'bg-slate-500/15 text-slate-700 border-slate-500/40 dark:text-slate-200',
}

export const ACTION_STATUSES = ['Proposed', 'Accepted', 'Rejected', 'InProgress', 'Completed'] as const
export const ACTION_STATUS_COLORS: Record<string, string> = {
  Proposed: 'bg-slate-500/15 text-slate-700 dark:text-slate-200',
  Accepted: 'bg-teal-500/15 text-teal-800 dark:text-teal-200',
  Rejected: 'bg-rose-500/15 text-rose-800 dark:text-rose-200',
  InProgress: 'bg-amber-500/15 text-amber-800 dark:text-amber-200',
  Completed: 'bg-violet-500/15 text-violet-800 dark:text-violet-200',
}
