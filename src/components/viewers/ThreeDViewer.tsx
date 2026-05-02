"use client";

// ============================================================
// ThreeDViewer
// ------------------------------------------------------------
// Soporta: .obj, .stl, .gltf, .glb, .ply
// Three.js + el loader correspondiente se cargan dinámicamente
// desde un import de la versión esm de unpkg/jsdelivr a través
// de un import map inyectado al primer uso.
//
// Por qué dynamic import y no dependencia npm:
//   - Three.js es ~700 KB y sus loaders viven en `examples/jsm`,
//     que requiere bundler con tree-shaking + alias. Al hacerlo
//     dinámicamente evitamos inflar el bundle base de la app y
//     mantenemos cero dependencias nuevas en package.json.
// ============================================================

import { useEffect, useRef, useState } from "react";
import { bareExt } from "./utils";
import { Loader2 } from "lucide-react";

const THREE_VERSION = "0.171.0";
const THREE_BASE = `https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}`;

// Import map para resolver "three" desde los loaders ESM.
function injectImportMap() {
  if (typeof window === "undefined") return;
  if (document.querySelector("script[data-three-import-map]")) return;
  const map = {
    imports: {
      three: `${THREE_BASE}/build/three.module.js`,
      "three/addons/": `${THREE_BASE}/examples/jsm/`,
    },
  };
  const s = document.createElement("script");
  s.type = "importmap";
  s.dataset.threeImportMap = "1";
  s.textContent = JSON.stringify(map);
  document.head.appendChild(s);
}

export default function ThreeDViewer({
  url,
  filename,
}: {
  url: string;
  filename: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | null = null;

    (async () => {
      try {
        injectImportMap();
        // Importamos vía Function() para que el bundler de Next/webpack
        // NO intente resolver "three" en build time.
        const dynImport = new Function("u", "return import(u)") as (
          u: string
        ) => Promise<any>;

        const THREE = await dynImport(`${THREE_BASE}/build/three.module.js`);
        const { OrbitControls } = await dynImport(
          `${THREE_BASE}/examples/jsm/controls/OrbitControls.js`
        );

        const ext = bareExt(filename);
        const loader = await getLoader(ext, dynImport);

        if (disposed || !containerRef.current) return;
        const container = containerRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0f172a); // slate-900
        const camera = new THREE.PerspectiveCamera(50, width / height, 0.01, 5000);
        camera.position.set(5, 5, 5);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(width, height);
        container.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const dir = new THREE.DirectionalLight(0xffffff, 0.8);
        dir.position.set(10, 20, 10);
        scene.add(dir);

        const grid = new THREE.GridHelper(20, 20, 0x334155, 0x1e293b);
        scene.add(grid);

        // Carga del modelo
        const obj = await loadModel(loader, ext, url, THREE);
        if (disposed) {
          renderer.dispose();
          return;
        }
        scene.add(obj);

        // Encuadrar el modelo
        frameObject(camera, controls, obj, THREE);

        let raf = 0;
        const animate = () => {
          raf = requestAnimationFrame(animate);
          controls.update();
          renderer.render(scene, camera);
        };
        animate();

        const onResize = () => {
          const w = container.clientWidth;
          const h = container.clientHeight;
          renderer.setSize(w, h);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        };
        window.addEventListener("resize", onResize);

        cleanup = () => {
          cancelAnimationFrame(raf);
          window.removeEventListener("resize", onResize);
          controls.dispose();
          renderer.dispose();
          renderer.domElement.remove();
          scene.traverse((o: any) => {
            if (o.geometry) o.geometry.dispose?.();
            if (o.material) {
              if (Array.isArray(o.material)) o.material.forEach((m: any) => m.dispose?.());
              else o.material.dispose?.();
            }
          });
        };

        setLoading(false);
      } catch (e: any) {
        console.error(e);
        if (!disposed) setError(e?.message || "Error cargando el modelo 3D");
        setLoading(false);
      }
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [url, filename]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 text-slate-300">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Cargando modelo 3D…
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/90 p-6 text-center text-sm text-red-300">
          <p className="font-semibold">No se pudo cargar el modelo.</p>
          <p className="font-mono text-xs">{error}</p>
        </div>
      )}
    </div>
  );
}

async function getLoader(
  ext: string,
  dynImport: (u: string) => Promise<any>
): Promise<any> {
  switch (ext) {
    case "stl": {
      const { STLLoader } = await dynImport(`${THREE_BASE}/examples/jsm/loaders/STLLoader.js`);
      return new STLLoader();
    }
    case "obj": {
      const { OBJLoader } = await dynImport(`${THREE_BASE}/examples/jsm/loaders/OBJLoader.js`);
      return new OBJLoader();
    }
    case "gltf":
    case "glb": {
      const { GLTFLoader } = await dynImport(`${THREE_BASE}/examples/jsm/loaders/GLTFLoader.js`);
      return new GLTFLoader();
    }
    case "ply": {
      const { PLYLoader } = await dynImport(`${THREE_BASE}/examples/jsm/loaders/PLYLoader.js`);
      return new PLYLoader();
    }
    default:
      throw new Error("Formato no soportado: ." + ext);
  }
}

function loadModel(
  loader: any,
  ext: string,
  url: string,
  THREE: any
): Promise<any> {
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (data: any) => {
        // Cada loader devuelve algo distinto: lo normalizamos a Object3D.
        if (ext === "stl" || ext === "ply") {
          const mat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, metalness: 0.1, roughness: 0.6 });
          const mesh = new THREE.Mesh(data, mat);
          mesh.geometry.computeVertexNormals?.();
          resolve(mesh);
        } else if (ext === "gltf" || ext === "glb") {
          resolve(data.scene || data.scenes?.[0]);
        } else if (ext === "obj") {
          resolve(data);
        } else {
          resolve(data);
        }
      },
      undefined,
      (err: any) => reject(err)
    );
  });
}

function frameObject(camera: any, controls: any, obj: any, THREE: any) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const fov = camera.fov * (Math.PI / 180);
  const dist = (maxDim / 2) / Math.tan(fov / 2);
  camera.position.copy(center).add(new THREE.Vector3(dist, dist, dist).multiplyScalar(1.4));
  camera.lookAt(center);
  controls.target.copy(center);
  controls.update();
}
