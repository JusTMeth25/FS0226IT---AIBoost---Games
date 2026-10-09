import { simulaTiro } from "./regole.ts";
import type { Mossa, Palla, Stato, Vec2 } from "./regole.ts";

export type Percorso = {
  id: number;
  points: Vec2[];
  final: Palla;
  pocket: number | null;
};
export type Anteprima = { white: Percorso; target: Percorso | null };

/** Lo stesso tiro deterministico usato dalla partita, fino all'arresto. */
export function calcolaAnteprima(stato: Stato, mossa: Mossa): Anteprima {
  const esito = simulaTiro(
    stato,
    { ...mossa, calledPocket: mossa.calledPocket ?? 0 },
    true,
  );
  const path = (id: number): Percorso => {
    const points: Vec2[] = [];
    for (const frame of esito.frames) {
      const ball = frame.find((b) => b.id === id)!;
      const previous = points.at(-1);
      if (
        !previous ||
        Math.hypot(ball.x - previous.x, ball.z - previous.z) > 0.001
      )
        points.push({ x: ball.x, z: ball.z });
      if (ball.pocketed) break;
    }
    const final = esito.balls.find((b) => b.id === id)!;
    if (points.at(-1)?.x !== final.x || points.at(-1)?.z !== final.z)
      points.push({ x: final.x, z: final.z });
    if (points.length === 1) points.push({ ...points[0] });
    return {
      id,
      points,
      final,
      pocket: esito.pocketed.find((b) => b.id === id)?.pocket ?? null,
    };
  };
  return {
    white: path(0),
    target: esito.firstContact === null ? null : path(esito.firstContact),
  };
}
