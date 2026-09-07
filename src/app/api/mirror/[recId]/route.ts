import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: Promise<{ recId: string }> }) {
  const { recId } = await params
  const body = await req.json().catch(() => ({}))
  const action = body.action as 'accept' | 'reject' | 'start' | 'complete'
  const reasonCode = body.reasonCode as string | undefined
  const actor = (body.actor as string) ?? 'user'

  if (!['accept', 'reject', 'start', 'complete'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const rec = await db.recommendation.findUnique({ where: { id: recId } })
  if (!rec) {
    return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 })
  }

  let newStatus = rec.status
  let rejectionReason = rec.rejectionReason
  if (action === 'accept') {
    newStatus = 'Accepted'
    rejectionReason = null
  } else if (action === 'reject') {
    newStatus = 'Rejected'
    rejectionReason = reasonCode ?? 'NO_REASON'
    if (!reasonCode) {
      return NextResponse.json({ error: 'reasonCode is required to reject' }, { status: 400 })
    }
  } else if (action === 'start') {
    newStatus = 'InProgress'
  } else if (action === 'complete') {
    newStatus = 'Completed'
  }

  const updated = await db.recommendation.update({
    where: { id: recId },
    data: { status: newStatus, rejectionReason },
  })

  // Append-only audit log
  await db.auditLog.create({
    data: {
      actor,
      action: `recommendation.${action}`,
      entityType: 'Recommendation',
      entityId: recId,
      payload: JSON.stringify({ status: newStatus, reasonCode, bucket: rec.bucket, skillId: rec.skillId }),
    },
  })

  return NextResponse.json({ ok: true, status: newStatus, recommendation: updated })
}
