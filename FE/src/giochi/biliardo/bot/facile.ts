import { bersagli, BUCHE, distanza, posizioneBianca, R } from "../regole.ts";
import type { Bot, Mossa, Palla } from "../regole.ts";
import { candidati, segmentoLibero } from "../tattica.ts";

const limitaPotenza = (power: number) => Math.max(0.08, Math.min(0.9, power));

/** Mira approssimativa e scelte varie, senza simulazioni o ricerca delle risposte. */
export const scegliMossa: Bot = (stato, random = Math.random) => {
  const cue = stato.ballInHand
    ? posizioneBianca(stato)
    : stato.balls.find((b) => b.id === 0)!;
  const placement = stato.ballInHand ? { x: cue.x, z: cue.z } : undefined;
  const options = candidati(stato);

  // Sul rack iniziale questa spaccata supera il requisito delle quattro sponde.
  // L'errore del livello facile viene applicato soltanto ai tiri successivi.
  if (stato.phase === "break") return { ...options[0].mossa };

  const targets = bersagli(stato);
  const clearTargets = targets.filter((ball) =>
    segmentoLibero(stato, cue, ball, [0, ball.id]),
  );
  const plausible = options
    .filter((candidate) => candidate.quality > 0)
    .slice(0, 12);
  const pick = <T>(items: T[]): T => items[Math.floor(random() * items.length)];
  let move: Mossa;
  let target: Palla | undefined;

  // Ogni tanto si limita a colpire una palla raggiungibile, senza cercare l'imbucata.
  if (clearTargets.length && (!plausible.length || random() < 0.35)) {
    const ball = pick(clearTargets);
    target = ball;
    const calledPocket = BUCHE.reduce(
      (best, pocket, index) =>
        distanza(ball, pocket) < distanza(ball, BUCHE[best]) ? index : best,
      0,
    );
    move = {
      angle: Math.atan2(target.z - cue.z, target.x - cue.x),
      power: limitaPotenza(0.32 + distanza(cue, target) * 0.045),
      calledPocket,
      placement,
    };
  } else {
    const pool = plausible.length ? plausible : options.slice(0, 8);
    const candidate = pool.length ? pick(pool) : undefined;
    target = targets.find((ball) => ball.id === candidate?.target);
    move = candidate
      ? { ...candidate.mossa }
      : { angle: 0, power: 0.4, placement };
  }

  // L'errore resta entro una frazione della larghezza della palla: anche da lontano
  // prova a fare contatto, ma sui tagli sbaglia spesso direzione e forza dell'imbucata.
  const travel = target ? distanza(cue, target) : 1;
  const spread = Math.min(0.12, Math.atan2(R * 1.6, Math.max(2 * R, travel)));
  return {
    ...move,
    angle: move.angle + (random() * 2 - 1) * spread,
    power: limitaPotenza(move.power * (0.72 + random() * 0.58)),
  };
};

export default scegliMossa;
