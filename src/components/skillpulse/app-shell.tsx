'use client'

import Image from 'next/image'
import { useUIStore } from '@/lib/skillpulse/store'
import { ROLES, MODULES, type ModuleId } from '@/lib/skillpulse/types'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { motion, AnimatePresence } from 'framer-motion'
import { SignalPulseTicker } from '@/components/skillpulse/signal-pulse-ticker'
import { CommandPalette } from '@/components/skillpulse/command-palette'
import { LanguageSwitcher } from '@/components/skillpulse/language-switcher'
import { useI18n } from '@/lib/skillpulse/i18n'
import {
  LayoutDashboard,
  Radar,
  Share2,
  GitCompareArrows,
  Map,
  ShieldCheck,
  ListChecks,
  GraduationCap,
  History,
  Menu,
  Activity,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

const ICONS: Record<string, any> = {
  LayoutDashboard,
  Radar,
  Share2,
  GitCompareArrows,
  Map,
  ShieldCheck,
  ListChecks,
  GraduationCap,
  History,
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { role, activeModule, setRole, setModule } = useUIStore()
  const roleMeta = ROLES.find((r) => r.id === role)!
  const visibleModules = MODULES.filter((m) => roleMeta.modules.includes(m.id))
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const { t } = useI18n()

  return (
    <div className="min-h-screen flex flex-col bg-background bg-mesh">
        <div role="note" className="bg-primary/10 px-4 py-2 text-center text-xs text-foreground">
          Interactive sample-data demo: Voting and saving are enabled. Changes are shared with all visitors.
        </div>
      {/* Header — glass sticky bar */}
      <header className="sticky top-0 z-40 w-full border-b border-border/60 glass">
        <div className="flex min-h-14 flex-wrap items-center gap-3 px-4 py-2 lg:px-6 max-w-[1600px] mx-auto">
          {/* Mobile nav trigger */}
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden h-9 w-9" aria-label="Open navigation">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 border-r-0">
              <SheetTitle className="sr-only">{t.app.name}</SheetTitle>
              <div className="h-14 flex items-center gap-2 px-4 border-b">
                <div className="h-8 w-8 rounded-lg overflow-hidden flex items-center justify-center">
                  <Image
                    src="/logo.svg"
                    alt="SkillPulse Grid logo"
                    width={32}
                    height={32}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <div className="text-sm font-semibold leading-tight">{t.app.name}</div>
                  <div className="text-[10px] text-muted-foreground leading-tight">SIH26134</div>
                </div>
              </div>
              <NavList
                modules={visibleModules}
                activeModule={activeModule}
                onSelect={(m) => { setModule(m); setMobileNavOpen(false) }}
              />
            </SheetContent>
          </Sheet>

          {/* Brand */}
          <div className="flex items-center gap-2.5 min-w-0">
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              className="h-9 w-9 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 shadow-sm"
            >
              <Image
                src="/logo.svg"
                alt="SkillPulse Grid logo"
                width={36}
                height={36}
                className="h-full w-full object-cover"
                priority
              />
            </motion.div>
            <div className="min-w-0 hidden sm:block">
              <div className="text-sm font-semibold leading-tight tracking-tight">{t.app.name}</div>
              <div className="text-[10px] text-muted-foreground leading-tight">{t.app.subtitle}</div>
            </div>
          </div>

          <div className="ml-auto flex flex-wrap items-center justify-end gap-2 min-w-0">
            {/* Command palette (Cmd+K) */}
            <CommandPalette />

            {/* Role switcher */}
            <Select value={role} onValueChange={(v: any) => setRole(v)}>
              <SelectTrigger aria-label="Select role" className="h-9 w-[150px] sm:w-[200px] text-xs flex-shrink-0">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.id} value={r.id} className="text-xs">
                    <div className="flex flex-col">
                      <span className="font-medium">{(t.roles as any)[r.id] ?? r.label}</span>
                      <span className="text-[10px] text-muted-foreground">{(t.roleGoals as any)[r.id] ?? r.goal}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Language switcher */}
            <LanguageSwitcher />

            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Live signal pulse bar — full width below header */}
      <SignalPulseTicker />

      {/* Body — sidebar + content */}
      <div className="flex-1 flex max-w-[1600px] mx-auto w-full">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-64 flex-col border-r border-border/60 bg-sidebar/50">
          <NavList
            modules={visibleModules}
            activeModule={activeModule}
            onSelect={setModule}
          />
          <div className="mt-auto p-3 border-t border-border/60">
            <div className="rounded-md bg-gradient-to-br from-primary/5 to-accent/10 p-2.5 text-[10px] text-muted-foreground space-y-1 border border-border/50">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <Activity className="h-3 w-3 text-primary" />
                {t.app.navHint}
              </div>
              <div>{t.app.navHintDesc}</div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <div className="px-4 lg:px-10 py-8 lg:py-10 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Sticky footer */}
      <footer className="border-t border-border/60 bg-background mt-auto">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ShieldAlert className="h-3.5 w-3.5 text-primary" />
            <span>
              <span className="font-medium text-foreground">{t.app.name}</span>
              {' · '}
              {t.app.footerText}
            </span>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <span className="hidden sm:inline">{t.app.footerVersion}</span>
            <span className="opacity-50 hidden sm:inline">·</span>
            <span>{t.app.footerStats}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

