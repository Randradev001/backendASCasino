import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SKILL_DIR = "C:/Users/andre/.codex/plugins/cache/openai-primary-runtime/presentations/26.1011.11113/skills/presentations";
const workspaceDir = "C:/Proyectos2025/AS/backendAS";
const candidatePath = path.join(workspaceDir, ".codex-presentation-build/adp-casino-seguridad-testing-produccion-candidate.pptx");
const finalPath = path.join(workspaceDir, "output/pptx/ADP_Casino_Seguridad_Testing_Produccion_OWASP_2026-10-16.pptx");
const stagingDir = path.join(workspaceDir, ".codex-presentation-build/finalizer");
await fs.mkdir(stagingDir, { recursive: true });
await fs.mkdir(path.dirname(finalPath), { recursive: true });
const { finalizePresentation } = await import(pathToFileURL(path.join(SKILL_DIR, "container_tools/artifact_tool_utils.mjs")).href);
const result = await finalizePresentation({
  workspaceDir,
  candidatePath,
  finalPath,
  pythonExecutable: "C:/Users/andre/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe",
  integrityValidatorPath: path.join(SKILL_DIR, "container_tools/inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(SKILL_DIR, "container_tools/inspect_presentation_layout_geometry.py"),
  layoutArgs: ["--expected-slide-size-emu", "12192000,6858000", "--validate-bullet-geometry", "--validate-heading-fit"],
  requiredNativeTableOwnerSlides: [],
  fontPolicy: { basis: "design", families: ["Aptos"] },
  verifyArtifactToolImport: true,
  receiptPath: path.join(stagingDir, "ADP_Casino_Seguridad_Testing_Produccion_OWASP_2026-10-16.validation.json"),
});
console.log(JSON.stringify(result));
