import { bersagli, BUCHE, distanza, gruppo, posizioneBianca, posizioneValida, R, risolviTiro, simulaTiro } from '../regole.ts'
import type { Bot, Giocatore, Mossa, Stato, Vec2 } from '../regole.ts'
import { candidati, segmentoLibero } from '../tattica.ts'
import type { Candidato } from '../tattica.ts'

// 48 simulazioni alla radice, poi al massimo 3 rami con 8 risposte ciascuno.
// Il limite di iterazioni rende la scelta riproducibile; la guardia serve solo
// su dispositivi lenti. Nessuna casualita intenzionale nel livello difficile.
const MAX_SIMULATIONS = 72
const MAX_ROOT = 48
const BEAM = 3
const REPLIES = 8
const TIME_LIMIT_MS = 780
const WIN = 100000
const potenza = (power: number) => Math.max(0.08, Math.min(1, power))

type Nodo = { mossa: Mossa; next: Stato; immediate: number; score: number }

function linee(stato: Stato): Candidato[] {
  const result = candidati(stato)
  if (stato.phase === 'break') return result
  const targets = bersagli(stato)
  const cue = stato.ballInHand ? posizioneBianca(stato) : stato.balls.find(b => b.id === 0)!

  if (stato.ballInHand) {
    for (const ball of targets) for (let pocket = 0; pocket < BUCHE.length; pocket++) {
      const hole = BUCHE[pocket], d = distanza(ball, hole)
      if (d < 0.001) continue
      const nx = (hole.x - ball.x) / d, nz = (hole.z - ball.z) / d
      if (!segmentoLibero(stato, ball, hole, [0, ball.id])) continue
      for (const behind of [0.6, 1.1, 1.8]) {
        const placement = { x: ball.x - nx * behind, z: ball.z - nz * behind }
        if (!posizioneValida(stato, placement)) continue
        const ghost = { x: ball.x - nx * 2 * R, z: ball.z - nz * 2 * R }
        if (!segmentoLibero(stato, placement, ghost, [0, ball.id])) continue
        const travel = behind - 2 * R
        const speed = Math.sqrt(2 * 0.95 * (travel + d)) + 0.35
        result.push({ target: ball.id, quality: 11 - (travel + d) * 0.3,
          mossa: { angle: Math.atan2(nz, nx), power: potenza((speed - 1.2) / 10), calledPocket: pocket, placement } })
      }
    }
  }

  // Contatto pieno e tiri di sponda restano candidati anche senza imbucate
  // geometriche disponibili: evitare il fallo e lasciare un tiro difficile.
  for (const ball of targets) {
    const clear = segmentoLibero(stato, cue, ball, [0, ball.id])
    let nearest = 0
    for (let p = 1; p < BUCHE.length; p++) if (distanza(ball, BUCHE[p]) < distanza(ball, BUCHE[nearest])) nearest = p
    const placement = stato.ballInHand ? cue : undefined
    const d = distanza(cue, ball)
    result.push({ target: ball.id, quality: (clear ? 2 : -10) - d * 0.2,
      mossa: { angle: Math.atan2(ball.z - cue.z, ball.x - cue.x), power: potenza((Math.sqrt(1.9 * (d + 2.8)) - 1.2) / 10), calledPocket: nearest, placement } })
    for (const [axis, rail] of [['x', -4.87], ['x', 4.87], ['z', -2.37], ['z', 2.37]] as const) {
      const mirror: Vec2 = { ...ball, [axis]: 2 * rail - ball[axis] }
      const denominator = mirror[axis] - cue[axis]
      if (Math.abs(denominator) < 0.0001) continue
      const t = (rail - cue[axis]) / denominator
      if (t <= 0 || t >= 1) continue
      const bounce = { x: cue.x + t * (mirror.x - cue.x), z: cue.z + t * (mirror.z - cue.z) }
      if (Math.abs(bounce.x) > 4.87 || Math.abs(bounce.z) > 2.37 || BUCHE.some(p => distanza(p, bounce) < 0.4)) continue
      if (!segmentoLibero(stato, cue, bounce, [0]) || !segmentoLibero(stato, bounce, ball, [0, ball.id])) continue
      const travel = distanza(cue, bounce) + distanza(bounce, ball)
      result.push({ target: ball.id, quality: -1 - travel * 0.2,
        mossa: { angle: Math.atan2(bounce.z - cue.z, bounce.x - cue.x), power: potenza((Math.sqrt(1.9 * (travel + 3)) / 0.83 - 1.2) / 10), calledPocket: nearest, placement } })
    }
  }
  return result.sort((a, b) => b.quality - a.quality)
}

