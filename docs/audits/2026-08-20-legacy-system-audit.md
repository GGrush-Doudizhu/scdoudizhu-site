# 旧网站、仓库与赛事数据只读审计

- 审计日期：2026-08-20
- 审计原则：所有历史目录只读，不执行拉取、切换分支、安装依赖、构建、格式化或原地修复
- 新工作区：`D:\scdoudizhu-dsl2`

## 结论摘要

目前存在四套性质不同的资产，混乱的主要原因是它们在不同时期承担过相似名称的职责：

1. `D:\MyGitHubWebsite\scdoudizhu` 是 DSL1 旧静态站，对应 GitHub 仓库 `GGrush-Doudizhu/scdoudizhu`，历史上由原用户主页仓库改名而来。
2. `D:\MyGitHubWebsite\ggrush-doudizhu.github.io` 是后来重新创建的 Docusaurus 个人站，服务 `ggrush.top`，与 DSL 网站没有直接迁移关系。
3. 当前线上 `scdoudizhu.com` 已经不是 DSL1 旧站，而是来自 `GGrush-Doudizhu/scdoudizhu-site` 的 DSL2 静态站雏形。
4. `E:\DSL1` 是赛事原始数据、人工核对表、生成结果和多版脚本混杂的数据工作目录，不是 Git 仓库，也不是可复现的数据产品。

因此，新网站不能从任一旧目录整体复制。正确策略是：保留旧目录原状，以提交哈希、文件哈希和来源清单追踪历史；只把经过确认的规则、公开数据、地图和授权素材复制到新工作区。

## 仓库与域名关系

### DSL1 旧静态站

- 本地目录：`D:\MyGitHubWebsite\scdoudizhu`
- 当前远端：`https://github.com/GGrush-Doudizhu/scdoudizhu.git`
- 当前分支：`main`
- 本地 HEAD：`d7e62f0`
- 审计时状态：工作树干净，本地最后记录与 `origin/main` 无领先或落后
- 自定义域名：`scdoudizhu.com`

`.git\logs\HEAD` 记录该目录于 2025-05-11 最初从 `GGrush-Doudizhu/GGrush-Doudizhu.github.io.git` 克隆。`CNAME` 在 2025-05-17 从 `ggrush.top` 改为 `scdoudizhu.com`。这说明原用户主页仓库后来被改名为 `scdoudizhu`，并转为承担 DSL1 网站发布。

### 个人 Docusaurus 站

- 本地目录：`D:\MyGitHubWebsite\ggrush-doudizhu.github.io`
- 当前远端：`https://github.com/GGrush-Doudizhu/ggrush-doudizhu.github.io.git`
- 当前分支：`main`
- 本地 HEAD：`83418e1`
- 自定义域名：`ggrush.top`
- 发布分支：`gh-pages`

该仓库从 2025-07-02 的全新提交开始，与 DSL1 旧站没有共同历史。它主要是 Docusaurus 3.8.1 默认教程、默认首页和少量个人信息，不属于 DSL2 迁移来源。

审计开始前，`docusaurus.config.js` 已存在一项未提交修改：导航栏 GitHub 链接从 Docusaurus 官方仓库改为 `GGrush-Doudizhu`。本次审计没有触碰或提交该修改。目录内被忽略的 `node_modules`、`build` 和 `.docusaurus` 也没有运行或复制。

### 当前线上 DSL2 雏形

- 线上地址：<https://scdoudizhu.com/>
- 源码仓库：<https://github.com/GGrush-Doudizhu/scdoudizhu-site>
- 技术：Astro 静态生成、React/TypeScript 交互组件、Python 数据加工脚本
- 发布：`main` 分支推送后由 GitHub Actions 构建并部署到 GitHub Pages
- 当前公开数据生成时间：2026-06-06

当前站包含首页、排行榜、数据中心、地图下载和社区新闻。它虽标记为 DSL2，却仍以胜负、胜率、地主/农民榜和 APM 为主要内容，没有第二届新方案要求的积分字段。因此它可作为失败原型和部署参考，不能作为新产品结构继续扩建。

本地三个审计目录及其 Git 元数据中都没有 `scdoudizhu-site` 的引用，所以它不是上述旧目录之一的自然延续，而是另一套独立建立的项目。

### DNS 基线

2026-08-20 导出的 DNS 工作簿记录：

- 根域名 `@` 指向 GitHub Pages 的四个 A 地址：
  - `185.199.108.153`
  - `185.199.109.153`
  - `185.199.110.153`
  - `185.199.111.153`
- `www` 的 CNAME 指向 `ggrush-doudizhu.github.io`
- 五条记录均为启用状态，TTL 为 600 秒

这表明域名基础设施仍按 GitHub Pages 的标准方式工作。新站正式切换前不需要提前改动 DNS；应先在独立预览地址完成验收，再安排一次可回退的域名切换。

## `E:\DSL1` 数据目录

### 规模与内容

`E:\DSL1` 及子目录均不是 Git 仓库。审计时共有 1,211 个文件，约 93.74 MB：

| 类型 | 数量 | 大小 |
|---|---:|---:|
| `.rep` 回放 | 481 | 73.53 MB |
| `.zip` 回放包 | 11 | 12.64 MB |
| 解析后 `.json` | 477 | 5.31 MB |
| Excel | 115 | 1.47 MB |
| CSV | 98 | 0.50 MB |
| Python | 14 | 0.20 MB |
| TypeScript | 3 | 0.07 MB |

主要流程可以还原为：

