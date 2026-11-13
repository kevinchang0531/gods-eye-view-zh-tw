# Hugging Face Spaces 用：建置時從 GitHub 抓台灣繁中版原始碼，跑完整伺服器（含即時資料轉接）。
# 這個資料夾只有 Dockerfile 和 README.md，上傳到 Space 即可；程式碼一律以 GitHub repo 為準。
FROM node:24.22.2-slim

ENV PUPPETEER_SKIP_DOWNLOAD=1
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Spaces 以 uid 1000 執行，node 映像的 node 使用者正好是 1000。
USER node
WORKDIR /home/node

# 改了 GitHub 想重新部署：到 Space 的 Settings 按 Factory rebuild。
ARG REPO=https://github.com/kevinchang0531/gods-eye-view-zh-tw.git
RUN git clone --depth 1 "$REPO" app
WORKDIR /home/node/app
RUN npm ci && mkdir -p node_modules/.vite

# 對外開放，但只接受這個 Space 自己的網域當 Host（防 DNS rebinding）：
# Hugging Face 執行時會給 SPACE_HOST（例如 user-gods-eye-view-zh-tw.hf.space）。
# 沒有設定任何 API 金鑰；伺服器對外分享時 Provider Settings（填金鑰面板）會自動停用。
ENV HOST=0.0.0.0 \
    PORT=7860
EXPOSE 7860
CMD ["sh", "-c", "GEV_ALLOWED_HOSTS=\"${GEV_ALLOWED_HOSTS:-$SPACE_HOST}\" exec npx vite --host 0.0.0.0 --port 7860 --strictPort"]
