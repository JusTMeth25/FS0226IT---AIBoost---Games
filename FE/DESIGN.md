---
name: Micio Club
description: Un club accogliente per giocare a biliardo in compagnia dei mici.
colors:
  primary: "#294c3c"
  primary-hover: "#366049"
  neutral-bg: "#f8f7f2"
  surface: "#fffefb"
  text: "#303d34"
  muted: "#6b7164"
  border: "#e4e6dc"
  accent: "#bf7658"
typography:
  display:
    fontFamily: "DM Serif Display, Georgia, serif"
    fontSize: "42px"
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: "-1px"
  body:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "14px"
    fontWeight: 400
rounded:
  sm: "5px"
  md: "8px"
  panel: "15px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-bg}"
    rounded: "{rounded.md}"
    padding: "14px 21px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
---

## Overview

**Creative North Star: "Un tavolo tra amici felini"**

Il club accogliente è una scelta confermata dall'utente. Carta crema, verde del panno, legno e ottone della scena 3D creano continuità tra gioco e comandi. L'artefatto principale è il tavolo giocabile; la cornice lascia spazio al tiro.

**Key Characteristics:**

- Titoli serif morbidi e comandi sans leggibili.
- Gatti disegnati in SVG e impronte sulle texture procedurali.
- Stato del turno, potenza e azione disponibili attorno al tavolo.

## Colors

Il verde profondo identifica le azioni primarie e il turno. La carta crema è lo sfondo; i testi secondari mantengono la tinta verde. Rosa, ambra e verde scuro distinguono le stecche. I colori delle palle restano riconoscibili tramite numero e fascia per le rigate.

## Typography

DM Serif Display per marchio, titolo e dialoghi; DM Sans per controlli e testo. Font serviti localmente tramite Fontsource, senza dipendenza da Google Fonts. Titolo 42 px desktop, 36 px tablet, 32 px telefono. Numeri della potenza tabulari.

## Layout

Contenitore massimo 1488 px, margine interno 56 px desktop e 16 px telefono. Tavolo flessibile con colonna avversario da 268 px. Sotto 900 px i comandi laterali passano sotto il tavolo; sotto 580 px la scelta del bot resta orizzontale. Interazioni pointer e tastiera condividono lo stesso stato.

## Elevation & Depth

Profondità reale della scena prospettica, luce calda e ombre morbide. Pannello con ombra `0 5px 16px #28372a06`. I dialoghi usano un fondale attenuato e proteggono il focus durante le scelte. Nessuna animazione ornamentale necessaria per giocare.

## Shapes

Pannelli a raggio 15 px; pulsanti 8 px; avatar rotondi. Icone Lucide con tratto coerente e ritratti felini SVG. Il panno e le palle sono geometrie Three.js con texture create dal codice.

## Components

Tavolo: camera orbitale controllabile, preset 3D/dall'alto, bianca, palle numerate e stecca arretrabile. La potenza segue il caricamento. Rilascio senza trazione non avvia un tiro. La modalità camera sospende mira e tiro; i controlli della vista stanno in una barra sotto il canvas.

Anteprima: linea chiara per la bianca e ambrata per la prima palla colpita. Cerchi e sfere trasparenti indicano l'arrivo simulato; una legenda testuale rende leggibili anche coordinate e imbucate. Le traiettorie usano la stessa fisica della partita.

Bot: tre pulsanti con avatar, nome, difficoltà e selezione esplicita. Cambio durante una partita richiede una scelta di nuova partita.

Pulsanti e input: focus visibile in ambra, stati disabilitati durante il movimento, etichette italiane e scorciatoie sospese su campi e modali. Canvas focalizzabile; frecce per mira, Shift per regolazione fine di 0,25° con indicatore visibile, W/S e +/− per potenza, Spazio per tiro, Esc per annullare. Valore dell'angolo a due decimali.

## Do's and Don'ts

- Do conservare il club accogliente e il tavolo come elemento principale.
- Do mantenere numero e fascia sulle palle oltre al colore.
- Do spiegare controlli, falli e variante ricreativa nel linguaggio del gioco.
- Don't introdurre dettagli di orchestrazione nei comandi del giocatore.
- Don't sostituire l'identità felina con decorazioni generiche da dashboard.
