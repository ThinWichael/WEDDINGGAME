# 婚禮問答遊戲 — 架構文件

## 專案目標
婚禮現場的即時問答遊戲網站。賓客掃 QR code 進入、註冊、看迎賓頁；主持人推進題目時，所有賓客手機畫面跟著切換；題目支援是非題與單選題；答題過程有戲劇化的天平動畫；賽後主持人有活動回顧頁可看誰回答了什麼。

## 技術約束
- 前端：React + Tailwind + shadcn
- **無自架後端**：資料用 Google Sheets，圖片直接 bundle 在 React 專案裡當靜態資源
- 賓客上限約 30 人
- 主持人後台用簡單密碼保護即可
- 接受輪詢同步延遲，不引入 Firebase 或其他即時推送服務

---

## 架構總覽

```
[賓客手機 React]                                         [主持人 React]
   │                                                              │
   │ 高頻讀：GET gviz endpoint（公開、無配額）                     │ 高頻讀：同左
   │   ─────────────────────────────────►  [Google Sheet]  ◄──────┤
   │                                            ▲                  │
   │ 低頻寫：POST Apps Script Web App           │                  │ 寫入：POST Apps Script
   │   ─────────────►  [Apps Script]  ─────────┘                  │   ────────►  [Apps Script]
   │                                                                │
   └──── 題目圖片 ──── (bundled in React build, served by CDN)──────┘
```

### 角色分工

| 元件 | 責任 |
|---|---|
| **React 前端** | UI、路由、本地 state、輪詢、動畫；題目圖片以 `import` 方式 bundle |
| **Google Sheet（公開讀）** | 唯一真實資料源；State / LiveCounts 分頁設成「知道連結者可檢視」 |
| **Google Apps Script Web App** | 所有寫入入口、後台 CRUD、密碼驗證；以主持人 Google 帳號身分執行 |
| **靜態部署平台** | Vercel / Netlify / GH Pages；任選免費方案 |

---

## 核心設計決策

### 1. 為什麼用 Google Apps Script Web App
Apps Script 是 Google 免費託管的 JS runtime，可以暴露 `doGet` / `doPost` 為 HTTP endpoint，內部用 `SpreadsheetApp.openById()` 直接讀寫 Sheet。

關鍵優點：
- **以主持人 Google 帳號身分執行**：前端不需要任何 API key 或 OAuth，賓客手機完全沒有金鑰
- **零維運**：不用買 server、不用付錢
- **部署 access = Anyone**：賓客不用 Google 登入

限制：
- 每次執行最多 6 分鐘
- **每天總執行時間 90 分鐘**（最會卡到的限制）
- URL Fetch 20,000 次/日（不影響本專案）

### 2. 為什麼讀寫分離
若所有讀寫都走 Apps Script，30 位賓客每 2 秒輪詢一次 → 一小時就會吃光每日 90 分鐘執行時間配額。

解法：
- **讀**走 Google Sheet 的公開 gviz endpoint：
  ```
  https://docs.google.com/spreadsheets/d/{id}/gviz/tq?tqx=out:json&sheet=State
  ```
  完全不耗 Apps Script 配額，前端直接 fetch
- **寫**才走 Apps Script，因為寫入需要主持人帳號身分執行 `appendRow()`

預估寫入量：30 人 × 10 題 + 主持人操作 ≈ 350 次/場，遠低於配額。

### 3. 為什麼圖片 bundle 在專案內
原本考慮 Google Drive，但直連 URL 不穩定（403、CORS、病毒掃描中介頁），用 Apps Script 代理又會吃配額。

題目圖片數量有限（一場婚禮通常 ~20 張），bundle 進 React build 由 CDN 服務最簡單可靠。

---

## Google Sheet Schema

建立一個 Spreadsheet，內含以下分頁：

### `State`（高頻讀，公開）
賓客輪詢的對象，盡量精簡：

| roomId | currentQuestionId | phase | revealedAt | updatedAt |
|---|---|---|---|---|
| r1 | q3 | answering | | 2026-04-12T19:30:00Z |

