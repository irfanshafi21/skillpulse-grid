import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const action = sp.get('action') ?? undefined
  const entityType = sp.get('entityType') ?? undefined
  const limit = Math.min(200, parseInt(sp.get('limit') ?? '100'))

  const logs = await db.auditLog.findMany({
    where: {
      action: action ?? undefined,
      entityType: entityType ?? undefined,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return NextResponse.json({
    count: logs.length,
    items: logs.map((l) => ({
      id: l.id,
      actor: l.actor,
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId,
      payload: (() => {
        try {
          return JSON.parse(l.payload)
        } catch {
          return l.payload
        }
      })(),
      createdAt: l.createdAt,
    })),
  })
}
