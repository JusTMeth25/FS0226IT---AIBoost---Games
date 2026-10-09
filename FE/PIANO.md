# Micio Club — piano e contratto

## Stato del lavoro
- [x] Progetto React + TypeScript ispezionato; build iniziale verde.
- [x] Contratto regole.ts, fisica deterministica e tattica condivisa.
- [ ] Tre agenti in parallelo su tre worktree e file distinti.
- [ ] Tavolo 3D, comandi accessibili, tema gattini.
- [ ] Integrazione sequenziale, verifica e build dopo ogni ramo.
- [ ] Torneo riproducibile, test browser e documentazione finale.

## Stato del gioco
`Stato`: 16 palle con coordinate x/z e stato imbucata; giocatore di turno 0/1; gruppi piene/rigate inizialmente null; fase break/playing/finished; palla in mano; vincitore; numero tiri; ultimo esito e cronologia. Tutte le funzioni di regole e bot sono pure e non modificano l'input.

## Mosse
`Mossa`: angle in radianti, power fra 0.08 e 1, calledPocket 0..5 obbligatorio sulla 8, placement x/z facoltativo solo con palla in mano. `Bot = (stato, random?) => Mossa`. Un generatore casuale iniettato rende riproducibili le prove. Le simulazioni dei bot usano la stessa fisica del giocatore.

## Regole
Piene 1–7, rigate 9–15, 8 per ultima e nella buca dichiarata. Tavolo aperto dopo la spaccata. Primo gruppo assegnato alla prima imbucata regolare successiva. Si continua imbucando una propria palla. Fallo per scratch, mancato/primo contatto errato, assenza di sponda o imbucata dopo il contatto. La 8 anticipata, con fallo o in buca diversa perde; sulla spaccata viene riposizionata. Spaccata valida con imbucata o almeno quattro palle numerate a sponda.

Variante ricreativa dichiarata: chiamata richiesta solo per la 8; dopo ogni fallo bianca in mano su tutto il tavolo; nessuna scelta di ripetere la spaccata; nessun salto o effetto. Non è una riproduzione integrale del regolamento WPA. Fonte: https://wpapool.com/rules/.

## Strategia e proprietà dei file
| Agente | Unico file modificabile | Strategia |
|---|---|---|
| bot-facile | src/giochi/biliardo/bot/facile.ts | Sceglie un bersaglio legale con casualità e imprecisione marcata. |
| bot-medio | src/giochi/biliardo/bot/medio.ts | Geometria della palla fantasma, preferenza per traiettorie libere, valutazione di pochi tiri e piccolo errore. |
| bot-difficile | src/giochi/biliardo/bot/difficile.ts | Simula più candidati e potenze, evita falli e studia la risposta/continuazione con ricerca limitata sotto un secondo. |

## Orchestrazione
L'orchestratore prepara e committa il contratto, crea tre worktree dal medesimo commit, avvia tre sottoagenti con contesto indipendente e un solo file autorizzato. Nessun agente cambia package, PIANO, regole o UI. Ciascuno committa il proprio file. L'orchestratore verifica i diff e integra un ramo per volta, eseguendo verifica e build. La UI rimane proprietà dell'orchestratore.

Superpowers: skill ufficiali dispatching-parallel-agents, using-git-worktrees, verification-before-completion. Impeccable: contesto, nuova interfaccia, craft-floor e controllo finale. I plugin non sono dipendenze runtime.
