import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const taxonomyVersionId = sp.get('taxonomyVersionId') ?? undefined
  const occupationId = sp.get('occupationId') ?? undefined
  const q = sp.get('q')?.toLowerCase() ?? ''
  const limit = Math.min(500, parseInt(sp.get('limit') ?? '300'))

  const taxonomy = await db.taxonomyVersion.findFirst({
    where: taxonomyVersionId ? { id: taxonomyVersionId } : { isCurrent: true },
  })
  if (!taxonomy) {
    return NextResponse.json({ error: 'No taxonomy version found' }, { status: 404 })
  }

  const occupations = await db.occupation.findMany({
    where: {
      taxonomyId: taxonomy.id,
      id: occupationId || undefined,
      preferredLabel: q ? { contains: q } : undefined,
    },
    include: {
      skills: { include: { skill: true } },
      sector: true,
      courses: { select: { id: true, code: true, name: true } },
    },
    take: limit,
  })

  const allSkills = await db.skill.findMany({
    where: { taxonomyId: taxonomy.id },
    include: { sector: true },
  })

  return NextResponse.json({
    taxonomy: { id: taxonomy.id, version: taxonomy.version, isCurrent: taxonomy.isCurrent },
    occupations: occupations.map((o) => ({
      id: o.id,
      uri: o.uri,
      code: o.code,
      label: o.preferredLabel,
      sector: o.sector.name,
      skills: o.skills.map((s) => ({
        id: s.skill.id,
        uri: s.skill.uri,
        label: s.skill.preferredLabel,
        proficiency: s.proficiency,
        essential: s.essential,
        isEmerging: s.skill.isEmerging,
        isDeclining: s.skill.isDeclining,
      })),
      courseCount: o.courses.length,
      courses: o.courses,
    })),
    skillCount: allSkills.length,
  })
}
