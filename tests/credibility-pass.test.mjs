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

test("the hero leads with AI engineering while keeping adjacent disciplines visible", async () => {
  const profile = await read("src/data/profile.ts");
  const hero = await read("src/components/Hero.astro");
  const cv = await read("cv/m-shafri-syamsuddin.tex");

  assert.match(profile, /primaryFocus:/);
  assert.match(profile, /Retrieval.*Document Intelligence.*Applied AI/);
  assert.match(profile, /supportingFocus:/);
  assert.match(profile, /Computer Vision.*NLP.*Data Science/);
  assert.match(hero, /profile\.primaryFocus/);
  assert.match(hero, /profile\.supportingFocus/);
  assert.match(hero, /ASSISTX ENTERPRISE/);
  assert.match(cv, /retrieval.*document-intelligence.*applied AI/i);
  assert.match(cv, /Computer Vision.*NLP.*Data Science/i);
});

test("the CV summary uses the same canonical title as the site profile", async () => {
  const profile = await read("src/data/profile.ts");
  const cv = await read("cv/m-shafri-syamsuddin.tex");
  const title = profile.match(/canonicalTitle:\s*\"([^\"]+)\"/)?.[1];

  assert.ok(title, "profile.canonicalTitle should be declared");
  const escapedTitle = title.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&").replace("&", "\\\\&");
  assert.match(cv, new RegExp(escapedTitle));
});

test("the enterprise experience keeps the employer, title, and public AssistX Suite context", async () => {
  const journey = await read("src/data/journey.ts");
  const cv = await read("cv/m-shafri-syamsuddin.tex");
  const project = await read("src/content/projects/enterprise-ai-platform.mdx");
  const projectIndex = await read("src/components/ProjectsBento.astro");
  const projectPage = await read("src/pages/projects/[slug].astro");
  const readme = await read("README.md");

  assert.match(journey, /Jan 2026 - Present/);
  assert.match(journey, /AI Engineer, AssistX Enterprise/);
  assert.match(journey, /Sep 2025 - Dec 2025/);
  assert.match(journey, /Jun 2022 - Dec 2023/);
  assert.match(journey, /VLM\/PDF ingestion|structured extraction/);
  assert.match(cv, /AI Engineer.*Jan 2026 -- Present/s);
  assert.match(cv, /AssistX Enterprise/);
  assert.match(cv, /Research Assistant.*Sep 2025 -- Dec 2025/s);
  assert.match(cv, /Junior Game Developer.*2021 -- 2022/s);
  assert.match(cv, /enterprise RAG.*agent-ingestion platform/);
  assert.match(cv, /tenant-scoped RFM\/persona segmentation/);
  assert.match(project, /Confidential/);
  assert.match(project, /RAG|intelligent document processing|customer intelligence/i);
  assert.match(project, /assistx-suite-flow\.png/);
  assert.match(project, /assistxenterprise\.ai\/product\/assistx-suite/);
  assert.match(project, /contextLabel:\s*"PUBLIC PRODUCT CONTEXT"/);
  assert.match(project, /scope:/);
  assert.match(project, /outcomes:/);
  assert.match(project, /order:\s*0/);
  assert.match(project, /analyzes document structure.*classifies inputs.*extracts validated fields.*automates downstream workflows/is);
  assert.match(projectIndex, /project-brand-watermark/);
  assert.match(projectIndex, /contextLabel/);
  assert.match(projectIndex, /project-media-context/);
  assert.match(projectPage, /assistx-document-flow\.png/);
  assert.match(projectPage, /assistx-extraction-flow\.png/);
  assert.match(projectPage, /case-public-visuals/);
  assert.match(projectPage, /case-contribution/);
  assert.match(projectPage, /MY CONTRIBUTION/);
  assert.match(projectPage, /assistx-enterprise-logo\.png|assistxLogo/);
  assert.doesNotMatch(project, /cifar-confusion/i);
  assert.match(readme, /Confidential work/);
  assert.match(readme, /Git history is not a secrecy boundary/);

  for (const source of [journey, cv]) {
    assert.doesNotMatch(source, /Papyrus|CIPF/);
  }
});

test("project cards distinguish published research from demonstrations", async () => {
  const malaria = await read("src/content/projects/malaria-parasite-detection.mdx");
  const visionServe = await read("src/content/projects/visionserve-cifar10-api.mdx");
  const sentiment = await read("src/content/projects/zero-shot-sentiment-pipeline.mdx");
  const archive = await read("src/pages/projects/index.astro");
  const filter = await read("src/components/ProjectFilter.tsx");

  assert.match(malaria, /contextLabel:\s*"PUBLISHED RESEARCH"/);
  assert.match(visionServe, /contextLabel:\s*"PRODUCTION-PATTERN DEMONSTRATION"/);
  assert.match(sentiment, /contextLabel:\s*"APPLIED PIPELINE DEMONSTRATION"/);
  assert.match(archive, /contextLabel/);
  assert.match(filter, /contextLabel/);
});

test("featured project anchors stay attached to the project identity", async () => {
  const bento = await read("src/components/ProjectsBento.astro");

  assert.match(bento, /projectAnchors:\s*Record<string, string>/);
  assert.match(bento, /projectAnchors\[id\]/);
  assert.match(bento, /projectShortLabels\[id\]/);
});

test("the project archive stays visible before React hydration", async () => {
  const filter = await read("src/components/ProjectFilter.tsx");

  assert.match(filter, /initial=\{false\}/);
  assert.doesNotMatch(filter, /initial=\{\{\s*opacity:\s*0/);
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

test("CV rebuild path and confirmed biography decisions are documented", async () => {
  const packageJson = await read("package.json");
  const readme = await read("README.md");
  const questions = await read("OPEN-QUESTIONS.md");

  assert.match(packageJson, /"cv"\s*:/);
  assert.match(readme, /npm run cv/);
  assert.match(readme, /LaTeX|latexmk|pdflatex/i);
  assert.match(questions, /Jakarta/);
  assert.match(questions, /Nanjing Xiaozhuang.*2020.?2022/s);
  assert.match(questions, /Product Lead/);
  assert.match(questions, /phone.*retained/i);
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
  assert.match(stack, /tier:\s*"CORE"/);
  assert.match(stack, /tier:\s*"SUPPORTING"/);
  assert.match(stack, /RAG|retrieval|document/i);
  assert.match(stack, /React/);
  assert.match(stack, /Jenkins/);
  assert.doesNotMatch(stack, /Other Tools/);
  assert.doesNotMatch(tech, /OPEN SLOT/);
  assert.match(tech, /CORE STACK|SUPPORTING PRACTICE/);
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
