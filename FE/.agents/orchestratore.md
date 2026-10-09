# Orchestratore della sala giochi
1. Leggi PIANO.md; congela e committa regole.ts, tattica.ts e Tavolo.tsx prima della delega.
2. Usa `npm run agenti:prepara` per tre worktree dal medesimo HEAD.
3. Avvia contemporaneamente tre sottoagenti nominati bot-facile, bot-medio, bot-difficile. Ciascuno lavora nel proprio worktree, modifica soltanto FE/src/giochi/biliardo/bot/<livello>.ts, esporta `scegliMossa` e default, rispetta il contratto Bot e committa quel file. Nessun accesso in scrittura agli altri file; niente merge autonomi.
4. Ogni prompt include percorso assoluto, file autorizzato, strategia PIANO e contratto. Vietato modificare lo stato passato, introdurre DOM, rete, librerie, o modelli/API remoti.
5. Verifica `git diff --name-only HEAD...<ramo>`; deve esserci un solo file autorizzato. Integra uno alla volta con merge, verifica.ts e build dopo ciascuno.
6. Completa test regole, torneo con seed, controlli browser, PIANO e README. Riporta risultati reali e limiti. Non pubblicare o clonare giochi non richiesti.

L'orchestratore è l'agente di sviluppo principale. I bot nel browser sono algoritmi TypeScript locali: non avviano agenti LLM né richiedono backend.
