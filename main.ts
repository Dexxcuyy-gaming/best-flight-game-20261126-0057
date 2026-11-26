// Sunset Isles — Island Hopper: the hand-in program (Node 22, stdlib only).
// It copies game/ and screenshots/ from beside this file into the output
// directory and writes dossier.json there — the summary the judge reads —
// using the vendored make.fun game library. Outside the grader,
// MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's caps for this bounty (see the kit's RULES.txt): at most
// 4 screenshots of 256 KiB each, game/ at most 993 files and 48 MiB,
// no path under game/ longer than 1000 bytes. The program is run twice
// and both runs must write the same bytes, so it copies and writes only
// — it never reads the clock, the network or anything outside this repo.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function copyTree(name) {
  const from = join(repoRoot, name);
  if (!existsSync(from)) return;
  cpSync(from, join(outDir, name), { recursive: true });
}

mkdirSync(outDir, { recursive: true });
copyTree('game');
copyTree('screenshots');
writeFileSync(join(outDir, 'dossier.json'), buildDossier(outDir, DOSSIER_CAPS));
