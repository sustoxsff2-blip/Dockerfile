FROM ghcr.io/puppeteer/puppeteer:latest

USER root
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Puerto que usa Render
EXPOSE 3000

CMD ["node", "index.js"]
