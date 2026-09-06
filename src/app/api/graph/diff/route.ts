import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Diff between two taxonomy versions.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const fromId = sp.get('from')
  const toId = sp.get('to')

  const [from, to] = await Promise.all([
    db.taxonomyVersion.findUnique({ where: { id: fromId ?? '' } }),
    db.taxonomyVersion.findUnique({ where: { id: toId ?? '' } }),
  ])
  if (!from || !to) {
    return NextResponse.json({ error: 'Both from and to taxonomy versions are required' }, { status: 400 })
  }

  const [fromSkills, toSkills] = await Promise.all([
    db.skill.findMany({ where: { taxonomyId: from.id } }),
    db.skill.findMany({ where: { taxonomyId: to.id } }),
  ])

  const fromSet = new Map(fromSkills.map((s) => [s.uri, s]))
  const toSet = new Map(toSkills.map((s) => [s.uri, s]))

  const added = toSkills.filter((s) => !fromSet.has(s.uri))
  const removed = fromSkills.filter((s) => !toSet.has(s.uri))
  const unchanged = toSkills.filter((s) => fromSet.has(s.uri))

  return NextResponse.json({
    from: { id: from.id, version: from.version, releaseDate: from.releaseDate },
    to: { id: to.id, version: to.version, releaseDate: to.releaseDate },
    summary: {
      added: added.length,
      removed: removed.length,
      unchanged: unchanged.length,
    },
    added: added.map((s) => ({ id: s.id, uri: s.uri, label: s.preferredLabel })),
    removed: removed.map((s) => ({ id: s.id, uri: s.uri, label: s.preferredLabel })),
  })
}
