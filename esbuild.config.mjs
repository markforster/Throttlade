import { context } from "esbuild";
import { cpSync, mkdirSync, existsSync, watch } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outdir = resolve(__dirname, "dist");
const extraWatchTargets = [resolve(__dirname, "src/theme/bootstrap.css")];

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
  safeCopy(
    resolve(__dirname, "src/html/popup.html"),
    resolve(outdir, "popup.html")
  );
  safeCopy(
    resolve(__dirname, "src/html/options.html"),
    resolve(outdir, "options.html")
  );
}

function setupExtraWatchers(ctx, files) {
  const watchers = new Map();
  let rebuilding = false;
  let queued = false;

  const triggerRebuild = () => {
    if (rebuilding) {
      queued = true;
      return;
    }
    rebuilding = true;
    ctx
      .rebuild()
      .catch((error) => {
        console.error("esbuild rebuild failed after extra watch change", error);
      })
      .finally(() => {
        rebuilding = false;
        if (queued) {
          queued = false;
          triggerRebuild();
        }
      });
  };

  const attachWatcher = (file) => {
    try {
      const watcher = watch(file, { persistent: true }, (eventType) => {
        if (eventType === "rename") {
          const active = watchers.get(file);
          if (active) {
            active.close();
            watchers.delete(file);
          }
          setTimeout(() => attachWatcher(file), 100);
        }
        triggerRebuild();
      });
      watcher.on("error", (error) => {
        console.error(`extra watch error for ${file}`, error);
      });
      watchers.set(file, watcher);
    } catch (error) {
      console.error(`failed to watch ${file}`, error);
    }
  };

  files.forEach((file) => {
    if (!existsSync(file)) {
      console.warn(`extra watch target not found: ${file}`);
      return;
    }
    attachWatcher(file);
  });

  return () => {
    for (const watcher of watchers.values()) {
      try {
        watcher.close();
      } catch (error) {
        console.error("error closing extra watcher", error);
      }
    }
    watchers.clear();
  };
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
    const disposeExtraWatchers = setupExtraWatchers(ctx, extraWatchTargets);
    const shutdown = () => {
      disposeExtraWatchers();
      ctx.dispose().catch((error) => {
        console.error("error disposing esbuild context", error);
      });
    };
    process.once("SIGINT", () => {
      shutdown();
      process.exit(0);
    });
    process.once("SIGTERM", shutdown);
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
})();
