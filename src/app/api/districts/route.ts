import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const sectorId = sp.get('sectorId') ?? undefined
  const skillId = sp.get('skillId') ?? undefined

  const where: Record<string, unknown> = {}
  if (sectorId) where.sectorId = sectorId
  if (skillId) where.demandSignals = { some: { skillId } }

  const districts = await db.district.findMany({
    where,
    include: {
      sectors: { include: { sector: true } },
      _count: { select: { jobPostings: true } },
      demandSignals: skillId
        ? {
            where: { skillId },
            select: { postingCount: true, sourceCount: true, confidence: true, trendLabel: true, validationState: true },
          }
        : false,
    },
    orderBy: { name: 'asc' },
  })

  // Aggregate demand signal stats per district (for the heatmap)
  const signalAgg = await db.demandSignal.groupBy({
    by: ['districtId'],
    _sum: { postingCount: true },
    _avg: { confidence: true },
    _count: { _all: true },
    where: { districtId: { not: null } },
  })
  const aggByDistrict = new Map(signalAgg.map((s) => [s.districtId, s]))

  // Top demanded skills per district (top 3 by posting count)
  const topSkillsByDistrict = await db.demandSignal.findMany({
    where: { districtId: { not: null } },
    include: { skill: true },
    orderBy: { postingCount: 'desc' },
  })
  const topSkillsMap = new Map<string, { id: string; label: string; uri: string; postingCount: number; isEmerging: boolean; isDeclining: boolean }[]>()
  for (const s of topSkillsByDistrict) {
    if (!s.districtId) continue
    const arr = topSkillsMap.get(s.districtId) ?? []
    if (arr.length < 5) {
      arr.push({
        id: s.skillId,
        label: s.skill.preferredLabel,
        uri: s.skill.uri,
        postingCount: s.postingCount,
        isEmerging: s.skill.isEmerging,
        isDeclining: s.skill.isDeclining,
      })
    }
    topSkillsMap.set(s.districtId, arr)
  }

  return NextResponse.json({
    districts: districts.map((d) => {
      const agg = aggByDistrict.get(d.id)
      const coverage = d.sectors[0]?.coverage ?? 0
      return {
        id: d.id,
        lgdCode: d.lgdCode,
        name: d.name,
        state: d.stateName,
        coverage,
        postingCount: d._count.jobPostings,
        demandSignalCount: agg?._count._all ?? 0,
        totalPostings: agg?._sum.postingCount ?? 0,
        avgConfidence: agg?._avg.confidence ?? 0,
        topSkills: topSkillsMap.get(d.id) ?? [],
        // mismatch severity: lower coverage + higher demand = high mismatch
        mismatch: Math.round((1 - coverage) * Math.min(1, (agg?._sum.postingCount ?? 0) / 50) * 100),
      }
    }),
  })
}
