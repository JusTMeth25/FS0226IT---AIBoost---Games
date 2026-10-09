import { useCallback, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Cat,
  CircleHelp,
  Coffee,
  PawPrint,
  Trophy,
} from "lucide-react";
import Tavolo from "./giochi/biliardo/Tavolo";
import type { Stats } from "./giochi/biliardo/Tavolo";
import Dialogo from "./components/Dialogo";
import "./App.css";

function readStats(): Stats {
  try {
    const value = JSON.parse(localStorage.getItem("micio-club-stats") ?? "{}");
    return {
      giocate: Number(value.giocate) || 0,
      vinte: Number(value.vinte) || 0,
      imbucate: Number(value.imbucate) || 0,
    };
  } catch {
    return { giocate: 0, vinte: 0, imbucate: 0 };
  }
}
export default function App() {
  const [modal, setModal] = useState<"rules" | "club" | null>(null);
  const [stats, setStats] = useState(readStats);
  const updateStats = useCallback((won: boolean | null, potted: number) => {
    setStats((previous) => {
      const next = {
        giocate: previous.giocate + (won === null ? 0 : 1),
        vinte: previous.vinte + (won === true ? 1 : 0),
        imbucate: previous.imbucate + potted,
      };
      try {
        localStorage.setItem("micio-club-stats", JSON.stringify(next));
      } catch {
        /* Statistiche disponibili per questa sessione. */
      }
      return next;
    });
  }, []);
  return (
    <>
      <header className="site-header">
        <a
          href="#sala"
          className="brand"
          aria-label="Micio Club, la sala giochi"
        >
          <span className="brand-icon">
            <Cat size={28} strokeWidth={1.6} />
          </span>
          <span>
            micio<span className="brand-light">club</span>
            <small>LA SALA DEI TIPI FELINI</small>
          </span>
        </a>
        <nav aria-label="Navigazione principale">
          <a className="nav-active" href="#sala">
            <PawPrint size={17} />
            La sala
          </a>
          <button onClick={() => setModal("rules")}>
            <BookOpen size={17} />
            Come si gioca
          </button>
          <button onClick={() => setModal("club")}>
            <Trophy size={17} />
            Il tuo club
          </button>
        </nav>
        <div className="header-note">
          <span />
          Nessuna fretta. Solo un’altra partita.
        </div>
      </header>
      <main id="sala">
        <div className="page-heading">
          <div>
            <h1>
              Una partita. <em>Nove vite.</em>
            </h1>
            <p>Accomodati al tavolo. I nostri mici ti stanno aspettando.</p>
          </div>
          <button className="rules-link" onClick={() => setModal("rules")}>
            <CircleHelp size={17} />
            Le regole del tavolo
            <ArrowUpRight size={15} />
          </button>
        </div>
        <Tavolo onStats={updateStats} />
      </main>
      <footer className="site-footer">
        <span>
          <Cat size={16} /> Fatto con calma. E un po’ di pelo.
        </span>
        <span>
          Micio Club <i>·</i> Il tuo angolino per staccare <Coffee size={15} />
        </span>
      </footer>
      {modal === "rules" && (
        <Dialogo
          title="Poche regole. Una bella partita."
          onClose={() => setModal(null)}
        >
          <div className="rules-content">
            <p>
              La tua missione: imbucare il tuo gruppo, poi la palla 8 nella buca
              che hai dichiarato.
            </p>
            <ol>
              <li>
                <strong>Apri il tavolo.</strong> La spaccata deve imbucare una
                palla oppure mandare almeno quattro palle numerate a sponda. I
                gruppi restano aperti.
              </li>
              <li>
                <strong>Trova la tua squadra.</strong> La prima imbucata
                regolare dopo la spaccata assegna piene (1–7) o rigate (9–15).
                Imbuca una tua palla e continui.
              </li>
              <li>
                <strong>Occhio alla bianca.</strong> Devi colpire prima una tua
                palla e poi raggiungere una sponda o imbucare. Bianca in buca,
                contatto sbagliato o nessun contatto sono fallo: l’altro
                giocatore ha palla in mano.
              </li>
              <li>
                <strong>La 8 arriva alla fine.</strong> Dopo aver svuotato il
                tuo gruppo, scegli la buca nel menu. Imbucare la 8 in anticipo,
                con fallo o nella buca sbagliata fa perdere. Sulla spaccata la 8
                torna sul punto.
              </li>
            </ol>
            <h3>Il tuo tiro, a modo tuo</h3>
            <p>
              Clicca o tocca il panno per fissare la mira; tenendo premuto puoi
              regolarla con il puntatore. Afferra la stecca, trascinala indietro
              lungo la sua direzione e rilascia: più la arretri, più il colpo è
              potente. Esc annulla il caricamento. Da tastiera usa le frecce per
              la mira, Shift + frecce per la regolazione fine e Spazio per
              tirare con la potenza impostata. Puoi anche usare il pulsante Tira
              e il cursore di potenza. Le scorciatoie restano sospese mentre
              compili un campo o apri una finestra. Con palla in mano puoi
              scegliere un punto sul tavolo oppure le coordinate X/Z.
            </p>
            <p className="rules-variant">
              Variante ricreativa: chiami la buca solo per la 8; dopo un fallo
              la bianca è libera su tutto il tavolo. Niente effetti, salti o
              opzione di ripetere la spaccata.
            </p>
          </div>
        </Dialogo>
      )}
      {modal === "club" && (
        <Dialogo title="Il tuo angolo di club." onClose={() => setModal(null)}>
          <p>
            Ogni partita lascia il segno. Questi risultati sono salvati in
            questo browser.
          </p>
          <div className="club-stats">
            <div>
              <strong>{stats.giocate}</strong>
              <span>Partite concluse</span>
            </div>
            <div>
              <strong>{stats.vinte}</strong>
              <span>Vittorie</span>
            </div>
            <div>
              <strong>{stats.imbucate}</strong>
              <span>Palle imbucate</span>
            </div>
          </div>
          <p>
            {stats.giocate
              ? "Il tavolo è sempre pronto per la prossima."
              : "La tua storia al club comincia con la prima spaccata."}
          </p>
          <button className="primary-button" onClick={() => setModal(null)}>
            Torna a giocare <ArrowUpRight size={17} />
          </button>
        </Dialogo>
      )}
    </>
  );
}