- `phase`: `waiting` / `answering` / `revealed` / `ended`
- 一個 row 代表一個 room 的當前狀態

### `Rooms`
| roomId | name | status | createdAt |
|---|---|---|---|
| r1 | 大衛和小美的婚禮 | playing | ... |

- `status`: `draft` / `waiting` / `playing` / `ended`

### `Questions`
| questionId | roomId | order | type | text | imageKey | optionsJson | correctAnswer |
|---|---|---|---|---|---|---|---|
| q1 | r1 | 1 | yn | 新郎新娘第一次見面在哪？ | (空) | (空) | yes |
| q2 | r1 | 2 | single | 新娘最愛的食物？ | groom_wedding.jpg | ["A","B","C","D"] | B |

- `type`: `yn`（是非）/ `single`（單選）
- `imageKey`: 對應 `src/assets/questions/` 下的檔名；空字串代表無圖
- `optionsJson`: 單選題的選項 JSON 字串，是非題留空

### `Guests`
| guestId | roomId | name | email | maritalStatus | joinAfterParty | vegetarian | message | registeredAt |
|---|---|---|---|---|---|---|---|---|
| g_xxx | r_xxx | 王小明 | ming@example.com | 已婚 | TRUE | FALSE | 祝新人幸福快樂！ | ... |

- **邀請函 URL：`https://yoursite.com/invite/{roomId}`** — 所有賓客收到的是同一條 URL（不需要 per-guest token / mail merge）
- 賓客第一次進入時，看到「註冊 / 登入」切換頁：
  - **註冊**（第一次）：填表後 Apps Script 自動產生 `guestId`，寫入這張表
  - **登入**（換裝置 / 重新回來）：輸入 email / 暱稱 / guestId 任一個作為弱識別，找回原本的 guestId
- 欄位說明：
  - `guestId`（由 Apps Script 自動產生，格式 `g_時間戳_隨機數`）
  - `name`（暱稱，必填）
  - `email`（選填但強烈建議，換裝置時用這個登入最可靠）
  - `maritalStatus`（婚姻狀態，文字輸入，必填）
  - `joinAfterParty`（是否參加 after party，boolean）
  - `vegetarian`（是否素食，boolean）
  - `message`（想說的話，可留空）
- 同瀏覽器重訪時會讀 localStorage `weddinggame:guestSession` 直接跳過表單進遊戲頁

### `Answers`
| answerId | roomId | questionId | guestId | answer | answeredAt |
|---|---|---|---|---|---|
| a1 | r1 | q1 | g1 | yes | ... |

活動回顧頁直接 join 這張表。

### `LiveCounts`（高頻讀，公開）
為了讓天平動畫即時反應，把每題目前的票數彙總：

| roomId | questionId | yesCount | noCount | optionACount | optionBCount | optionCCount | optionDCount |
|---|---|---|---|---|---|---|---|

- 每次有人送答案時，Apps Script 同時 update 這張表
- 賓客輪詢這張表的對應 row 來畫天平

### `Config`
| key | value |
|---|---|
| hostPasswordHash | `<SHA-256 hex of your password>` |
| appVersion | 1.0.0 |
| defaultPhase | waiting |

`hostPasswordHash` 存的是密碼的 SHA-256 hex（小寫）。前端登入時仍送明文，Apps Script 收到後做 SHA-256 再跟這欄比對。產生 hash 有三種方式：

1. **Apps Script 內建輔助函式**：打開 Code.gs，把 `generateHostPasswordHash` 裡的 `PASSWORD` 改成你想要的密碼，執行它（▶︎），看「執行記錄」複製 hash 貼進 Sheet
2. **命令列**：`echo -n "你的密碼" | shasum -a 256 | awk '{print $1}'`
3. **瀏覽器 console**：
   ```js
   crypto.subtle.digest('SHA-256', new TextEncoder().encode('你的密碼'))
     .then(b => console.log(Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('')));
   ```

---

## Apps Script API 設計

部署為 Web App，access = Anyone，URL 簡稱為 `${API}`。

