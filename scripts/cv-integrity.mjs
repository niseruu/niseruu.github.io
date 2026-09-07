import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const paths = { source: "cv/m-shafri-syamsuddin.tex", pdf: "public/docs/m-shafri-syamsuddin-cv.pdf" };
const manifest = "cv/build-manifest.json";

async function fingerprints(root) {
  const contents = await Promise.all(Object.values(paths).map(path => readFile(resolve(root, path))));
  return Object.fromEntries(Object.keys(paths).map((key, index) => [key, createHash("sha256").update(contents[index]).digest("hex")]));
}

export async function recordCvBuild(root) {
  await writeFile(resolve(root, manifest), JSON.stringify(await fingerprints(root), null, 2) + "\n");
}

export async function checkCvBuild(root) {
  const recorded = JSON.parse(await readFile(resolve(root, manifest), "utf8"));
  const actual = await fingerprints(root);
  if (recorded.source !== actual.source || recorded.pdf !== actual.pdf) {
    throw new Error("The CV source or PDF has changed since its last rebuild. Run npm run cv and commit the source, PDF, and cv/build-manifest.json together.");
  }
}
