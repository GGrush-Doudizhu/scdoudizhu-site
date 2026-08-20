import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const [url, outputPath, widthText = "1440", heightText = "960"] =
  process.argv.slice(2);

if (!url || !outputPath) {
  console.error(
    "用法：node scripts/capture-preview.mjs <网址> <输出 PNG 绝对路径> [视口宽度] [视口高度]",
  );
  process.exitCode = 1;
} else {
  const width = Number.parseInt(widthText, 10);
  const height = Number.parseInt(heightText, 10);
  const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });

  try {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(url, { waitUntil: "networkidle" });
    await mkdir(path.dirname(outputPath), { recursive: true });
    await page.screenshot({ path: outputPath, fullPage: true });
    console.log(`截图已保存：${outputPath}`);
  } finally {
    await browser.close();
  }
}
