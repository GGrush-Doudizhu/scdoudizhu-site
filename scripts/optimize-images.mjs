import { access, readdir, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const backgroundSources = [
  "public/news/assets/sc-cosmic-rift.png",
  "public/news/assets/sc-protoss-carrier.png",
  "public/news/assets/sc-protoss-warrior.png",
  "public/news/assets/sc-terran-fleet.png",
  "public/news/assets/sc-zerg-swarm.png",
  "public/assets/protoss-wallpaper-4.png",
];

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function optimizeBackground(relativeSource) {
  const source = path.join(projectRoot, relativeSource);
  const outputBase = source.replace(/\.png$/u, "");
  const avif = `${outputBase}.avif`;
  const webp = `${outputBase}.webp`;

  if (!(await exists(source))) {
    if ((await exists(avif)) && (await exists(webp))) return;
    throw new Error(`缺少背景源图和衍生图：${relativeSource}`);
  }

  const pipeline = sharp(source).resize({
    width: 1600,
    fit: "inside",
    withoutEnlargement: true,
  });

  await Promise.all([
    pipeline.clone().avif({ quality: 50, effort: 6 }).toFile(avif),
    pipeline
      .clone()
      .webp({ quality: 72, effort: 6, smartSubsample: true })
      .toFile(webp),
  ]);

  await Promise.all([access(avif), access(webp)]);
  await unlink(source);
}

async function optimizeSponsorDirectory(relativeDirectory) {
  const directory = path.join(projectRoot, relativeDirectory);
  const sources = (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && /\.(?:jpe?g|png)$/iu.test(entry.name))
    .map((entry) => entry.name);

  for (const name of sources) {
    const source = path.join(directory, name);
    const output = path.join(
      directory,
      name.replace(/\.(?:jpe?g|png)$/iu, ".webp"),
    );
    await sharp(source)
      .resize(192, 192, { fit: "cover", position: "centre" })
      .webp({ quality: 76, effort: 6, smartSubsample: true })
      .toFile(output);
    await access(output);
    await unlink(source);
  }
}

async function optimizeBrandMark() {
  const source = path.join(
    projectRoot,
    "public/assets/dsl-three-races-suits.png",
  );
  const output256 = path.join(
    projectRoot,
    "public/assets/dsl-three-races-suits.webp",
  );
  const output512 = path.join(
    projectRoot,
    "public/assets/dsl-three-races-suits-512.webp",
  );

  if (!(await exists(source))) {
    if ((await exists(output256)) && (await exists(output512))) return;
    throw new Error("缺少品牌图标源图和衍生图。");
  }

  await Promise.all([
    sharp(source)
      .resize(256, 256, { fit: "contain" })
      .webp({ quality: 82, alphaQuality: 90, effort: 6 })
      .toFile(output256),
    sharp(source)
      .resize(512, 512, { fit: "contain" })
      .webp({ quality: 82, alphaQuality: 90, effort: 6 })
      .toFile(output512),
  ]);
  await Promise.all([access(output256), access(output512)]);
  await unlink(source);
}

await Promise.all(backgroundSources.map(optimizeBackground));
await optimizeSponsorDirectory("public/assets/sponsors/dsl1");
await optimizeSponsorDirectory("public/assets/sponsors/dsl2");
await optimizeBrandMark();

const unusedBrandDraft = path.join(
  projectRoot,
  "public/assets/dsl-spade-command.png",
);
if (await exists(unusedBrandDraft)) await unlink(unusedBrandDraft);

console.log("图片优化完成：背景已生成 AVIF/WebP，头像与品牌图标已生成 WebP。");
