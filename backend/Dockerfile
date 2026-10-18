# ---- Backend Dockerfile ----
# Sử dụng Node 22 Alpine để image nhỏ gọn
FROM node:22-alpine

# Thư mục làm việc trong container
WORKDIR /app

# Copy package files trước để tận dụng Docker layer cache
COPY package*.json ./

# Chỉ cài production dependencies (bỏ qua nodemon, eslint...)
RUN npm ci --omit=dev

# Copy toàn bộ source code
COPY src/ ./src/

# Expose cổng backend
EXPOSE 5000

# Chạy bằng node (production) thay vì nodemon
CMD ["node", "src/server.js"]
