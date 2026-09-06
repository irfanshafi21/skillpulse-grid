'use client'

import { useEffect, useState } from 'react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useUIStore } from '@/lib/skillpulse/store'
import { MODULES, ROLES, type ModuleId } from '@/lib/skillpulse/types'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/skillpulse/i18n'
import {
  LayoutDashboard, Radar, Share2, GitCompareArrows, Map, ShieldCheck,
  ListChecks, GraduationCap, History, Search, ArrowRight, User, Sparkles,
} from 'lucide-react'

const ICONS: Record<string, any> = {
  LayoutDashboard, Radar, Share2, GitCompareArrows, Map, ShieldCheck,
  ListChecks, GraduationCap, History,
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const { setModule, setRole, role } = useUIStore()
  const roleMeta = ROLES.find((r) => r.id === role)!
  const visibleModules = MODULES.filter((m) => roleMeta.modules.includes(m.id))
  const { t } = useI18n()

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const run = (fn: () => void) => {
    fn()
    setOpen(false)
  }

  return (
    <>
      {/* Trigger button — visible on lg+ screens */}
      <button
        onClick={() => setOpen(true)}
        className="hidden lg:flex items-center gap-2 h-9 px-3 rounded-full border border-border/60 bg-card/60 backdrop-blur-xl shadow-soft hover:border-primary/40 transition-colors text-xs text-muted-foreground group flex-shrink-0"
        aria-label="Open command palette (Cmd+K)"
      >
        <Search className="h-3.5 w-3.5 group-hover:text-primary transition-colors flex-shrink-0" />
        <span className="hidden xl:inline whitespace-nowrap">Search…</span>
        <kbd className="hidden xl:inline-flex items-center gap-0.5 rounded border border-border/60 bg-muted/40 px-1 py-0 text-[9px] font-mono font-semibold text-muted-foreground flex-shrink-0">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder={t.command.placeholder} />
        <CommandList>
          <CommandEmpty>{t.command.placeholder}</CommandEmpty>

          <CommandGroup heading={t.command.modules}>
            {visibleModules.map((m) => {
              const Icon = ICONS[m.icon] ?? LayoutDashboard
              const label = (t.modules as any)[m.id] ?? m.label
              const desc = (t.moduleDesc as any)[m.id] ?? m.description
              return (
                <CommandItem
                  key={m.id}
                  value={`${m.label} ${m.description} ${m.short} ${label} ${desc}`}
                  onSelect={() => run(() => setModule(m.id as ModuleId))}
                  className="group"
                >
                  <Icon className="h-4 w-4 text-muted-foreground group-aria-selected:text-primary" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{label}</div>
                    <div className="text-xs text-muted-foreground truncate">{desc}</div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 opacity-0 group-aria-selected:opacity-100 text-primary" />
                </CommandItem>
              )
            })}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading={t.command.switchRole}>
            {ROLES.map((r) => {
              const label = (t.roles as any)[r.id] ?? r.label
              const goal = (t.roleGoals as any)[r.id] ?? r.goal
              return (
                <CommandItem
                  key={r.id}
                  value={`role ${r.label} ${r.short} ${r.goal} ${label} ${goal}`}
                  onSelect={() => run(() => setRole(r.id))}
                  className="group"
                >
                  <User className={cn('h-4 w-4', r.color)} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{label}</div>
                    <div className="text-xs text-muted-foreground truncate">{goal}</div>
                  </div>
                  {role === r.id && (
                    <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">{t.command.active}</span>
                  )}
                </CommandItem>
              )
            })}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading={t.command.quickActions}>
            <CommandItem
              value={`${t.command.openMirror} ${t.command.openMirrorDesc} curriculum mirror hero`}
              onSelect={() => run(() => { setRole('provider'); setModule('mirror'); })}
            >
              <Sparkles className="h-4 w-4 text-primary" />
              <div className="flex-1">
                <div className="text-sm font-medium">{t.command.openMirror}</div>
                <div className="text-xs text-muted-foreground">{t.command.openMirrorDesc}</div>
              </div>
            </CommandItem>
            <CommandItem
              value={`${t.command.viewReadiness} ${t.command.viewReadinessDesc} candidate readiness`}
              onSelect={() => run(() => { setRole('candidate'); setModule('candidate'); })}
            >
              <GraduationCap className="h-4 w-4 text-amber-500" />
              <div className="flex-1">
                <div className="text-sm font-medium">{t.command.viewReadiness}</div>
                <div className="text-xs text-muted-foreground">{t.command.viewReadinessDesc}</div>
              </div>
            </CommandItem>
            <CommandItem
              value={`${t.command.validateSignals} ${t.command.validateSignalsDesc} validate demand signals employer`}
              onSelect={() => run(() => { setRole('employer'); setModule('validation'); })}
            >
              <ShieldCheck className="h-4 w-4 text-rose-500" />
              <div className="flex-1">
                <div className="text-sm font-medium">{t.command.validateSignals}</div>
                <div className="text-xs text-muted-foreground">{t.command.validateSignalsDesc}</div>
              </div>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}

function CommandDialog({
  children,
  open,
  onOpenChange,
}: {
  children: React.ReactNode
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 shadow-soft-lg max-w-2xl">
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        <DialogDescription className="sr-only">Search modules, roles, and quick actions</DialogDescription>
        <Command className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-4 [&_[cmdk-input-wrapper]_svg]:w-4 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-2.5 [&_[cmdk-item]_svg]:h-4 [&_[cmdk-item]_svg]:w-4">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  )
}
