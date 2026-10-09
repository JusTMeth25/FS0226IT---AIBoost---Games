import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Crosshair,
  Flag,
  Lightbulb,
  Maximize2,
  Move3D,
  ZoomIn,
  ZoomOut,
  MousePointer2,
  PawPrint,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import Scena3D from "./Scena3D";
import Gatto from "../../components/Gatto";
import Dialogo from "../../components/Dialogo";
import {
  bersagli,
  COLORI,
  creaStato,
  gruppo,
  mossaValida,
  NOMI_BUCHE,
  posizioneValida,
  risolviTiro,
  simulaTiro,
} from "./regole";
import type { Mossa, Palla, Stato, Vec2 } from "./regole";
import type { StileStecca } from "./scena";
import type { AzioneCamera } from "./scena";
import { calcolaAnteprima } from "./anteprima";
import type { Anteprima, Percorso } from "./anteprima";

type Livello = "facile" | "medio" | "difficile";
type Stats = { giocate: number; vinte: number; imbucate: number };
export type { Stats };
const avversari = {
  facile: {
    nome: "Milo",
    testo: "Qualche tiro fortunato, tante pause per le coccole.",
    color: "#c79772",
    variant: "sleepy" as const,
    dots: 1,
  },
  medio: {
    nome: "Luna",
    testo: "Studia gli angoli. E ogni tanto ti lascia uno spiraglio.",
    color: "#abb7ae",
    variant: "happy" as const,
    dots: 2,
  },
  difficile: {
    nome: "Nero",
    testo: "Pensa al prossimo tiro prima di imbucare questo.",
    color: "#747f79",
    variant: "cool" as const,
    dots: 3,
  },
};
const livelli: Livello[] = ["facile", "medio", "difficile"];
const skins: { id: StileStecca; nome: string; nota: string }[] = [
  {
    id: "sakura",
    nome: "Zampa di rosa",
    nota: "Acero, rosa e piccole impronte",
  },
  {
    id: "tiger",
    nome: "Micio tigrato",
    nota: "Legno caldo e dettagli ambrati",
  },
  { id: "noir", nome: "Notte felina", nota: "Verde profondo e ottone" },
];

function Pallina({ id, down = false }: { id: number; down?: boolean }) {
  return (
    <span
      className={`mini-ball ${id > 8 ? "striped" : ""} ${down ? "potted" : ""}`}
      style={{ "--ball": COLORI[id > 8 ? id - 8 : id] } as React.CSSProperties}
      aria-label={`Palla ${id}${down ? " imbucata" : ""}`}
    >
      <span>{id}</span>
    </span>
  );
}

function descriviArrivo(route: Percorso) {
  return route.pocket !== null
    ? `in buca (${NOMI_BUCHE[route.pocket]})`
    : `X ${route.final.x.toFixed(2)} · Z ${route.final.z.toFixed(2)}`;
}

