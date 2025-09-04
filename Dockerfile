FROM node:20-alpine AS base
WORKDIR /app

# Copy only what's guaranteed to exist
COPY package.json ./

# Install deps (locks optional; this will still work)
RUN npm i --no-audit --no-fund

# Build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist
COPY .env.example ./.env
CMD ["node", "dist/index.js"]
