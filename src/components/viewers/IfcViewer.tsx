"use client";

// ============================================================
// IfcViewer
// ------------------------------------------------------------
// Renderiza ficheros IFC sobre Three.js usando `web-ifc` (parser
// WASM mantenido por That Open Company / IFCJS).
//
// Estrategia idéntica a ThreeDViewer: cargamos web-ifc y three
// dinámicamente desde jsdelivr, sin meter dependencias npm.
// El WASM se sirve también desde el CDN (initWasmPath).
//
// Para .ifczip / .ifcxml — sólo soportamos el .ifc en texto.
// Si se sube un .ifczip, web-ifc no lo descomprime aún, así que
// mostramos un error con sugerencia de extraer.
// ============================================================

import { useEffect, useRef, useState } from "react";
import { extOf } from "@/lib/storage/constants";
import { Loader2 } from "lucide-react";

const THREE_VERSION = "0.171.0";
const THREE_BASE = `https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}`;
const WEB_IFC_VERSION = "0.0.69";
const WEB_IFC_BASE = `https://cdn.jsdelivr.net/npm/web-ifc@${WEB_IFC_VERSION}`;

function injectImportMap() {
  if (typeof window === "undefined") return;
  if (document.querySelector("script[data-three-import-map]")) return;
  const map = {
    imports: {
      three: `${THREE_BASE}/build/three.module.js`,
      "three/addons/": `${THREE_BASE}/examples/jsm/`,
      "web-ifc": `${WEB_IFC_BASE}/web-ifc-api.js`,
    },
  };
  const s = document.createElement("script");
  s.type = "importmap";
  s.dataset.threeImportMap = "1";
  s.textContent = JSON.stringify(map);
  document.head.appendChild(s);
}

export default function IfcViewer({
  url,
  filename,
}: {
  url: string;
  filename: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState("Inicializando…");

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | null = null;

    const ext = extOf(filename);
    if (ext === ".ifczip") {
      setError("Los ficheros .ifczip deben extraerse antes de visualizarse.");
      return;
    }
    if (ext === ".ifcxml") {
      setError("Los ficheros .ifcXML aún no están soportados — usa .ifc.");
      return;
    }

    (async () => {
      try {
        injectImportMap();
        const dynImport = new Function("u", "return import(u)") as (u: string) => Promise<any>;

        setLoading("Cargando librerías…");
        const THREE = await dynImport(`${THREE_BASE}/build/three.module.js`);
        const { OrbitControls } = await dynImport(
          `${THREE_BASE}/examples/jsm/controls/OrbitControls.js`
        );
        const webifc = await dynImport(`${WEB_IFC_BASE}/web-ifc-api.js`);
        const ifcAPI = new webifc.IfcAPI();
        ifcAPI.SetWasmPath(`${WEB_IFC_BASE}/`);
        await ifcAPI.Init();

        if (disposed || !containerRef.current) return;
        const container = containerRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0f172a);
        const camera = new THREE.PerspectiveCamera(50, width / height, 0.01, 5000);
        camera.position.set(20, 20, 20);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(width, height);
        container.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const dl = new THREE.DirectionalLight(0xffffff, 0.8);
        dl.position.set(50, 100, 50);
        scene.add(dl);
        scene.add(new THREE.GridHelper(50, 50, 0x334155, 0x1e293b));

        setLoading("Descargando IFC…");
        const res = await fetch(url);
        if (!res.ok) throw new Error("HTTP " + res.status);
        const buf = new Uint8Array(await res.arrayBuffer());

        setLoading("Parseando IFC…");
        const modelID = ifcAPI.OpenModel(buf);

        setLoading("Generando geometría…");
        const root = new THREE.Group();
        ifcAPI.StreamAllMeshes(modelID, (mesh: any) => {
          const placedGeoms = mesh.geometries;
          for (let i = 0; i < placedGeoms.size(); i++) {
            const placed = placedGeoms.get(i);
            const geom = ifcAPI.GetGeometry(modelID, placed.geometryExpressID);
            const verts = ifcAPI.GetVertexArray(geom.GetVertexData(), geom.GetVertexDataSize());
            const idx = ifcAPI.GetIndexArray(geom.GetIndexData(), geom.GetIndexDataSize());

            const bg = new THREE.BufferGeometry();
            // verts es interleaved [x,y,z, nx,ny,nz, ...]
            const positions = new Float32Array(verts.length / 2);
            const normals = new Float32Array(verts.length / 2);
            for (let v = 0, p = 0; v < verts.length; v += 6, p += 3) {
              positions[p] = verts[v];
              positions[p + 1] = verts[v + 1];
              positions[p + 2] = verts[v + 2];
              normals[p] = verts[v + 3];
              normals[p + 1] = verts[v + 4];
              normals[p + 2] = verts[v + 5];
            }
            bg.setAttribute("position", new THREE.BufferAttribute(positions, 3));
            bg.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
            bg.setIndex(new THREE.BufferAttribute(new Uint32Array(idx), 1));

            const c = placed.color;
            const mat = new THREE.MeshStandardMaterial({
              color: new THREE.Color(c.x, c.y, c.z),
              opacity: c.w,
              transparent: c.w < 1,
              metalness: 0.05,
              roughness: 0.7,
            });
            const m = new THREE.Mesh(bg, mat);
            const t = placed.flatTransformation;
            const mat4 = new THREE.Matrix4();
            mat4.fromArray(t);
            m.applyMatrix4(mat4);
            root.add(m);
          }
        });

        scene.add(root);
        ifcAPI.CloseModel(modelID);

        const box = new THREE.Box3().setFromObject(root);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const fov = camera.fov * (Math.PI / 180);
        const dist = (maxDim / 2) / Math.tan(fov / 2);
        camera.position.copy(center).add(new THREE.Vector3(dist, dist, dist).multiplyScalar(1.4));
        camera.lookAt(center);
        controls.target.copy(center);
        controls.update();

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
        };

        setLoading("");
      } catch (e: any) {
        console.error(e);
        if (!disposed) setError(e?.message || "Error cargando IFC");
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
          {loading}
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/90 p-6 text-center text-sm text-red-300">
          <p className="font-semibold">No se pudo cargar el IFC.</p>
          <p className="font-mono text-xs">{error}</p>
        </div>
      )}
    </div>
  );
}
