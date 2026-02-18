import { build } from "esbuild";
import fs from "fs";
import path from "path";
import JavaScriptObfuscator from "javascript-obfuscator";

const outDir = "app-prod";
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

// IMPORTANT:
// - "electron" MUST stay external, otherwise esbuild bundles the npm "electron" package (bad).
// - nut-js should stay external too (it has native deps/binaries).
const EXTERNAL = ["electron", "@nut-tree-fork/nut-js"];

await build({
  entryPoints: ["src/main/main.js"],
  bundle: true,
  platform: "node",
  target: "node18",
  minify: true,
  external: EXTERNAL,
  outfile: `${outDir}/main.js`,
});

await build({
  entryPoints: ["src/main/preload.js"],
  bundle: true,
  platform: "node",
  target: "node18",
  minify: true,
  external: ["electron"],
  outfile: `${outDir}/preload.js`,
});

await build({
  entryPoints: ["src/renderer/renderer.js"],
  bundle: true,
  platform: "browser",
  target: "es2020",
  minify: true,
  outfile: `${outDir}/renderer.js`,
});

let html = fs.readFileSync("src/renderer/index.html", "utf8");
html = html.replace(/\.\/renderer\.js/g, "./renderer.js");
fs.writeFileSync(`${outDir}/index.html`, html);

const filesToObfuscate = ["main.js", "preload.js", "renderer.js"];
for (const f of filesToObfuscate) {
  const p = path.join(outDir, f);
  const code = fs.readFileSync(p, "utf8");

  const obfuscated = JavaScriptObfuscator.obfuscate(code, {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.75,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.25,
    stringArray: true,
    stringArrayThreshold: 0.75,
    simplify: true,
    renameGlobals: false,
    sourceMap: false,
  }).getObfuscatedCode();

  fs.writeFileSync(p, obfuscated);
}

console.log("✅ Production bundle built into /app-prod (minified + obfuscated).");
