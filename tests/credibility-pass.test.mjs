import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { access } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (relative) => readFile(new URL(relative, root), "utf8");

test("the loader is opt-in so content remains visible when JavaScript fails", async () => {
  const layout = await read("src/layouts/BaseLayout.astro");
  const css = await read("src/styles/global.css");
  const script = await read("src/scripts/site.ts");

  assert.doesNotMatch(layout, /document\.documentElement\.classList\.add\("has-js"\)/);
  assert.match(css, /\.site-loader\s*\{[^}]*display:\s*none/);
  assert.match(css, /\.has-js\s+\.site-loader\.is-active\s*\{[^}]*display:\s*block/);
  assert.match(script, /document\.documentElement\.classList\.add\("has-js"\)/);
  assert.match(script, /loader\.classList\.add\([^)]*"is-active"/);
  assert.match(script, /loader\.classList\.remove\([^)]*"is-active"/);
});

test("the canonical profile identity is reused by the homepage metadata and hero", async () => {
  const profile = await read("src/data/profile.ts");
  const layout = await read("src/layouts/BaseLayout.astro");
  const index = await read("src/pages/index.astro");
  const hero = await read("src/components/Hero.astro");

  assert.match(profile, /canonicalTitle:\s*"Computer Vision & NLP Engineer"/);
  assert.match(layout, /profile\.canonicalTitle|canonicalTitle/);
  assert.match(index, /profile\.canonicalTitle/);
  assert.match(hero, /profile\.canonicalTitle/);
});

test("the CV summary uses the same canonical title as the site profile", async () => {
  const profile = await read("src/data/profile.ts");
  const cv = await read("cv/m-shafri-syamsuddin.tex");
  const title = profile.match(/canonicalTitle:\s*\"([^\"]+)\"/)?.[1];

  assert.ok(title, "profile.canonicalTitle should be declared");
  const escapedTitle = title.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&").replace("&", "\\\\&");
  assert.match(cv, new RegExp(escapedTitle));
});

test("the confidential enterprise experience keeps the employer and omits internal product names", async () => {
  const journey = await read("src/data/journey.ts");
  const cv = await read("cv/m-shafri-syamsuddin.tex");
  const project = await read("src/content/projects/enterprise-ai-platform.mdx");
  const readme = await read("README.md");

  assert.match(journey, /Jan 2026 - Present/);
  assert.match(journey, /AssistX Enterprise/);
  assert.match(journey, /VLM\/PDF ingestion|structured extraction/);
  assert.match(cv, /AI Platform Engineering.*Jan 2026 -- Present/s);
  assert.match(cv, /AssistX Enterprise/);
  assert.match(cv, /enterprise RAG.*agent-ingestion platform/);
  assert.match(cv, /tenant-scoped RFM\/persona segmentation/);
  assert.match(project, /Confidential/);
  assert.match(project, /RAG|intelligent document processing|customer intelligence/i);
  assert.match(project, /links:\s*\[\]/);
  assert.match(readme, /Confidential work/);
  assert.match(readme, /Git history is not a secrecy boundary/);

  for (const source of [journey, cv, project]) {
    assert.doesNotMatch(source, /AssistX Suite|Papyrus|CIPF/);
  }
});

test("project metric slots contain measurements or concrete deliverables, not filler labels", async () => {
  const sources = await Promise.all([
    read("src/content/projects/malaria-parasite-detection.mdx"),
    read("src/content/projects/visionserve-cifar10-api.mdx"),
    read("src/content/projects/zero-shot-sentiment-pipeline.mdx"),
  ]);
  const combined = sources.join("\n");

  assert.doesNotMatch(combined, /value:\s*"1"/);
  assert.doesNotMatch(combined, /value:\s*"CPU"/);
  assert.doesNotMatch(combined, /value:\s*"Zero-shot"/);
  assert.doesNotMatch(combined, /value:\s*"Config"/);
});

test("the contact panel does not advertise table-stakes encryption", async () => {
  const contact = await read("src/components/Contact.astro");
  assert.doesNotMatch(contact, /ENCRYPTION\s*\/\/\s*TLS/);
});

test("CV rebuild path and unresolved biography decisions are documented", async () => {
  const packageJson = await read("package.json");
  const readme = await read("README.md");
  const questions = await read("OPEN-QUESTIONS.md");

  assert.match(packageJson, /"cv"\s*:/);
  assert.match(readme, /npm run cv/);
  assert.match(readme, /LaTeX|latexmk|pdflatex/i);
  assert.match(questions, /Semarang|Jakarta/);
  assert.match(questions, /Nanjing Xiaozhuang|3\.68/);
  assert.match(questions, /JIWANA|Product Lead|CEO/);
  assert.match(questions, /mobile number|phone/i);
});

test("the CV keeps a clearly labelled ATS-friendly skills section", async () => {
  const cv = await read("cv/m-shafri-syamsuddin.tex");
  assert.match(cv, /\\section\*\{Skills\}/);
  assert.match(cv, /Programming\s*\\&\s*ML/);
});

test("the CV build script is present", async () => {
  await access(new URL("scripts/build-cv.mjs", root));
});
