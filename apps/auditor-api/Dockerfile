FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache libc6-compat \
  && corepack enable \
  && corepack prepare pnpm@9.15.4 --activate

ENV NX_DAEMON=false
ENV PNPM_CONCURRENCY=2
ENV UV_THREADPOOL_SIZE=2

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nx.json tsconfig.base.json ./
COPY eslint.config.mjs jest.config.ts jest.preset.js ./
COPY apps ./apps
COPY libs ./libs

RUN pnpm install --frozen-lockfile --child-concurrency 1
RUN npx nx build auditor-api --prod

# Webpack generatePackageJson lists runtime deps; workspace libs are bundled into main.js.
RUN npm install --omit=dev --prefix dist/apps/auditor-api

FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache libc6-compat

ENV NODE_ENV=production
ENV PORT=3333

COPY --from=builder /app/dist/apps/auditor-api ./dist/apps/auditor-api

EXPOSE 3333

CMD ["node", "dist/apps/auditor-api/main.js"]
