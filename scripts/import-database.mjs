import { createClient } from '@libsql/client'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

const url = process.env.TURSO_DATABASE_URL
if (!url) {
  console.log('No hosted database configured; retaining the local sample database.')
  process.exit(0)
}
if (!url.startsWith('file:') && !process.env.TURSO_AUTH_TOKEN) {
  throw new Error('TURSO_AUTH_TOKEN is required for the hosted import')
}

const sourceUrl = pathToFileURL(path.resolve('data/demo.db')).href
if (url === sourceUrl) throw new Error('Import target must differ from the source database')
const source = createClient({ url: sourceUrl })
const target = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN })
const quote = (name) => `"${name.replaceAll('"', '""')}"`
let transaction
try {
  transaction = await target.transaction('write')
  const existing = await transaction.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
  if (existing.rows.length) {
    if (!existing.rows.some((row) => row.name === '_SkillPulseImport')) {
      throw new Error('Target database is not empty. Import stopped without changing existing data.')
    }
    const marker = await transaction.execute("SELECT version FROM _SkillPulseImport WHERE id='initial-sample-data'")
    if (!marker.rows.length) throw new Error('Import marker is incomplete; manual review required')
    await transaction.rollback()
    console.log('SkillPulse data already imported; existing records left unchanged.')
  } else {
    const schema = await source.execute("SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY CASE type WHEN 'table' THEN 0 ELSE 1 END, name")
    await transaction.execute('PRAGMA defer_foreign_keys = ON')
    for (const object of schema.rows) await transaction.execute(object.sql)
    let total = 0
    for (const table of schema.rows.filter((row) => row.type === 'table')) {
      const data = await source.execute(`SELECT * FROM ${quote(table.name)}`)
      for (let offset = 0; offset < data.rows.length; offset += 50) {
        const statements = data.rows.slice(offset, offset + 50).map((row) => ({
          sql: `INSERT INTO ${quote(table.name)} (${data.columns.map(quote).join(',')}) VALUES (${data.columns.map(() => '?').join(',')})`,
          args: data.columns.map((column) => row[column]),
        }))
        await transaction.batch(statements)
      }
      total += data.rows.length
    }
    const integrity = await transaction.execute('PRAGMA foreign_key_check')
    if (integrity.rows.length) throw new Error('Import failed foreign-key verification')
    await transaction.execute('CREATE TABLE _SkillPulseImport (id TEXT PRIMARY KEY, version INTEGER NOT NULL, importedAt TEXT NOT NULL)')
    await transaction.execute({ sql: 'INSERT INTO _SkillPulseImport VALUES (?, ?, ?)', args: ['initial-sample-data', 1, new Date().toISOString()] })
    await transaction.commit()
    console.log(`Imported ${total} sample rows into the dedicated database.`)
  }
} catch (error) {
  if (transaction && !transaction.closed) await transaction.rollback()
  throw error
} finally {
  transaction?.close()
  source.close()
  target.close()
}
