import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatRelease } from '../src/lib/release-meta'

test('CR-025 footer uses the embedded app version and fixed build timestamp in Malaysia time', () => {
  const build = { version: '0.1.0', updatedAt: '2026-11-06T02:16:00.000Z' }
  assert.equal(formatRelease(build), 'App v0.1.0 · Updated 2026-11-06 10:16 MYT')
  assert.equal(formatRelease({ ...build, version: 'v1.2.3' }), 'App v1.2.3 · Updated 2026-11-06 10:16 MYT')
  assert.equal(formatRelease({ version: '0.1.0', updatedAt: '2026-11-05T17:30:00.000Z' }), 'App v0.1.0 · Updated 2026-11-06 01:30 MYT')
})

test('CR-025 footer never invents a release number or timestamp without build metadata', () => {
  assert.equal(formatRelease(undefined), 'App version unavailable · Updated unavailable')
  assert.equal(formatRelease({ version: '', updatedAt: '2026-11-06T02:16:00.000Z' }), 'App version unavailable · Updated unavailable')
  assert.equal(formatRelease({ version: '1', updatedAt: 'not-a-date' }), 'App version unavailable · Updated unavailable')
})
