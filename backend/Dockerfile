FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# RUN npx prisma generate
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
# Copy Prisma client đã được generate từ builder (output = ../src/generated/prisma)
COPY --from=builder /app/src/generated ./src/generated
EXPOSE 3000
CMD ["node", "dist/main"]