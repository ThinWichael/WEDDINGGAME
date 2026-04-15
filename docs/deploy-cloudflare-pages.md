# Cloudflare Pages 部署筆記

Cloudflare Pages 是 GitHub Pages 之外的免費替代方案，**支援 private repo**、**不限頻寬**、**自動 CD**（push 到 `main` 就自動重部署），對本專案而言比 GitHub Pages 更順。

預期部署網址格式：`https://weddinggame.pages.dev/`（或你自訂的專案名）

## 為什麼選 Cloudflare Pages

| 特性 | GitHub Pages | Cloudflare Pages |
|---|---|---|
| Private repo | ❌ 免費不支援 | ✅ 免費支援 |
| 部署在 root | ❌ 子路徑 `/WEDDINGGAME/` | ✅ root `/` |
| 需要 `base` / `basename` 設定 | ✅ 要 | ❌ 不用 |
| SPA fallback | 需手動 `cp index.html 404.html` | ✅ 自動處理 |
| 環境變數 | build 時讀本機 `.env` | ✅ 網頁介面設定 |
| 部署方式 | 本機 `npm run deploy` | ✅ `git push` 觸發自動 CD |
| 自訂網域 | 支援 | 支援 |
| 頻寬 | 100 GB/月 | 無限 |

## 如果要從 GitHub Pages 切換過來要做的「反向步驟」

本專案目前是為 GitHub Pages 設定的，要改用 Cloudflare Pages 需回退以下程式碼：

### 1. `vite.config.ts`：把 `base` 改回 `/`

```ts
// 從：
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/WEDDINGGAME/" : "/",
  // ...
}));

// 改回：
export default defineConfig({
  // 不需要 base
  // ...
});
```

### 2. `src/App.tsx`：`basename` 可保留或移除

```ts
// 保留也沒差，因為 BASE_URL 會是 "/"：
createBrowserRouter([...], { basename: import.meta.env.BASE_URL })

// 或拿掉第二個參數：
createBrowserRouter([...])
```

### 3. `package.json`：移除 deploy scripts

```json
// 刪除這兩行：
"predeploy": "npm run build && cp dist/index.html dist/404.html",
"deploy": "gh-pages -d dist"
```

### 4. 移除 `gh-pages` 套件

```bash
npm uninstall gh-pages
```

### 5. 處理 `.env`（強烈建議）

既然環境變數改由 Cloudflare 介面注入，`.env` 裡的 `VITE_APPS_SCRIPT_URL` 就不該再 commit：

1. 編輯 `.gitignore` 加入 `.env` 和 `.env.development`（保留 `.env.example`）
2. `git rm --cached .env .env.development`
3. `git commit -m "stop tracking .env"`

注意：即使這樣做，初始 commit 的歷史裡仍然看得到 `.env` 的內容。要徹底抹掉就得 rewrite history（`git filter-repo`），但本專案的 URL 屬於「敏感但非秘密」，一般不值得這麼搞。

### 6. 刪除 `gh-pages` 分支（可選）

如果已經跑過 `npm run deploy`，GitHub 上會有一個 `gh-pages` 分支。可以在網頁上手動刪除：
`https://github.com/ThinWichael/WEDDINGGAME/branches`

## Cloudflare Pages 的一次性設定

### 1. 註冊與連結

1. 打開 <https://dash.cloudflare.com/sign-up/pages>
2. 用 GitHub 帳號授權登入（Cloudflare 會請求讀取你的 repo）
3. 左側選單 **Workers & Pages** → **Create application** → **Pages** 分頁 → **Connect to Git**
4. 授權存取 `ThinWichael/WEDDINGGAME`（可選「只開放這個 repo」）
5. 選擇該 repo 後按 **Begin setup**

### 2. Build 設定

| 欄位 | 值 |
|---|---|
| Project name | `weddinggame`（會變成 `weddinggame.pages.dev`） |
| Production branch | `main` |
| Framework preset | **Vite** |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | 保持空白 |

### 3. 環境變數（關鍵）

在同一個 setup 頁面往下捲，找到 **Environment variables (advanced)** 展開：

| Variable name | Value |
|---|---|
| `VITE_APPS_SCRIPT_URL` | 你的 Apps Script `/exec` 網址 |
| `VITE_SHEET_ID` | 你的 Google Sheet ID（可選，目前程式碼沒讀它，純粹保留備用） |

> ⚠️ 變數名**必須以 `VITE_` 開頭**，否則 Vite 不會把它們 expose 到 client bundle。

### 4. 按 Save and Deploy

Cloudflare 會立即：

1. Clone 你的 repo
2. `npm install`
3. `npm run build`（會把你設的環境變數注入）
4. 部署 `dist/` 到 edge CDN
5. 給你一個 `https://weddinggame.pages.dev/` 網址

首次部署約 1–2 分鐘。完成後網址會顯示在專案頁面上。

## 每次更新

**什麼都不用做**。只要 `git push origin main`，Cloudflare 會自動偵測 push、重 build、重部署。

每次 push 到其他分支或 PR 也會有 **preview deployment**（不同的暫時網址），`main` 才會覆蓋 production 的 `pages.dev` 網址。

## 驗證清單

- `/` → 首頁 HomeRoute
- `/invite/<roomId>` → RSVP 表單
- `/game/<roomId>` → 暱稱輸入 → 進遊戲
- 在 `/game/...` 頁面按 **F5 重整** → 應該仍然停在遊戲畫面（Cloudflare Pages 對 SPA 自動做 fallback，不用額外設定）
- `/host/login` → host 後台可登入

## 自訂網域（可選）

Cloudflare Pages 專案頁面 → **Custom domains** → **Set up a custom domain**。如果網域本來就在 Cloudflare 管理，DNS 會自動設定；如果在別家，它會給你一組 CNAME 記錄要加到網域的 DNS 設定。免費、自動 HTTPS。

## 注意事項

- **`.env` 仍可保留在本機**（不 commit），`npm run dev` 時 Vite 會讀本機的 `.env`；部署時 Cloudflare 用它自己的環境變數，兩者互不影響
- **預覽環境變數**：Cloudflare 有 **Production** 跟 **Preview** 兩套環境變數。如果你希望 PR 預覽也能呼叫 Apps Script，兩套都要填 `VITE_APPS_SCRIPT_URL`
- **build cache**：Cloudflare 會自動 cache `node_modules`，之後每次 build 會快很多
- **Apps Script CORS**：本專案目前用 `text/plain` content-type 避開 preflight，同時 Apps Script 部署設定允許 `Anyone`，換部署平台不會影響 CORS
- **build 失敗時**：Cloudflare Pages 會在專案頁面顯示 build log，錯誤訊息跟本機跑 `npm run build` 看到的一樣
