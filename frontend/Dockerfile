# ------------------------------------------------------------------
# Imagen del frontend, en 2 etapas:
#   1. Node compila la página (npm run build -> carpeta dist/).
#   2. Nginx sirve esos archivos y reenvía /api/ y /admin/ al backend.
# La imagen final solo tiene Nginx y la página ya compilada (sin Node).
#
# No se usa sola: la arranca docker compose (proyecto-backend/deploy/).
# ------------------------------------------------------------------

# ---- Etapa 1: compilar ----
FROM node:22-alpine AS build
WORKDIR /app

# Primero solo las dependencias: si package*.json no cambian, Docker reutiliza
# este paso y las siguientes construcciones son más rápidas.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# En el servidor el panel siempre usa la API de Django (con login).
ARG VITE_DATA_SOURCE=api
ENV VITE_DATA_SOURCE=$VITE_DATA_SOURCE
RUN npm run build

# ---- Etapa 2: servir con Nginx ----
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
