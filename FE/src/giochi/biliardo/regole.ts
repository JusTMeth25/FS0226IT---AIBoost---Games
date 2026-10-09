/** Contratto puro condiviso. Nessun DOM, I/O o dipendenza dalla UI. */
export type Gruppo = "piene" | "rigate";
export type Giocatore = 0 | 1;
export type Vec2 = { x: number; z: number };
export type Palla = Vec2 & { id: number; pocketed: boolean };
export type Mossa = {
  angle: number;
  power: number;
  calledPocket?: number;
  placement?: Vec2;
};
export type Imbucata = { id: number; pocket: number };
export type Esito = {
  balls: Palla[];
  firstContact: number | null;
  pocketed: Imbucata[];
  railsAfterContact: boolean;
  railBalls: number[];
  frames: Palla[][];
};
export type Stato = {
  balls: Palla[];
  turn: Giocatore;
  groups: [Gruppo | null, Gruppo | null];
  phase: "break" | "playing" | "finished";
  ballInHand: boolean;
  winner: Giocatore | null;
  shots: number;
  message: string;
  history: string[];
  lastShot: { foul: boolean; pocketed: Imbucata[] } | null;
};
export type Bot = (stato: Stato, random?: () => number) => Mossa;
export const R = 0.13;
export const TABLE = { halfWidth: 5, halfHeight: 2.5, pocketRadius: 0.255 };
export const BUCHE: Vec2[] = [
  { x: -5, z: -2.5 },
  { x: 0, z: -2.5 },
  { x: 5, z: -2.5 },
  { x: -5, z: 2.5 },
  { x: 0, z: 2.5 },
  { x: 5, z: 2.5 },
];
export const NOMI_BUCHE = [
  "Alto sinistra",
  "Alto centro",
  "Alto destra",
  "Basso sinistra",
  "Basso centro",
  "Basso destra",
];
export const COLORI = [
  "#fff8e7",
  "#eab83e",
  "#3875c3",
  "#d34b48",
  "#9068b8",
  "#e3863a",
  "#40986b",
  "#9c4353",
  "#22232b",
];
export const gruppo = (id: number): Gruppo | null =>
  id > 0 && id < 8 ? "piene" : id > 8 && id < 16 ? "rigate" : null;
export const avversario = (p: Giocatore): Giocatore => (p === 0 ? 1 : 0);
export const distanza = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.z - b.z);

export function creaStato(): Stato {
  const balls: Palla[] = [{ id: 0, x: -2.5, z: 0, pocketed: false }];
  // La 8 al centro; gli angoli posteriori appartengono a gruppi diversi.
  const ids = [1, 10, 3, 4, 8, 12, 13, 6, 15, 2, 7, 14, 5, 9, 11];
  let i = 0;
  for (let row = 0; row < 5; row++)
    for (let col = 0; col <= row; col++) {
      balls.push({
        id: ids[i++],
        x: 2 + row * R * Math.sqrt(3) * 1.015,
        z: (col - row / 2) * R * 2.03,
        pocketed: false,
      });
    }
  return {
    balls: balls.sort((a, b) => a.id - b.id),
    turn: 0,
    groups: [null, null],
    phase: "break",
    ballInHand: false,
    winner: null,
    shots: 0,
    message: "Il tavolo è tuo. Apri la partita!",
    history: [],
    lastShot: null,
  };
}

export function bersagli(stato: Stato): Palla[] {
  const own = stato.groups[stato.turn];
  const active = stato.balls.filter((b) => !b.pocketed && b.id !== 0);
  if (!own) return active.filter((b) => b.id !== 8);
  const remaining = active.filter((b) => gruppo(b.id) === own);
  return remaining.length ? remaining : active.filter((b) => b.id === 8);
}

export function posizioneValida(stato: Stato, p: Vec2): boolean {
  return (
    Number.isFinite(p.x) &&
    Number.isFinite(p.z) &&
    Math.abs(p.x) < 5 - R &&
    Math.abs(p.z) < 2.5 - R &&
    BUCHE.every((b) => distanza(b, p) > TABLE.pocketRadius + R) &&
    stato.balls.every(
      (b) => b.id === 0 || b.pocketed || distanza(b, p) >= 2 * R + 0.008,
    )
  );
}

