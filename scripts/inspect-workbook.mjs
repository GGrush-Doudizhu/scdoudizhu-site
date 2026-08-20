import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

async function loadArtifactTool() {
  try {
    return await import("@oai/artifact-tool");
  } catch (projectImportError) {
    const runtimeModules = process.env.CODEX_WORKSPACE_NODE_MODULES;

    if (!runtimeModules) {
      throw new Error(
        "无法加载 @oai/artifact-tool。请把工作区依赖加载器提供的 node_modules 绝对路径写入 CODEX_WORKSPACE_NODE_MODULES。",
        { cause: projectImportError },
      );
    }

    const requireFromRuntime = createRequire(
      path.join(runtimeModules, "package.json"),
    );
    const resolvedEntry = requireFromRuntime.resolve("@oai/artifact-tool");
    return import(pathToFileURL(resolvedEntry).href);
  }
}

const [inputPath] = process.argv.slice(2);

if (!inputPath) {
  console.error("用法：node scripts/inspect-workbook.mjs <工作簿绝对路径>");
  process.exitCode = 1;
} else {
  const { FileBlob, SpreadsheetFile } = await loadArtifactTool();
  const input = await FileBlob.load(inputPath);
  const workbook = await SpreadsheetFile.importXlsx(input);

  const structure = await workbook.inspect({
    kind: "workbook,sheet,table,definedName,drawing",
    include: "id,name",
    maxChars: 12_000,
    tableMaxRows: 8,
    tableMaxCols: 12,
    tableMaxCellChars: 100,
  });

  const sample = await workbook.inspect({
    kind: "region",
    maxChars: 20_000,
    tableMaxRows: 20,
    tableMaxCols: 16,
    tableMaxCellChars: 120,
  });

  console.log("=== 工作簿结构 ===");
  console.log(structure.ndjson);
  console.log("=== 有限数据样本 ===");
  console.log(sample.ndjson);
}
