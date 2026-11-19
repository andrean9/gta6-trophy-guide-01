// Leonida Trophy Guide — hand-in program (Node 22, standard library only).
//
// The guide itself is the plain static files in app/ beside this file: an
// offline checklist and tracker for the 55 GTA 6 trophies, opened at
// app/index.html. This program hands it in: it copies app/ and screenshots/
// into the output directory and writes dossier.json there, the summary the
// judge reads (the screenshots, the first load's files and bytes, and the
// source text), using the vendored make.fun library.
//
// vendor/makefun-frontend.ts is the kit's copy and must stay untouched: the
// scorer rebuilds the dossier with its own copy of the same library and
// compares the two byte for byte, so any change here would fail the gate.
//
// The program runs in the grader with /output as its destination. Outside
// the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-frontend.ts";

// The repository root: the directory this file lives in.
const REPO_ROOT = fileURLToPath(new URL(".", import.meta.url));

// Where the handed-in entry goes: the grader's /output, or the override
// the developer sets when running the program by hand.
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

// The scorer's own caps, from the kit's gate reference. Only
// text_max_bytes shapes the dossier's bytes; the rest refuse an entry the
// scorer would refuse anyway (more than 4 screenshots, or one over 256 KiB;
// app/ past 993 files and directories or 48 MiB in all).
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
};

function handIn() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // The app itself: every file under app/, copied as-is.
  cpSync(join(REPO_ROOT, "app"), join(OUTPUT_DIR, "app"), { recursive: true });

  // The screenshots, when the folder exists. The dossier builder expects
  // the directory to be there either way.
  mkdirSync(join(OUTPUT_DIR, "screenshots"), { recursive: true });
  const shotsDir = join(REPO_ROOT, "screenshots");
  if (existsSync(shotsDir)) {
    cpSync(shotsDir, join(OUTPUT_DIR, "screenshots"), { recursive: true });
  }

  // The dossier, built from what was just copied, so it always describes
  // the handed-in files exactly.
  writeFileSync(
    join(OUTPUT_DIR, "dossier.json"),
    buildDossier(OUTPUT_DIR, DOSSIER_CAPS),
  );
}

handIn();
