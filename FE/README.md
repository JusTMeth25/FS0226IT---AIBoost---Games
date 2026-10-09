# Micio Club

Sala giochi frontend in React e TypeScript. Il primo gioco è un biliardo palla a 8 con tavolo 3D Three.js, palle numerate, stecche a tema gattini e tre bot locali. L'atmosfera del club accogliente è stata scelta dall'utente.

## Avvio

Serve Node.js 24 o superiore: gli script `.ts` vengono eseguiti direttamente con Node.

```sh
npm install
npm run dev
```

Apri l'indirizzo stampato da Vite, normalmente `http://localhost:5173`. Per la versione compilata: `npm run build` e `npm run preview`.

## Come giocare

Scegli Milo (facile), Luna (medio) o Nero (difficile). Clicca/tocca il panno per fissare la mira; puoi regolarla tenendo premuto e trascinando sul panno. Afferra la stecca, arretrala lungo il suo asse e rilascia per tirare: la distanza regola la potenza. Un semplice clic sulla stecca non tira. Esc annulla la carica.

Le frecce ruotano la mira di un grado; Shift + frecce fanno una correzione fine. Spazio tira con la potenza impostata. Sono disponibili anche cursore di potenza, campo angolo e pulsante Tira. Le scorciatoie non interferiscono con campi e dialoghi; durante il turno del bot e il movimento delle palle i comandi di tiro sono disabilitati.

Con palla in mano, scegli una posizione libera con il puntatore o i campi X/Z. Prima del tiro finale dichiara la buca della 8 nel menu. Puoi cambiare stecca, attivare i suoni, disattivare la guida e passare alla vista dall'alto. Le statistiche sono conservate in questo browser.

Regole ricreative ispirate alla [palla a 8 WPA](https://wpapool.com/rules/): gruppi assegnati dopo la spaccata, primo contatto con una propria palla, sponda o imbucata dopo il contatto, palla in mano dopo un fallo e 8 per ultima nella buca dichiarata. Sono dichiarate le semplificazioni: chiamata solo sulla 8, palla in mano sempre su tutto il tavolo, nessuna opzione di ripetere la spaccata, salti o spin. Non è un simulatore integrale del regolamento da torneo.

## Verifica

```sh
npm run verifica
npm run torneo
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
```

Il torneo gioca 8 partite per coppia, seed 400–407 e spaccata alternata, con massimo 180 tiri. I timeout sono pareggi. Il test richiede che medio superi facile e difficile superi medio nel campione: non presume che una strategia vinca sempre. I test browser coprono desktop/mobile, ciclo umano/bot, cambi partita, stecche, tastiera e trascinamento.

## Contratto e orchestrazione

```text
src/giochi/biliardo/
  regole.ts       Stato, mosse, fisica e arbitraggio puri
  tattica.ts      Geometria e valutazione condivisa
  Tavolo.tsx      Partita, turni e controlli React
  Scena3D.tsx     Collegamento React/Three.js
  scena.ts        Tavolo, texture, stecca e interazioni 3D
  bot.worker.ts  Esecuzione dei bot fuori dal thread della UI
  bot/
    facile.ts    Milo: geometria casuale con imprecisione
    medio.ts     Luna: simulazione dei migliori 4 tiri
    difficile.ts Nero: fino a 72 simulazioni e ricerca a due tiri
```

Il contratto è stato committato prima della delega. Tre sottoagenti reali hanno lavorato in parallelo su tre worktree e tre rami, modificando un solo file bot ciascuno. I rami sono stati integrati in sequenza con verifica e build dopo ogni integrazione. Proprietà dei file, hash, strategie, stato e risultati sono documentati in [PIANO.md](PIANO.md); il mandato dell'orchestratore è in [.agents/orchestratore.md](.agents/orchestratore.md).

`npm run agenti:prepara` prepara i tre worktree se non esistono. Lo script prepara l'isolamento Git; l'orchestratore di sviluppo avvia i sottoagenti tramite gli strumenti della sessione. I bot del gioco sono algoritmi TypeScript e non richiedono un backend o chiamate a modelli.

Sono state applicate le skill ufficiali di [Superpowers](https://github.com/obra/superpowers) per isolamento/delega/verifica e di [Impeccable](https://github.com/pbakaus/impeccable) per interfaccia, controllo visivo e sistema di design. Le copie delle skill sono locali all'ambiente di sviluppo; la connessione nativa del plugin Superpowers nell'app è stata proposta e non eseguita automaticamente. Non sono dipendenze del gioco.

## Limiti e documenti

Rendering 3D, fisica deterministica nel piano del tavolo: attrito, urti elastici approssimati e sponde. Servono browser moderno e WebGL; l'app mostra una possibilità di recupero se il renderer non può avviarsi. Il bot difficile ha un limite di iterazioni e una guardia temporale che può ridurre la ricerca sui dispositivi lenti. Nessun servizio remoto viene chiamato durante una partita; anche i font sono serviti localmente.

[PRODUCT.md](PRODUCT.md) descrive il prodotto. [DESIGN.md](DESIGN.md) e `.impeccable/design.json` fissano il design implementato. Gli screenshot di verifica sono in `.impeccable/review/`, esclusi da Git. I tre worktree sono conservati per rendere ispezionabile la consegna. Clonazione di altri giochi e pubblicazione GitHub sono fasi successive alla prima iterazione richiesta.
