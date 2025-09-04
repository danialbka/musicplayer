# ---------- Builder stage ----------
    FROM node:20-alpine AS base
    WORKDIR /app
    
    # Install yt-dlp (and ffmpeg) from Alpine repos (no pip needed)
    RUN apk add --no-cache python3 yt-dlp ffmpeg
    
    # Install deps and build
    COPY package.json ./
    RUN npm i --no-audit --no-fund
    COPY tsconfig.json ./
    COPY src ./src
    RUN npm run build
    
    # ---------- Runtime stage ----------
    FROM node:20-alpine
    WORKDIR /app
    ENV NODE_ENV=production
    
    # Runtime needs yt-dlp + ffmpeg too
    RUN apk add --no-cache python3 yt-dlp ffmpeg
    
    COPY --from=base /app/node_modules ./node_modules
    COPY --from=base /app/dist ./dist
    COPY .env.example ./.env
    CMD ["node", "dist/index.js"]
    