# scdoudizhu-site

第二届星际斗地主官网项目。

## 本地运行

```powershell
npm install
python tools/import_parser_zip.py ..\斗地主解析结果0603.zip
python tools/validate_data.py
python tools/build_site_data.py
npm run dev
```

## 构建

```powershell
npm run build
```

## 数据原则

- 第二届只有 `地主` 和 `农民` 两个角色。
- 网站发布数据不保留 `slotId`、`playerId` 等底层房间/解析字段。
- 管理员内部备注不直接发布到公开数据。

