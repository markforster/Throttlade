import { context } from "esbuild";
import { cpSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outdir = resolve(__dirname, "dist");

function safeCopy(src, dest, opts = {}) {
  if (existsSync(src))
    cpSync(src, dest, { recursive: true, force: true, ...opts });
}

function copyStatic() {
  mkdirSync(outdir, { recursive: true });
  safeCopy(
    resolve(__dirname, "manifest.json"),
    resolve(outdir, "manifest.json")
  );
  safeCopy(resolve(__dirname, "public"), outdir); // now optional
  safeCopy(resolve(__dirname, "src/popup.html"), resolve(outdir, "popup.html"));
  safeCopy(
    resolve(__dirname, "src/options.html"),
    resolve(outdir, "options.html")
  );
}

/** @type {Record<string, import('esbuild').Loader>} */
const loaders = { ".svg": "file" };

const common = {
  bundle: true,
  sourcemap: true,
  target: "es2022",
  outdir,
  format: "esm",
  logLevel: "info",
  entryPoints: {
    background: "src/background.ts",
    content: "src/content.ts",
    "content-bridge": "src/content-bridge.ts",
    inpage: "src/inpage.ts",
    popup: "src/popup.tsx",
    options: "src/options.tsx",
  },
  loader: loaders,
};

const isWatch = process.argv.includes("--watch");

(async () => {
  copyStatic();
  const ctx = await context({
    ...common,
    plugins: [
      {
        name: "copy-static",
        setup(build) {
          build.onStart(() => copyStatic());
        },
      },
    ],
  });
  if (isWatch) {
    console.log("esbuild watching…");
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
})();
