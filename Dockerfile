FROM node:22-alpine AS builder
WORKDIR /app

# 모노레포 루트 의존성
COPY package.json package-lock.json* ./
COPY packages/dp-schema-public/package.json packages/dp-schema-public/
COPY packages/dpu-core/package.json packages/dpu-core/
COPY api-server/package.json api-server/

RUN npm install --workspace=packages/dp-schema-public --workspace=packages/dpu-core --workspace=api-server

# 소스 복사 + 빌드
COPY packages/dp-schema-public/ packages/dp-schema-public/
COPY packages/dpu-core/ packages/dpu-core/
COPY api-server/ api-server/

RUN npm run build --workspace=packages/dp-schema-public && \
    npm run build --workspace=packages/dpu-core && \
    npm run build --workspace=api-server

# ─── Runtime ────────────────────────────────────────────────────────
FROM node:22-alpine
WORKDIR /app

RUN apk add --no-cache tini

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/dp-schema-public/dist ./packages/dp-schema-public/dist
COPY --from=builder /app/packages/dp-schema-public/package.json ./packages/dp-schema-public/
COPY --from=builder /app/packages/dpu-core/dist ./packages/dpu-core/dist
COPY --from=builder /app/packages/dpu-core/package.json ./packages/dpu-core/
COPY --from=builder /app/api-server/dist ./api-server/dist
COPY --from=builder /app/api-server/package.json ./api-server/

ENV NODE_ENV=production
ENV PORT=3200
ENV DB_PATH=/data/proof.db

VOLUME ["/data"]
EXPOSE 3200

ENTRYPOINT ["tini", "--"]
CMD ["node", "api-server/dist/index.js"]
