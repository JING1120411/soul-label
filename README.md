# 灵魂成分表

42 道题，12 味配料，生成一张只属于你的灵魂营养成分表。

- **前端**：纯静态 HTML / CSS / JavaScript，无构建步骤，托管在 GitHub Pages
- **后端**：Supabase（PostgreSQL + PostgREST RPC 函数）
- **数据模型**：密码核销（每张 3 次）+ 结果存档 + 后台发码

## 目录

```
index.html              测评主站（密码 → 答题 → 结果 → 保存长图 / 分享）
admin.html              后台（凭口令生成密码、看用量）
assets/app.js           页面逻辑与流程
assets/backend.js       后端适配层，只暴露 rpc(name, args)
assets/config.js        站点配置（后端地址、anon key）
assets/poster.js        结果长图，Canvas 手绘，无第三方依赖
assets/soul-label-data.js  题库、12 味配料、计分算法
supabase/schema.sql     数据库初始化脚本（表 / RLS / 函数）
```

## 配置

打开 `assets/config.js`，填两行：

```js
backend: {
  driver: 'supabase',
  supabase: {
    url: 'https://xxxxxxxx.supabase.co',
    anonKey: 'sb_publishable_...'   // 或 eyJhbGciOi... 开头的 anon key
  }
}
```

`anon` key 是设计上公开的，可以放在前端。真正的权限控制在数据库里：
三张表都开了 RLS 且没有给 `anon` 任何表权限，读写只能走
`SECURITY DEFINER` 函数，所以拿到 key 也读不到密码表，也没法批量拉结果。

## 部署

推送到 `main` 分支即可，GitHub Actions 会自动发布到 Pages：

```
https://<用户名>.github.io/<仓库名>/
```

## 更新题库

`assets/soul-label-data.js` 里 `items` 是 36 道主体题，`scenarios` 是 6 道情境题。
改文本不影响计分——维度归属由 `ing` 字段决定，与题号无关。
