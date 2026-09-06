// SkillPulse Grid — Seed Script
// Populates the SQLite prototype database with a realistic IT-ITeS
// sector × Maharashtra district dataset that supports the full
// Detect → Understand → Validate → Compare → Localize → Recommend → Trace
// evidence workflow described in the PRD (SIH26134).

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

// Deterministic ID helpers so cross-references remain stable.
const id = (prefix: string, n: number) => `${prefix}_${n.toString().padStart(4, '0')}`

async function main() {
  console.log('🌱 Seeding SkillPulse Grid prototype dataset...')

  // Wipe existing data (order matters for FK constraints)
  await db.auditLog.deleteMany()
  await db.candidateAssessment.deleteMany()
  await db.candidate.deleteMany()
  await db.recommendation.deleteMany()
  await db.courseSkill.deleteMany()
  await db.module.deleteMany()
  await db.course.deleteMany()
  await db.validationResponse.deleteMany()
  await db.validationRequest.deleteMany()
  await db.validationSignal.deleteMany()
  await db.employer.deleteMany()
  await db.demandSignal.deleteMany()
  await db.jobPosting.deleteMany()
  await db.districtSector.deleteMany()
  await db.district.deleteMany()
  await db.occupationSkill.deleteMany()
  await db.occupation.deleteMany()
  await db.skill.deleteMany()
  await db.sector.deleteMany()
  await db.taxonomyVersion.deleteMany()

  // ── Taxonomy ───────────────────────────────────────────────────────
  const tx = await db.taxonomyVersion.create({
    data: {
      id: id('tx', 1),
      version: 'ESCO v1.2.0 + India-ext-0.3',
      baseSystem: 'ESCO',
      releaseDate: new Date('2025-06-01'),
      notes: 'ESCO core + India extension layer for IT-ITeS prototype.',
      isCurrent: true,
    },
  })

  const txPrev = await db.taxonomyVersion.create({
    data: {
      id: id('tx', 0),
      version: 'ESCO v1.1.0 + India-ext-0.1',
      baseSystem: 'ESCO',
      releaseDate: new Date('2024-01-01'),
      notes: 'Previous taxonomy snapshot — used to demonstrate delta on version switch.',
      isCurrent: false,
    },
  })

  // ── Sector ─────────────────────────────────────────────────────────
  const sectorIT = await db.sector.create({
    data: {
      id: id('sec', 1),
      code: 'IT-ITeS',
      name: 'IT — IT Enabled Services',
    },
  })

  // ── Districts (Maharashtra sample) ─────────────────────────────────
  const districtDefs = [
    ['274', 'Pune', 'Maharashtra', 0.92],
    ['521', 'Mumbai Suburban', 'Maharashtra', 0.97],
    ['514', 'Mumbai City', 'Maharashtra', 0.95],
    ['276', 'Nagpur', 'Maharashtra', 0.78],
    ['275', 'Nashik', 'Maharashtra', 0.66],
    ['272', 'Aurangabad (Chhatrapati Sambhajinagar)', 'Maharashtra', 0.61],
    ['271', 'Thane', 'Maharashtra', 0.88],
    ['533', 'Navi Mumbai', 'Maharashtra', 0.84],
    ['277', 'Kolhapur', 'Maharashtra', 0.49],
    ['278', 'Solapur', 'Maharashtra', 0.42],
    ['279', 'Amravati', 'Maharashtra', 0.38],
    ['280', 'Nanded', 'Maharashtra', 0.31],
  ] as const

  const districts: Record<string, { id: string; name: string; coverage: number }> = {}
  for (const [lgd, name, state, cov] of districtDefs) {
    const d = await db.district.create({
      data: { id: id('dist', parseInt(lgd)), lgdCode: lgd, name, stateName: state },
    })
    await db.districtSector.create({
      data: { districtId: d.id, sectorId: sectorIT.id, coverage: cov },
    })
    districts[lgd] = { id: d.id, name, coverage: cov }
  }

  // ── Skills (ESCO-anchored + India extension) ────────────────────────
  type SkillSeed = {
    uri: string
    label: string
    alt: string
    emerging?: boolean
    declining?: boolean
    halfLife: number
  }

  const skillDefs: SkillSeed[] = [
    { uri: 'esco:S1', label: 'Python (Programming Language)', alt: 'python|py', halfLife: 3 },
    { uri: 'esco:S2', label: 'JavaScript', alt: 'javascript|js|node', halfLife: 3 },
    { uri: 'esco:S3', label: 'SQL', alt: 'sql|database queries', halfLife: 4 },
    { uri: 'esco:S4', label: 'React (Web Framework)', alt: 'react|reactjs|react.js', halfLife: 2.5 },
    { uri: 'esco:S5', label: 'Java (Programming Language)', alt: 'java|j2ee|spring', halfLife: 4 },
    { uri: 'esco:S6', label: 'Cloud Computing', alt: 'aws|azure|gcp|cloud', halfLife: 2.5 },
    { uri: 'esco:S7', label: 'DevOps', alt: 'devops|ci/cd|kubernetes', halfLife: 2 },
    { uri: 'esco:S8', label: 'Data Analysis', alt: 'data analysis|pandas|numpy', halfLife: 3 },
    { uri: 'esco:S9', label: 'Machine Learning', alt: 'machine learning|ml|scikit', halfLife: 2 },
    { uri: 'inext:S10', label: 'Generative AI & LLMs', alt: 'genai|llm|gpt|prompt engineering', emerging: true, halfLife: 1.2 },
    { uri: 'inext:S11', label: 'Prompt Engineering', alt: 'prompt|prompt design', emerging: true, halfLife: 1 },
    { uri: 'inext:S12', label: 'MLOps', alt: 'mlops|model deployment', emerging: true, halfLife: 1.8 },
    { uri: 'esco:S13', label: 'HTML & CSS', alt: 'html|css|tailwind', halfLife: 4 },
    { uri: 'esco:S14', label: 'TypeScript', alt: 'typescript|ts', halfLife: 3 },
    { uri: 'esco:S15', label: 'REST API Design', alt: 'rest|api|restful', halfLife: 3 },
    { uri: 'esco:S16', label: 'Agile/Scrum', alt: 'agile|scrum|jira', halfLife: 4 },
    { uri: 'esco:S17', label: 'Quality Assurance / Testing', alt: 'qa|testing|selenium|automation', halfLife: 3 },
    { uri: 'esco:S18', label: 'Project Management', alt: 'project management|pmo|pmp', halfLife: 4 },
    { uri: 'esco:S19', label: 'Adobe Flash (legacy)', alt: 'flash|actionscript', declining: true, halfLife: 5 },
    { uri: 'esco:S20', label: 'jQuery (legacy)', alt: 'jquery', declining: true, halfLife: 4 },
    { uri: 'esco:S21', label: 'Communication Skills', alt: 'communication|verbal|written', halfLife: 5 },
    { uri: 'esco:S22', label: 'Cybersecurity Fundamentals', alt: 'security|cybersecurity|owasp', halfLife: 2.2 },
    { uri: 'inext:S23', label: 'Vector Databases', alt: 'vector db|pinecone|weaviate', emerging: true, halfLife: 1.5 },
    { uri: 'esco:S24', label: 'Docker', alt: 'docker|containers', halfLife: 2.5 },
    { uri: 'esco:S25', label: 'Git', alt: 'git|version control', halfLife: 4 },
  ]

  const skills: Record<string, string> = {}
  for (const [i, s] of skillDefs.entries()) {
    const created = await db.skill.create({
      data: {
        id: id('skill', i + 1),
        uri: s.uri,
        preferredLabel: s.label,
        altLabels: s.alt,
        isEmerging: !!s.emerging,
        isDeclining: !!s.declining,
        halfLifeYears: s.halfLife,
        taxonomyId: tx.id,
        sectorId: sectorIT.id,
      },
    })
    skills[s.uri] = created.id
  }

  // Also create one skill in the previous taxonomy to demonstrate deltas
  const genAiPrev = await db.skill.create({
    data: {
      id: id('skill', 999),
      uri: 'inext:S10-prev',
      preferredLabel: 'Generative AI (early)',
      altLabels: 'genai early',
      halfLifeYears: 1.2,
      taxonomyId: txPrev.id,
      sectorId: sectorIT.id,
    },
  })

  // ── Occupations + OccupationSkill ──────────────────────────────────
  type OccSeed = {
    uri: string
    code: string
    label: string
    skills: { uri: string; prof: number; essential: boolean }[]
  }

  const occDefs: OccSeed[] = [
    {
      uri: 'esco:O1',
      code: 'ITS-001',
      label: 'Full-Stack Developer',
      skills: [
        { uri: 'esco:S2', prof: 4, essential: true },
        { uri: 'esco:S4', prof: 4, essential: true },
        { uri: 'esco:S14', prof: 3, essential: true },
        { uri: 'esco:S15', prof: 3, essential: true },
        { uri: 'esco:S13', prof: 3, essential: false },
        { uri: 'esco:S3', prof: 3, essential: true },
        { uri: 'inext:S10', prof: 2, essential: false },
        { uri: 'inext:S11', prof: 2, essential: false },
        { uri: 'esco:S24', prof: 2, essential: false },
        { uri: 'esco:S25', prof: 3, essential: true },
      ],
    },
    {
      uri: 'esco:O2',
      code: 'ITS-002',
      label: 'DevOps Engineer',
      skills: [
        { uri: 'esco:S6', prof: 4, essential: true },
        { uri: 'esco:S7', prof: 4, essential: true },
        { uri: 'esco:S24', prof: 4, essential: true },
        { uri: 'esco:S1', prof: 3, essential: true },
        { uri: 'esco:S22', prof: 3, essential: true },
        { uri: 'inext:S12', prof: 3, essential: false },
        { uri: 'inext:S23', prof: 2, essential: false },
        { uri: 'esco:S5', prof: 2, essential: false },
        { uri: 'esco:S25', prof: 3, essential: true },
      ],
    },
    {
      uri: 'esco:O3',
      code: 'ITS-003',
      label: 'Data Analyst',
      skills: [
        { uri: 'esco:S1', prof: 4, essential: true },
        { uri: 'esco:S8', prof: 4, essential: true },
        { uri: 'esco:S3', prof: 3, essential: true },
        { uri: 'inext:S10', prof: 2, essential: false },
        { uri: 'esco:S21', prof: 3, essential: true },
        { uri: 'esco:S25', prof: 2, essential: false },
      ],
    },
    {
      uri: 'esco:O4',
      code: 'ITS-004',
      label: 'ML Engineer',
      skills: [
        { uri: 'esco:S9', prof: 4, essential: true },
        { uri: 'esco:S1', prof: 4, essential: true },
        { uri: 'inext:S10', prof: 4, essential: true },
        { uri: 'inext:S11', prof: 3, essential: true },
        { uri: 'inext:S12', prof: 3, essential: true },
        { uri: 'inext:S23', prof: 3, essential: true },
        { uri: 'esco:S6', prof: 3, essential: false },
        { uri: 'esco:S24', prof: 3, essential: true },
      ],
    },
    {
      uri: 'esco:O5',
      code: 'ITS-005',
      label: 'QA Automation Engineer',
      skills: [
        { uri: 'esco:S17', prof: 4, essential: true },
        { uri: 'esco:S2', prof: 3, essential: true },
        { uri: 'esco:S4', prof: 3, essential: false },
        { uri: 'esco:S5', prof: 2, essential: false },
        { uri: 'esco:S25', prof: 3, essential: true },
        { uri: 'esco:S16', prof: 3, essential: true },
      ],
    },
  ]

  const occupations: Record<string, string> = {}
  for (const [i, o] of occDefs.entries()) {
    const occ = await db.occupation.create({
      data: {
        id: id('occ', i + 1),
        uri: o.uri,
        code: o.code,
        preferredLabel: o.label,
        description: `${o.label} — IT-ITeS sector occupation (ESCO-anchored).`,
        taxonomyId: tx.id,
        sectorId: sectorIT.id,
      },
    })
    occupations[o.uri] = occ.id
    for (const sdef of o.skills) {
      await db.occupationSkill.create({
        data: {
          occupationId: occ.id,
          skillId: skills[sdef.uri],
          proficiency: sdef.prof,
          essential: sdef.essential,
        },
      })
    }
  }

  // ── Employers ──────────────────────────────────────────────────────
  const employerDefs = [
    { id: id('emp', 1), name: 'Persistent Systems', orgId: 'ORG-PERSIST', weight: 1.2 },
    { id: id('emp', 2), name: 'TCS Digital', orgId: 'ORG-TCS', weight: 1.3 },
    { id: id('emp', 3), name: 'Infosys BPM', orgId: 'ORG-INFY', weight: 1.2 },
    { id: id('emp', 4), name: 'Wipro Digital', orgId: 'ORG-WIPRO', weight: 1.1 },
    { id: id('emp', 5), name: 'ZS Associates', orgId: 'ORG-ZS', weight: 1.0 },
    { id: id('emp', 6), name: 'Cognizant India', orgId: 'ORG-CTS', weight: 1.1 },
    { id: id('emp', 7), name: 'Capgemini Tech', orgId: 'ORG-CAP', weight: 1.0 },
    { id: id('emp', 8), name: 'Birlasoft', orgId: 'ORG-BIRLA', weight: 0.9 },
  ]
  for (const e of employerDefs) {
    await db.employer.create({
      data: { ...e, sectorId: sectorIT.id, verified: true },
    })
  }

  // ── Job Postings (5,000 simulated, here we create a representative sample)
  //    For prototype scale we create ~120 postings that exercise the
  //    demand signal aggregator and the demo workflow.
  // ───────────────────────────────────────────────────────────────────
  type PostingTemplate = {
    occUri: string
    skills: { uri: string; weight: number }[]
    titles: string[]
    employerOrgs: string[]
    districts: string[]
    baseVolume: number
    emergingBias?: boolean
    decliningBias?: boolean
  }

  const postingTemplates: PostingTemplate[] = [
    {
      occUri: 'esco:O1',
      skills: [
        { uri: 'esco:S2', weight: 1.0 },
        { uri: 'esco:S4', weight: 0.95 },
        { uri: 'esco:S14', weight: 0.8 },
        { uri: 'inext:S10', weight: 0.65 },
        { uri: 'inext:S11', weight: 0.55 },
        { uri: 'esco:S15', weight: 0.7 },
        { uri: 'esco:S3', weight: 0.6 },
      ],
      titles: ['Full Stack Engineer', 'React + Node Developer', 'MERN Developer'],
      employerOrgs: ['ORG-PERSIST', 'ORG-TCS', 'ORG-INFY', 'ORG-WIPRO', 'ORG-ZS'],
      districts: ['274', '521', '271', '533'],
      baseVolume: 22,
      emergingBias: true,
    },
    {
      occUri: 'esco:O2',
      skills: [
        { uri: 'esco:S6', weight: 1.0 },
        { uri: 'esco:S7', weight: 0.95 },
        { uri: 'esco:S24', weight: 0.9 },
        { uri: 'inext:S12', weight: 0.7 },
        { uri: 'inext:S23', weight: 0.5 },
        { uri: 'esco:S1', weight: 0.6 },
      ],
      titles: ['DevOps Engineer', 'SRE / Platform Engineer', 'Cloud Release Engineer'],
      employerOrgs: ['ORG-CTS', 'ORG-CAP', 'ORG-PERSIST'],
      districts: ['274', '514', '271', '276'],
      baseVolume: 16,
      emergingBias: true,
    },
    {
      occUri: 'esco:O4',
      skills: [
        { uri: 'inext:S10', weight: 1.0 },
        { uri: 'inext:S11', weight: 0.95 },
        { uri: 'inext:S12', weight: 0.85 },
        { uri: 'inext:S23', weight: 0.75 },
        { uri: 'esco:S9', weight: 0.85 },
        { uri: 'esco:S1', weight: 0.7 },
      ],
      titles: ['ML Engineer', 'AI Engineer', 'LLM Application Engineer'],
      employerOrgs: ['ORG-ZS', 'ORG-PERSIST', 'ORG-INFY', 'ORG-TCS'],
      districts: ['274', '521', '514'],
      baseVolume: 18,
      emergingBias: true,
    },
    {
      occUri: 'esco:O5',
      skills: [
        { uri: 'esco:S17', weight: 1.0 },
        { uri: 'esco:S2', weight: 0.7 },
        { uri: 'esco:S20', weight: 0.2 }, // declining skill still in some postings
      ],
      titles: ['QA Automation Engineer', 'SDET', 'Test Automation Lead'],
      employerOrgs: ['ORG-BIRLA', 'ORG-CTS', 'ORG-CAP'],
      districts: ['276', '275', '272'],
      baseVolume: 14,
      decliningBias: true,
    },
    {
      occUri: 'esco:O3',
      skills: [
        { uri: 'esco:S1', weight: 1.0 },
        { uri: 'esco:S8', weight: 0.95 },
        { uri: 'esco:S3', weight: 0.85 },
        { uri: 'inext:S10', weight: 0.55 },
      ],
      titles: ['Data Analyst', 'BI Analyst', 'Insights Analyst'],
      employerOrgs: ['ORG-ZS', 'ORG-INFY', 'ORG-WIPRO'],
      districts: ['274', '521', '514', '271'],
      baseVolume: 20,
    },
  ]

  const postings: { id: string; occUri: string; skills: string[]; orgId: string; districtId?: string; confidence: number }[] = []
  let postingCounter = 0
  const today = new Date('2026-09-01')
  for (const t of postingTemplates) {
    for (let i = 0; i < t.baseVolume; i++) {
      postingCounter++
      const occId = occupations[t.occUri]
      const orgId = t.employerOrgs[i % t.employerOrgs.length]
      const districtLgd = t.districts[i % t.districts.length]
      const districtId = districts[districtLgd].id
      const title = t.titles[i % t.titles.length]
      const postedAt = new Date(today)
      postedAt.setDate(postedAt.getDate() - (i % 540)) // spread across ~18 months
      const isDuplicate = i % 12 === 0 // ~8% duplicates
      const isNoisy = i % 19 === 0 // ~5% noisy variants
      const confidence = isNoisy ? 0.45 : 0.72 + ((i % 5) / 30)
      const hitSkills = t.skills
        .filter((s) => Math.random() < 0.6 + s.weight * 0.4)
        .map((s) => s.uri)
      if (hitSkills.length === 0) hitSkills.push(t.skills[0].uri)
      const posting = await db.jobPosting.create({
        data: {
          id: id('jp', postingCounter),
          externalId: `POST-${postingCounter}`,
          title,
          description: `${title} role at ${orgId.replace('ORG-', '')}. Required skills: ${hitSkills.join(', ')}.`,
          employerName: employerDefs.find((e) => e.orgId === orgId)!.name,
          employerOrgId: orgId,
          districtId,
          sectorId: sectorIT.id,
          postedAt,
          isDuplicate,
          isNoisy,
          confidence,
          rawSkillHits: hitSkills.join('|'),
        },
      })
      postings.push({ id: posting.id, occUri: t.occUri, skills: hitSkills, orgId, districtId, confidence })
    }
  }

  // ── Demand Signals (aggregated per skill × district × period) ──────
  // For each (skill × district) we compute postingCount + sourceCount.
  type AggKey = string
  const agg = new Map<AggKey, {
    skillId: string
    districtId: string
    occupationId?: string
    postings: string[]
    orgs: Set<string>
    dates: Date[]
    emergingBias: boolean
    decliningBias: boolean
  }>()

  for (const p of postings) {
    for (const skillUri of p.skills) {
      const skillId = skills[skillUri]
      const key = `${skillId}|${p.districtId ?? ''}`
      const entry = agg.get(key) ?? {
        skillId,
        districtId: p.districtId ?? '',
        occupationId: occupations[p.occUri],
        postings: [],
        orgs: new Set<string>(),
        dates: [],
        emergingBias: false,
        decliningBias: false,
      }
      entry.postings.push(p.id)
      entry.orgs.add(p.orgId)
      entry.dates.push(new Date())
      const template = postingTemplates.find((t) => t.occUri === p.occUri)
      if (template?.emergingBias) entry.emergingBias = true
      if (template?.decliningBias) entry.decliningBias = true
      agg.set(key, entry)
    }
  }

  const demandSignals: { id: string; skillId: string; skillUri: string; districtId?: string; postings: string[]; orgs: string[] }[] = []
  let dsCounter = 0
  for (const [, v] of agg) {
    dsCounter++
    const dsId = id('ds', dsCounter)
    const postingCount = v.postings.length
    const sourceCount = v.orgs.size
    const confidence = Math.min(0.98, 0.4 + postingCount * 0.05 + sourceCount * 0.04)
    const trendSlope = v.emergingBias ? 0.8 + Math.random() * 0.5 : v.decliningBias ? -0.6 - Math.random() * 0.3 : (Math.random() - 0.5) * 0.3
    const trendLabel = v.emergingBias ? 'Emerging' : v.decliningBias ? 'Declining' : 'Stable'
    const validationState = v.emergingBias && postingCount >= 3 ? 'Pending' : 'Detected'
    await db.demandSignal.create({
      data: {
        id: dsId,
        skillId: v.skillId,
        occupationId: v.occupationId,
        sectorId: sectorIT.id,
        districtId: v.districtId || undefined,
        postingCount,
        sourceCount,
        trendSlope,
        trendLabel,
        confidence,
        validationState,
        promotionScore: 0,
        periodStart: new Date('2025-01-01'),
        periodEnd: new Date('2026-09-01'),
        postings: { connect: v.postings.map((pid) => ({ id: pid })) },
      },
    })
    demandSignals.push({
      id: dsId,
      skillId: v.skillId,
      skillUri: Object.entries(skills).find(([, sid]) => sid === v.skillId)?.[0] ?? '',
      districtId: v.districtId || undefined,
      postings: v.postings,
      orgs: Array.from(v.orgs),
    })
  }

  // ── Validation Requests + Responses + Signals ───────────────────────
  // Pick the top emerging demand signals (genai, mlops, prompt) and create
  // validation requests for them. Then create responses that satisfy the
  // quorum (Confirm with ≥3 distinct orgs and positive ratio > 0.6) for
  // most, and one "Needs Review" rejection to demonstrate the detour path.
  const emergingSignals = demandSignals.filter((ds) => {
    const skillDef = skillDefs.find((s) => s.uri === ds.skillUri)
    return skillDef?.emerging && ds.postings.length >= 3
  })

  // Group emerging signals by skill (only need one request per skill)
  const emergingBySkill = new Map<string, typeof emergingSignals>()
  for (const ds of emergingSignals) {
    const arr = emergingBySkill.get(ds.skillId) ?? []
    arr.push(ds)
    emergingBySkill.set(ds.skillId, arr)
  }

  let reqCounter = 0
  for (const [skillId, signals] of Array.from(emergingBySkill.entries())) {
    reqCounter++
    const firstSignal = signals[0]
    const deadline = new Date('2026-09-15')
    const isRejectDemo = reqCounter === 3 // 3rd emerging skill → rejection detour
    const status = isRejectDemo ? 'Rejected' : 'Promoted'

    const req = await db.validationRequest.create({
      data: {
        id: id('vr', reqCounter),
        demandSignalId: firstSignal.id,
        skillId,
        message: `Please validate market demand for ${skillDefs.find((s) => s.uri === firstSignal.skillUri)?.label ?? 'this skill'}.`,
        threshold: 2.0,
        minOrganizations: 3,
        positiveRatioThreshold: 0.6,
        deadline,
        status,
      },
    })

    // 4 responses each, distinct orgs
    const responderOrgs = ['ORG-PERSIST', 'ORG-TCS', 'ORG-INFY', 'ORG-WIPRO']
    for (let i = 0; i < 4; i++) {
      const emp = employerDefs.find((e) => e.orgId === responderOrgs[i])!
      let responseType = 'Confirm'
      if (isRejectDemo) {
        responseType = i < 3 ? 'Reject' : 'Confirm'
      } else {
        responseType = i === 3 ? 'Qualify' : 'Confirm'
      }
      const reasonCode = responseType === 'Reject' ? 'POSTING_VOLUME_TOO_LOW' : responseType === 'Qualify' ? 'ROLE_SPECIFIC_ONLY' : null
      const resp = await db.validationResponse.create({
        data: {
          id: id('vresp', reqCounter * 10 + i),
          requestId: req.id,
          employerId: emp.id,
          responseType,
          reasonCode,
          comment: responseType === 'Confirm' ? 'Confirmed growing demand in our hiring pipeline.' : responseType === 'Reject' ? 'Volume appears inflated by aggregator scraping.' : 'Relevant only for senior ML roles, not entry-level.',
        },
      })
      const skillObj = await db.skill.findUnique({ where: { id: skillId } })
      // Pick a representative posting from this signal
      const samplePostingId = firstSignal.postings[0]
      const posting = samplePostingId ? await db.jobPosting.findUnique({ where: { id: samplePostingId } }) : null
      await db.validationSignal.create({
        data: {
          id: id('vsig', reqCounter * 100 + i),
          skillId,
          postingId: posting?.id,
          demandSignalId: firstSignal.id,
          employerId: emp.id,
          responseType,
          weight: emp.weight,
          reasonCode,
        },
      })
    }

    // Update demand signal state
    const positiveRatio = isRejectDemo ? 0.25 : 0.75
    const promotionScore = isRejectDemo ? 0.75 : 4.7 // weighted confirm score
    const newState = isRejectDemo ? 'NeedsReview' : 'Validated'
    await db.demandSignal.update({
      where: { id: firstSignal.id },
      data: {
        validationState: newState,
        promotionScore,
      },
    })
  }

  // ── Courses + Modules + CourseSkill ─────────────────────────────────
  // 30 courses total — here we seed 6 representative ones (one hero course
  // used by Curriculum Mirror demo, plus 5 comparison courses).
  type CourseSeed = {
    code: string
    name: string
    duration: number
    occupationUri: string
    institution: string
    districtLgd?: string
    modules: { title: string; hours: number; outcome?: string; skills: { uri: string; prof: number; hours: number }[] }[]
  }

  const courseDefs: CourseSeed[] = [
    {
      code: 'CTS-FSD-101',
      name: 'Full-Stack Developer Diploma (CTS-style)',
      duration: 12,
      occupationUri: 'esco:O1',
      institution: 'ITI Pune Hadapsar',
      districtLgd: '274',
      modules: [
        { title: 'Programming Foundations', hours: 80, outcome: 'Write procedural & OOP code.', skills: [
          { uri: 'esco:S2', prof: 3, hours: 50 },
          { uri: 'esco:S13', prof: 2, hours: 20 },
          { uri: 'esco:S25', prof: 2, hours: 10 },
        ] },
        { title: 'Front-End Web Development', hours: 120, outcome: 'Build responsive UIs.', skills: [
          { uri: 'esco:S4', prof: 3, hours: 60 },
          { uri: 'esco:S13', prof: 3, hours: 30 },
          { uri: 'esco:S14', prof: 2, hours: 30 },
        ] },
        { title: 'Back-End & APIs', hours: 140, outcome: 'Design REST APIs.', skills: [
          { uri: 'esco:S15', prof: 3, hours: 50 },
          { uri: 'esco:S3', prof: 3, hours: 50 },
          { uri: 'esco:S2', prof: 3, hours: 40 },
        ] },
        { title: 'DevOps Essentials', hours: 60, outcome: 'Containerize apps.', skills: [
          { uri: 'esco:S24', prof: 2, hours: 30 },
          { uri: 'esco:S6', prof: 2, hours: 30 },
        ] },
        { title: 'Quality Assurance', hours: 40, outcome: 'Automated test suites.', skills: [
          { uri: 'esco:S17', prof: 2, hours: 40 },
        ] },
        { title: 'Agile & Communication', hours: 30, outcome: 'Work in agile teams.', skills: [
          { uri: 'esco:S16', prof: 2, hours: 15 },
          { uri: 'esco:S21', prof: 2, hours: 15 },
        ] },
      ],
    },
    {
      code: 'CTS-ML-201',
      name: 'Machine Learning Engineer (CTS-style)',
      duration: 9,
      occupationUri: 'esco:O4',
      institution: 'ITI Mumbai Andheri',
      districtLgd: '521',
      modules: [
        { title: 'ML Foundations', hours: 100, outcome: 'Train classic ML models.', skills: [
          { uri: 'esco:S9', prof: 3, hours: 60 },
          { uri: 'esco:S1', prof: 3, hours: 40 },
        ] },
        { title: 'Data Wrangling', hours: 60, outcome: 'Clean datasets.', skills: [
          { uri: 'esco:S8', prof: 3, hours: 30 },
          { uri: 'esco:S3', prof: 2, hours: 30 },
        ] },
        { title: 'Deployment Basics', hours: 50, outcome: 'Serve models.', skills: [
          { uri: 'inext:S12', prof: 2, hours: 25 },
          { uri: 'esco:S24', prof: 2, hours: 25 },
        ] },
      ],
    },
    {
      code: 'CTS-DEV-301',
      name: 'Cloud & DevOps Engineer',
      duration: 8,
      occupationUri: 'esco:O2',
      institution: 'Govt ITI Nagpur',
      districtLgd: '276',
      modules: [
        { title: 'Linux & Networking', hours: 60, skills: [
          { uri: 'esco:S7', prof: 2, hours: 30 },
          { uri: 'esco:S22', prof: 2, hours: 30 },
        ] },
        { title: 'Cloud Platforms', hours: 80, skills: [
          { uri: 'esco:S6', prof: 3, hours: 80 },
        ] },
        { title: 'CI/CD & Containers', hours: 80, skills: [
          { uri: 'esco:S24', prof: 3, hours: 40 },
          { uri: 'esco:S7', prof: 3, hours: 40 },
        ] },
        { title: 'Python Scripting', hours: 50, skills: [
          { uri: 'esco:S1', prof: 3, hours: 50 },
        ] },
      ],
    },
    {
      code: 'CTS-DA-401',
      name: 'Data Analyst Bootcamp',
      duration: 6,
      occupationUri: 'esco:O3',
      institution: 'Maharashtra Skill Dev Mission — Pune',
      districtLgd: '274',
      modules: [
        { title: 'SQL & Databases', hours: 60, skills: [
          { uri: 'esco:S3', prof: 3, hours: 60 },
        ] },
        { title: 'Python for Data', hours: 80, skills: [
          { uri: 'esco:S1', prof: 3, hours: 50 },
          { uri: 'esco:S8', prof: 2, hours: 30 },
        ] },
        { title: 'Reporting & Communication', hours: 40, skills: [
          { uri: 'esco:S21', prof: 3, hours: 40 },
        ] },
      ],
    },
    {
      code: 'CTS-QA-501',
      name: 'QA Automation Engineer',
      duration: 7,
      occupationUri: 'esco:O5',
      institution: 'ITI Nashik',
      districtLgd: '275',
      modules: [
        { title: 'Testing Fundamentals', hours: 60, skills: [
          { uri: 'esco:S17', prof: 3, hours: 60 },
        ] },
        { title: 'Test Automation', hours: 80, skills: [
          { uri: 'esco:S17', prof: 3, hours: 50 },
          { uri: 'esco:S2', prof: 2, hours: 30 },
        ] },
        { title: 'Agile Delivery', hours: 30, skills: [
          { uri: 'esco:S16', prof: 3, hours: 30 },
        ] },
      ],
    },
    {
      code: 'CTS-LEG-601',
      name: 'Legacy Web Developer (declining skills focus)',
      duration: 8,
      occupationUri: 'esco:O1',
      institution: 'ITI Kolhapur',
      districtLgd: '279',
      modules: [
        { title: 'HTML/CSS/jQuery', hours: 100, skills: [
          { uri: 'esco:S13', prof: 3, hours: 50 },
          { uri: 'esco:S20', prof: 3, hours: 50 },
        ] },
        { title: 'Flash Animations', hours: 60, skills: [
          { uri: 'esco:S19', prof: 2, hours: 60 },
        ] },
        { title: 'Basic JavaScript', hours: 50, skills: [
          { uri: 'esco:S2', prof: 2, hours: 50 },
        ] },
      ],
    },
  ]

  const courses: Record<string, string> = {}
  let courseCounter = 0
  for (const cdef of courseDefs) {
    courseCounter++
    const occId = occupations[cdef.occupationUri]
    const districtId = cdef.districtLgd ? districts[cdef.districtLgd].id : undefined
    const course = await db.course.create({
      data: {
        id: id('course', courseCounter),
        code: cdef.code,
        name: cdef.name,
        duration: cdef.duration,
        occupationId: occId,
        sectorId: sectorIT.id,
        institution: cdef.institution,
        districtId,
      },
    })
    courses[cdef.code] = course.id
    for (const [mi, m] of cdef.modules.entries()) {
      const moduleRow = await db.module.create({
        data: {
          id: id(`mod-${courseCounter}`, mi + 1),
          courseId: course.id,
          title: m.title,
          sequence: mi + 1,
          durationHours: m.hours,
          learningOutcome: m.outcome,
        },
      })
      for (const cs of m.skills) {
        const skillId = skills[cs.uri]
        // Aggregate if this skill already exists for this course
        const existing = await db.courseSkill.findUnique({
          where: { courseId_skillId: { courseId: course.id, skillId } },
        })
        if (existing) {
          await db.courseSkill.update({
            where: { id: existing.id },
            data: {
              taughtProficiency: Math.max(existing.taughtProficiency, cs.prof),
              emphasisHours: existing.emphasisHours + cs.hours,
            },
          })
        } else {
          await db.courseSkill.create({
            data: {
              courseId: course.id,
              moduleId: moduleRow.id,
              skillId,
              taughtProficiency: cs.prof,
              emphasisHours: cs.hours,
            },
          })
        }
      }
    }
  }

  // ── Recommendations (Curriculum Mirror output for hero course) ──────
  // For the hero course CTS-FSD-101 we generate recommendation rows for
  // every demanded skill in the Full-Stack Developer occupation.
  const heroCourseId = courses['CTS-FSD-101']
  const heroOccId = occupations['esco:O1']
  const heroOccupationSkills = await db.occupationSkill.findMany({
    where: { occupationId: heroOccId },
    include: { skill: true },
  })
  const heroTaughtSkills = await db.courseSkill.findMany({
    where: { courseId: heroCourseId },
    include: { skill: true },
  })
  const taughtByUri = new Map(heroTaughtSkills.map((cs) => [cs.skill.uri, cs]))

  let recCounter = 0
  for (const os of heroOccupationSkills) {
    recCounter++
    const taught = taughtByUri.get(os.skill.uri)
    const dsForSkill = demandSignals.find((d) => d.skillId === os.skill.id)
    const isEmerging = os.skill.isEmerging
    const isDeclining = os.skill.isDeclining

    let bucket = 'Match'
    let actionType = 'ReviewLater'
    let priorityBand = 'P3'
    let rationale = 'Skill taught at adequate proficiency and demand is stable.'

    if (!taught) {
      if (isEmerging) {
        bucket = 'Emerging'
        actionType = 'AddModule'
        priorityBand = 'P0'
        rationale = 'Emerging skill not yet taught; demand validated and rising.'
      } else if (isDeclining) {
        bucket = 'Declining'
        actionType = 'ReviewLater'
        priorityBand = 'P3'
        rationale = 'Declining skill not taught — no action needed.'
      } else {
        bucket = 'Missing'
        actionType = 'AddModule'
        priorityBand = 'P1'
        rationale = 'Required skill missing from curriculum.'
      }
    } else if (taught.taughtProficiency < os.proficiency - 1) {
      bucket = 'Missing'
      actionType = 'UpdateModule'
      priorityBand = 'P1'
      rationale = `Taught at L${taught.taughtProficiency} but occupation requires L${os.proficiency}.`
    } else if (isDeclining) {
      bucket = 'Declining'
      actionType = 'ReduceEmphasis'
      priorityBand = 'P2'
      rationale = 'Demand is declining — consider reducing teaching hours.'
    } else if (!os.essential) {
      bucket = 'LowPriority'
      actionType = 'ReviewLater'
      priorityBand = 'P3'
      rationale = 'Optional skill, low priority for revision.'
    }

    await db.recommendation.create({
      data: {
        id: id('rec', recCounter),
        courseId: heroCourseId,
        demandSignalId: dsForSkill?.id,
        skillId: os.skill.id,
        bucket,
        actionType,
        priorityBand,
        suggestedOwner: actionType === 'AddModule' ? 'Curriculum Designer' : actionType === 'UpdateModule' ? 'Module Lead' : 'Program Owner',
        rationale,
        evidenceIds: dsForSkill?.postings.slice(0, 5).join('|') ?? '',
        status: 'Proposed',
      },
    })
  }

  // ── Candidate Readiness ────────────────────────────────────────────
  const candidate = await db.candidate.create({
    data: {
      id: id('cand', 1),
      name: 'Aarav Sharma',
      occupationId: occupations['esco:O1'],
      districtId: districts['274'].id,
    },
  })
  const candidateAssessments = [
    { uri: 'esco:S2', prof: 3 },
    { uri: 'esco:S4', prof: 3 },
    { uri: 'esco:S14', prof: 2 },
    { uri: 'esco:S15', prof: 2 },
    { uri: 'esco:S3', prof: 2 },
    { uri: 'esco:S13', prof: 3 },
    { uri: 'esco:S25', prof: 2 },
    { uri: 'esco:S24', prof: 1 },
    { uri: 'inext:S10', prof: 0 }, // missing
    { uri: 'inext:S11', prof: 0 }, // missing
  ]
  for (const [i, a] of candidateAssessments.entries()) {
    await db.candidateAssessment.create({
      data: {
        id: id('ca', i + 1),
        candidateId: candidate.id,
        skillId: skills[a.uri],
        proficiency: a.prof,
      },
    })
  }

  // ── Audit log entries ───────────────────────────────────────────────
  await db.auditLog.createMany({
    data: [
      {
        id: id('audit', 1),
        actor: 'system',
        action: 'signal.ingested',
        entityType: 'DemandSignal',
        entityId: '-',
        payload: JSON.stringify({ count: demandSignals.length, period: '2025-01..2026-09' }),
      },
      {
        id: id('audit', 2),
        actor: 'employer:ORG-PERSIST',
        action: 'validation.promoted',
        entityType: 'DemandSignal',
        entityId: '-',
        payload: JSON.stringify({ skill: 'Generative AI & LLMs', score: 4.7, orgs: 4 }),
      },
      {
        id: id('audit', 3),
        actor: 'employer:ORG-CTS',
        action: 'validation.rejected',
        entityType: 'DemandSignal',
        entityId: '-',
        payload: JSON.stringify({ skill: 'MLOps', reason: 'POSTING_VOLUME_TOO_LOW', score: 0.75 }),
      },
    ],
  })

  console.log(`✅ Seed complete.`)
  console.log(`   Sectors: 1 | Taxonomies: 2 | Districts: ${districtDefs.length}`)
  console.log(`   Skills: ${skillDefs.length} | Occupations: ${occDefs.length}`)
  console.log(`   Job postings: ${postings.length} | Demand signals: ${demandSignals.length}`)
  console.log(`   Courses: ${courseDefs.length} | Recommendations: ${recCounter}`)
  console.log(`   Candidates: 1`)
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
