FROM node:20-alpine

# Install system dependencies: ffmpeg, python3 (required by yt-dlp), curl, and ca-certificates
RUN apk add --no-cache \
    ffmpeg \
    python3 \
    curl \
    ca-certificates \
    bash

# Download and install the latest yt-dlp binary directly to ensure compatibility with YouTube updates
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

# Set working directory
WORKDIR /app

# Copy package lock and package manifest
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Install tsx and typescript inside the container to execute the worker script directly without pre-compiling
RUN npm install -D tsx typescript @types/node

# Copy all source files
COPY . .

# Set environment
ENV NODE_ENV=production

# Command to boot the background worker
CMD ["npx", "tsx", "src/worker.ts"]
