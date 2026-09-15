FROM node:20-slim AS builder

WORKDIR /app

RUN corepack enable \
  && corepack prepare pnpm@9.15.4 --activate

ENV NX_DAEMON=false
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nx.json tsconfig.base.json ./
COPY eslint.config.mjs jest.config.ts jest.preset.js ./
COPY apps ./apps
COPY libs ./libs

RUN pnpm install --frozen-lockfile

# NEXT_PUBLIC_* is inlined at build time. Browser traffic uses the published host port.
ARG NEXT_PUBLIC_AUDITOR_API_URL=http://localhost:3333
ENV NEXT_PUBLIC_AUDITOR_API_URL=$NEXT_PUBLIC_AUDITOR_API_URL

RUN npx nx build web-portal --prod

FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/apps/web-portal/.next/standalone ./
COPY --from=builder /app/apps/web-portal/.next/static ./apps/web-portal/.next/static
COPY --from=builder /app/apps/web-portal/public ./apps/web-portal/public

EXPOSE 3000

CMD ["node", "apps/web-portal/server.js"]
