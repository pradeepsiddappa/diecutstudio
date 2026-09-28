// Bundle the TS test file with esbuild's Node API (PATH-independent), then run
// it with Node's built-in test runner.
import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const out = "node_modules/.cache/tests.mjs";
mkdirSync("node_modules/.cache", { recursive: true });

await build({
  entryPoints: ["tests/diecut.test.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: out,
  logLevel: "error",
});

// Run the file directly (not `node --test`, which skips node_modules paths).
// node:test auto-runs registered tests on execution and exits non-zero on fail.
const r = spawnSync(process.execPath, [out], { stdio: "inherit" });
process.exit(r.status ?? 1);
