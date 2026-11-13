# God's Eye View 台灣繁中版

> 本 repo fork 自 [bilawalsidhu/gods-eye-view](https://github.com/bilawalsidhu/gods-eye-view)（MIT 授權），
> 只多了「台灣繁體中文外掛」與 Hugging Face 部署設定。原始英文說明見 [README.md](README.md)。

**線上版：** 部署在 Render（網址部署後補上）

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/kevinchang0531/gods-eye-view-zh-tw)

## 這是什麼（白話版）

一個在瀏覽器裡跑的「間諜衛星模擬器」，只是上面的資料全部是真的、公開的：

- **3D 地球**：Esri 衛星影像＋地形，不用金鑰；有 Google／Cesium 金鑰還能看寫實 3D 城市。
- **即時目標**：天上的民航機、軍機（ADS-B 訊號）、海上的船（AIS）、人造衛星軌道、地震、野火、火箭發射、颱風路徑、公開路口攝影機、火車……點一下就鎖定追蹤、顯示詳細資料。
- **駕駛艙模式**：坐進正在飛的班機，從機上視角看地形。
- **畫面濾鏡**：夜視（NVG）、熱成像（FLIR）、CRT、黑白，加上軍事風 HUD 與偵測框。
- **語音控制**（要 OpenAI 金鑰）：用說的「飛到台北、顯示附近的飛機」。
- **導演模式**：錄製運鏡、分享連結（相機位置、圖層、追蹤目標都存在網址裡）。

資料多半每 15～30 秒更新一次，地球上的東西是用內插法讓它看起來連續移動。

## 台灣繁體中文外掛（`zh-tw-plugin/`）

上游已有 `zh-Hant` 翻譯，但用語偏大陸（數據、實時、加載、視圖、點擊、默認……）。外掛做三件事：

1. **翻譯轉台灣用語**：上游 zh-Hant 先過 OpenCC（`t → twp`，含台灣片語），再套 `terms.json` 補充詞表（實時→即時、視圖→檢視、點擊→點選、攝像頭→攝影機……），引號改「」。約 940 條被改寫。
2. **預設繁中**：第一次開啟一律台灣繁中；右下角地球鈕可換語言，選擇會被記住；網址加 `?lang=en` 可臨時看英文。
3. 語言選單顯示「中文（台灣）」，`<html lang>` 改成 `zh-Hant`。

上游更新後重新套用：

```bash
git pull upstream main
git checkout upstream/main -- src/i18n/locales/zh-Hant.json src/i18n/locale.js index.html
rm zh-tw-plugin/zh-Hant.upstream.json
node zh-tw-plugin/apply.mjs
```

覺得哪個詞不順，改 `zh-tw-plugin/terms.json` 再跑 `node zh-tw-plugin/apply.mjs`。

## 本機執行

需要 Node.js 24（24.14 以上）或 26。

```bash
npm ci
npm run dev
```

開 <http://localhost:4173>。本機版可以在 POWER UP 面板填 API 金鑰（Google、Cesium、OpenAI、AISStream 船舶等）。

## 線上版（Render）

即時航班、船舶等資料要經過這個專案自己的 Node 伺服器轉接，所以不能只放成靜態網頁。
線上版用 `render.yaml` 部署在 Render 免費方案：建置時 `npm run build`，執行時 `vite preview`
同時提供網頁和 /api 轉接（約 160 MB 記憶體，免費方案 512 MB 夠用）。

- 線上版**沒有設定任何 API 金鑰**，只用免金鑰資料；伺服器對外分享時，填金鑰的面板會自動停用。
- 只接受 Render 給的網域當 Host（`RENDER_EXTERNAL_HOSTNAME`），其他網域一律 403。
- push 到 main 會自動重新部署。
- 免費方案 15 分鐘沒人用會休眠，再開啟要等約一分鐘。

## 授權

程式碼依原專案 MIT 授權。內含與執行時抓取的第三方資料、3D 模型各有授權，
部分（海底電纜、尼泊爾洪水影像等）**限非商業用途**，詳見 [LICENSE](LICENSE) 與 [DATA_SOURCES.md](DATA_SOURCES.md)。

## 測試說明

上游有 7 個單元測試寫死了舊用語（例如「保存密鑰」「實時」）或「沒指定語言就跟著瀏覽器」，
套用外掛後這 7 個會失敗，屬於預期中的差異；其餘 i18n 測試 142 個通過，`npm run i18n` 全部語言完整。
