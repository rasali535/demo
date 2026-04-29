# ===== mAgri Dockerfile =====
# Multi-stage build: small final image (~150 MB).
# Works on any container host (Hostinger VPS, Render, Railway, Fly.io, etc.)

# --- Stage 1: deps ---
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json yarn.lock ./
RUN corepack enable && yarn install --frozen-lockfile

# --- Stage 2: builder ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Disable Next telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1
# Provide a dummy MONGO_URL during build so Next doesn't try to connect
ENV MONGO_URL=mongodb://localhost:27017
ENV DB_NAME=magri_build
ENV NEXT_PUBLIC_BASE_URL=https://example.com
RUN yarn build

# --- Stage 3: runner ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# Copy standalone build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public 2>/dev/null || true

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
