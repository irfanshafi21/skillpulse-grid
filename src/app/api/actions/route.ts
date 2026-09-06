import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const status = sp.get('status') ?? undefined
  const courseId = sp.get('courseId') ?? undefined

  const recs = await db.recommendation.findMany({
    where: {
      status: status ?? undefined,
      courseId: courseId ?? undefined,
    },
    include: {
      course: { include: { occupation: true, district: true } },
      skill: true,
      demandSignal: true,
    },
    orderBy: [{ priorityBand: 'asc' }, { createdAt: 'desc' }],
  })

  const grouped = recs.reduce((acc, r) => {
    const k = r.course.code
    if (!acc[k]) acc[k] = { course: r.course, items: [] }
    acc[k].items.push({
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
      demandSignalId: r.demandSignalId,
    })
    return acc
  }, {} as Record<string, { course: any; items: any[] }>)

  return NextResponse.json({
    count: recs.length,
    byStatus: {
      Proposed: recs.filter((r) => r.status === 'Proposed').length,
      Accepted: recs.filter((r) => r.status === 'Accepted').length,
      Rejected: recs.filter((r) => r.status === 'Rejected').length,
      InProgress: recs.filter((r) => r.status === 'InProgress').length,
      Completed: recs.filter((r) => r.status === 'Completed').length,
    },
    groups: Object.values(grouped),
  })
}
