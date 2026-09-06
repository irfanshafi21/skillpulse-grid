import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { Bucket } from '@/lib/skillpulse/types'

// Calculate the Alignment Score with a transparent, reproducible formula.
//   alignment = (weightedMatched / weightedDemanded) * 100
//   weightedMatched = Σ_{s in Match} (essential?1.5:1) * proficiencyCloseness
//   weightedDemanded = Σ_{all demanded} (essential?1.5:1) * 1.0
//   proficiencyCloseness = min(taught/prof, 1)
//   Emerging/Declining contributions are reported separately as signals, not added to numerator
function computeAlignmentScore(items: {
  bucket: Bucket
  essential: boolean
  taughtProf?: number
  demandedProf: number
}[]) {
  let weightedDemanded = 0
  let weightedMatched = 0
  let emerging = 0
  let declining = 0
  let missing = 0

  for (const it of items) {
    const w = it.essential ? 1.5 : 1.0
    weightedDemanded += w
    if (it.bucket === 'Match') {
      const closeness = it.taughtProf ? Math.min(it.taughtProf / it.demandedProf, 1) : 0
      weightedMatched += w * closeness
    } else if (it.bucket === 'Emerging') {
      emerging++
    } else if (it.bucket === 'Declining') {
      declining++
    } else if (it.bucket === 'Missing') {
      missing++
    }
  }

  const alignment = weightedDemanded > 0 ? Math.round((weightedMatched / weightedDemanded) * 100) : 0
  return {
    alignment,
    formula: {
      weightedMatched: Number(weightedMatched.toFixed(2)),
      weightedDemanded: Number(weightedDemanded.toFixed(2)),
      essentialWeight: 1.5,
      optionalWeight: 1.0,
      proficiencyCloseness: 'min(taught/demanded, 1)',
      finalScale: 100,
    },
    counts: {
      match: items.filter((i) => i.bucket === 'Match').length,
      missing,
      emerging,
      declining,
      lowPriority: items.filter((i) => i.bucket === 'LowPriority').length,
    },
  }
}

// Classify a single skill into its bucket using occupation requirement + taught + demand signal + skill flags.
function classifyBucket(args: {
  taught?: { taughtProficiency: number } | null
  demandedProf: number
  essential: boolean
  isEmerging: boolean
  isDeclining: boolean
  hasDemand: boolean
}): Bucket {
  const { taught, demandedProf, essential, isEmerging, isDeclining, hasDemand } = args
  if (!taught) {
    if (isEmerging && hasDemand) return 'Emerging'
    if (isDeclining) return 'Declining'
    if (essential) return 'Missing'
    return 'LowPriority'
  }
  if (isDeclining) return 'Declining'
  if (taught.taughtProficiency < demandedProf - 1) return 'Missing'
  if (!essential && !isEmerging) return 'LowPriority'
  return 'Match'
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const courseId = sp.get('courseId')
  if (!courseId) {
    return NextResponse.json({ error: 'courseId is required' }, { status: 400 })
  }

  const t0 = Date.now()

  const course = await db.course.findUnique({
    where: { id: courseId },
    include: {
      occupation: {
        include: { skills: { include: { skill: true } } },
      },
      modules: { orderBy: { sequence: 'asc' } },
      courseSkills: { include: { skill: true, module: true } },
      district: true,
      sector: true,
    },
  })

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  if (!course.occupation) {
    return NextResponse.json({ error: 'This course has no occupation assigned' }, { status: 422 })
  }

  // Fetch all demand signals for the occupation's skills
  const skillIds = course.occupation.skills.map((s) => s.skillId)
  const demandSignals = await db.demandSignal.findMany({
    where: { skillId: { in: skillIds } },
    include: { skill: true, validations: true },
  })
  const demandBySkill = new Map(demandSignals.map((d) => [d.skillId, d]))
  const taughtBySkill = new Map(course.courseSkills.map((cs) => [cs.skillId, cs]))

  // Build bucket items for each demanded skill
  const items = course.occupation.skills.map((os) => {
    const taught = taughtBySkill.get(os.skillId) ?? null
    const demand = demandBySkill.get(os.skillId)
    const bucket = classifyBucket({
      taught: taught ? { taughtProficiency: taught.taughtProficiency } : null,
      demandedProf: os.proficiency,
      essential: os.essential,
      isEmerging: os.skill.isEmerging,
      isDeclining: os.skill.isDeclining,
      hasDemand: !!demand,
    })
    return {
      bucket,
      essential: os.essential,
      taughtProf: taught?.taughtProficiency,
      demandedProf: os.proficiency,
      skillId: os.skillId,
      skillLabel: os.skill.preferredLabel,
      skillUri: os.skill.uri,
      isEmerging: os.skill.isEmerging,
      isDeclining: os.skill.isDeclining,
      taughtProficiency: taught?.taughtProficiency ?? 0,
      demandedProficiency: os.proficiency,
      emphasisHours: taught?.emphasisHours ?? 0,
      moduleId: taught?.moduleId ?? null,
      demandSignalId: demand?.id ?? null,
      postingCount: demand?.postingCount ?? 0,
      sourceCount: demand?.sourceCount ?? 0,
      trendLabel: demand?.trendLabel ?? 'Stable',
      confidence: demand?.confidence ?? 0,
      validationState: demand?.validationState ?? 'Detected',
      promotionScore: demand?.promotionScore ?? 0,
    }
  })

  const alignment = computeAlignmentScore(items.map((i) => ({
    bucket: i.bucket,
    essential: i.essential,
    taughtProf: i.taughtProficiency,
    demandedProf: i.demandedProficiency,
  })))

  // Fetch existing recommendations (so the UI can show Proposed/Accepted/Rejected state)
  const recs = await db.recommendation.findMany({
    where: { courseId: course.id },
    include: { skill: true, demandSignal: true },
  })
  const recBySkill = new Map(recs.map((r) => [r.skillId, r]))

  const durationMs = Date.now() - t0

  return NextResponse.json({
    course: {
      id: course.id,
      code: course.code,
      name: course.name,
      institution: course.institution,
      durationMonths: course.duration,
      occupation: course.occupation
        ? { id: course.occupation.id, label: course.occupation.preferredLabel, code: course.occupation.code }
        : null,
      district: course.district ? { id: course.district.id, name: course.district.name, lgdCode: course.district.lgdCode } : null,
      sector: { name: course.sector.name, code: course.sector.code },
      moduleCount: course.modules.length,
    },
    alignment,
    performance: { durationMs, targetMs: 10000, meetsTarget: durationMs <= 10000 },
    items: items.map((i) => {
      const rec = recBySkill.get(i.skillId)
      return {
        ...i,
        recommendation: rec
          ? {
              id: rec.id,
              actionType: rec.actionType,
              priorityBand: rec.priorityBand,
              suggestedOwner: rec.suggestedOwner,
              rationale: rec.rationale,
              status: rec.status,
              rejectionReason: rec.rejectionReason,
              evidenceIds: rec.evidenceIds ? rec.evidenceIds.split('|') : [],
            }
          : null,
      }
    }),
    recommendations: recs.map((r) => ({
      id: r.id,
      skillId: r.skillId,
      skillLabel: r.skill?.preferredLabel ?? 'Unassigned skill',
      bucket: r.bucket,
      actionType: r.actionType,
      priorityBand: r.priorityBand,
      suggestedOwner: r.suggestedOwner,
      rationale: r.rationale,
      status: r.status,
      rejectionReason: r.rejectionReason,
      evidenceIds: r.evidenceIds ? r.evidenceIds.split('|') : [],
    })),
  })
}
