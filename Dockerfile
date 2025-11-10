# Install dependencies only when needed
FROM node:22-alpine AS deps

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.

RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install 

# Rebuild the source code only when needed
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image, copy all the files and run next
FROM node:20-alpine AS runner
WORKDIR /app

# ENV NODE_ENV production
ENV NODE_ENV cluster

RUN addgroup -g 1001 -S nodejs
RUN adduser -S obuser -u 1001
RUN chown -R 1000:1000 /app
USER 1000

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./dist
# This is necessary in order to the service pick the env vars from package.json!!
COPY package.json ./

USER obuser

EXPOSE 4000
ENV PORT 4000

CMD ["npm", "run", "start:prod" ]