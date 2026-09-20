# 第二届 DSL 赞助记录

赞助商资料与到账流水分开维护，当前等级只记录在赞助商资料中，不随每笔流水重复填写。

## 赞助商资料

`src/data/dsl2-sponsor-profiles.json` 是公开昵称、头像与当前等级的唯一来源，首页和赞助鸣谢页通过 `src/data/dsl2-sponsors.ts` 共用它。

- `name`：完整公开昵称，同时用于关联流水，例如 DR.Yang（原昵称 DBS）、WoShiLaoCaiNiao。不另设简短代号。
- `tier`：当前赞助等级，使用 `platinum`（铂金）、`diamond`（钻石）、`gold`（黄金）、`silver`（白银）。
- `avatar`：公开头像路径。

页面按铂金、钻石、黄金、白银分组，同档按名单中的顺序展示。没有赞助商的档位仍保留标题与分区，并显示“虚位以待，欢迎支持赞助”。等级与顺序由主办方确认，不按累计金额自动调整。当前两位铂金赞助商依次为 DR.Yang、WoShiLaoCaiNiao，钻石档位空缺；白银赞助商依次为 stefsunli、shougong、nianqing、KaKaRu。

## 到账流水

`sponsorship-ledger.json` 保存完整到账记录，每笔到账单独追加，不需要流水编号。所有金额均为人民币，不另设币种字段。`transactions` 中各笔包含：

- `sponsor`：赞助商完整昵称，与公开名单中的 `name` 完全一致（包括大小写）。
- `amount`：人民币金额，使用 JSON 数字，最多两位小数；校验时换算为整数分汇总。
- `purpose`：该笔赞助的具体用途。
- `status`：到账状态，目前为 `已收到`。
- `received_date`：实际到账日期，格式为 `YYYY-MM-DD`；未知填 `null`。
- `recorded_date`：建档日期，格式为 `YYYY-MM-DD`；未知填 `null`，不等同于到账日期。

CSV 中的 7 笔到账已完整迁移，旧 CSV 停止维护。最后一笔 WoShiLaoCaiNiao 的 1,000 元记录原先缺少建档日期，因此保留到账日期 `2026-09-18`，建档日期设为 `null`，未推测补填。

## 更新方式

1. 已有赞助商再次赞助：只在 `transactions` 末尾追加一笔到账记录。
2. 新增赞助商：在公开名单中加入完整昵称、等级和头像，再用相同昵称追加流水。
3. 升级：只修改公开名单的 `tier`，无需修改历史流水。更名时同步修改公开名单的 `name` 和该赞助商全部流水的 `sponsor`。调整同档展示顺序时移动名单中的条目。
4. 运行 `pnpm validate:sponsors` 检查格式、日期、赞助商关联、头像和累计金额。

具体金额、用途和日期仅保留在仓库流水中，不导入网站组件或复制到 `public`。网站仅展示公开昵称、头像和当前赞助等级。
