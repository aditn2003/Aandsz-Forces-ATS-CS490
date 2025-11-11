FROM node:18-alpine

WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

EXPOSE 4000

# Adjust if your start script is different
CMD ["node", "server.js"]