function mosse(stato: Stato, limit: number): Mossa[] {
  const options = linee(stato)
  if (!options.length) return []
  if (stato.phase === 'break') {
    const base = options[0].mossa
    return [0, -0.009, 0.009, -0.022, 0.022].flatMap(offset =>
      [0.96, 0.86, 1].map(power => ({ ...base, angle: base.angle + offset, power }))).slice(0, limit)
  }

  // Diversifica bersaglio e buca prima delle varianti della stessa posizione.
  const routes = new Set<string>()
  const bases: Candidato[] = []
  for (const option of options) {
    const key = `${option.target}:${option.mossa.calledPocket}:${option.quality >= 3 ? 'pot' : 'safe'}`
    if (routes.has(key)) continue
    routes.add(key)
    bases.push(option)
    if (bases.length === 12) break
  }
  // Una difesa resta nel ventaglio anche su tavoli con molte linee d'imbucata.
  const safe = options.find(option => option.quality < 3)
  if (safe && !bases.includes(safe)) bases.splice(Math.min(10, bases.length), bases.length >= 12 ? 1 : 0, safe)

  const moves: Mossa[] = []
  const seen = new Set<string>()
  const add = (move: Mossa) => {
    const key = `${move.angle.toFixed(5)}:${move.power.toFixed(4)}:${move.calledPocket}:${move.placement?.x.toFixed(3)}:${move.placement?.z.toFixed(3)}`
    if (seen.has(key) || moves.length >= limit) return
    seen.add(key)
    moves.push(move)
  }
  // Nei nodi figli privilegia quattro linee diverse con due potenze ciascuna.
  if (limit <= REPLIES) {
    for (const base of bases.slice(0, 4)) add(base.mossa)
    for (const base of bases.slice(0, 4)) add({ ...base.mossa, power: potenza(base.mossa.power + 0.045) })
    return moves
  }
  for (const base of bases) add(base.mossa)
  for (const offset of [0.045, -0.035]) for (const base of bases) add({ ...base.mossa, power: potenza(base.mossa.power + offset) })
  // La fisica a passi finiti rende utili piccole correzioni sui tagli sottili.
  const cue = stato.ballInHand ? posizioneBianca(stato) : stato.balls.find(b => b.id === 0)!
  for (const base of bases.slice(0, 6)) {
    const target = stato.balls.find(ball => ball.id === base.target)!
    const correction = Math.min(0.022, 0.014 / Math.max(0.5, distanza(base.mossa.placement ?? cue, target)))
    for (const sign of [-1, 1]) add({ ...base.mossa, angle: base.mossa.angle + correction * sign })
  }
  return moves
}

function esitoValore(before: Stato, after: Stato, player: Giocatore): number {
  if (after.winner !== null) return after.winner === player ? WIN : -WIN
  const own = after.groups[before.turn]
  let value = after.lastShot?.foul ? -650 : 0
  for (const ball of after.lastShot?.pocketed ?? []) {
    if (ball.id === 0) value -= 60
    else if (ball.id !== 8) value += !own || gruppo(ball.id) === own ? 100 : -70
  }
  if (!after.lastShot?.foul && after.turn === before.turn) value += 18
  return before.turn === player ? value : -value
}

