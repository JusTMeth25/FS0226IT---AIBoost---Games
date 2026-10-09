import * as THREE from "three";
import { BUCHE, COLORI, R } from "./regole.ts";
import type { Palla, Vec2 } from "./regole.ts";

export type StileStecca = "sakura" | "tiger" | "noir";
const skins = {
  sakura: ["#edd8bf", "#ba6474"],
  tiger: ["#bd7e43", "#423127"],
  noir: ["#293732", "#c6a56a"],
};

function paw(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y + size * 0.15, size * 0.3, size * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const [dx, dy] of [
    [-0.32, -0.18],
    [-0.12, -0.4],
    [0.14, -0.4],
    [0.34, -0.16],
  ]) {
    ctx.beginPath();
    ctx.ellipse(
      x + dx * size,
      y + dy * size,
      size * 0.12,
      size * 0.16,
      dx,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
}
function texture(
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  w = 512,
  h = 256,
) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext("2d")!, w, h);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function ballTexture(id: number) {
  return texture((ctx, w, h) => {
    ctx.fillStyle = id > 8 || id === 0 ? "#fff8e8" : COLORI[id];
    ctx.fillRect(0, 0, w, h);
    if (id > 8) {
      ctx.fillStyle = COLORI[id - 8];
      ctx.fillRect(0, h * 0.25, w, h * 0.5);
    }
    if (id)
      for (const x of [w * 0.25, w * 0.75]) {
        ctx.fillStyle = "#fff8eb";
        ctx.beginPath();
        ctx.arc(x, h / 2, 38, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#292922";
        ctx.font = "bold 45px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(id), x, h / 2 + 2);
      }
    paw(ctx, w * 0.5, h * 0.5, 28, id === 0 ? "#c5a591" : "#ffffffa0");
  });
}

export function creaScena(
  host: HTMLDivElement,
  onPoint: (p: Vec2, click: boolean) => void,
) {
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute(
    "aria-label",
    "Tavolo da biliardo 3D. Muovi il puntatore per mirare e usa il pulsante Tira.",
  );
  renderer.domElement.setAttribute("role", "img");
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 80);
  let top = false;
  const hemi = new THREE.HemisphereLight("#fff8e9", "#53644f", 2);
  scene.add(hemi);
  const light = new THREE.DirectionalLight("#fff7e6", 2.4);
  light.position.set(-3, 10, 3);
  light.castShadow = true;
  light.shadow.mapSize.set(2048, 2048);
  light.shadow.camera.left = -8;
  light.shadow.camera.right = 8;
  light.shadow.camera.top = 7;
  light.shadow.camera.bottom = -7;
  light.shadow.normalBias = 0.02;
  scene.add(light);
  const mat = (color: string, roughness = 0.55, metalness = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const woodTexture = texture((ctx, w, h) => {
    ctx.fillStyle = "#674733";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 100; i++) {
      ctx.strokeStyle = i % 2 ? "#a5764c33" : "#271e1933";
      ctx.lineWidth = 1 + (i % 3);
      ctx.beginPath();
      ctx.moveTo(0, (i * h) / 100);
      ctx.bezierCurveTo(
        w * 0.3,
        (i * h) / 100 + 7,
        w * 0.7,
        (i * h) / 100 - 9,
        w,
        (i * h) / 100,
      );
      ctx.stroke();
    }
  });
  const wood = new THREE.MeshStandardMaterial({
    map: woodTexture,
    roughness: 0.4,
  });
  const dark = mat("#302921"),
    green = mat("#28674f", 0.98),
    gold = mat("#bca16d", 0.3, 0.7);
  function box(
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    material: THREE.Material,
  ) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }
  box(11.2, 0.57, 6.2, 0, -0.43, 0, dark);
  box(11.05, 0.12, 6.05, 0, -0.14, 0, gold);
  box(10.95, 0.2, 5.95, 0, -0.05, 0, wood);
  const clothTex = texture((ctx, w, h) => {
    ctx.fillStyle = "#39735d";
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        ctx.fillStyle = (x * 73 + y * 137) % 7 < 3 ? "#ffffff04" : "#00000004";
        ctx.fillRect(x, y, 1, 1);
      }
  });
  const cloth = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 5),
    new THREE.MeshStandardMaterial({ map: clothTex, roughness: 1 }),
  );
  cloth.rotation.x = -Math.PI / 2;
  cloth.position.y = 0.06;
  cloth.receiveShadow = true;
  scene.add(cloth);
  for (const z of [-2.76, 2.76]) {
    for (const x of [-2.5, 2.5]) {
      box(4.42, 0.22, 0.38, x, 0.16, z, wood);
      box(4.42, 0.16, 0.19, x, 0.15, Math.sign(z) * 2.49, green);
    }
    for (const x of [-3.7, -2.4, -1.1, 1.1, 2.4, 3.7]) {
      const inlay = box(0.055, 0.012, 0.08, x, 0.278, z, gold);
      inlay.rotation.y = Math.PI / 4;
    }
  }
  for (const x of [-5.25, 5.25]) {
    box(0.4, 0.22, 4.35, x, 0.16, 0, wood);
    box(0.19, 0.16, 4.35, Math.sign(x) * 4.99, 0.15, 0, green);
  }
  for (const pocket of BUCHE) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.267, 0.045, 12, 32),
      gold,
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(pocket.x, 0.092, pocket.z);
    scene.add(ring);
    const hole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.257, 0.2, 0.12, 32),
      mat("#121c17", 1),
    );
    hole.position.set(pocket.x, 0.045, pocket.z);
    scene.add(hole);
  }
  for (const x of [-4.5, 4.5])
    for (const z of [-2, 2]) {
      box(0.4, 0.65, 0.4, x, -0.94, z, dark);
      box(0.42, 0.09, 0.42, x, -1.23, z, gold);
    }
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.ShadowMaterial({ opacity: 0.18 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.3;
  shadow.receiveShadow = true;
  scene.add(shadow);
  const crestTex = texture((ctx, w, h) => {
    paw(ctx, w / 2, h * 0.4, 90, "#dbecce26");
    ctx.font = "22px Georgia";
    ctx.textAlign = "center";
    ctx.fillStyle = "#dbecce33";
    ctx.fillText("MICIO CLUB", w / 2, h * 0.82);
  });
  const crest = new THREE.Mesh(
    new THREE.PlaneGeometry(2.3, 1.15),
    new THREE.MeshBasicMaterial({
      map: crestTex,
      transparent: true,
      depthWrite: false,
    }),
  );
  crest.rotation.x = -Math.PI / 2;
  crest.position.set(0, 0.064, 0);
  scene.add(crest);
  const ballMeshes = new Map<number, THREE.Mesh>();
  for (let id = 0; id < 16; id++) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(R, 32, 24),
      new THREE.MeshStandardMaterial({
        map: ballTexture(id),
        roughness: 0.2,
        metalness: 0.05,
      }),
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    ballMeshes.set(id, mesh);
  }
  const cueGroup = new THREE.Group();
  scene.add(cueGroup);
  const cueShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.05, 3.5, 16),
    mat("#d9b78c", 0.35),
  );
  cueShaft.rotation.z = Math.PI / 2;
  cueShaft.position.x = -2.05;
  cueGroup.add(cueShaft);
  const gripTexture = texture((ctx, w, h) => {
    ctx.fillStyle = "#b76c78";
    ctx.fillRect(0, 0, w, h);
    for (let x = 30; x < w; x += 80) paw(ctx, x, h / 2, 40, "#f6e5d1");
  });
  const gripMaterial = new THREE.MeshStandardMaterial({
    map: gripTexture,
    roughness: 0.7,
  });
  const grip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.043, 0.052, 1.05, 16),
    gripMaterial,
  );
  grip.rotation.z = Math.PI / 2;
  grip.position.x = -3.28;
  cueGroup.add(grip);
  const tip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.024, 0.024, 0.065, 12),
    mat("#5b9b92"),
  );
  tip.rotation.z = Math.PI / 2;
  tip.position.x = -0.29;
  cueGroup.add(tip);
  const lineGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(),
    new THREE.Vector3(1, 0, 0),
  ]);
  const line = new THREE.Line(
    lineGeometry,
    new THREE.LineDashedMaterial({
      color: "#f9f0cc",
      dashSize: 0.12,
      gapSize: 0.08,
      transparent: true,
      opacity: 0.72,
    }),
  );
  scene.add(line);
  const targetRing = new THREE.Mesh(
    new THREE.RingGeometry(R * 0.9, R, 32),
    new THREE.MeshBasicMaterial({
      color: "#f7eacb",
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
    }),
  );
  targetRing.rotation.x = -Math.PI / 2;
  scene.add(targetRing);
  let currentBalls: Palla[] = [];
  const resize = () => {
    const { width, height } = host.getBoundingClientRect(),
      aspect = width / Math.max(height, 1);
    const distance =
      Math.max(top ? 6.8 : 5.9, 14.4 / aspect) / (2 * Math.tan(Math.PI / 10));
    camera.aspect = aspect;
    camera.position.copy(
      new THREE.Vector3(top ? 0 : 0.065, top ? 1 : 0.79, top ? 0.001 : 0.61)
        .normalize()
        .multiplyScalar(distance),
    );
    camera.lookAt(0, -0.15, 0);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    renderer.render(scene, camera);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  const raycaster = new THREE.Raycaster(),
    plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.2);
  const pointer = (event: PointerEvent, click: boolean) => {
    const rect = renderer.domElement.getBoundingClientRect();
    raycaster.setFromCamera(
      new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1,
      ),
      camera,
    );
    const hit = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
    if (hit) onPoint({ x: hit.x, z: hit.z }, click);
  };
  const move = (e: PointerEvent) => pointer(e, false),
    click = (e: PointerEvent) => pointer(e, true);
  renderer.domElement.addEventListener("pointermove", move);
  renderer.domElement.addEventListener("pointerdown", click);
  resize();
  return {
    balls(balls: Palla[]) {
      currentBalls = balls;
      for (const ball of balls) {
        const mesh = ballMeshes.get(ball.id)!;
        const dx = ball.x - mesh.position.x,
          dz = ball.z - mesh.position.z;
        if (Math.abs(dx) + Math.abs(dz) < 1) {
          mesh.rotation.z -= dx / R;
          mesh.rotation.x += dz / R;
        }
        mesh.position.set(ball.x, R + 0.067, ball.z);
        mesh.visible = !ball.pocketed;
      }
      renderer.render(scene, camera);
    },
    aim(angle: number, visible: boolean, guide: boolean, skin: StileStecca) {
      const cue = currentBalls.find((b) => b.id === 0);
      cueGroup.visible = visible;
      line.visible = visible && guide;
      targetRing.visible = visible && guide;
      if (cue) {
        cueGroup.position.set(cue.x, 0.21, cue.z);
        cueGroup.rotation.y = -angle;
        cueGroup.rotation.z = -0.045;
        let length = 3.5;
        // La guida si ferma al primo ostacolo; non promette un'imbucata.
        for (let t = 0.1; t < 5; t += 0.035) {
          const x = cue.x + Math.cos(angle) * t,
            z = cue.z + Math.sin(angle) * t;
          if (
            Math.abs(x) > 4.85 ||
            Math.abs(z) > 2.35 ||
            currentBalls.some(
              (b) =>
                b.id && !b.pocketed && Math.hypot(x - b.x, z - b.z) < R * 2,
            )
          ) {
            length = t;
            break;
          }
        }
        line.geometry.setFromPoints([
          new THREE.Vector3(cue.x, 0.205, cue.z),
          new THREE.Vector3(
            cue.x + Math.cos(angle) * length,
            0.205,
            cue.z + Math.sin(angle) * length,
          ),
        ]);
        line.computeLineDistances();
        targetRing.position.set(
          cue.x + Math.cos(angle) * length,
          0.07,
          cue.z + Math.sin(angle) * length,
        );
      }
      const [shaft, handle] = skins[skin];
      (cueShaft.material as THREE.MeshStandardMaterial).color.set(shaft);
      gripMaterial.color.set(handle);
      renderer.render(scene, camera);
    },
    view(value: boolean) {
      top = value;
      resize();
    },
    dispose() {
      observer.disconnect();
      renderer.domElement.removeEventListener("pointermove", move);
      renderer.domElement.removeEventListener("pointerdown", click);
      const materials = new Set<THREE.Material>(),
        textures = new Set<THREE.Texture>();
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        mesh.geometry?.dispose();
        if (mesh.material)
          for (const m of Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material])
            materials.add(m);
      });
      materials.forEach((m) => {
        for (const value of Object.values(m))
          if (value instanceof THREE.Texture) textures.add(value);
        m.dispose();
      });
      textures.forEach((t) => t.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
