import { mkdtemp, rm, copyFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "cv/m-shafri-syamsuddin.tex");
const destination = resolve(root, "public/docs/m-shafri-syamsuddin-cv.pdf");

function available(command) {
  const result = spawnSync("which", [command], { encoding: "utf8" });
  if (result.status === 0) return result.stdout.trim();

  // Cargo-installed tools are intentionally supported without requiring a
  // system-wide install or an interactive sudo prompt.
  const userLocalCommand = resolve(homedir(), ".cargo", "bin", command);
  return existsSync(userLocalCommand) ? userLocalCommand : "";
}

const latexmk = available("latexmk");
const pdflatex = available("pdflatex");
const tectonic = available("tectonic");

if (!latexmk && !pdflatex && !tectonic) {
  console.error(
    "CV rebuild requires a LaTeX toolchain (latexmk, pdflatex, or tectonic). Install one, then run npm run cv again.",
  );
  process.exitCode = 1;
} else {
  const outputDirectory = await mkdtemp(resolve(tmpdir(), "shafri-cv-"));
  try {
    const args = latexmk
      ? ["-pdf", "-interaction=nonstopmode", "-halt-on-error", `-outdir=${outputDirectory}`, source]
      : pdflatex
        ? ["-interaction=nonstopmode", "-halt-on-error", `-output-directory=${outputDirectory}`, source]
        : ["--outdir", outputDirectory, "--reruns", "1", source];
    const command = latexmk || pdflatex || tectonic;
    const passes = latexmk || tectonic ? 1 : 2;

    for (let pass = 0; pass < passes; pass += 1) {
      const result = spawnSync(command, args, { cwd: root, stdio: "inherit" });
      if (result.status !== 0) process.exit(result.status ?? 1);
    }

    const generated = resolve(outputDirectory, "m-shafri-syamsuddin.pdf");
    await copyFile(generated, destination);
    console.log(`CV written to ${destination}`);
  } finally {
    await rm(outputDirectory, { recursive: true, force: true });
  }
}
