import { fileURLToPath } from "node:url";
import { checkCvBuild } from "./cv-integrity.mjs";

try {
  await checkCvBuild(fileURLToPath(new URL("../", import.meta.url)));
  console.log("CV source and published PDF match the recorded build.");
} catch (error) {
  console.error(`CV check failed: ${error.message}. Rebuild with npm run cv.`);
  process.exitCode = 1;
}
