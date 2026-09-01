import { mkdtemp, rm, copyFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "cv/m-shafri-syamsuddin.tex");
const destination = resolve(root, "public/docs/m-shafri-syamsuddin-cv.pdf");

function available(command) {
  const result = spawnSync("which", [command], { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : "";
}

const latexmk = available("latexmk");
const pdflatex = available("pdflatex");

if (!latexmk && !pdflatex) {
  console.error(
    "CV rebuild requires a LaTeX toolchain (latexmk or pdflatex). Install one, then run npm run cv again.",
  );
  process.exitCode = 1;
} else {
  const outputDirectory = await mkdtemp(resolve(tmpdir(), "shafri-cv-"));
  try {
    const args = latexmk
      ? ["-pdf", "-interaction=nonstopmode", "-halt-on-error", `-outdir=${outputDirectory}`, source]
      : ["-interaction=nonstopmode", "-halt-on-error", `-output-directory=${outputDirectory}`, source];
    const command = latexmk || pdflatex;
    const passes = latexmk ? 1 : 2;

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