### 公開端點（不需密碼）
- `POST ${API}?action=registerGuest`
  - body: `{ roomId, name, email, maritalStatus, joinAfterParty, vegetarian, message }`
  - 驗證 roomId 存在 → 產生新 guestId → 寫入 Guests sheet → 回傳 `{ guestId, roomId, name }`
- `POST ${API}?action=loginGuest`
  - body: `{ roomId, identifier, identifierType }` 其中 `identifierType` 是 `'email'` / `'name'` / `'guestId'`
  - 在 Guests sheet 中用對應欄位查找（大小寫不敏感、去空白）→ 找到回 `{ guestId, roomId, name }` / 找不到丟錯
- `POST ${API}?action=submitAnswer`
  - body: `{ guestId, questionId, answer }`
  - 寫入 Answers，同時 atomic update LiveCounts 對應 cell

### 主持人端點（需要密碼 header）
所有請求 header 帶 `X-Host-Password: xxx`，Apps Script 比對 `Config.hostPasswordHash`：

- `POST ${API}?action=createRoom` / `updateRoom` / `deleteRoom`
  - 刪除 room 時連帶刪除該 room 的 questions / guests / answers / state
- `POST ${API}?action=upsertQuestion` / `deleteQuestion`
- `POST ${API}?action=advanceState`
  - body: `{ roomId, currentQuestionId, phase }`
  - 主持人按「下一題」「公佈答案」時呼叫
- `GET ${API}?action=getReview&roomId=xxx`
  - 回傳活動回顧資料（題目 + 每題每位賓客的答案）

### 前端公開讀（不走 Apps Script）
直接打 gviz endpoint：

```js
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=State&tq=${encodeURIComponent(`select * where A='${roomId}'`)}`;
const text = await fetch(url).then(r => r.text());
const json = JSON.parse(text.substring(47, text.length - 2));
```

封裝成一個 `gvizFetch(sheet, query)` util。

---

## React 前端結構

```
src/
  routes/
    invite/[token].tsx          # 邀請函/註冊頁
    play/[roomId].tsx           # 賓客遊戲頁（含輪詢、天平動畫）
    host/login.tsx              # 主持人登入
    host/rooms.tsx              # GameRoom CRUD
    host/rooms/[id]/edit.tsx    # 編輯題目
    host/rooms/[id]/control.tsx # 主持人遊戲控制台（推進題目按鈕）
    host/rooms/[id]/review.tsx  # 活動回顧
  lib/
    api.ts                      # 包 Apps Script + gviz fetch
    auth.ts                     # localStorage token、host password
    polling.ts                  # useGameState hook，內含 setInterval 輪詢
  components/
    BalanceBar.tsx              # 天平動畫
    QuestionCard.tsx
    OptionButton.tsx
    ui/                         # shadcn 元件
  assets/
    questions/                  # 題目圖片靜態檔
```

### 輪詢策略
`useGameState(roomId)` hook：
- 每 2 秒打一次 gviz `State` 表
- 偵測到 `currentQuestionId` 或 `phase` 變化時，trigger UI 切換動畫
- `phase === 'answering'` 時，再多輪詢 `LiveCounts` 表帶動天平
- `phase === 'revealed'` 時停止 LiveCounts 輪詢，鎖定數字
- 切到下一題時 reset 並重新開始

30 人 × 30 req/min = 900 req/min 打到 gviz。實務上沒看過這個量級被擋。如果擔心，可以拉到 3 秒輪詢。

---

## 已知風險與後備方案

1. **gviz endpoint 偶爾被快取**：實測若發現 stale，可加 `&_t=${Date.now()}` cache buster
2. **Apps Script 寫入 race condition**：兩位賓客同時送答案可能 LiveCounts 計數丟失。用 `LockService.getScriptLock()` 包寫入區段
3. **賓客重新整理頁面**：localStorage 存 `inviteToken` + `guestId`，重新整理後自動恢復
4. **主持人按錯下一題**：在控制台加「上一題」按鈕，純粹改 State 表回前一題即可
5. **gviz 回傳格式特殊**：開頭有 `)]}',\n` 的 prefix 需要剝掉，封裝在 `gvizFetch` util 裡處理
