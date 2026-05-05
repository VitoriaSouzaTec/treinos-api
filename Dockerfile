FROM node:20-alpine AS builder

# Install dependencies needed for Prisma
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Copy all files first to avoid any "file not found" issues during scripts
COPY . .

# Install all dependencies
RUN npm install

# Build the app (tsc)
RUN npm run build

FROM node:20-alpine AS runner

# Install runtime dependencies for Prisma
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
# Install only production dependencies
RUN npm install --omit=dev --ignore-scripts

# Copy compiled code from builder
COPY --from=builder /app/dist ./dist

# Copy the generated Prisma client files
COPY --from=builder /app/src/generated ./src/generated

EXPOSE 3030

# Using the start command from package.json
CMD ["npm", "run", "start"]