import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { performance } from 'node:perf_hooks'

const base = new URL(process.env.ROFUN_URL || 'http://127.0.0.1:4199')
assert(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname), 'Use a dedicated local preview.')
const count = Number(process.argv[2] || 100)
assert(Number.isInteger(count) && count > 0 && count <= 500)

async function request(room, role, payload) {
  const url = new URL('/api/relic', base)
  url.search = new URLSearchParams({ mode: 'stage', role })
  const start = performance.now()
  const response = await fetch(url, {
    method: payload ? 'POST' : 'GET',
    headers: { Cookie: 'rofun_preview=' + room, Origin: base.origin, 'Content-Type': 'application/json' },
    body: payload && JSON.stringify(payload),
  })
  const data = await response.json()
  return { code: response.status, data, duration: performance.now() - start }
}

async function success(room, role, payload) {
  const response = await request(room, role, payload)
  assert.equal(response.code, 200, JSON.stringify(response.data))
  return response.data
}

const buyers = ['Buyer A', 'Buyer B']
const cases = await Promise.all(Array.from({ length: count }, async () => {
  const room = randomUUID()
  const started = await success(room, 'Seller', { action: 'starter' })
  const item = started.items[0].id
  const listed = await success(room, 'Seller', { action: 'list', item, price: 1_000_000 })
  const { id, price } = listed.listings[0]
  const offers = await Promise.all(buyers.map(async role => {
    const status = await success(room, role, { action: 'offer', id, price })
    return status.offers[0].offerId
  }))
  for (const id of offers) await success(room, 'Seller', { action: 'approve', id })
  return { room, item, id, price, offers }
}))

await new Promise(resolve => setTimeout(resolve, 3100))
const start = performance.now()
const results = await Promise.all(cases.map(({ room, id, price, offers }) =>
  Promise.all(buyers.map((role, index) => request(room, role, { action: 'buy', id, price, offerId: offers[index] })))))
const elapsed = performance.now() - start

await Promise.all(cases.map(async ({ room, item }, index) => {
  const attempts = results[index]
  assert.deepEqual(attempts.map(attempt => attempt.code).sort(), [200, 409])
  const winner = attempts.find(attempt => attempt.code === 200).data.actor
  const [seller, buyerA, buyerB] = await Promise.all(['Seller', ...buyers].map(role => success(room, role)))
  for (const buyer of [buyerA, buyerB]) {
    assert.equal(buyer.balance, buyer.actor === winner ? 1_000_000 : 2_000_000)
    assert.equal(buyer.items[0]?.id, buyer.actor === winner ? item : undefined)
  }
  assert.equal(seller.balance, 2_990_000)
  assert.deepEqual(seller.totals, { sales: 1, volume: 1_000_000, platform: 5_000, burned: 5_000 })
}))

const latencies = results.flat().map(result => result.duration).sort((a, b) => a - b)
const percentile = fraction => Number(latencies[Math.ceil(latencies.length * fraction) - 1].toFixed(1))
console.log(JSON.stringify({
  independentListings: count, purchaseRequests: latencies.length,
  completedSales: count, rejectedDuplicates: count, mismatches: 0,
  elapsedMs: Number(elapsed.toFixed(1)),
  purchaseResponsesPerSecond: Math.round(latencies.length * 1000 / elapsed),
  latencyMs: { p50: percentile(.5), p95: percentile(.95), max: percentile(1) },
}, null, 2))
