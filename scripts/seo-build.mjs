// Bundle + run the build-time SEO generator (PATH-independent), mirroring
// scripts/verify.mjs. esbuild bundles the TS (which imports the model registry)
// into a node ESM file, then we run it against the freshly-built dist/.
import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const out = "node_modules/.cache/seo-gen.mjs";
mkdirSync("node_modules/.cache", { recursive: true });

await build({
  entryPoints: ["scripts/seo-gen.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: out,
  logLevel: "error",
});

const r = spawnSync(process.execPath, [out], { stdio: "inherit" });
process.exit(r.status ?? 1);
