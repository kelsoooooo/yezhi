# SPECTRA · 香港野外物種掃描

用手機／電腦鏡頭拍攝動植物，透過 Gemini 即時辨識物種、顯示多個候選與信心度，並以科幻 HUD + 圖鑑解鎖 + 香港地圖採集點構成遊戲體驗。

## 啟動

```bash
cd species-scanner
cp .env.example .env   # 填入 GEMINI_API_KEY
npm install
npm run dev
```

- 前端：http://localhost:5173  
- API：http://localhost:8787（Vite 已代理 `/api`）

## 功能

- 鏡頭即時預覽與一鍵掃描
- Gemini 回傳最多 4 個候選物種、信心度、稀有度與介紹
- 圖鑑解鎖、XP／等級、本地儲存進度
- 香港 OpenStreetMap（深色底圖）+ 生態熱點 + 你的發現標記

## 安全與地區限制

- 請勿把 `.env` 提交到 git。若 API key 曾出現在聊天，請到 [Google AI Studio](https://aistudio.google.com/apikey) **輪替金鑰**。
- Google Gemini API 目前可能拒絕香港等地區 IP。本專案預設 `ALLOW_DEMO_FALLBACK=true`：真實呼叫失敗時會回傳香港物種示範資料，方便先玩完整流程。
- 若要真實辨識：用支援地區的網路／VPN，或把 `server/` 部署到海外主機；也可設 `DEMO_MODE=true` 強制示範模式。
- 可透過 `GEMINI_MODEL` 指定模型（預設 `gemini-3.6-flash`）。
