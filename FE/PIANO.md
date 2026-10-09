# Micio Club — piano e contratto

## Stato del lavoro

- [x] Progetto React + TypeScript ispezionato; build iniziale verde.
- [x] Contratto regole.ts, fisica deterministica e tattica condivisa.
- [x] Tre agenti in parallelo su tre worktree e file distinti.
- [x] Tavolo 3D, comandi accessibili, tema gattini.
- [x] Integrazione sequenziale, verifica e build dopo ogni ramo.
- [x] Torneo riproducibile, test browser e documentazione finale.

## Stato del gioco

`Stato`: 16 palle con coordinate x/z e stato imbucata; giocatore di turno 0/1; gruppi piene/rigate inizialmente null; fase break/playing/finished; palla in mano; vincitore; numero tiri; ultimo esito e cronologia. Tutte le funzioni di regole e bot sono pure e non modificano l'input.

## Mosse

`Mossa`: angle in radianti, power fra 0.08 e 1, calledPocket 0..5 obbligatorio sulla 8, placement x/z facoltativo solo con palla in mano. `Bot = (stato, random?) => Mossa`. Un generatore casuale iniettato rende riproducibili le prove. Le simulazioni dei bot usano la stessa fisica del giocatore.

## Regole

Piene 1–7, rigate 9–15, 8 per ultima e nella buca dichiarata. Tavolo aperto dopo la spaccata. Primo gruppo assegnato alla prima imbucata regolare successiva. Si continua imbucando una propria palla. Fallo per scratch, mancato/primo contatto errato, assenza di sponda o imbucata dopo il contatto. La 8 anticipata, con fallo o in buca diversa perde; sulla spaccata viene riposizionata. Spaccata valida con imbucata o almeno quattro palle numerate a sponda.

Variante ricreativa dichiarata: chiamata richiesta solo per la 8; dopo ogni fallo bianca in mano su tutto il tavolo; nessuna scelta di ripetere la spaccata; nessun salto o effetto. Non è una riproduzione integrale del regolamento WPA. Fonte: https://wpapool.com/rules/.

## Strategia e proprietà dei file

| Agente        | Unico file modificabile              | Strategia                                                                                                                                                                                            |
| ------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| bot-facile    | src/giochi/biliardo/bot/facile.ts    | Sceglie un bersaglio legale con casualità e imprecisione marcata.                                                                                                                                    |
| bot-medio     | src/giochi/biliardo/bot/medio.ts     | Palla fantasma e traiettorie libere; simula 4 candidati, errore ±0,006 radianti e ±1,5% di potenza.                                                                                                  |
| bot-difficile | src/giochi/biliardo/bot/difficile.ts | Varianti geometriche, potenze, posizionamento della bianca e sponde. Beam/minimax a due tiri: 48 simulazioni alla radice e 3 rami con fino a 8 risposte, massimo 72 simulazioni e guardia di 780 ms. |

## Orchestrazione

L'orchestratore prepara e committa il contratto, crea tre worktree dal medesimo commit, avvia tre sottoagenti con contesto indipendente e un solo file autorizzato. Nessun agente cambia package, PIANO, regole o UI. Ciascuno committa il proprio file. L'orchestratore verifica i diff e integra un ramo per volta, eseguendo verifica e build. La UI rimane proprietà dell'orchestratore.

Superpowers: skill ufficiali dispatching-parallel-agents, using-git-worktrees, verification-before-completion. Impeccable: contesto, nuova interfaccia, craft-floor e controllo finale. I plugin non sono dipendenze runtime.

## Esecuzione degli agenti

Contratto comune committato in `662e035` prima dell'avvio. Tre sottoagenti reali avviati in parallelo, tre worktree in `.worktrees/`, tre rami. Durante la delega ogni agente ha modificato e committato esclusivamente il suo file bot:

| Agente        | Commit    | Integrazione su main |
| ------------- | --------- | -------------------- |
| bot-facile    | `e47cf95` | `4428dbd`            |
| bot-medio     | `595a682` | `6e90dc4`            |
| bot-difficile | `7dc5953` | `8ad9839`            |

Ogni integrazione ha superato `verifica.ts` e build, in sequenza. Nessun conflitto. Le successive modifiche comuni e la formattazione sono state curate soltanto dall'orchestratore. I worktree sono conservati per rendere ispezionabile l'isolamento.

## Comandi e interazione

