# =============================================
# Frontend Dockerfile — Multi-stage build
# =============================================

# --- Stage 1: Build React app ---
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files trước (tối ưu cache)
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build production bundle (Vite bake env vars vào bundle)
# VITE_API_BASE_URL=/api sẽ được inject qua ARG → ENV
ARG VITE_API_BASE_URL=/api
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

RUN npm run build

# --- Stage 2: Serve với Nginx ---
FROM nginx:alpine AS runner

# Xóa config mặc định của Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy React build output từ stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose cổng HTTP
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
