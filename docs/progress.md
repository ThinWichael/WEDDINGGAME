# 開發進度

## 目前狀態
- [x] 規格討論完成
- [x] 架構決策完成（見 [architecture.md](./architecture.md)）
- [x] M1：打通最小遊戲流程
- [x] M2：天平動畫 + 票數即時更新
- [x] M3：主持人後台 CRUD
- [x] 改版：賓客認證改為 shared room URL + register/login（拿掉 per-guest token）
- [ ] M4：活動回顧頁
- [ ] M5：UI 套版（待設計師交付設計稿）

---

## ⚠️ 改版後必須手動做的事

賓客認證機制改版後，你**必須**完成以下步驟才能跑新版：

### 1. 編輯 Google Sheet `Guests` 分頁 header
**變更前**：
| guestId | roomId | inviteToken | name | maritalStatus | ... |

**變更後**：
| guestId | roomId | name | email | maritalStatus | ... |

操作：
1. 切到 `Guests` 分頁
2. 點 C 欄（`inviteToken`）→ 右鍵「刪除欄 C」
3. 在 `maritalStatus` 欄左側「插入 1 欄」→ header 填 `email`
4. 最終 header 順序：`guestId | roomId | name | email | maritalStatus | joinAfterParty | vegetarian | message | registeredAt`
5. 舊資料列（如果有）直接清掉，因為欄位對不齊

### 2. Apps Script 重新部署
- script.google.com → 部署 → 管理部署 → 鉛筆 → 版本選「新版本」→ 部署
- URL 不變，`.env.development` 不用動

### 3. 清掉瀏覽器 localStorage
devtools → Application → Local Storage → 刪除 `weddinggame:*` 所有 key（避免舊 session 含 inviteToken 造成混淆）

---

## M1：打通最小遊戲流程（最重要、優先做）

驗證「主持人推進題目 → 賓客畫面跟著切換」這條核心路徑可行。

### 任務
- [ ] 建立 React 專案（Vite + React + TS + Tailwind + shadcn）
- [ ] 建立 Google Sheet：手動建好所有分頁（State / Rooms / Questions / Guests / Answers / LiveCounts / Config），手填一個 Room + 3 題測試資料
- [ ] 把 Sheet 設成「知道連結者可檢視」
- [ ] 在 script.google.com 建立 Apps Script，貼上初版 `Code.gs`
  - [ ] 實作 `doGet` / `doPost` 路由分發
  - [ ] 實作 `submitAnswer`（含 LockService）
  - [ ] 實作 `advanceState`（主持人密碼驗證）
  - [ ] 實作 `registerGuest`
  - [ ] 部署為 Web App，access = Anyone
- [ ] 前端 `lib/api.ts`：包 Apps Script POST + gviz GET 兩個 helper
- [ ] 前端 `lib/polling.ts`：`useGameState(roomId)` hook
- [ ] 路由 `/invite/:token`：賓客註冊頁
  - 欄位：暱稱（文字）、婚姻狀態（文字）、是否參加 after party（boolean）、是否素食（boolean）、想說的話（文字，可留空）
- [ ] 路由 `/play/:roomId`：賓客遊戲頁（簡單 UI，能顯示題目、能送答案、能跟著主持人切換）
- [ ] 路由 `/host/rooms/:id/control`：主持人控制台（兩個按鈕：「公佈答案」「下一題」）

### 驗收
1. 開瀏覽器 A 進入 `/invite/test123` → 註冊成功 → 進入遊戲頁，看到第一題
2. 開瀏覽器 B 進入 `/host/rooms/r1/control`（帶密碼）
3. 在 A 點選 yes
4. 在 B 按「公佈答案」→ A 在 2 秒內切到揭曉畫面
5. 在 B 按「下一題」→ A 在 2 秒內切到第二題
6. 重複到最後一題 → A 自動跳到謝詞頁

---

## M2：天平動畫 + 票數即時更新

### 任務
- [ ] Apps Script `submitAnswer` 內加上 atomic update LiveCounts 對應 cell
- [ ] 前端輪詢 LiveCounts，注入到 `useGameState`
- [ ] `BalanceBar.tsx` 元件：使用 framer-motion 做支點移動動畫
- [ ] 公佈答案後的數字揭曉動畫
- [ ] 是非題與單選題兩種票數視覺化分別處理

### 驗收
- 多位賓客同時送答案時，天平支點戲劇性移動
- 公佈答案瞬間，數字以動畫方式呈現

---

## M3：主持人後台 CRUD

### 任務
- [ ] 路由 `/host/login`：密碼登入頁，登入後 token 存 localStorage
- [ ] 路由 `/host/rooms`：GameRoom 列表 + 新增 / 編輯 / 刪除
- [ ] Apps Script `deleteRoom`：級聯刪除該 room 的 questions / guests / answers / state
- [ ] 路由 `/host/rooms/:id/edit`：題目編輯（CRUD 題目，含選擇圖片下拉、是非/單選切換、選項編輯、正確答案）
- [ ] 圖片下拉的 source：列出 `src/assets/questions/` 下所有檔名（用 Vite `import.meta.glob`）

### 驗收
- 新建一個 Room、加入 5 題、改成 playing 狀態，能正常被賓客玩
- 刪除 Room 後，相關所有資料都從 Sheet 消失

---

## M4：活動回顧頁

### 任務
- [ ] Apps Script `getReview` endpoint：回傳 questions + 每位賓客每題的答案
- [ ] 路由 `/host/rooms/:id/review`：表格呈現
  - 一個 row 一位賓客
  - 一個 column 一題
  - cell 顯示該賓客的答案 + 是否答對
- [ ] 加上題目選項統計圖（每題的答對率）

### 驗收
- 主持人在賽後可以一目了然看到誰答了什麼，方便當社群話題

---

## M5：UI 套版

等外觀設計師交付設計稿後再進行。

### 任務（暫定）
- [ ] 套用設計稿到所有頁面
- [ ] 響應式微調（手機優先）
- [ ] Loading / Error 狀態處理
- [ ] 動畫細節打磨

---

## 開發備忘
- Apps Script Web App 每次「程式碼有修改」要重新部署成「新版本」才會生效
- gviz endpoint 回傳格式有 `)]}',\n` 開頭 prefix，要剝掉才能 JSON.parse
- `LockService.getScriptLock().waitLock(10000)` 包寫入區段以避免 race condition
- localStorage key 命名建議統一 prefix：`weddinggame:guestId`、`weddinggame:hostToken` 等
