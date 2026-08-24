# 第二届 DSL 赞助流水

`sponsorship-ledger.csv` 是第二届 DSL 赞助的仓库内完整流水源档，每笔到账单独记录，不因网站公开范围而删减金额或用途。

字段说明：

- `transaction_id`：仓库内唯一流水编号。
- `sponsor_name`：赞助者公开昵称。
- `amount_cny`：人民币金额，固定保留两位小数。
- `currency`：币种，目前统一为 `CNY`。
- `purpose`：赞助者指定或说明的资金用途。
- `status`：到账状态。
- `received_date`：实际到账日期；当前五笔赞助未提供具体日期，因此留空，不臆造数据。
- `recorded_date`：本次在仓库建档的日期，不等同于实际到账日期。
- `public_tier`：网站公开鸣谢时使用的赞助档位。
- `public_display`：是否在网站公开鸣谢昵称与头像。

公开网站只从 `src/data/dsl2-sponsors.ts` 读取昵称、头像和档位，不读取或展示本 CSV 中的金额与用途。新增赞助时，应先追加本流水，再按公开决定更新网站名单。
