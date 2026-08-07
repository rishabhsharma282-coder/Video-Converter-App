# Use Official Node.js LTS image with FFmpeg installed
FROM node:20-alpine

# Install FFmpeg and bash
RUN apk add --no-available --no-cache ffmpeg bash

# Set working directory
WORKDIR /app

# Copy root and package configuration
COPY package*.json ./
COPY client/package*.json ./client/

# Install server and client dependencies
RUN npm install
RUN cd client && npm install

# Copy application source code
COPY . .

# Build Vite client production assets
RUN npm run build:client

# Expose port
EXPOSE 5000

# Environment variables
ENV PORT=5000
ENV NODE_ENV=production

# Start Express application
CMD ["npm", "start"]
