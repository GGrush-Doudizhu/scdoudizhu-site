# DSL2 网站维护与开发说明

本文集中保存面向赛事组织者和网站维护者的工作区说明。根目录 `README.md` 仅承担普通访客的赛事介绍与入口导航，不放置本地环境、历史资料、构建部署或内部数据细节。

## 工作区定位

本仓库是第二届 DSL 星际斗地主联赛官方网站的独立工作区。项目采用另起炉灶的方式建设，不直接修改第一届网站及其历史仓库。旧网站、旧仓库和旧数据只作为只读资料源；需要复用的内容必须先复制到本仓库，并在 `references/SOURCES.md` 登记来源、用途、筛选边界与必要的完整性校验。

网站使用 Astro 静态生成与 TypeScript。当前公开页面包括首页、常规赛积分榜、赛程、规则、季后赛、新闻、奖励与赞助、地图下载及 404 页面。

## 历史资料保护

以下位置全部视为只读资料源，严禁直接编辑、移动、删除、重命名、格式化或生成构建产物：

- `E:\DSL1`
- `D:\MyGitHubWebsite\ggrush-doudizhu.github.io`
- `D:\MyGitHubWebsite\scdoudizhu`
- `F:\星际斗地主DSL联赛第二届`
- `E:\download from Edge\scdoudizhu.com\_1787193537917.xlsx`

使用其中的资料时只能复制到 `D:\scdoudizhu-dsl2` 的适当位置，不得移动、剪切、原地转换或使用会回写源文件的工具。复制后应记录原始绝对路径、复制日期、用途与完整性校验信息。

## 数据与公开边界

项目采用单一公开仓库。为方便赛事维护，原始对局、解析结果、别名和复核资料可保存在 `data-source/`；只有经过整理并满足页面数据契约的结果才能进入 `src/` 或 `public/`。

公开积分榜以名次、公开显示名、累计总积分、段位和统计时间为核心，不发布单局胜负。访问令牌、账号凭据和私钥不得提交。

## 本地运行

项目要求 Node.js 22.12 以上与 pnpm 11.19.0。

```powershell
pnpm install
pnpm dev
```

执行公开数据校验、Astro 检查、格式检查和静态构建：

```powershell
pnpm run verify
```

执行桌面端与移动端浏览器验收：

```powershell
pnpm run test:e2e
```

如需在 Windows 本机显式指定 Edge，可设置：

```powershell
$env:PLAYWRIGHT_EXECUTABLE_PATH = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
pnpm run test:e2e
```

## 自动部署

推送 `main` 分支后，GitHub Actions 会按照锁文件安装依赖，执行数据、类型、格式、构建与浏览器验收；全部通过后才会将静态产物发布到 `https://scdoudizhu.com/`。

仓库保留 `public/CNAME` 以声明正式域名。部署完成后应在线复核首页、积分榜、规则、地图下载、404、HTTPS 和移动端布局。

## Git 要求

1. 所有项目修改均在 `D:\scdoudizhu-dsl2` 中完成，并由 Git 管理。
2. 按可独立理解、可独立回退的逻辑阶段提交，不混入无关修改。
3. 提交标题和正文均使用详细中文，说明修改内容、原因、影响范围、资料来源与验证方式。
4. 提交前检查差异，避免纳入临时文件、凭据、个人隐私或无关内容。
5. 每个工作阶段结束前确保本地与远端同步，且工作树没有未提交或未跟踪文件。
6. 禁止通过重写历史、强制推送或破坏性重置掩盖问题；发现错误时优先新增可审计的修正提交。

## 相关维护文档

- [产品需求](product-requirements.md)
- [技术架构](architecture.md)
- [实施路线](roadmap.md)
- [未决事项](open-questions.md)
- [资料来源与复制登记](../references/SOURCES.md)
- [历史系统审计](audits/2026-08-20-legacy-system-audit.md)
- [架构决策记录](decisions/)
