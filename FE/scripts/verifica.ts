import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'
import { existsSync } from 'node:fs'
import { applicaMossa, creaStato, mossaValida, risolviTiro, simulaTiro } from '../src/giochi/biliardo/regole.ts'
import type { Bot, Esito, Stato } from '../src/giochi/biliardo/regole.ts'

let checks = 0
function check(name: string, run: () => void) { run(); checks++; console.log(`OK ${name}`) }
const base = creaStato()
const event = (s: Stato, overrides: Partial<Esito> = {}): Esito => ({ balls: s.balls.map(b => ({ ...b })), firstContact: 1, pocketed: [], railsAfterContact: true, railBalls: [1, 2, 3, 4], frames: [], ...overrides })
check('rack: 16 palle, 8 centrale e angoli di gruppi diversi', () => {
  assert.equal(base.balls.length, 16); assert.equal(new Set(base.balls.map(b => b.id)).size, 16)
  assert.equal(base.balls[8].z, 0)
  const back = base.balls.filter(b => b.x > 2.9).sort((a, b) => a.z - b.z)
  assert(back[0].id < 8 && back.at(-1)!.id > 8)
})
check('rifiuta NaN, potenza fuori range e placement illegale', () => {
  assert(!mossaValida(base, { angle: NaN, power: 0.5 })); assert(!mossaValida(base, { angle: 0, power: 2 }))
  assert(!mossaValida(base, { angle: 0, power: 0.5, placement: { x: 0, z: 0 } }))
})
check('simulazione deterministica, immutabilità e spaccata fisica', () => {
  const original = JSON.stringify(base), move = { angle: 0, power: 0.96 }
  const first = simulaTiro(base, move), second = simulaTiro(base, move)
  assert.deepEqual(first, second); assert.equal(JSON.stringify(base), original); assert.equal(first.firstContact, 1)
  assert(first.balls.every(b => Number.isFinite(b.x) && Number.isFinite(b.z)))
  assert(first.pocketed.length > 0 || first.railBalls.length >= 4)
})
check('spaccata lascia gruppi aperti e 8 riposizionata', () => {
  const s = risolviTiro(base, { angle: 0, power: 1 }, event(base, { pocketed: [{ id: 8, pocket: 0 }] }))
  assert.equal(s.winner, null); assert.deepEqual(s.groups, [null, null]); assert(!s.balls[8].pocketed)
})
const playing: Stato = { ...base, phase: 'playing' }
check('gruppi assegnati solo con imbucata regolare', () => {
  const s = risolviTiro(playing, { angle: 0, power: 0.5 }, event(playing, { pocketed: [{ id: 1, pocket: 0 }] }))
  assert.deepEqual(s.groups, ['piene', 'rigate']); assert.equal(s.turn, 0)
})
check('scratch dà palla in mano senza assegnare il gruppo', () => {
  const s = risolviTiro(playing, { angle: 0, power: 0.5 }, event(playing, { pocketed: [{ id: 1, pocket: 0 }, { id: 0, pocket: 1 }] }))
  assert(s.ballInHand); assert.equal(s.turn, 1); assert.deepEqual(s.groups, [null, null])
})
check('primo contatto errato e nessuna sponda sono falli', () => {
  const assigned: Stato = { ...playing, groups: ['piene', 'rigate'] }
  assert(risolviTiro(assigned, { angle: 0, power: 0.5 }, event(assigned, { firstContact: 9 })).lastShot?.foul)
  assert(risolviTiro(assigned, { angle: 0, power: 0.5 }, event(assigned, { railsAfterContact: false })).lastShot?.foul)
})
check('8 prematura perde; 8 dichiarata vince; scratch sulla 8 perde', () => {
  const assigned: Stato = { ...playing, groups: ['piene', 'rigate'] }
  const m = { angle: 0, power: 0.5, calledPocket: 2 }
  assert.equal(risolviTiro(assigned, m, event(assigned, { firstContact: 8, pocketed: [{ id: 8, pocket: 2 }] })).winner, 1)
  const final: Stato = { ...assigned, balls: assigned.balls.map(b => ({ ...b, pocketed: b.id > 0 && b.id < 8 })) }
  assert.equal(risolviTiro(final, m, event(final, { firstContact: 8, pocketed: [{ id: 8, pocket: 2 }] })).winner, 0)
  assert.equal(risolviTiro(final, m, event(final, { firstContact: 8, pocketed: [{ id: 8, pocket: 1 }] })).winner, 1)
  assert.equal(risolviTiro(final, m, event(final, { firstContact: 8, pocketed: [{ id: 8, pocket: 2 }, { id: 0, pocket: 2 }] })).winner, 1)
})
export function seeded(seed: number) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 } }
const bots: { name: string; play: Bot }[] = []
for (const name of ['facile', 'medio', 'difficile']) {
  const url = new URL(`../src/giochi/biliardo/bot/${name}.ts`, import.meta.url)
  if (existsSync(url)) bots.push({ name, play: (await import(url.href)).scegliMossa })
}
for (const bot of bots) check(`bot ${bot.name}: contratto, input immutato, tempo`, () => {
  for (const state of [base, playing, { ...playing, ballInHand: true }]) {
    const before = JSON.stringify(state), start = performance.now(), m = bot.play(state, seeded(42))
    const elapsed = performance.now() - start
    assert(mossaValida(state, m)); assert.equal(JSON.stringify(state), before)
    assert(elapsed < 1000, `${bot.name}: ${elapsed.toFixed(0)}ms`)
  }
})
if (process.argv.includes('--torneo') && bots.length === 3) {
  // Partite complete; limite esplicito, i timeout sono pareggi e mai vittorie inventate.
  for (const [weak, strong] of [[0, 1], [1, 2]]) {
    const wins = [0, 0]; let draws = 0
    for (let match = 0; match < 8; match++) {
      let state = creaStato(); const rng = seeded(400 + match)
      const order = match % 2 ? [strong, weak] : [weak, strong]
      for (let t = 0; t < 180 && state.winner === null; t++) state = applicaMossa(state, bots[order[state.turn]].play(state, rng))
      if (state.winner === null) draws++
      else wins[order[state.winner] === weak ? 0 : 1]++
    }
    console.log(`TORNEO ${bots[weak].name} ${wins[0]} — ${wins[1]} ${bots[strong].name}; pareggi ${draws}`)
    assert(wins[1] > wins[0], 'Il livello superiore deve prevalere sul campione dichiarato')
  }
}
console.log(`${checks} verifiche superate; ${bots.length}/3 bot integrati.`)
