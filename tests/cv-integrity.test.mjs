import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkCvBuild, recordCvBuild } from "../scripts/cv-integrity.mjs";

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "cv-integrity-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "cv"));
  await mkdir(join(root, "public/docs"), { recursive: true });
  await writeFile(join(root, "cv/m-shafri-syamsuddin.tex"), "original source");
  await writeFile(join(root, "public/docs/m-shafri-syamsuddin-cv.pdf"), "original PDF");
  await recordCvBuild(root);
  return root;
}

test("a recorded CV build passes without requiring LaTeX on the deployment host", async t => {
  await assert.doesNotReject(checkCvBuild(await fixture(t)));
});
test("changing the CV source while keeping the old PDF blocks deployment", async t => {
  const root = await fixture(t);
  await writeFile(join(root, "cv/m-shafri-syamsuddin.tex"), "updated experience");
  await assert.rejects(checkCvBuild(root), /Run npm run cv/);
});
test("replacing the downloadable PDF also blocks deployment", async t => {
  const root = await fixture(t);
  await writeFile(join(root, "public/docs/m-shafri-syamsuddin-cv.pdf"), "stale PDF");
  await assert.rejects(checkCvBuild(root), /Run npm run cv/);
});
test("recording the rebuilt source and PDF restores a valid build", async t => {
  const root = await fixture(t);
  await writeFile(join(root, "cv/m-shafri-syamsuddin.tex"), "updated source");
  await writeFile(join(root, "public/docs/m-shafri-syamsuddin-cv.pdf"), "rebuilt PDF");
  await recordCvBuild(root);
  await assert.doesNotReject(checkCvBuild(root));
});
