import { bersagli, BUCHE, distanza, gruppo, posizioneBianca, R, simulaTiro, risolviTiro } from './regole.ts'
import type { Mossa, Stato, Vec2 } from './regole.ts'
export type Candidato = { mossa: Mossa; quality: number; target: number }
export function segmentoLibero(stato: Stato, a: Vec2, b: Vec2, ignore: number[]): boolean {
  const dx = b.x - a.x, dz = b.z - a.z, length2 = dx * dx + dz * dz
  return stato.balls.every(ball => {
    if (ball.pocketed || ignore.includes(ball.id)) return true
    const t = Math.max(0, Math.min(1, ((ball.x - a.x) * dx + (ball.z - a.z) * dz) / (length2 || 1)))
    return distanza(ball, { x: a.x + t * dx, z: a.z + t * dz }) > R * 2.04
  })
}
export function candidati(stato: Stato): Candidato[] {
  const cue = stato.ballInHand ? posizioneBianca(stato) : stato.balls.find(b => b.id === 0)!
  const placement = stato.ballInHand ? cue : undefined
  if (stato.phase === 'break') return [{ mossa: { angle: Math.atan2(-cue.z, 2 - cue.x), power: 0.96, placement }, quality: 1, target: 1 }]
  const candidates: Candidato[] = []
  for (const ball of bersagli(stato)) {
    for (let pocket = 0; pocket < BUCHE.length; pocket++) {
      const p = BUCHE[pocket], d = distanza(ball, p)
      const nx = (p.x - ball.x) / d, nz = (p.z - ball.z) / d
      const ghost = { x: ball.x - nx * 2 * R, z: ball.z - nz * 2 * R }
      const travel = distanza(cue, ghost)
      const cut = ((ghost.x - cue.x) * nx + (ghost.z - cue.z) * nz) / travel
      if (cut < 0.16 || Math.abs(ghost.x) > 4.87 || Math.abs(ghost.z) > 2.37) continue
      const clear = segmentoLibero(stato, cue, ghost, [0, ball.id]) && segmentoLibero(stato, ball, p, [0, ball.id])
      const speed = Math.sqrt(2 * 0.95 * (travel + d / (cut * cut))) + 0.35
      candidates.push({ target: ball.id, quality: (clear ? 8 : -5) + cut * 3 - (travel + d) * 0.3,
        mossa: { angle: Math.atan2(ghost.z - cue.z, ghost.x - cue.x), power: Math.max(0.1, Math.min(0.88, (speed - 1.2) / 10)), calledPocket: pocket, placement } })
    }
    candidates.push({ target: ball.id, quality: -8, mossa: { angle: Math.atan2(ball.z - cue.z, ball.x - cue.x), power: 0.42, calledPocket: 0, placement } })
  }
  return candidates.sort((a, b) => b.quality - a.quality)
}
export function valutaMossa(stato: Stato, mossa: Mossa): { score: number; next: Stato } {
  const result = simulaTiro(stato, mossa)
  const next = risolviTiro(stato, mossa, result)
  if (next.winner !== null) return { score: next.winner === stato.turn ? 10000 : -10000, next }
  const own = next.groups[stato.turn]
  const score = result.pocketed.reduce((sum, p) => sum + (p.id === 0 ? -100 : gruppo(p.id) === own || !own ? 45 : -18), 0)
    + (next.lastShot?.foul ? -130 : 5) + (next.turn === stato.turn ? 18 : 0)
  return { score, next }
}
