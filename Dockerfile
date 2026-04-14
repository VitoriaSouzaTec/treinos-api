FROM node:20-alpine AS builder

# Install dependencies needed for Prisma
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

COPY package*.json ./
# Copy prisma directory first to take advantage of layer caching
COPY prisma ./prisma/

RUN npm install

COPY . .

# Generate Prisma client and build the app
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner

# Install runtime dependencies for Prisma
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

# Copy compiled code from builder
COPY --from=builder /app/dist ./dist

# Copy the generated Prisma client files (including engine binaries)
# Since the output is custom (src/generated/prisma), we copy it into the runner
# This ensures that the engine binaries, which tsc might skip, are present.
COPY --from=builder /app/src/generated ./src/generated

EXPOSE 3000

# Using the production start command from package.json
CMD ["npm", "run", "start:prod"]