export function posizioneBianca(stato: Stato): Vec2 {
  const cue = stato.balls.find((b) => b.id === 0)!;
  if (posizioneValida(stato, cue)) return { x: cue.x, z: cue.z };
  for (let x = -2.5; x < 4.7; x += 0.35)
    for (let z = 0; z < 2.3; z += 0.35) {
      if (posizioneValida(stato, { x, z })) return { x, z };
    }
  return { x: -4, z: -2 };
}

export function mossaValida(stato: Stato, m: Mossa): boolean {
  return (
    stato.phase !== "finished" &&
    Number.isFinite(m.angle) &&
    Number.isFinite(m.power) &&
    m.power >= 0.08 &&
    m.power <= 1 &&
    (m.calledPocket === undefined ||
      (Number.isInteger(m.calledPocket) &&
        m.calledPocket >= 0 &&
        m.calledPocket < 6)) &&
    (!m.placement ||
      (stato.ballInHand && posizioneValida(stato, m.placement))) &&
    (bersagli(stato)[0]?.id !== 8 || m.calledPocket !== undefined)
  );
}

/** Fisica 2D deterministica sul piano del tavolo, resa in 3D dalla UI. */
export function simulaTiro(
  stato: Stato,
  mossa: Mossa,
  recordFrames = false,
): Esito {
  if (!mossaValida(stato, mossa)) throw new Error("Mossa non valida");
  const balls = stato.balls.map((b) => ({ ...b, vx: 0, vz: 0 }));
  const cue = balls.find((b) => b.id === 0)!;
  if (stato.ballInHand)
    Object.assign(cue, mossa.placement ?? posizioneBianca(stato), {
      pocketed: false,
    });
  const speed = 1.2 + mossa.power * 10;
  cue.vx = Math.cos(mossa.angle) * speed;
  cue.vz = Math.sin(mossa.angle) * speed;
  const result: Esito = {
    balls: [],
    firstContact: null,
    pocketed: [],
    railsAfterContact: false,
    railBalls: [],
    frames: [],
  };
  const snapshot = () =>
    balls.map(({ id, x, z, pocketed }) => ({ id, x, z, pocketed }));
  if (recordFrames) result.frames.push(snapshot());
  const dt = 1 / 180;
  for (let step = 0; step < 2700; step++) {
    let moving = false;
    for (const b of balls) {
      if (b.pocketed) continue;
      const v = Math.hypot(b.vx, b.vz);
      if (v > 0) {
        moving = true;
        b.x += b.vx * dt;
        b.z += b.vz * dt;
        const next = Math.max(0, v - 0.95 * dt);
        b.vx *= next / v;
        b.vz *= next / v;
      }
      const pocket = BUCHE.findIndex(
        (p) => distanza(p, b) < TABLE.pocketRadius,
      );
      if (pocket >= 0) {
        b.pocketed = true;
        b.vx = 0;
        b.vz = 0;
        result.pocketed.push({ id: b.id, pocket });
        continue;
      }
      let rail = false;
      if (Math.abs(b.x) > 5 - R) {
        b.x = Math.sign(b.x) * (5 - R);
        b.vx = -b.vx * 0.83;
        rail = true;
      }
      // Le imboccature laterali restano aperte fino al centro della buca.
      if (Math.abs(b.z) > 2.5 - R && Math.abs(b.x) > 0.22) {
        b.z = Math.sign(b.z) * (2.5 - R);
        b.vz = -b.vz * 0.83;
        rail = true;
      }
      if (rail && result.firstContact !== null) {
        result.railsAfterContact = true;
        if (b.id && !result.railBalls.includes(b.id))
          result.railBalls.push(b.id);
      }
    }
    for (let i = 0; i < balls.length; i++)
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i],
          b = balls[j];
        if (a.pocketed || b.pocketed) continue;
        const dx = b.x - a.x,
          dz = b.z - a.z,
          d2 = dx * dx + dz * dz;
        if (d2 >= 4 * R * R || d2 < 1e-12) continue;
        const d = Math.sqrt(d2),
          nx = dx / d,
          nz = dz / d;
        const impulse = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
        const overlap = (2 * R - d) / 2 + 0.00001;
        a.x -= nx * overlap;
        a.z -= nz * overlap;
        b.x += nx * overlap;
        b.z += nz * overlap;
        if (impulse > 0) {
          a.vx -= impulse * nx * 0.985;
          a.vz -= impulse * nz * 0.985;
          b.vx += impulse * nx * 0.985;
          b.vz += impulse * nz * 0.985;
          if (result.firstContact === null && (a.id === 0 || b.id === 0))
            result.firstContact = a.id === 0 ? b.id : a.id;
        }
      }
    if (recordFrames && step % 6 === 0) result.frames.push(snapshot());
    if (!moving && step > 1) break;
  }
  result.balls = snapshot();
  if (recordFrames) result.frames.push(result.balls);
  return result;
}

