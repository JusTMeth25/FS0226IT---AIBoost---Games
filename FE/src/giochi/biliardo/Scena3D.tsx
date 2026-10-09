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
  charge: number | null;
  gameId: number;
  canStrike: boolean;
  onCharge: (power: number | null) => void;
  onRelease: (power: number) => void;
  onPoint: (p: Vec2, click: boolean) => void;
};
export default function Scena3D(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<ReturnType<typeof creaScena> | null>(null);
  const handler = useRef({
    point: props.onPoint,
    charge: props.onCharge,
    release: props.onRelease,
  });
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    handler.current = {
      point: props.onPoint,
      charge: props.onCharge,
      release: props.onRelease,
    };
  }, [props.onPoint, props.onCharge, props.onRelease]);
  useEffect(() => {
    try {
      scene.current = creaScena(
        host.current!,
        (p, c) => handler.current.point(p, c),
        {
          onCharge: (p) => handler.current.charge(p),
          onRelease: (p) => handler.current.release(p),
        },
      );
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
    scene.current?.aim(
      props.angle,
      props.aiming,
      props.guide,
      props.skin,
      props.charge,
    );
  }, [
    props.balls,
    props.angle,
    props.aiming,
    props.guide,
    props.skin,
    props.charge,
  ]);
  useEffect(() => {
    scene.current?.interaction(props.canStrike, props.gameId);
  }, [props.canStrike, props.gameId]);
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
