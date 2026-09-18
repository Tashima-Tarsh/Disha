import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "node_modules/maplibre-gl/dist");
const target = path.join(root, "public/vendor/maplibre");
await fs.mkdir(target, { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  await fs.copyFile(path.join(source, file), path.join(target, file));
}
console.info(JSON.stringify({ type: "maplibre_assets", status: "ready", target }));
