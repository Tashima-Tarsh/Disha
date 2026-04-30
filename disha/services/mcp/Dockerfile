FROM node:22-slim AS build
WORKDIR /app

COPY package.json package-lock.json tsconfig.json server.json ./
COPY src ./src
COPY api ./api
COPY README.md ./README.md

RUN npm ci
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/README.md ./README.md

RUN addgroup --system --gid 10001 appuser \
  && adduser --system --uid 10001 appuser
USER appuser

EXPOSE 4000
CMD ["node", "dist/http.js"]