```text
.rep 回放
→ screp.exe 解析
→ parsed_json
→ auto_data.csv / verified_data.xlsx
→ 人工审核
→ verified_data.csv / summary.xlsx
→ all_data.csv 与各角色汇总
→ Elo、Glicko、搭档分析等输出
```

旧脚本依赖 Python、pandas、openpyxl、xlsxwriter 和外部 `D:\screp\screp.exe`，但没有依赖锁定文件或环境说明。多个脚本仍硬编码 `E:\DSL数据库\DSL第1赛季`，与实际目录 `E:\DSL1\DSL第1赛季` 不一致，因此不能直接运行。

### 已确认的数据范围

旧站的以下五份排行榜 CSV 与 `E:\DSL1\DSL第1赛季` 同名文件逐字节一致：

- `all.csv`
- `dizhu.csv`
- `nongmin.csv`
- `funong.csv`
- `pinnong.csv`

旧站的 `data\last-matchday.csv` 也与 `20250612\auto_data.csv` 及 `20250612\verified_data.csv` 逐字节一致。这证明 DSL1 的发布流程是从赛事数据目录生成结果，然后人工复制到静态网站并提交。

顶层 `all_data.csv` 的实际公开汇总范围为：

- 日期：2025-05-06 至 2025-06-12
- 比赛日：24 个
- 对局：289 局
- 选手参赛记录：2,311 条
- 不同选手：76 人

所以 DSL1 旧站只能被描述为“统计截至 2025-06-12”，不能宣称覆盖完整第一赛季。

### 不一致与风险

- `matchdays` 实际有 46 个日期目录，延伸到 2026-04-04，但顶层汇总只包含前 24 个比赛日。
- 第一赛季说明写的是 2025-05-06 至 2025-07-31，目录中却混入 2025 年 9—11 月及 2026 年 4 月数据；这些后期比赛日的赛事归属必须人工确认。
- 481 个回放与 477 个解析 JSON 数量不一致，并存在无对应回放的 JSON、嵌套解压导致的疑似重复回放、自定义目录和零字节占位文档。
- 多版 Elo/Glicko 表、带“副本”名称的脚本及输出没有权威版本说明。
- 三个 TypeScript 文件依赖缺失的相对模块，无法独立构建。
- 回放、解析 JSON、报名表、玩家别名等可能包含不适合公开的个人或社区数据。

## DSL1 旧静态站的可用性

旧站由 11 个根级 HTML 文件、内联 CSS/JavaScript 和本地 CSV 组成，没有包管理、构建系统、测试或自动部署。五个排行榜页面各约 505 行，主要通过复制粘贴维护。

明确问题包括：

- 数据更新依赖人工复制多份 CSV。
- 使用 `line.split(',')` 解析 CSV，不能正确处理带引号、逗号或换行的合法字段。
- 部分 CSV 值通过模板字符串写入 `innerHTML`，存在内容注入风险。
- `.idea`、副本页面和过时路径说明进入了仓库。
- 微信号、赞助者姓名或昵称、金额、头像仍是公开内容，迁移前需要重新确认授权。

可研究但不能直接照搬的内容包括：地图文件、地图预览、赛事说明、历史赞助结构、CSV 字段和数据加工思路。

## 当前线上原型的额外风险

`scdoudizhu-site` 的 README 声称公开数据不会保留底层 `slotId`、`playerId`，但公开仓库的原始导入 ZIP 内仍包含带这些字段的解析 JSON。这意味着“源码可公开”和“运营证据可公开”曾被错误地混为一体。

新项目必须在 Git 历史层面分离：

- 公开站点仓库：只包含公开文案、公开赛程和经过净化的积分榜结果。
- 私有赛事数据仓库：包含回放、原始记录、别名映射、计分流水、纠错证据和审核信息。

敏感文件不能先提交到公开仓库再删除，因为 Git 历史仍会保留内容。

## 迁移边界

### 可以选择性复制

- 第二届正式方案及其经过确认的公开文案。
- DNS 基线和部署关系说明。
- DSL1 赛事说明与“截至 2025-06-12”的已确认公开汇总，用于未来历史档案。
- 经过赛事归属确认后重建的其他 DSL1 结果。
- 确认版本、来源和使用权限后的地图文件与预览。
- 获得继续公开授权的赞助资料和头像。
- 旧数据加工逻辑中可验证的概念，但必须重新实现路径、依赖、数据契约和测试。

### 不得整体复制

- 任一旧目录的 `.git`。
- `node_modules`、`build`、`.docusaurus`、`.idea`、`.vscode`、`__pycache__`。
- 未甄别的副本文件、多版排名表和陈旧构建物。
- 无法独立编译的 TypeScript 片段。
- Docusaurus 默认教程和默认素材。
- 原始回放、解析 ZIP、底层玩家或房间标识、报名表等私有证据数据。

## 对旧目录的最终状态确认

审计结束时：

```text
D:\MyGitHubWebsite\scdoudizhu
## main...origin/main
（干净）

D:\MyGitHubWebsite\ggrush-doudizhu.github.io
## main...origin/main
 M docusaurus.config.js
（审计前已存在，本次保持原状）

E:\DSL1
（仍不是 Git 仓库，本次未产生文件）

F:\星际斗地主DSL联赛第二届
（本次只读取方案与文件元数据，未修改）
```

## 审计后的决定

1. 不在任何旧仓库上继续开发。
2. 不把任一旧目录整体复制进新项目。
3. 当前线上站保持运行，直到新站通过预览验收。
4. 新站第一版只公开积分、积分名次、段位和统计时间，不公开胜负、胜率、场次、角色明细或原始对局流水。
5. 在处理第一份原始比赛记录前，先建立独立的私有数据工作区和可审计的计分流水模型。
