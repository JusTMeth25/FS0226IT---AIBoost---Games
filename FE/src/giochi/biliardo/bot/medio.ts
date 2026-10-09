import { posizioneBianca } from '../regole.ts'
import type { Bot, Mossa } from '../regole.ts'
import { candidati, valutaMossa } from '../tattica.ts'

// La geometria condivisa ordina prima i percorsi liberi verso la palla
// fantasma e la buca. Il medio verifica solo quattro tiri, senza cercare
// altre potenze o studiare il turno successivo.
const TIRI_DA_VALUTARE = 4

export const scegliMossa: Bot = (stato, random = Math.random) => {
  const migliori = candidati(stato).slice(0, TIRI_DA_VALUTARE)
  let scelta: Mossa = {
    angle: 0,
    power: 0.35,
    ...(stato.ballInHand ? { placement: posizioneBianca(stato) } : {}),
  }
  let punteggioMigliore = -Infinity

  for (const candidato of migliori) {
    // Falli, imbucate e 8 irregolari pesano piu della sola geometria;
    // a parita di esito preferiamo il tiro corto e meno tagliato.
    const punteggio = valutaMossa(stato, candidato.mossa).score + candidato.quality * 0.4
    if (punteggio > punteggioMigliore) {
      punteggioMigliore = punteggio
      scelta = candidato.mossa
    }
  }

  // La spaccata condivisa e gia calibrata per mandare quattro palle a
  // sponda: una variazione di forza puo renderla irregolare.
  if (stato.phase === 'break') return { ...scelta }

  // L'errore viene aggiunto dopo la scelta: la simulazione non garantisce
  // l'esecuzione perfetta. Due estrazioni rendono la prova riproducibile.
  return {
    ...scelta,
    angle: scelta.angle + (random() * 2 - 1) * 0.006,
    power: Math.max(0.08, Math.min(1, scelta.power * (1 + (random() * 2 - 1) * 0.015))),
  }
}

export default scegliMossa
