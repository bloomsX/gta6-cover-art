// Vice Cover Studio — the program that hands this entry in.
//
// It runs on Node 22 with the standard library only, inside the grader's
// container (or locally, with MAKEFUN_OUTPUT_DIR standing in for /output).
// It copies the app's static files and the screenshots beside this file into
// the output directory, then writes /output/dossier.json: the summary the
// judge reads, built by the vendored make.fun library from the files it was
// just given. The program runs twice and must write identical bytes both
// times, so it does nothing time- or order-dependent here.
//
// Try it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// and serve the app itself with `node serve.ts` (http://localhost:8080).

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The whole app: static files only, no build step, works offline.
mkdirSync(outDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outDir, 'app'), { recursive: true });

// The screenshots, if they are there yet (an early run may not have them).
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The dossier, byte-identical to what buildDossier writes from these files:
// the gate rebuilds it and compares, so the caps here must match the gate's.
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
