import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Generic evidence lookup — given a recommendationId, demandSignalId,
// or validationRequestId, return the full evidence chain.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // 1. Try recommendation
  const rec = await db.recommendation.findUnique({
    where: { id },
    include: {
      skill: true,
      course: { include: { occupation: true, district: true } },
      demandSignal: {
        include: {
          skill: true,
          sector: true,
          district: true,
          occupation: true,
          postings: { take: 5, orderBy: { postedAt: 'desc' } },
          validations: { include: { employer: true }, orderBy: { createdAt: 'desc' } },
          validationRequest: { include: { responses: { include: { employer: true } } } },
        },
      },
    },
  })

  if (rec) {
    const ds = rec.demandSignal
    return NextResponse.json({
      kind: 'recommendation',
      recommendation: {
        id: rec.id,
        bucket: rec.bucket,
        actionType: rec.actionType,
        priorityBand: rec.priorityBand,
        rationale: rec.rationale,
        status: rec.status,
        suggestedOwner: rec.suggestedOwner,
        evidenceIds: rec.evidenceIds ? rec.evidenceIds.split('|') : [],
      },
      skill: { id: rec.skill?.id ?? '', uri: rec.skill?.uri ?? '', label: rec.skill?.preferredLabel ?? 'Unassigned skill', isEmerging: rec.skill?.isEmerging ?? false, isDeclining: rec.skill?.isDeclining ?? false },
      course: { id: rec.course.id, code: rec.course.code, name: rec.course.name, occupation: rec.course.occupation?.preferredLabel, district: rec.course.district?.name ?? 'Unknown' },
      demandSignal: ds ? {
        id: ds.id,
        postingCount: ds.postingCount,
        sourceCount: ds.sourceCount,
        trendLabel: ds.trendLabel,
        trendSlope: ds.trendSlope,
        confidence: ds.confidence,
        validationState: ds.validationState,
        promotionScore: ds.promotionScore,
        periodStart: ds.periodStart,
        periodEnd: ds.periodEnd,
        sector: ds.sector.name,
        district: ds.district?.name ?? null,
        samplePostings: ds.postings.map((p) => ({
          id: p.id,
          title: p.title,
          employer: p.employerName,
          employerOrgId: p.employerOrgId,
          postedAt: p.postedAt,
          isDuplicate: p.isDuplicate,
          isNoisy: p.isNoisy,
          confidence: p.confidence,
        })),
        validations: ds.validations.map((v) => ({
          id: v.id,
          employer: v.employer.name,
          employerOrgId: v.employer.orgId,
          responseType: v.responseType,
          weight: v.weight,
          reasonCode: v.reasonCode,
          createdAt: v.createdAt,
        })),
        validationRequest: ds.validationRequest ? {
          id: ds.validationRequest.id,
          status: ds.validationRequest.status,
          threshold: ds.validationRequest.threshold,
          minOrganizations: ds.validationRequest.minOrganizations,
          positiveRatioThreshold: ds.validationRequest.positiveRatioThreshold,
          responses: ds.validationRequest.responses.map((r) => ({
            id: r.id,
            employer: r.employer.name,
            employerOrgId: r.employer.orgId,
            weight: r.employer.weight,
            responseType: r.responseType,
            reasonCode: r.reasonCode,
            comment: r.comment,
            respondedAt: r.respondedAt,
          })),
        } : null,
      } : null,
    })
  }

  // 2. Try demand signal directly
  const ds = await db.demandSignal.findUnique({
    where: { id },
    include: {
      skill: true,
      sector: true,
      district: true,
      occupation: true,
      postings: { take: 8, orderBy: { postedAt: 'desc' } },
      validations: { include: { employer: true } },
      validationRequest: { include: { responses: { include: { employer: true } } } },
    },
  })
  if (ds) {
    return NextResponse.json({
      kind: 'demandSignal',
      demandSignal: {
        id: ds.id,
        skill: ds.skill,
        postingCount: ds.postingCount,
        sourceCount: ds.sourceCount,
        trendLabel: ds.trendLabel,
        confidence: ds.confidence,
        validationState: ds.validationState,
        promotionScore: ds.promotionScore,
        samplePostings: ds.postings.map((p) => ({
          id: p.id,
          title: p.title,
          employer: p.employerName,
          employerOrgId: p.employerOrgId,
          postedAt: p.postedAt,
          isDuplicate: p.isDuplicate,
          isNoisy: p.isNoisy,
          confidence: p.confidence,
        })),
        validations: ds.validations.map((v) => ({
          id: v.id,
          employer: v.employer.name,
          employerOrgId: v.employer.orgId,
          responseType: v.responseType,
          weight: v.weight,
          reasonCode: v.reasonCode,
          createdAt: v.createdAt,
        })),
        validationRequest: ds.validationRequest ? {
          id: ds.validationRequest.id,
          status: ds.validationRequest.status,
          responses: ds.validationRequest.responses.map((r) => ({
            id: r.id,
            employer: r.employer.name,
            employerOrgId: r.employer.orgId,
            responseType: r.responseType,
            reasonCode: r.reasonCode,
            comment: r.comment,
            respondedAt: r.respondedAt,
          })),
        } : null,
      },
    })
  }

  // 3. Try validation request
  const vr = await db.validationRequest.findUnique({
    where: { id },
    include: {
      demandSignal: { include: { skill: true } },
      responses: { include: { employer: true } },
    },
  })
  if (vr) {
    return NextResponse.json({
      kind: 'validationRequest',
      validationRequest: {
        id: vr.id,
        status: vr.status,
        threshold: vr.threshold,
        minOrganizations: vr.minOrganizations,
        positiveRatioThreshold: vr.positiveRatioThreshold,
        deadline: vr.deadline,
        skill: vr.demandSignal.skill,
        responses: vr.responses.map((r) => ({
          id: r.id,
          employer: r.employer.name,
          employerOrgId: r.employer.orgId,
          responseType: r.responseType,
          reasonCode: r.reasonCode,
          comment: r.comment,
          respondedAt: r.respondedAt,
        })),
      },
    })
  }

  return NextResponse.json({ error: 'Evidence not found' }, { status: 404 })
}
