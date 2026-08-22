import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { DocumentIntegrityError, DocumentStoreService } from './document-store.service'

let root: string
let store: DocumentStoreService

beforeAll(async () => {
  root = await fs.mkdtemp(join(tmpdir(), 'onegrc-docstore-'))
  process.env.DOCUMENT_STORE_PATH = root
  store = new DocumentStoreService()
})

afterAll(async () => {
  await fs.rm(root, { recursive: true, force: true })
})

describe('content-addressed document store', () => {
  it('stores bytes and reads them back', async () => {
    const bytes = Buffer.from('a treasury challan, notionally')
    const put = await store.put(bytes)
    expect(put.written).toBe(true)
    expect(put.byteSize).toBe(bytes.length)
    expect(await store.get(put.sha256)).toEqual(bytes)
  })

  it('deduplicates: the same file twice is one blob and two references', async () => {
    const bytes = Buffer.from('PFRDA circular 2026/43')
    const first = await store.put(bytes)
    const second = await store.put(bytes)
    expect(second.sha256).toBe(first.sha256)
    expect(first.written).toBe(true)
    expect(second.written).toBe(false)
  })

  it('detects a corrupted blob rather than serving it', async () => {
    const bytes = Buffer.from('Maharashtra PT Act section 6')
    const { sha256 } = await store.put(bytes)
    // Tamper with the stored bytes behind the store's back.
    await fs.writeFile(store.locate(sha256), Buffer.from('substituted content'))
    await expect(store.get(sha256)).rejects.toThrow(DocumentIntegrityError)
  })

  it('reports whether a document is present', async () => {
    const { sha256 } = await store.put(Buffer.from('present'))
    expect(await store.exists(sha256)).toBe(true)
    expect(await store.exists('0'.repeat(64))).toBe(false)
  })

  it('shards the path so no directory grows unbounded', async () => {
    const { sha256 } = await store.put(Buffer.from('sharding'))
    expect(store.locate(sha256)).toContain(join(sha256.slice(0, 2), sha256.slice(2, 4)))
  })
})
