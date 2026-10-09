import { useEffect, useRef, useState } from "react";
import { creaScena } from "./scena";
import type { StileStecca } from "./scena";
import type { Palla, Vec2 } from "./regole";
type Props = {
  balls: Palla[];
  angle: number;
  aiming: boolean;
  guide: boolean;
  top: boolean;
  skin: StileStecca;
  onPoint: (p: Vec2, click: boolean) => void;
};
export default function Scena3D(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<ReturnType<typeof creaScena> | null>(null);
  const handler = useRef(props.onPoint);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    handler.current = props.onPoint;
  }, [props.onPoint]);
  useEffect(() => {
    try {
      scene.current = creaScena(host.current!, (p, c) => handler.current(p, c));
    } catch {
      queueMicrotask(() => setFailed(true));
    }
    return () => {
      scene.current?.dispose();
      scene.current = null;
    };
  }, []);
  useEffect(() => {
    scene.current?.balls(props.balls);
    scene.current?.aim(props.angle, props.aiming, props.guide, props.skin);
  }, [props.balls, props.angle, props.aiming, props.guide, props.skin]);
  useEffect(() => {
    scene.current?.view(props.top);
  }, [props.top]);
  return (
    <div ref={host} className="scene-host">
      {failed && (
        <div className="webgl-error">
          <strong>Il tavolo 3D non è disponibile.</strong>
          <p>
            Abilita l’accelerazione hardware del browser e ricarica la pagina.
          </p>
          <button onClick={() => window.location.reload()}>
            Ricarica il tavolo
          </button>
        </div>
      )}
    </div>
  );
}
