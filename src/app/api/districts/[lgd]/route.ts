import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ lgd: string }> }) {
  const { lgd } = await params

  const district = await db.district.findFirst({
    where: { lgdCode: lgd },
    include: {
      sectors: { include: { sector: true } },
      _count: { select: { jobPostings: true, demandSignals: true } },
    },
  })
  if (!district) {
    return NextResponse.json({ error: 'District not found' }, { status: 404 })
  }

  // Top demanded occupations
  const topOccupations = await db.demandSignal.findMany({
    where: { districtId: district.id, occupationId: { not: null } },
    include: { occupation: true },
    orderBy: { postingCount: 'desc' },
    take: 5,
  })

  // Top missing skills (skills demanded but where no local course teaches them)
  const localCourses = await db.course.findMany({
    where: { districtId: district.id },
    select: { id: true },
  })
  const localCourseIds = localCourses.map((c) => c.id)
  const taughtSkillIds = localCourseIds.length
    ? (await db.courseSkill.findMany({
        where: { courseId: { in: localCourseIds } },
        distinct: ['skillId'],
        select: { skillId: true },
      })).map((cs) => cs.skillId)
    : []

  const demandedSkills = await db.demandSignal.findMany({
    where: { districtId: district.id },
    include: { skill: true, occupation: true },
    orderBy: { postingCount: 'desc' },
    take: 12,
  })
  const topMissing = demandedSkills
    .filter((d) => !taughtSkillIds.includes(d.skillId))
    .slice(0, 5)
    .map((d) => ({
      id: d.skillId,
      label: d.skill.preferredLabel,
      uri: d.skill.uri,
      postingCount: d.postingCount,
      isEmerging: d.skill.isEmerging,
      isDeclining: d.skill.isDeclining,
      trendLabel: d.trendLabel,
    }))

  // Training supply: courses offered in this district
  const localCoursesDetailed = await db.course.findMany({
    where: { districtId: district.id },
    include: { occupation: true, _count: { select: { courseSkills: true, modules: true } } },
  })

  // Coverage indicator: organizations contributing to signals in this district
  const orgs = new Set<string>()
  const postings = await db.jobPosting.findMany({
    where: { districtId: district.id },
    select: { employerOrgId: true },
  })
  for (const p of postings) orgs.add(p.employerOrgId)

  return NextResponse.json({
    district: {
      id: district.id,
      lgdCode: district.lgdCode,
      name: district.name,
      state: district.stateName,
      coverage: district.sectors[0]?.coverage ?? 0,
    },
    metrics: {
      postingCount: district._count.jobPostings,
      demandSignalCount: district._count.demandSignals,
      organizationCount: orgs.size,
      courseCount: localCoursesDetailed.length,
    },
    topOccupations: topOccupations.map((d) => ({
      id: d.occupation!.id,
      label: d.occupation!.preferredLabel,
      code: d.occupation!.code,
      postingCount: d.postingCount,
      confidence: d.confidence,
    })),
    topMissingSkills: topMissing,
    localCourses: localCoursesDetailed.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      durationMonths: c.duration,
      occupation: c.occupation?.preferredLabel ?? null,
      moduleCount: c._count.modules,
      skillCount: c._count.courseSkills,
    })),
    coverageIndicator: {
      sourceOrganizations: orgs.size,
      sourcesRequired: 3,
      sufficient: orgs.size >= 3,
      coveragePct: Math.min(100, (orgs.size / 3) * 100),
    },
  })
}
