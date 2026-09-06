'use client'

import { AppShell } from '@/components/skillpulse/app-shell'
import { useUIStore } from '@/lib/skillpulse/store'
import { PageTransition } from '@/lib/skillpulse/motion'
import { DashboardOverview } from '@/components/skillpulse/modules/dashboard'
import { DemandObservatory } from '@/components/skillpulse/modules/observatory'
import { SkillGraphExplorer } from '@/components/skillpulse/modules/skill-graph'
import { CurriculumMirror } from '@/components/skillpulse/modules/mirror'
import { DistrictIntelligence } from '@/components/skillpulse/modules/district'
import { ValidationQuorum } from '@/components/skillpulse/modules/validation'
import { ActionPlans, CandidateReadiness } from '@/components/skillpulse/modules/actions'
import { AuditTrail } from '@/components/skillpulse/modules/audit'

export default function Home() {
  const { activeModule, setModule } = useUIStore()

  return (
    <AppShell>
      <PageTransition k={activeModule}>
        {activeModule === 'dashboard' && <DashboardOverview onNavigate={setModule} />}
        {activeModule === 'observatory' && <DemandObservatory />}
        {activeModule === 'graph' && <SkillGraphExplorer />}
        {activeModule === 'mirror' && <CurriculumMirror />}
        {activeModule === 'district' && <DistrictIntelligence />}
        {activeModule === 'validation' && <ValidationQuorum />}
        {activeModule === 'actions' && <ActionPlans />}
        {activeModule === 'candidate' && <CandidateReadiness />}
        {activeModule === 'audit' && <AuditTrail />}
      </PageTransition>
    </AppShell>
  )
}
