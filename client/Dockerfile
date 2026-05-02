FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5173
# --host exposes Vite dev server on 0.0.0.0 so the browser can reach it from fuera del contenedor
CMD ["npx", "vite", "--host"]