/** Separa arbitraggio e fisica per verificare anche casi limite sintetici. */
export function risolviTiro(stato: Stato, mossa: Mossa, esito: Esito): Stato {
  const next: Stato = {
    ...stato,
    balls: esito.balls.map((b) => ({ ...b })),
    groups: [...stato.groups],
    shots: stato.shots + 1,
    phase: "playing",
    history: [...stato.history],
  };
  const legalIds = bersagli(stato).map((b) => b.id);
  const scratch = esito.pocketed.some((b) => b.id === 0);
  const objectPots = esito.pocketed.filter((b) => b.id !== 0);
  const firstWrong =
    esito.firstContact === null ||
    (stato.phase !== "break" && !legalIds.includes(esito.firstContact));
  const illegalBreak =
    stato.phase === "break" &&
    objectPots.length === 0 &&
    esito.railBalls.length < 4;
  const noRail = !objectPots.length && !esito.railsAfterContact;
  const foul = scratch || firstWrong || illegalBreak || noRail;
  const eight = esito.pocketed.find((b) => b.id === 8);
  let message: string;
  if (eight && stato.phase !== "break") {
    const win =
      !foul && legalIds.includes(8) && mossa.calledPocket === eight.pocket;
    next.winner = win ? stato.turn : avversario(stato.turn);
    next.phase = "finished";
    message = win
      ? "Palla 8 nella buca dichiarata. Partita vinta!"
      : "Palla 8 irregolare: vince l’avversario.";
  } else {
    if (eight) {
      const ball = next.balls.find((b) => b.id === 8)!;
      ball.pocketed = true;
      let x = 2;
      while (
        next.balls.some(
          (b) => !b.pocketed && distanza(b, { x, z: 0 }) < 2 * R + 0.01,
        ) &&
        x < 4.6
      )
        x += 0.28;
      Object.assign(ball, { x, z: 0, pocketed: false });
    }
    if (!foul && !next.groups[stato.turn] && stato.phase !== "break") {
      const assigned = objectPots
        .map((b) => gruppo(b.id))
        .find((g) => g !== null);
      if (assigned) {
        next.groups[stato.turn] = assigned;
        next.groups[avversario(stato.turn)] =
          assigned === "piene" ? "rigate" : "piene";
      }
    }
    const keepTurn =
      !foul &&
      objectPots.some(
        (b) =>
          b.id !== 8 &&
          (!next.groups[stato.turn] ||
            gruppo(b.id) === next.groups[stato.turn]),
      );
    next.turn = keepTurn ? stato.turn : avversario(stato.turn);
    next.ballInHand = foul;
    if (foul) {
      message = scratch
        ? "Fallo: bianca in buca."
        : firstWrong
          ? "Fallo: primo contatto non valido."
          : illegalBreak
            ? "Spaccata non valida: servono quattro palle a sponda o un’imbucata."
            : "Fallo: nessuna sponda dopo il contatto.";
      message += " Palla in mano all’avversario.";
      Object.assign(
        next.balls.find((b) => b.id === 0)!,
        posizioneBianca(next),
        { pocketed: false },
      );
    } else
      message = keepTurn
        ? "Bella imbucata! Il turno continua."
        : "Cambio turno. Tocca all’avversario.";
    if (eight) message = "La 8 sulla spaccata torna sul punto. " + message;
  }
  next.message = message;
  next.lastShot = { foul, pocketed: esito.pocketed };
  next.history = [
    `${stato.turn === 0 ? "Tu" : "Bot"} · ${message}`,
    ...stato.history,
  ].slice(0, 30);
  return next;
}

export function applicaMossa(stato: Stato, mossa: Mossa): Stato {
  return risolviTiro(stato, mossa, simulaTiro(stato, mossa));
}
