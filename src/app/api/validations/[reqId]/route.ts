import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: Promise<{ reqId: string }> }) {
  const { reqId } = await params
  const body = await req.json().catch(() => ({}))
  const employerId = body.employerId as string | undefined
  const responseType = body.responseType as 'Confirm' | 'Reject' | 'Qualify' | undefined
  const reasonCode = body.reasonCode as string | undefined
  const comment = body.comment as string | undefined

  if (typeof employerId !== 'string' || !employerId || !responseType || !['Confirm', 'Reject', 'Qualify'].includes(responseType ?? '') || (reasonCode !== undefined && typeof reasonCode !== 'string') || (comment !== undefined && typeof comment !== 'string')) {
    return NextResponse.json({ error: 'Valid employerId and responseType required' }, { status: 400 })
  }

  const request = await db.validationRequest.findUnique({
    where: { id: reqId },
    include: { demandSignal: true, responses: { include: { employer: true } } },
  })
  if (!request) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }

  const employer = await db.employer.findUnique({ where: { id: employerId } })
  if (!employer) {
    return NextResponse.json({ error: 'Employer not found' }, { status: 404 })
  }

  // Create the response
  const resp = await db.validationResponse.create({
    data: {
      requestId: reqId,
      employerId: employer.id,
      responseType,
      reasonCode,
      comment,
    },
  })

  // Append the validation signal (immutable audit entry)
  await db.validationSignal.create({
    data: {
      skillId: request.skillId,
      demandSignalId: request.demandSignalId,
      employerId: employer.id,
      responseType,
      weight: employer.weight,
      reasonCode,
    },
  })

  // Recompute the request status (post-hoc quorum check)
  const allResponses = await db.validationResponse.findMany({
    where: { requestId: reqId },
    include: { employer: true },
  })
  const confirm = allResponses.filter((x) => x.responseType === 'Confirm')
  const reject = allResponses.filter((x) => x.responseType === 'Reject')
  const qualify = allResponses.filter((x) => x.responseType === 'Qualify')
  const distinctOrgs = new Set(allResponses.map((x) => x.employer.orgId)).size
  const weightedScore = confirm.reduce((s, x) => s + x.employer.weight, 0)
    + qualify.reduce((s, x) => s + x.employer.weight * 0.5, 0)
    - reject.reduce((s, x) => s + x.employer.weight * 0.5, 0)
  const positiveRatio = allResponses.length > 0
    ? (confirm.length + qualify.length) / allResponses.length
    : 0
  const orgScores = new Map<string, number>()
  for (const x of allResponses) {
    orgScores.set(x.employer.orgId, (orgScores.get(x.employer.orgId) ?? 0) + x.employer.weight)
  }
  const totalScore = Array.from(orgScores.values()).reduce((a, b) => a + b, 0)
  const topOrgConcentration = totalScore > 0
    ? Math.max(...Array.from(orgScores.values())) / totalScore
    : 0
  const concentrationFlag = topOrgConcentration > 0.5

  const meetsQuorum = distinctOrgs >= request.minOrganizations &&
    weightedScore >= request.threshold &&
    positiveRatio >= request.positiveRatioThreshold &&
    !concentrationFlag

  let newStatus = request.status
  let demandState = request.demandSignal.validationState
  if (meetsQuorum) {
    newStatus = 'Promoted'
    demandState = 'Validated'
  } else if (reject.length >= 2 || positiveRatio < 0.4) {
    newStatus = 'Rejected'
    demandState = 'NeedsReview'
  }

  await db.validationRequest.update({
    where: { id: reqId },
    data: { status: newStatus },
  })
  await db.demandSignal.update({
    where: { id: request.demandSignalId },
    data: { validationState: demandState, promotionScore: Number(weightedScore.toFixed(2)) },
  })

  await db.auditLog.create({
    data: {
      actor: `employer:${employer.orgId}`,
      action: `validation.${responseType.toLowerCase()}`,
      entityType: 'ValidationRequest',
      entityId: reqId,
      payload: JSON.stringify({ responseType, reasonCode, weight: employer.weight, meetsQuorum, newStatus }),
    },
  })

  return NextResponse.json({
    ok: true,
    response: { id: resp.id, responseType },
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
      newStatus,
      demandState,
    },
  })
}
