import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest) {
  // Single demo candidate (id cand_0001)
  const candidate = await db.candidate.findFirst({
    include: {
      occupation: {
        include: { skills: { include: { skill: true } } },
      },
      district: true,
      assessments: { include: { skill: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  if (!candidate) {
    return NextResponse.json({ error: 'No candidate data' }, { status: 404 })
  }

  // Build a per-skill readiness map: assessment (or 0) vs occupation proficiency
  const assessedBySkill = new Map(candidate.assessments.map((a) => [a.skillId, a.proficiency]))

  const items = candidate.occupation.skills.map((os) => {
    const assessed = assessedBySkill.get(os.skillId) ?? 0
    const gap = Math.max(0, os.proficiency - assessed)
    const ratio = Math.min(1, assessed / os.proficiency)
    return {
      skillId: os.skillId,
      label: os.skill.preferredLabel,
      uri: os.skill.uri,
      essential: os.essential,
      isEmerging: os.skill.isEmerging,
      isDeclining: os.skill.isDeclining,
      demandedProficiency: os.proficiency,
      assessedProficiency: assessed,
      gap,
      readiness: Math.round(ratio * 100),
    }
  })

  // Overall readiness — weighted by essentiality
  const weightedTotal = items.reduce((s, i) => s + (i.essential ? 1.5 : 1.0), 0)
  const weightedReady = items.reduce((s, i) => s + (i.essential ? 1.5 : 1.0) * Math.min(1, i.assessedProficiency / i.demandedProficiency), 0)
  const overall = weightedTotal > 0 ? Math.round((weightedReady / weightedTotal) * 100) : 0

  // Priority learning sequence — gaps sorted by essential + gap size + emerging first
  const learningSequence = items
    .filter((i) => i.gap > 0)
    .sort((a, b) => {
      if (a.essential !== b.essential) return a.essential ? -1 : 1
      if (a.isEmerging !== b.isEmerging) return a.isEmerging ? -1 : 1
      return b.gap - a.gap
    })
    .map((i, idx) => ({
      rank: idx + 1,
      skillId: i.skillId,
      label: i.label,
      uri: i.uri,
      current: i.assessedProficiency,
      target: i.demandedProficiency,
      gap: i.gap,
      essential: i.essential,
      isEmerging: i.isEmerging,
    }))

  // District/sector context (honest framing)
  const districtName = candidate.district?.name ?? 'Unknown district'
  const signalsForOccupation = await db.demandSignal.count({
    where: { occupationId: candidate.occupation.id, districtId: candidate.districtId ?? undefined },
  })

  return NextResponse.json({
    candidate: {
      id: candidate.id,
      name: candidate.name,
      occupation: { id: candidate.occupation.id, label: candidate.occupation.preferredLabel, code: candidate.occupation.code },
      district: districtName,
    },
    overallReadiness: overall,
    totalSkills: items.length,
    matchedSkills: items.filter((i) => i.gap === 0).length,
    gapSkills: learningSequence.length,
    items,
    learningSequence,
    context: {
      districtName,
      signalsForOccupation,
      disclaimer: `Readiness is computed against validated demand for ${candidate.occupation.preferredLabel} in ${districtName}. No employment guarantee implied.`,
    },
  })
}
