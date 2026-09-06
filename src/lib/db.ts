import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql/web'
import path from 'node:path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createDatabaseClient() {
  if (process.env.TURSO_DATABASE_URL) {
    if (!process.env.TURSO_AUTH_TOKEN) {
      throw new Error('TURSO_AUTH_TOKEN is required when TURSO_DATABASE_URL is configured')
    }
    return new PrismaClient({
      adapter: new PrismaLibSQL({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      }, { timestampFormat: 'unixepoch-ms' }),
      log: ['error', 'warn'],
    })
  }

  return new PrismaClient({
    datasources: {
      db: { url: process.env.DATABASE_URL || `file:${path.join(process.cwd(), 'data', 'demo.db').replaceAll('\\', '/')}` },
    },
    log: ['error', 'warn'],
  })
}

export const db = globalForPrisma.prisma ?? createDatabaseClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
