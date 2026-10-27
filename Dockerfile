# syntax=docker/dockerfile:1
FROM node:20-alpine AS runner

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install --production

# Copy application code
COPY . .

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

# Expose server port
EXPOSE 8080

# Persist data folder
VOLUME ["/app/data"]

# Run CarePoint server
CMD ["npm", "start"]