function posizioneValore(stato: Stato, player: Giocatore): number {
  if (stato.winner !== null) return stato.winner === player ? WIN : -WIN
  const options = candidati(stato)
  const best = options[0]?.quality ?? -8
  const openings = Math.min(4, options.filter(c => c.quality > 6).length)
  const value = Math.max(-12, best * 2.2) + openings * 2 + (stato.ballInHand ? 32 : 0)
  return stato.turn === player ? value : -value
}

export const scegliMossa: Bot = (stato, _random) => {
  // La UI non chiede mosse a partita finita; evita comunque simulazioni illegali.
  if (stato.phase === 'finished') return { angle: 0, power: 0.08, calledPocket: 0 }
  const clock = typeof performance === 'undefined' ? undefined : () => performance.now()
  const start = clock?.() ?? 0
  let simulations = 0
  const available = () => simulations < MAX_SIMULATIONS && (!clock || clock() - start < TIME_LIMIT_MS)
  const rootMoves = mosse(stato, MAX_ROOT)
  const fallback: Mossa = { angle: 0, power: 0.3, calledPocket: 0,
    ...(stato.ballInHand ? { placement: posizioneBianca(stato) } : {}) }
  if (!rootMoves.length) return fallback
  const player = stato.turn
  const nodes: Nodo[] = []
  const simulate = (before: Stato, move: Mossa) => {
    simulations++
    return risolviTiro(before, move, simulaTiro(before, move))
  }
  for (const move of rootMoves) {
    if (nodes.length && !available()) break
    const next = simulate(stato, move)
    if (next.winner === player) return move
    const immediate = esitoValore(stato, next, player)
    const score = next.winner === null ? immediate + posizioneValore(next, player) : immediate
    nodes.push({ mossa: move, next, immediate, score })
  }
  nodes.sort((a, b) => b.score - a.score)

  // Beam/minimax a due tiri: chi imbuca gioca ancora, altrimenti il secondo
  // livello minimizza il nostro punteggio. La palla in mano viene ripianificata.
  const beam: Nodo[] = []
  for (const node of nodes) {
    if (node.next.winner !== null) continue
    const sameOutcome = beam.some(other =>
      other.next.turn === node.next.turn && other.next.lastShot?.foul === node.next.lastShot?.foul &&
      JSON.stringify(other.next.lastShot?.pocketed) === JSON.stringify(node.next.lastShot?.pocketed) &&
      distanza(other.next.balls.find(b => b.id === 0)!, node.next.balls.find(b => b.id === 0)!) < 0.25)
    if (!sameOutcome) beam.push(node)
    if (beam.length === BEAM) break
  }
  if (!beam.length) return nodes[0].mossa
  const replies = beam.map(node => mosse(node.next, REPLIES))
  const bestReply = beam.map(node => node.next.turn === player ? -Infinity : Infinity)
  const evaluated = beam.map(() => false)
  // Visita alternata: una guardia temporale non lascia tutti i rami salvo uno
  // senza risposta. Ogni ramo compete solo dopo almeno una simulazione figlia.
  for (let depth = 0; depth < REPLIES && available(); depth++) {
    for (let index = 0; index < beam.length && available(); index++) {
      const node = beam[index], reply = replies[index][depth]
      if (!reply) continue
      const next = simulate(node.next, reply)
      const value = next.winner === null
        ? esitoValore(node.next, next, player) + posizioneValore(next, player)
        : next.winner === player ? WIN : -WIN
      bestReply[index] = node.next.turn === player ? Math.max(bestReply[index], value) : Math.min(bestReply[index], value)
      evaluated[index] = true
    }
  }
  if (!evaluated.some(Boolean)) return nodes[0].mossa
  let chosen = nodes[0].mossa, best = -Infinity
  for (let i = 0; i < beam.length; i++) {
    if (!evaluated[i]) continue
    const value = Math.abs(bestReply[i]) >= WIN ? bestReply[i] : beam[i].immediate + bestReply[i] * 0.8
    if (value > best) { best = value; chosen = beam[i].mossa }
  }
  return chosen
}

export default scegliMossa
