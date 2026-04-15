# GitHub Pages 部署筆記

本專案目前設定為部署到 GitHub Pages 的 **子路徑模式**：
`https://thinwichael.github.io/WEDDINGGAME/`

檢查部署設定
https://github.com/ThinWichael/WEDDINGGAME/settings

檢查最新部署
https://github.com/ThinWichael/WEDDINGGAME/actions

## 先決條件

- **Repo 必須是 public**。GitHub Pages 免費方案不支援 private repo（private 需要 GitHub Pro）。
- 切換 public/private 位置：`Settings → 最底下 Danger Zone → Change repository visibility`
- 切成 public 前請確認 `.env` 裡沒有真正的機密。本專案的 `VITE_APPS_SCRIPT_URL` 屬於「敏感但非秘密」，因為它 build 後也會寫進 client JS bundle，見 `docs/architecture.md` 的安全模型章節。

## 一次性設定（已完成）

專案已經為 GitHub Pages 部署做好三件事，如果之後要切換部署目標（例如改到 Cloudflare Pages），請對照「反向步驟」章節回復。

### 1. `vite.config.ts`：條件 base

```ts
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/WEDDINGGAME/" : "/",
  // ...
}));
```

- `npm run dev` 時 base 為 `/`，本機 `localhost:5173/` 照常運作
- `npm run build` 時 base 為 `/WEDDINGGAME/`，產出的 asset 路徑會帶前綴

### 2. `src/App.tsx`：Router basename

```ts
const router = createBrowserRouter(
  [ /* routes */ ],
  { basename: import.meta.env.BASE_URL }
);
```

Vite 會根據 config 的 `base` 自動填 `BASE_URL`，dev 時是 `/`、build 時是 `/WEDDINGGAME/`，一份程式碼兩個環境都正確。

### 3. `package.json`：deploy scripts

```json
"predeploy": "npm run build && cp dist/index.html dist/404.html",
"deploy": "gh-pages -d dist"
```

`predeploy` 的 `cp index.html 404.html` 是 SPA fallback 的常見技巧：GitHub Pages 遇到不存在的路徑會回 `404.html`，把它設成 `index.html` 的副本就能讓 React Router 在重整 `/game/r1` 時仍然正常工作。

devDependencies 也多裝了 [`gh-pages`](https://www.npmjs.com/package/gh-pages) 這個 npm 套件。

## GitHub 網頁上要做的一次性設定

前提：repo 已公開。

1. 打開 `https://github.com/ThinWichael/WEDDINGGAME/settings/pages`
2. **Source** 選 **Deploy from a branch**
3. **Branch** 選 `gh-pages` / `/ (root)`
4. 按 **Save**

首次部署後 1–2 分鐘，頁面頂端會出現綠色的網址框：
`https://thinwichael.github.io/WEDDINGGAME/`

> `gh-pages` 分支是 `gh-pages` npm 套件第一次 `npm run deploy` 時自動建立的。不要手動在上面 commit 任何東西，每次 deploy 都會整包覆蓋。

## 每次部署

在本機跑：

```bash
npm run deploy
```

它會依序做：

1. `tsc -b && vite build`（TypeScript 檢查 + Vite build，會用本機的 `.env`）
2. `cp dist/index.html dist/404.html`（SPA fallback）
3. `gh-pages -d dist`（把 `dist/` 整包 push 到 GitHub 的 `gh-pages` 分支）

第一次 deploy 時會要認證，跟 `git push main` 時用的 HTTPS token / SSH key 同一套。

部署完成後 1–2 分鐘 GitHub Pages 會更新網站。

## 驗證清單

首次部署或更新重大變更後，跑一遍：

- `/WEDDINGGAME/` → 首頁 HomeRoute
- `/WEDDINGGAME/invite/<roomId>` → RSVP 表單
- `/WEDDINGGAME/game/<roomId>` → 暱稱輸入 → 進遊戲
- 在 `/game/...` 頁面按 **F5 重整** → 應該仍然停在遊戲畫面（驗證 SPA fallback 有生效）
- `/WEDDINGGAME/host/login` → host 後台可登入

## 注意事項

- **repo 改名**：如果將來 repo 改名，必須同步改 `vite.config.ts` 的 `base: "/WEDDINGGAME/"` 字串，大小寫要一致
- **自訂網域**：若之後綁自訂網域部署在 root，把 `base` 改回 `"/"` 即可，`basename` 不用改（會自動變 `/`）
- **環境變數**：因為 build 發生在本機，會自動讀取 `.env`，不需要設定任何 GitHub Secret
- **build 大小警告**：Vite 會警告 bundle 超過 500 KB，目前可以忽略，未來若要優化再做 code splitting

## 反向步驟（切換到別的部署目標時）

如果以後要改用 Cloudflare Pages / Vercel / Netlify 這類部署在 root 的服務：

1. `vite.config.ts` 把 `base` 改回 `"/"`（或整個拿掉 `defineConfig` 的 function 形式）
2. `src/App.tsx` 的 `basename: import.meta.env.BASE_URL` 可以保留（會自動等於 `/`）或拿掉
3. `package.json` 移除 `predeploy` 與 `deploy` script
4. `npm uninstall gh-pages`
5. 在對應的平台上設定環境變數 `VITE_APPS_SCRIPT_URL`
6. 刪除 GitHub 上的 `gh-pages` 分支（可選）

詳細參見 `docs/deploy-cloudflare-pages.md`。
