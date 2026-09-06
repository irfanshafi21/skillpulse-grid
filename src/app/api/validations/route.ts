import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const status = sp.get('status') ?? undefined
  const employerId = sp.get('employerId') ?? undefined

  const requests = await db.validationRequest.findMany({
    where: {
      status: status ?? undefined,
      responses: employerId ? { some: { employerId } } : undefined,
    },
    include: {
      demandSignal: {
        include: { skill: true, district: true, sector: true },
      },
      responses: { include: { employer: true }, orderBy: { respondedAt: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const items = requests.map((r) => {
    const confirm = r.responses.filter((x) => x.responseType === 'Confirm')
    const reject = r.responses.filter((x) => x.responseType === 'Reject')
    const qualify = r.responses.filter((x) => x.responseType === 'Qualify')
    const distinctOrgs = new Set(r.responses.map((x) => x.employer.orgId)).size
    const weightedScore = confirm.reduce((s, x) => s + x.employer.weight, 0)
      + qualify.reduce((s, x) => s + x.employer.weight * 0.5, 0)
      - reject.reduce((s, x) => s + x.employer.weight * 0.5, 0)
    const positiveRatio = r.responses.length > 0
      ? (confirm.length + qualify.length) / r.responses.length
      : 0
    const topOrgId = r.responses.length > 0
      ? r.responses.reduce((acc, x) => {
          acc.set(x.employer.orgId, (acc.get(x.employer.orgId) ?? 0) + x.employer.weight)
          return acc
        }, new Map<string, number>())
      : new Map<string, number>()
    const topOrgConcentration = r.responses.length > 0 && topOrgId.size > 0
      ? Math.max(...Array.from(topOrgId.values())) / Math.max(1, Array.from(topOrgId.values()).reduce((a, b) => a + b, 0))
      : 0
    const concentrationFlag = topOrgConcentration > 0.5
    const meetsQuorum = distinctOrgs >= r.minOrganizations &&
      weightedScore >= r.threshold &&
      positiveRatio >= r.positiveRatioThreshold &&
      !concentrationFlag

    return {
      id: r.id,
      skill: r.demandSignal.skill,
      district: r.demandSignal.district?.name ?? null,
      sector: r.demandSignal.sector.name,
      message: r.message,
      status: r.status,
      threshold: r.threshold,
      minOrganizations: r.minOrganizations,
      positiveRatioThreshold: r.positiveRatioThreshold,
      deadline: r.deadline,
      createdAt: r.createdAt,
      responses: r.responses.map((x) => ({
        id: x.id,
        employer: x.employer.name,
        employerOrgId: x.employer.orgId,
        weight: x.employer.weight,
        responseType: x.responseType,
        reasonCode: x.reasonCode,
        comment: x.comment,
        respondedAt: x.respondedAt,
      })),
      summary: {
        confirm: confirm.length,
        reject: reject.length,
        qualify: qualify.length,
        distinctOrgs,
        weightedScore: Number(weightedScore.toFixed(2)),
        positiveRatio: Number(positiveRatio.toFixed(2)),
        topOrgConcentration: Number(topOrgConcentration.toFixed(2)),
        concentrationFlag,
        meetsQuorum,
      },
    }
  })

  return NextResponse.json({ count: items.length, items })
}
