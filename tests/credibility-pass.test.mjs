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

  assert.match(profile, /canonicalTitle:\s*"AI Engineer"/);
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

test("the enterprise experience keeps the employer and uses public AssistX Suite context", async () => {
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
  assert.match(project, /assistx-enterprise-logo\.png/);
  assert.match(project, /assistxenterprise\.ai\/product\/assistx-suite/);
  assert.match(project, /analyzes document structure.*classifies inputs.*extracts validated fields.*automates downstream workflows/is);
  assert.doesNotMatch(project, /cifar-confusion/i);
  assert.match(readme, /Confidential work/);
  assert.match(readme, /Git history is not a secrecy boundary/);

  for (const source of [journey, cv]) {
    assert.doesNotMatch(source, /Papyrus|CIPF/);
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

test("project copy does not overclaim model calibration or non-metric counts", async () => {
  const visionServe = await read("src/content/projects/visionserve-cifar10-api.mdx");
  const sentiment = await read("src/content/projects/zero-shot-sentiment-pipeline.mdx");

  assert.doesNotMatch(visionServe, /confidence-calibrated/i);
  assert.doesNotMatch(visionServe, /predictions are confidence-calibrated/i);
  assert.match(visionServe, /class probabilities and confidence scores/i);
  assert.doesNotMatch(sentiment, /value:\s*"0"/);
  assert.doesNotMatch(sentiment, /value:\s*"3"/);
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
  assert.match(cv, /AI Engineering/);
});

test("the capability matrix foregrounds the current AI engineering workflow", async () => {
  const profile = await read("src/data/profile.ts");
  const stack = await read("src/data/techStack.ts");
  const tech = await read("src/components/TechStack.astro");

  assert.match(profile, /AI Engineer/);
  assert.match(stack, /AI Product Engineering/);
  assert.match(stack, /RAG|retrieval|document/i);
  assert.match(stack, /React/);
  assert.match(stack, /Jenkins/);
  assert.doesNotMatch(stack, /Other Tools/);
  assert.doesNotMatch(tech, /OPEN SLOT/);
});

test("interface sound is opt-in and the loader keeps direct visits short", async () => {
  const nav = await read("src/components/Nav.astro");
  const sound = await read("src/scripts/ui-sound.ts");
  const site = await read("src/scripts/site.ts");

  assert.doesNotMatch(nav, /data-sound-enabled="true"/);
  assert.match(nav, /data-sound-enabled="false"/);
  assert.match(sound, /getItem\(SOUND_PREFERENCE_KEY\) === "enabled"/);
  assert.match(site, /minimum:\s*mode === "route" \? 280 : 800/);
  assert.match(site, /maximum:\s*mode === "route" \? 1800 : 2400/);
});

test("the CV build script is present", async () => {
  await access(new URL("scripts/build-cv.mjs", root));
});
