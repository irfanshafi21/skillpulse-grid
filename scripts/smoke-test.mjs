import assert from 'node:assert/strict'

const base = process.argv[2] || 'http://127.0.0.1:3018'
async function get(path) {
  const response = await fetch(`${base}${path}`)
  assert.equal(response.status, 200, `${path}: ${response.status}`)
  console.log(`PASS GET ${path}`)
  return response.json()
}

const paths = ['dashboard', 'demand', 'graph', 'districts', 'validations', 'actions', 'candidate', 'audit']
const result = Object.fromEntries(await Promise.all(paths.map(async (name) => [name, await get(`/api/${name}`)])))
assert.ok(result.demand.items.length > 0, 'Demand dataset is populated')
assert.ok(result.actions.groups.length > 0, 'Recommendations are populated')
await get(`/api/demand/${result.demand.items[0].id}`)
await get(`/api/districts/${result.districts.districts[0].lgdCode}`)
await get(`/api/mirror?courseId=${result.actions.groups[0].course.id}`)
await get(`/api/evidence/${result.actions.groups[0].items[0].id}`)

// In demo mode these requests must stop before any database write.
for (const path of ['/api/validations/demo-check', '/api/mirror/demo-check']) {
  const response = await fetch(`${base}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
  })
  assert.equal(response.status, 403, `${path} must reject demo writes`)
  console.log(`PASS POST ${path}: demo writes blocked`)
}
console.log('All demo smoke checks passed.')
