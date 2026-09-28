// Bundle + run the export-size verification script (PATH-independent).
import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const out = "node_modules/.cache/verify.mjs";
mkdirSync("node_modules/.cache", { recursive: true });

await build({
  entryPoints: ["scripts/verify.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: out,
  logLevel: "error",
});

const r = spawnSync(process.execPath, [out], { stdio: "inherit" });
process.exit(r.status ?? 1);