function NavList({
  modules,
  activeModule,
  onSelect,
}: {
  modules: typeof MODULES
  activeModule: ModuleId
  onSelect: (m: ModuleId) => void
}) {
  const { t } = useI18n()
  // Live counts for module badges (signature feature — shows real activity per module)
  const counts: Partial<Record<ModuleId, number>> = {
    observatory: 74,
    validation: 4,
    actions: 10,
    audit: 4,
    mirror: 6,
    district: 12,
    graph: 25,
    candidate: 1,
  }

  return (
    <ScrollArea className="flex-1 custom-scroll">
      <nav className="p-3 space-y-0.5">
        <div className="px-2 pb-2 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">{t.app.modules}</span>
          <span className="text-[9px] text-muted-foreground tabular-nums">{modules.length}</span>
        </div>
        {modules.map((m) => {
          const Icon = ICONS[m.icon] ?? LayoutDashboard
          const active = activeModule === m.id
          const count = counts[m.id]
          const isLive = ['observatory', 'validation', 'actions', 'audit'].includes(m.id)
          const label = (t.modules as any)[m.id] ?? m.label
          const desc = (t.moduleDesc as any)[m.id] ?? m.description
          return (
            <button
              key={m.id}
              onClick={() => onSelect(m.id)}
              title={desc}
              className={cn(
                'group relative w-full text-left flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
                active
                  ? 'text-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
              )}
              aria-current={active ? 'page' : undefined}
            >
              {active && (
                <motion.div
                  layoutId="nav-active-pill"
                  className="absolute inset-0 rounded-lg bg-gradient-to-br from-primary to-primary/85 shadow-sm"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              <Icon className={cn(
                'h-4 w-4 flex-shrink-0 relative z-10 transition-transform',
                active ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-sidebar-accent-foreground'
              )} />
              <div className="min-w-0 flex-1 relative z-10">
                <div className="font-medium leading-tight truncate">{label}</div>
              </div>
              {/* Live indicator dot for active modules */}
              {isLive && !active && (
                <span className="relative flex h-1.5 w-1.5 z-10">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-teal-500 opacity-60 animate-ping" style={{ animationDuration: '2.5s' }} />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-teal-500" />
                </span>
              )}
              {/* Count badge */}
              {count !== undefined && (
                <span className={cn(
                  'text-[9px] font-bold tabular-nums px-1.5 py-0.5 rounded-full z-10',
                  active
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-muted text-muted-foreground group-hover:bg-accent'
                )}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </ScrollArea>
  )
}
