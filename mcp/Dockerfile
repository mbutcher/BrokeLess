FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY dist/ ./dist/

ENV BUDGET_APP_URL=http://budget_backend:3001/api/v1
ENV BUDGET_APP_API_KEY=""

CMD ["node", "dist/index.js"]
