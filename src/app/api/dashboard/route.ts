import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest) {
  const [
    skillCount,
    occupationCount,
    postingCount,
    demandSignalCount,
    courseCount,
    recommendationCount,
    validatedSignals,
    emergingSkills,
    districts,
  ] = await Promise.all([
    db.skill.count({ where: { taxonomy: { isCurrent: true } } }),
    db.occupation.count(),
    db.jobPosting.count(),
    db.demandSignal.count(),
    db.course.count(),
    db.recommendation.count(),
    db.demandSignal.count({ where: { validationState: 'Validated' } }),
    db.skill.count({ where: { isEmerging: true, taxonomy: { isCurrent: true } } }),
    db.district.findMany({
      include: { sectors: true, _count: { select: { jobPostings: true } } },
      orderBy: { name: 'asc' },
    }),
  ])

  // Top demanded skills (by posting count across all signals)
  const topDemanded = await db.demandSignal.groupBy({
    by: ['skillId'],
    _sum: { postingCount: true },
    orderBy: { _sum: { postingCount: 'desc' } },
    take: 8,
  })
  const topSkills = await db.skill.findMany({
    where: { id: { in: topDemanded.map((t) => t.skillId) } },
  })
  const topDemandedDetailed = topDemanded.map((t) => {
    const sk = topSkills.find((s) => s.id === t.skillId)!
    return {
      skillId: t.skillId,
      label: sk.preferredLabel,
      uri: sk.uri,
      isEmerging: sk.isEmerging,
      isDeclining: sk.isDeclining,
      postingCount: t._sum.postingCount ?? 0,
    }
  })

  // Validation pipeline
  const validationPipeline = await db.demandSignal.groupBy({
    by: ['validationState'],
    _count: { _all: true },
  })

  // Recent audit entries
  const recentAudit = await db.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 6,
  })

  return NextResponse.json({
    kpis: {
      skills: skillCount,
      occupations: occupationCount,
      postings: postingCount,
      demandSignals: demandSignalCount,
      courses: courseCount,
      recommendations: recommendationCount,
      validated: validatedSignals,
      emerging: emergingSkills,
      districts: districts.length,
    },
    topDemanded: topDemandedDetailed,
    validationPipeline: validationPipeline.map((v) => ({
      state: v.validationState,
      count: v._count._all,
    })),
    districts: districts.map((d) => ({
      id: d.id,
      lgdCode: d.lgdCode,
      name: d.name,
      state: d.stateName,
      coverage: d.sectors[0]?.coverage ?? 0,
      postingCount: d._count.jobPostings,
    })),
    recentAudit,
  })
}