- Clic/tap sul panno fissa la mira; tenendo premuto si può regolarla con il puntatore. L'hover non sposta la stecca mentre ci si avvicina per afferrarla. Afferra la stecca, trascina indietro lungo il suo asse e rilascia per tirare. La distanza controlla la potenza; una semplice pressione non tira. Pointer capture mantiene il trascinamento anche fuori dal canvas.
- Frecce sinistra/giù e destra/su: rotazione della mira di 1 grado, Shift riduce il passo a 0,25 gradi. Campo angolo a due decimali e indicatore di mira fine. W/+ e S/− modificano la potenza di 5 punti percentuali, Shift riduce il passo a 1 punto. Spazio tira con la potenza impostata; auto-repeat non produce colpi multipli.
- Esc, perdita del focus, annullamento del puntatore o cambio vista: annullano il caricamento. Input e dialoghi conservano i propri comandi; durante il tiro o il turno del bot le azioni umane sono bloccate.
- Una nuova partita invalida anche il gesto interno del renderer: rilasciare un trascinamento precedente non tira nel nuovo stato.
- Alternativa da tastiera: campo angolo, potenza, pulsante Tira, coordinate X/Z per la palla in mano e scelta della buca sulla 8.
- Tre stecche cosmetiche: Zampa di rosa, Micio tigrato, Notte felina. Camera 3D o dall'alto, guida di mira e suono facoltativo.
- Muovi vista abilita OrbitControls: rotazione con trascinamento, pan con tasto destro, zoom con rotella; touch a uno/due dita. Pulsanti per orientamento e zoom, Reset vista, Torna alla mira. Mira e tiro sospesi durante il controllo della camera. Il resize conserva la vista corrente; selezionare un preset o Reset vista la ripristina.
- Traiettoria completa usa la stessa simulazione del tiro, con un debounce di 45 ms durante le regolazioni. Mostra il percorso fino all'arresto, arrivo e imbucata della bianca e della prima palla toccata. Gli urti successivi con tutte le palle sono inclusi; i riposizionamenti imposti dall'arbitraggio avvengono dopo il movimento previsto.

## Verifica e limiti

`npm run verifica`: rack, validazione, fisica deterministica, immutabilità, assegnazione gruppi, falli, spaccata e condizioni sulla 8; contratto e tempo dei tre bot.

`npm run torneo`: seed 400–407, 8 partite per coppia, alternanza del giocatore che apre, massimo 180 tiri. Un timeout conta come pareggio. Il livello superiore deve vincere più partite; questo campione non garantisce la vittoria in ogni situazione.

Risultato verificato dopo l'integrazione: medio batte facile 8–0; difficile batte medio 8–0; nessun pareggio. I bot usano un Web Worker per mantenere reattiva l'interfaccia. Il limite temporale del difficile riduce la ricerca su hardware lento e può modificare la scelta rispetto al solo budget di iterazioni.

`npm run test:e2e`: browser Chromium, desktop e mobile, modali, stecche, difficoltà, ciclo umano/bot, annullamento partita, trascinamento, frecce e spazio. Gli screenshot locali di verifica stanno in `.impeccable/review/` e sono esclusi da Git.

Nessun backend, multiplayer o chiamata LLM durante il gioco. Statistiche nel localStorage del browser. Three.js rende geometria 3D; collisioni, attrito e sponde sono simulati nel piano del tavolo con passo fisso, senza spin o salti. Serve WebGL; in caso di errore si mostra il recupero esplicito.

Skill applicate da copie locali dei repository ufficiali [Superpowers](https://github.com/obra/superpowers) e [Impeccable](https://github.com/pbakaus/impeccable). L'installazione nativa di Superpowers nell'app è stata proposta, non eseguita automaticamente. Le skill sono strumenti di sviluppo e non pacchetti dell'applicazione.

## Esito finale delle verifiche

- Regole, contratti e coerenza anteprima/tiro: **12 verifiche superate**, tutti e tre i bot integrati.
- Torneo: **medio 8–0 facile**, **difficile 8–0 medio**, nessun pareggio nei seed dichiarati.
- Browser Chromium: **9 casi verificati** su desktop/mobile, con input mouse e touch, tastiera, finestre, worker, reset durante il caricamento, camera libera e anteprima completa. Il trascinamento dopo reset e la camera touch sono stati confermati con una successiva esecuzione mirata.
- TypeScript e build produzione: passati. ESLint: nessun errore. Rimane il messaggio informativo di Vite sulla dimensione del bundle che include Three.js.
- Revisione separata, in sola lettura, dello stesso sottoagente del bot facile: tre rilievi risolti. Mira stabile durante l'avvicinamento alla stecca; reset invalida il trascinamento; testo secondario con contrasto 4,694:1. Il verdetto copre queste tre correzioni.
- Documentazione completata: README, PRODUCT, DESIGN, sidecar Impeccable e questo piano. Screenshot desktop e mobile ispezionati con tavolo interamente visibile.

Il controllo meccanico Impeccable sul primo risultato dell'interfaccia ha restituito `[]`; la revisione finale ha verificato le successive correzioni specifiche. Le partite non richiedono servizi esterni o connessione ai plugin di sviluppo.
