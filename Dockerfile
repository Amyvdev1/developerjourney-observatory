FROM node:24-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
ENV PORT=4315
ENV BIND_HOST=0.0.0.0
CMD ["npm", "start"]