export default function Tavolo({
  onStats,
}: {
  onStats: (won: boolean | null, potted: number) => void;
}) {
  const [stato, setStato] = useState(creaStato);
  const [frames, setFrames] = useState<Palla[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [livello, setLivello] = useState<Livello>("facile");
  const [angle, setAngle] = useState(0);
  const [power, setPower] = useState(0.96);
  const [charge, setCharge] = useState<number | null>(null);
  const [gameId, setGameId] = useState(0);
  const [pocket, setPocket] = useState<number | undefined>();
  const [placement, setPlacement] = useState<Vec2 | undefined>();
  const [placing, setPlacing] = useState(false);
  const [top, setTop] = useState(false);
  const [guide, setGuide] = useState(true);
  const [extended, setExtended] = useState(false);
  const [fineAim, setFineAim] = useState(false);
  const [cameraMode, setCameraMode] = useState(false);
  const [cameraReset, setCameraReset] = useState(0);
  const [cameraCommand, setCameraCommand] = useState<{
    id: number;
    action: AzioneCamera;
  } | null>(null);
  const [predicted, setPredicted] = useState<{
    key: string;
    data: Anteprima;
  } | null>(null);
  const [sound, setSound] = useState(false);
  const [skin, setSkin] = useState<StileStecca>("sakura");
  const [equipment, setEquipment] = useState(false);
  const [restart, setRestart] = useState<Livello | null>(null);
  const [help, setHelp] = useState(true);
  const [botError, setBotError] = useState(false);
  const animation = useRef(0);
  const shotLock = useRef(false);
  const audio = useRef<AudioContext | null>(null);
  const match = useRef(0);
  const bot = avversari[livello];
  const playerTurn = stato.turn === 0 && !busy && stato.phase !== "finished";
  const onEight = bersagli(stato)[0]?.id === 8;
  const canShoot =
    playerTurn &&
    !placing &&
    !cameraMode &&
    !equipment &&
    !restart &&
    (!onEight || pocket !== undefined);
  const previewKey = `${gameId}:${stato.shots}:${angle}:${power}:${pocket}:${placement?.x}:${placement?.z}`;
  const previewEnabled = extended && playerTurn && !placing;
  const preview =
    previewEnabled && predicted?.key === previewKey ? predicted.data : null;
  useEffect(() => {
    if (!previewEnabled) return;
    // Debounce breve: non si ripete la simulazione per ogni evento del mouse.
    const timer = setTimeout(
      () =>
        setPredicted({
          key: previewKey,
          data: calcolaAnteprima(stato, {
            angle,
            power,
            calledPocket: pocket,
            placement,
          }),
        }),
      45,
    );
    return () => clearTimeout(timer);
  }, [previewEnabled, previewKey, stato, angle, power, pocket, placement]);
  const cameraAction = (action: AzioneCamera) =>
    setCameraCommand((previous) => ({ id: (previous?.id ?? 0) + 1, action }));

  useEffect(
    () => () => {
      cancelAnimationFrame(animation.current);
      void audio.current?.close();
    },
    [],
  );
  function playSound() {
    if (!sound) return;
    try {
      audio.current ??= new AudioContext();
      const ctx = audio.current;
      void ctx.resume();
      const osc = ctx.createOscillator(),
        gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "triangle";
      osc.frequency.setValueAtTime(240, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.14, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start();
      osc.stop(ctx.currentTime + 0.13);
    } catch {
      /* Il suono è facoltativo; il gioco continua. */
    }
  }
  const shoot = useCallback(
    (move: Mossa, source: Stato = stato) => {
      if (shotLock.current || !mossaValida(source, move)) return;
      shotLock.current = true;
      const result = simulaTiro(source, move, true),
        next = risolviTiro(source, move, result);
      const id = match.current;
      setBusy(true);
      setCharge(null);
      setPlacement(undefined);
      setPlacing(false);
      const start = performance.now();
      const animate = (time: number) => {
        if (id !== match.current) return;
        const index = Math.floor((time - start) / 22);
        if (index < result.frames.length) {
          setFrames(result.frames[index]);
          animation.current = requestAnimationFrame(animate);
        } else {
          setFrames(null);
          setStato(next);
          setBusy(false);
          shotLock.current = false;
          setPocket(undefined);
          setPower(0.48);
          if (source.turn === 0)
            onStats(null, result.pocketed.filter((b) => b.id > 0).length);
          if (next.winner !== null) onStats(next.winner === 0, 0);
        }
      };
      animation.current = requestAnimationFrame(animate);
    },
    [stato, onStats],
  );
  useEffect(() => {
    if (stato.turn !== 1 || stato.phase === "finished" || busy || botError)
      return;
    const worker = new Worker(new URL("./bot.worker.ts", import.meta.url), {
      type: "module",
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const requestId = match.current;
    const started = performance.now();
    worker.onmessage = (event) => {
      if (requestId !== match.current) return;
      if (event.data.error || !mossaValida(stato, event.data.mossa)) {
        setBotError(true);
        return;
      }
      timer = setTimeout(
        () => {
          if (requestId === match.current) shoot(event.data.mossa, stato);
        },
        Math.max(0, 800 - (performance.now() - started)),
      );
    };
    worker.onerror = () => setBotError(true);
    worker.postMessage({ stato, livello });
    return () => {
      worker.terminate();
      clearTimeout(timer);
    };
  }, [stato, livello, busy, shoot, botError]);

  const humanShot = (chargedPower?: number) => {
    if (canShoot && !document.querySelector("dialog[open]")) {
      playSound();
      shoot({
        angle,
        power: chargedPower ?? power,
        calledPocket: pocket,
        placement,
      });
    }
  };
  // I campi e le finestre conservano i loro comandi nativi; le scorciatoie
  // agiscono soltanto sul tavolo e non possono tirare durante il turno del bot.
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        document.querySelector("dialog[open]")
      )
        return;
      if (
        event.target instanceof Element &&
        event.target.closest(
          "input, textarea, select, [contenteditable='true']",
        )
      )
        return;
      if (event.key === "Shift") {
        setFineAim(true);
        return;
      }
      const space = event.code === "Space" || event.key === " ";
      if (
        space &&
        event.target instanceof Element &&
        event.target.closest("button, a, summary")
      )
        return;
      const powerDirection =
        event.code === "KeyW" || event.key === "+" || event.key === "="
          ? 1
          : event.code === "KeyS" || event.key === "-"
            ? -1
            : 0;
      const direction = {
        ArrowLeft: -1,
        ArrowDown: -1,
        ArrowRight: 1,
        ArrowUp: 1,
      }[event.key];
      if (!space && direction === undefined && !powerDirection) return;
      event.preventDefault();
      if (!playerTurn || placing || charge !== null || cameraMode) return;
      setFineAim(event.shiftKey);
      if (powerDirection) {
        setPower((p) =>
          Math.max(
            0.08,
            Math.min(
              1,
              Number(
                (p + powerDirection * (event.shiftKey ? 0.01 : 0.05)).toFixed(
                  2,
                ),
              ),
            ),
          ),
        );
        return;
      }
      if (space) {
        if (!event.repeat) humanShot();
      } else
        setAngle((a) =>
          Math.atan2(
            Math.sin(
              a + (direction! * (event.shiftKey ? 0.25 : 1) * Math.PI) / 180,
            ),
            Math.cos(
              a + (direction! * (event.shiftKey ? 0.25 : 1) * Math.PI) / 180,
            ),
          ),
        );
    };
    window.addEventListener("keydown", keydown);
    const keyup = (e: KeyboardEvent) => {
      if (e.key === "Shift") setFineAim(false);
    };
    const blur = () => setFineAim(false);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", blur);
    };
  });
  function chargeCue(value: number | null) {
    setCharge(value);
    if (value !== null) setPower(Math.max(0.08, value));
  }
  function reset(nextLevel: Livello) {
    setGameId((id) => id + 1);
    match.current++;
    cancelAnimationFrame(animation.current);
    shotLock.current = false;
    setCharge(null);
    setCameraMode(false);
    setFineAim(false);
    setStato(creaStato());
    setFrames(null);
    setBusy(false);
    setLivello(nextLevel);
    setAngle(0);
    setPower(0.96);
    setPocket(undefined);
    setPlacement(undefined);
    setPlacing(false);
    setRestart(null);
    setBotError(false);
  }
  function chooseLevel(nextLevel: Livello) {
    if (nextLevel === livello) return;
    if (stato.shots > 0 || busy) setRestart(nextLevel);
    else reset(nextLevel);
  }
  function aimPoint(p: Vec2, click: boolean) {
    if (
      !playerTurn ||
      cameraMode ||
      charge !== null ||
      document.querySelector("dialog[open]")
    )
      return;
    if (placing) {
      if (click && posizioneValida(stato, p)) {
        setPlacement(p);
        setPlacing(false);
      }
      return;
    }
    const cue = placement ?? stato.balls[0];
    setAngle(Math.atan2(p.z - cue.z, p.x - cue.x));
  }
  let visibleBalls = frames ?? stato.balls;
  if (placement && !frames)
    visibleBalls = visibleBalls.map((b) =>
      b.id === 0 ? { ...b, ...placement } : b,
    );
  const remaining = (player: 0 | 1) =>
    stato.groups[player]
      ? stato.balls.filter(
          (b) => !b.pocketed && gruppo(b.id) === stato.groups[player],
        ).length
      : 7;
  const status =
    stato.phase === "finished"
      ? stato.winner === 0
        ? "Il tavolo ha un nuovo re!"
        : `${bot.nome} si prende la rivincita.`
      : busy
        ? "Le palle sono in movimento…"
        : stato.turn === 1
          ? `${bot.nome} sta studiando il tiro…`
          : cameraMode
            ? "Muovi vista: trascina per ruotare, rotella per zoom, tasto destro per spostare."
            : placing
              ? "Scegli un punto libero sul panno."
              : charge !== null
                ? `Potenza ${Math.round(charge * 100)}%. Rilascia per tirare; Esc annulla.`
                : stato.ballInHand
                  ? "Palla in mano: puoi riposizionare la bianca."
                  : onEight
                    ? "È il momento della 8. Dichiara la buca."
                    : stato.phase === "break"
                      ? "Si comincia! A te la spaccata."
                      : "Tocca a te. Trova il tuo angolo.";
  return (
    <div className="game-layout">
      <section className="table-panel" aria-label="Partita di biliardo">
        <div className="table-toolbar">
          <div className="game-title">
            <span className="eight-mark">8</span>
            <strong>Biliardo</strong>
            <span className="tag">Palla a 8</span>
          </div>
          <div className="toolbar-actions">
            <button
              className="icon-button"
              aria-label={sound ? "Disattiva suoni" : "Attiva suoni"}
              aria-pressed={sound}
              onClick={() => setSound(!sound)}
            >
              {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button
              className="icon-button"
              aria-label="Nuova partita"
              onClick={() =>
                stato.shots || busy ? setRestart(livello) : reset(livello)
              }
            >
              <RotateCcw size={18} />
            </button>
          </div>
        </div>
        <div className="game-stage">
          <div className="scoreboard">
            <div
              className={`player-score ${stato.turn === 0 && stato.phase !== "finished" ? "active" : ""}`}
            >
              <div className="avatar you">
                <PawPrint size={23} />
              </div>
              <div>
                <div className="player-name">
                  Tu{" "}
                  <span>
                    {stato.turn === 0 && stato.phase !== "finished"
                      ? "Al tiro"
                      : "Giocatore"}
                  </span>
                </div>
                <div className="ball-row">
                  {stato.groups[0] ? (
                    Array.from(
                      { length: 7 },
                      (_, i) => i + (stato.groups[0] === "piene" ? 1 : 9),
                    ).map((id) => (
                      <Pallina
                        key={id}
                        id={id}
                        down={stato.balls[id].pocketed}
                      />
                    ))
                  ) : (
                    <span className="open-table">Gruppo da assegnare</span>
                  )}
                </div>
              </div>
            </div>
            <div className="versus">vs</div>
            <div
              className={`player-score opponent-score ${stato.turn === 1 && stato.phase !== "finished" ? "active" : ""}`}
            >
              <div className="avatar cat-avatar">
                <Gatto color={bot.color} variant={bot.variant} />
              </div>
              <div>
                <div className="player-name">
                  {bot.nome}
                  <span>{livello}</span>
                </div>
                <div className="ball-row">
                  {stato.groups[1] ? (
                    Array.from(
                      { length: 7 },
                      (_, i) => i + (stato.groups[1] === "piene" ? 1 : 9),
                    ).map((id) => (
                      <Pallina
                        key={id}
                        id={id}
                        down={stato.balls[id].pocketed}
                      />
                    ))
                  ) : (
                    <span className="open-table">Gruppo da assegnare</span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="table-scene">
            <Scena3D
              balls={visibleBalls}
              angle={angle}
              aiming={playerTurn && !placing}
              guide={guide && !extended}
              preview={preview}
              cameraMode={cameraMode}
              cameraReset={cameraReset}
              cameraCommand={cameraCommand}
              top={top}
              skin={skin}
              charge={charge}
              gameId={gameId}
              canStrike={canShoot}
              onCharge={chargeCue}
              onRelease={humanShot}
              onPoint={aimPoint}
            />
          </div>
          <div
            className={`turn-notice ${busy || stato.turn === 1 ? "thinking" : ""}`}
            role="status"
          >
            <span className="status-dot" />
            {status}
          </div>
          {stato.phase === "finished" && (
            <div className="result-overlay">
              <div>
                <PawPrint size={32} />
                <h2>
                  {stato.winner === 0
                    ? "Bella zampata!"
                    : "Questa è di " + bot.nome + "."}
                </h2>
                <p>{stato.message}</p>
                <button
                  className="primary-button"
                  onClick={() => reset(livello)}
                >
                  Giochiamo ancora <ArrowRight size={17} />
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="view-actions">
          <button
            className={top ? "selected" : ""}
            onClick={() => setTop(!top)}
            aria-pressed={top}
          >
            <Maximize2 size={14} />
            {top ? "Vista dall’alto" : "Vista 3D"}
          </button>
          <button
            className={guide ? "selected" : ""}
            onClick={() => {
              setGuide(!guide);
              if (guide) setExtended(false);
            }}
            aria-pressed={guide}
          >
            <Crosshair size={14} />
            Guida di mira
          </button>
          <button
            className={extended ? "selected" : ""}
            aria-pressed={extended}
            onClick={() => {
              setExtended(!extended);
              setGuide(true);
            }}
          >
            <Crosshair size={14} />
            Traiettoria completa
          </button>
          <button
            className={cameraMode ? "selected" : ""}
            aria-pressed={cameraMode}
            onClick={() => setCameraMode(!cameraMode)}
          >
            <Move3D size={14} />
            {cameraMode ? "Torna alla mira" : "Muovi vista"}
          </button>
        </div>
        {cameraMode && (
          <div className="camera-controls" aria-label="Controlli camera">
            <span>Trascina: ruota · Destro: sposta · Rotella/pinch: zoom</span>
            <div>
              <button
                className="icon-button"
                aria-label="Ruota vista a sinistra"
                onClick={() => cameraAction("left")}
              >
                <ArrowLeft size={16} />
              </button>
              <button
                className="icon-button"
                aria-label="Ruota vista a destra"
                onClick={() => cameraAction("right")}
              >
                <ArrowRight size={16} />
              </button>
              <button
                className="icon-button"
                aria-label="Alza vista"
                onClick={() => cameraAction("up")}
              >
                <ArrowUpRight size={16} />
              </button>
              <button
                className="icon-button"
                aria-label="Abbassa vista"
                onClick={() => cameraAction("down")}
              >
                <ArrowDown size={16} />
              </button>
              <button
                className="icon-button"
                aria-label="Avvicina vista"
                onClick={() => cameraAction("in")}
              >
                <ZoomIn size={16} />
              </button>
              <button
                className="icon-button"
                aria-label="Allontana vista"
                onClick={() => cameraAction("out")}
              >
                <ZoomOut size={16} />
              </button>
              <button
                className="secondary-button"
                onClick={() => setCameraReset((n) => n + 1)}
              >
                Reset vista
              </button>
            </div>
          </div>
        )}
        {previewEnabled && (
          <div className="preview-summary" aria-live="polite">
            <strong>Anteprima del tiro</strong>
            {preview ? (
              <>
                <span className="preview-white">
                  Bianca: {descriviArrivo(preview.white)}
                </span>
                <span className="preview-target">
                  {preview.target
                    ? `Palla ${preview.target.id}: ${descriviArrivo(preview.target)}`
                    : "Nessuna palla colpita"}
                </span>
              </>
            ) : (
              <span>Calcolo traiettorie…</span>
            )}
            <small>
              Cerchi = arrivo · Stessa fisica del tiro · Include sponde e altri
              urti
            </small>
          </div>
        )}
        <div className="shot-controls">
          <div className="power-control">
            <label htmlFor="power">
              Potenza{" "}
              <strong>
                {Math.round(power * 100)}
                <small>%</small>
              </strong>
            </label>
            <input
              id="power"
              type="range"
              min="8"
              max="100"
              value={Math.round(power * 100)}
              disabled={!playerTurn || charge !== null || cameraMode}
              onChange={(e) => setPower(Number(e.target.value) / 100)}
              style={{ "--fill": `${power * 100}%` } as React.CSSProperties}
            />
            <div className="range-captions">
              <span>Delicata</span>
              <span>Decisa</span>
            </div>
          </div>
          <div className="angle-control">
            <label htmlFor="angle">Regola la mira</label>
            <div>
              <button
                className="icon-button"
                disabled={!playerTurn || charge !== null || cameraMode}
                aria-label="Mira a sinistra"
                onClick={() => setAngle((a) => a - Math.PI / 180)}
              >
                <ArrowLeft size={15} />
              </button>
              <input
                id="angle"
                type="number"
                step="0.25"
                min="-180"
                max="180"
                value={Number(((angle * 180) / Math.PI).toFixed(2))}
                disabled={!playerTurn || charge !== null || cameraMode}
                onChange={(e) =>
                  setAngle(
                    (Math.max(-180, Math.min(180, Number(e.target.value))) *
                      Math.PI) /
                      180,
                  )
                }
              />
              <span>°</span>
              <button
                className="icon-button"
                disabled={!playerTurn || charge !== null || cameraMode}
                aria-label="Mira a destra"
                onClick={() => setAngle((a) => a + Math.PI / 180)}
              >
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
          <button
            className="shoot-button"
            disabled={!canShoot || charge !== null}
            onClick={() => humanShot()}
            aria-keyshortcuts="Space"
          >
            {busy
              ? "In movimento"
              : stato.turn === 1
                ? "Turno di " + bot.nome
                : stato.phase === "break"
                  ? "Spacca!"
                  : "Tira"}
            <ArrowUpRight size={20} />
          </button>
        </div>
        <div className="keyboard-guide">
          <span
            className={fineAim ? "fine-aim active" : "fine-aim"}
            aria-live="polite"
          >
            {fineAim
              ? "Mira fine attiva · 0,25°"
              : "Frecce: 1° · Shift + frecce: 0,25°"}
          </span>
          <span>
            W / +: più potenza · S / −: meno potenza · Shift: passi 1%
          </span>
        </div>
        {stato.ballInHand && playerTurn && (
          <div className="ball-in-hand">
            <MousePointer2 size={16} />
            <span>
              {placement
                ? "Bianca riposizionata."
                : "Scegli dove giocare la bianca."}
            </span>
            <button onClick={() => setPlacing(!placing)}>
              {placing ? "Mantieni posizione attuale" : "Posiziona sul tavolo"}
            </button>
            <span className="placement-keyboard">
              <label>
                X{" "}
                <input
                  aria-label="Posizione bianca X"
                  type="number"
                  min="-4.8"
                  max="4.8"
                  step="0.1"
                  value={(placement ?? stato.balls[0]).x.toFixed(1)}
                  onChange={(e) => {
                    const p = {
                      ...(placement ?? stato.balls[0]),
                      x: Number(e.target.value),
                    };
                    if (posizioneValida(stato, p)) setPlacement(p);
                  }}
                />
              </label>
              <label>
                Z{" "}
                <input
                  aria-label="Posizione bianca Z"
                  type="number"
                  min="-2.3"
                  max="2.3"
                  step="0.1"
                  value={(placement ?? stato.balls[0]).z.toFixed(1)}
                  onChange={(e) => {
                    const p = {
                      ...(placement ?? stato.balls[0]),
                      z: Number(e.target.value),
                    };
                    if (posizioneValida(stato, p)) setPlacement(p);
                  }}
                />
              </label>
            </span>
          </div>
        )}
        {onEight && playerTurn && (
          <div className="pocket-choice">
            <label htmlFor="pocket">Buca dichiarata per la 8</label>
            <select
              id="pocket"
              value={pocket ?? ""}
              onChange={(e) =>
                setPocket(
                  e.target.value === "" ? undefined : Number(e.target.value),
                )
              }
            >
              <option value="">Scegli la buca…</option>
              {NOMI_BUCHE.map((name, i) => (
                <option key={i} value={i}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        )}
        {botError && (
          <div className="bot-error" role="alert">
            Il bot non ha completato il tiro.{" "}
            <button onClick={() => setBotError(false)}>Riprova</button>
          </div>
        )}
        <div className="table-bottom">
          <span>
            <MousePointer2 size={14} /> Trascina e rilascia la stecca · Frecce:
            mira · Spazio: tira
          </span>
          <span>
            Tiro {stato.shots + 1}
            <span className="tiny-separator">·</span>
            {stato.groups[0]
              ? `${remaining(0)} palle rimaste`
              : "Tavolo aperto"}
          </span>
        </div>
      </section>
      <aside className="game-sidebar">
        <div className="opponent-section">
          <div className="section-heading">
            <h2>Il tuo avversario</h2>
            <PawPrint size={17} />
          </div>
          <p>Tre mici. Tre modi di giocare.</p>
          <div className="opponent-options">
            {livelli.map((level) => {
              const b = avversari[level];
              return (
                <button
                  key={level}
                  className={`opponent-option ${livello === level ? "chosen" : ""}`}
                  aria-pressed={livello === level}
                  onClick={() => chooseLevel(level)}
                >
                  <span className={`cat-portrait ${level}`}>
                    <Gatto color={b.color} variant={b.variant} />
                  </span>
                  <span className="opponent-description">
                    <strong>{b.nome}</strong>
                    <span>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </span>
                  </span>
                  <span className="difficulty-dots" aria-hidden="true">
                    {[1, 2, 3].map((i) => (
                      <i key={i} className={i <= b.dots ? "filled" : ""} />
                    ))}
                  </span>
                  {livello === level && (
                    <Check className="opponent-check" size={15} />
                  )}
                </button>
              );
            })}
          </div>
          <p className="bot-personality">« {bot.testo} »</p>
        </div>
        <div className="equipment-section">
          <div className="section-heading">
            <h2>La tua stecca</h2>
            <Sparkles size={16} />
          </div>
          <button
            className="cue-preview"
            onClick={() => setEquipment(true)}
            aria-label="Personalizza la stecca"
          >
            <span className={`cue-illustration ${skin}`}>
              <i />
              <i />
              <i />
            </span>
            <PawPrint className="cue-paw" size={17} />
          </button>
          <button className="cue-name" onClick={() => setEquipment(true)}>
            <span>{skins.find((s) => s.id === skin)!.nome}</span>
            <ChevronDown size={16} />
          </button>
          <span className="equipment-note">
            Un tocco di carattere, a ogni tiro.
          </span>
        </div>
        <div className="tip-box">
          <Lightbulb size={21} />
          <div>
            <strong>Questione di zampa.</strong>
            <p>
              La potenza non è tutto. Un tiro leggero ti aiuta a controllare
              dove si ferma la bianca.
            </p>
          </div>
        </div>
      </aside>
      {help && (
        <div className="quick-guide">
          <div className="quick-guide-title">
            <span className="guide-paw">
              <PawPrint size={20} />
            </span>
            <div>
              <strong>Il primo tiro non si scorda.</strong>
              <p>Prenditi un momento, poi fai parlare la stecca.</p>
            </div>
          </div>
          <div className="guide-step">
            <MousePointer2 size={17} />
            <span>Mira con mouse o frecce</span>
          </div>
          <div className="guide-step">
            <ArrowDown size={17} />
            <span>Trascina la stecca indietro</span>
          </div>
          <div className="guide-step">
            <Flag size={17} />
            <span>Rilascia, oppure premi spazio</span>
          </div>
          <button
            className="icon-button"
            aria-label="Nascondi suggerimenti"
            onClick={() => setHelp(false)}
          >
            <X size={17} />
          </button>
        </div>
      )}
      <details className="match-log">
        <summary>
          Cronaca del tavolo{" "}
          <span>
            {stato.history.length
              ? `Ultimo tiro: ${stato.lastShot?.foul ? "fallo" : "regolare"}`
              : "La partita deve ancora iniziare"}
          </span>
        </summary>
        {stato.history.length ? (
          <ol>
            {stato.history.map((line, i) => (
              <li key={`${stato.shots}-${i}`}>{line}</li>
            ))}
          </ol>
        ) : (
          <p>Qui trovi imbucate, cambi turno e falli della partita.</p>
        )}
      </details>
      {restart && (
        <Dialogo
          title="Un nuovo giro di zampa?"
          onClose={() => setRestart(null)}
        >
          <p>
            La partita in corso verrà sostituita da una nuova contro{" "}
            {avversari[restart].nome}. I risultati delle partite già concluse
            restano nel tuo club.
          </p>
          <div className="dialog-actions">
            <button
              className="secondary-button"
              onClick={() => setRestart(null)}
            >
              Continua questa
            </button>
            <button className="primary-button" onClick={() => reset(restart)}>
              Nuova partita <ArrowRight size={16} />
            </button>
          </div>
        </Dialogo>
      )}
      {equipment && (
        <Dialogo
          title="La stecca giusta per te."
          onClose={() => setEquipment(false)}
        >
          <p>
            Tre stili felini, la stessa precisione. Scegli il tuo preferito.
          </p>
          <div className="skin-options">
            {skins.map((s) => (
              <button
                key={s.id}
                className={skin === s.id ? "selected" : ""}
                onClick={() => setSkin(s.id)}
                aria-pressed={skin === s.id}
              >
                <span className={`cue-illustration ${s.id}`}>
                  <i />
                  <i />
                  <i />
                </span>
                <strong>
                  {s.nome} {skin === s.id && <Check size={15} />}
                </strong>
                <span>{s.nota}</span>
              </button>
            ))}
          </div>
          <button
            className="primary-button"
            onClick={() => setEquipment(false)}
          >
            Torna al tavolo <ArrowRight size={16} />
          </button>
        </Dialogo>
      )}
    </div>
  );
}
