import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const q = sp.get('q')?.toLowerCase() ?? ''
  const sectorId = sp.get('sectorId') ?? undefined
  const districtId = sp.get('districtId') ?? undefined
  const trendLabel = sp.get('trendLabel') ?? undefined
  const validationState = sp.get('validationState') ?? undefined
  const minConfidence = parseFloat(sp.get('minConfidence') ?? '0')
  const limit = Math.min(200, parseInt(sp.get('limit') ?? '100'))

  const where: Prisma.DemandSignalWhereInput = {
    sectorId: sectorId ?? undefined,
    districtId: districtId || undefined,
    trendLabel: trendLabel ?? undefined,
    validationState: validationState ?? undefined,
    confidence: { gte: minConfidence },
    skill: q ? { preferredLabel: { contains: q } } : undefined,
  }

  const signals = await db.demandSignal.findMany({
    where,
    include: {
      skill: true,
      occupation: true,
      district: true,
      sector: true,
    },
    orderBy: [{ postingCount: 'desc' }, { confidence: 'desc' }],
    take: limit,
  })

  return NextResponse.json({
    count: signals.length,
    items: signals.map((s) => ({
      id: s.id,
      skillId: s.skillId,
      skillLabel: s.skill.preferredLabel,
      skillUri: s.skill.uri,
      isEmerging: s.skill.isEmerging,
      isDeclining: s.skill.isDeclining,
      halfLifeYears: s.skill.halfLifeYears,
      occupation: s.occupation?.preferredLabel ?? null,
      occupationId: s.occupationId,
      sector: s.sector.name,
      district: s.district?.name ?? null,
      districtId: s.districtId,
      postingCount: s.postingCount,
      sourceCount: s.sourceCount,
      trendSlope: s.trendSlope,
      trendLabel: s.trendLabel,
      confidence: s.confidence,
      validationState: s.validationState,
      promotionScore: s.promotionScore,
      periodStart: s.periodStart,
      periodEnd: s.periodEnd,
    })),
  })
}
