import facile from "./bot/facile";
import medio from "./bot/medio";
import difficile from "./bot/difficile";
import type { Stato } from "./regole";
self.onmessage = (
  event: MessageEvent<{
    stato: Stato;
    livello: "facile" | "medio" | "difficile";
  }>,
) => {
  try {
    self.postMessage({
      mossa: { facile, medio, difficile }[event.data.livello](event.data.stato),
    });
  } catch (error) {
    self.postMessage({ error: String(error) });
  }
};
