# 星际斗地主 DSL 第二届官方网站

这是第二届 DSL 斗地主星际联赛官方网站的全新工作区。

本项目采用“另起炉灶”的方式建设，不直接修改第一届网站及其历史仓库。旧网站、旧仓库和旧数据只作为只读资料源；所有需要复用的内容都必须先复制到本仓库，并记录来源、用途和筛选理由。

## 当前阶段

旧系统审计、产品需求、源码/网站构建边界和公开网站第一版骨架已经完成。当前站点采用 Astro 7 静态生成与 TypeScript，从空项目实现，不复制旧站组件或排行榜逻辑。

已经具备：

- 首页、积分榜、赛程、规则、季后赛、通知、奖励与赞助、地图及 404 页面。
- 只允许名次、公开显示名、累计总积分、段位和统计时间的公开数据契约。
- 明确的无积分、无通知、日期待公布和地图版本待确认状态。
- 数据越界扫描、类型检查、格式检查、静态构建和桌面/移动端浏览器验收。
- favicon、Web App Manifest、robots、sitemap、canonical 和基础分享元数据。

项目采用单一公开仓库。为了方便赛事开发，原始对局、解析结果、别名和复核资料以后可以保存在仓库的 `data-source/` 中；只有经过整理的数据才会进入 `src/` 或 `public/` 并出现在面向用户的网站。访问令牌、账号凭据和私钥仍不得提交。

当前尚未设置 GitHub 远端、自动部署或 `scdoudizhu.com` 切换。现有线上站保持不变。正式积分、实际赛程和地图下载也不会在主办方确认前发布。

实施路线见 `docs/roadmap.md`，未决赛事规则见 `docs/open-questions.md`。

## 本地运行

项目要求 Node.js 22.12 以上与 pnpm 11.19.0。

```powershell
pnpm install
pnpm dev
```

执行公开数据校验、Astro 检查、格式检查和静态构建：

```powershell
pnpm verify
```

浏览器验收需要可用的 Chromium 浏览器。Windows 本机可显式指定 Edge：

```powershell
$env:PLAYWRIGHT_EXECUTABLE_PATH = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
pnpm test:e2e
```

## 已知只读资料源

- 当前线上 DSL2 雏形：<https://scdoudizhu.com/>
- 网站解析数据实际位置：`E:\download from Edge\scdoudizhu.com_1787193537917.xlsx`
- 第一届资料：`E:\DSL1`
- 历史本地仓库：`D:\MyGitHubWebsite\ggrush-doudizhu.github.io`
- 历史本地仓库：`D:\MyGitHubWebsite\scdoudizhu`
- 第二届赛事资料：`F:\星际斗地主DSL联赛第二届`
- 第二届赛事方案：`F:\星际斗地主DSL联赛第二届\docs\第二届DSL斗地主星际联赛方案.html`
- GitHub 历史仓库：`GGrush-Doudizhu/scdoudizhu-site`
- GitHub 历史仓库：`GGrush-Doudizhu/scdoudizhu`

## 版本管理原则

本仓库中的所有有效修改都必须纳入 Git，并按逻辑阶段提交。提交信息使用清晰、详细的中文，说明修改内容、原因、影响范围以及必要的验证结果。每个阶段结束时必须保持工作树干净。
