import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const signal = await db.demandSignal.findUnique({
    where: { id },
    include: {
      skill: true,
      occupation: true,
      district: true,
      sector: true,
      postings: { take: 12, orderBy: { postedAt: 'desc' } },
      validations: { include: { employer: true }, orderBy: { createdAt: 'desc' } },
      validationRequest: { include: { responses: { include: { employer: true }, orderBy: { respondedAt: 'asc' } } } },
      recommendations: { include: { course: true }, take: 5 },
    },
  })

  if (!signal) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Build a synthetic time series from posting distribution
  const monthlyCounts: { month: string; count: number }[] = []
  const buckets = new Map<string, number>()
  for (const p of signal.postings) {
    const k = `${p.postedAt.getFullYear()}-${(p.postedAt.getMonth() + 1).toString().padStart(2, '0')}`
    buckets.set(k, (buckets.get(k) ?? 0) + 1)
  }
  for (const [k, v] of Array.from(buckets.entries()).sort()) {
    monthlyCounts.push({ month: k, count: v })
  }

  // Districts contributing
  const contributingDistricts = await db.demandSignal.findMany({
    where: { skillId: signal.skillId, id: { not: id } },
    include: { district: true },
    take: 10,
  })

  return NextResponse.json({
    id: signal.id,
    skill: {
      id: signal.skill.id,
      uri: signal.skill.uri,
      label: signal.skill.preferredLabel,
      altLabels: signal.skill.altLabels,
      description: signal.skill.description,
      isEmerging: signal.skill.isEmerging,
      isDeclining: signal.skill.isDeclining,
      halfLifeYears: signal.skill.halfLifeYears,
    },
    occupation: signal.occupation
      ? { id: signal.occupation.id, label: signal.occupation.preferredLabel, code: signal.occupation.code }
      : null,
    sector: { id: signal.sector.id, name: signal.sector.name, code: signal.sector.code },
    district: signal.district ? { id: signal.district.id, lgdCode: signal.district.lgdCode, name: signal.district.name } : null,
    postingCount: signal.postingCount,
    sourceCount: signal.sourceCount,
    trendSlope: signal.trendSlope,
    trendLabel: signal.trendLabel,
    confidence: signal.confidence,
    validationState: signal.validationState,
    promotionScore: signal.promotionScore,
    periodStart: signal.periodStart,
    periodEnd: signal.periodEnd,
    timeSeries: monthlyCounts,
    samplePostings: signal.postings.map((p) => ({
      id: p.id,
      title: p.title,
      employer: p.employerName,
      employerOrgId: p.employerOrgId,
      postedAt: p.postedAt,
      isDuplicate: p.isDuplicate,
      isNoisy: p.isNoisy,
      confidence: p.confidence,
    })),
    contributingDistricts: contributingDistricts.map((d) => ({
      id: d.id,
      name: d.district?.name ?? 'National',
      lgdCode: d.district?.lgdCode ?? null,
      postingCount: d.postingCount,
      confidence: d.confidence,
    })),
    linkedOccupations: signal.occupation ? [
      { id: signal.occupation.id, label: signal.occupation.preferredLabel, code: signal.occupation.code },
    ] : [],
    validationHistory: signal.validations.map((v) => ({
      id: v.id,
      employer: v.employer.name,
      employerOrgId: v.employer.orgId,
      responseType: v.responseType,
      weight: v.weight,
      reasonCode: v.reasonCode,
      createdAt: v.createdAt,
    })),
    validationRequest: signal.validationRequest
      ? {
          id: signal.validationRequest.id,
          status: signal.validationRequest.status,
          threshold: signal.validationRequest.threshold,
          minOrganizations: signal.validationRequest.minOrganizations,
          positiveRatioThreshold: signal.validationRequest.positiveRatioThreshold,
          deadline: signal.validationRequest.deadline,
          responses: signal.validationRequest.responses.map((r) => ({
            id: r.id,
            employer: r.employer.name,
            employerOrgId: r.employer.orgId,
            responseType: r.responseType,
            reasonCode: r.reasonCode,
            comment: r.comment,
            respondedAt: r.respondedAt,
          })),
        }
      : null,
    recommendations: signal.recommendations.map((r) => ({
      id: r.id,
      bucket: r.bucket,
      actionType: r.actionType,
      priorityBand: r.priorityBand,
      course: r.course.name,
      courseCode: r.course.code,
    })),
  })
}
