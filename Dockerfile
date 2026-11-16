

# Usar una version LTS explicita de Node.js.
FROM node:24.22.3-alpine3.24
# Establecer el directorio de trabajo
WORKDIR /app
# Copiar los archivos de configuración de npm
COPY package*.json ./
# Instalar las dependencias de Node.js
RUN npm ci --omit=dev
# Instalar Chromium y sus dependencias
RUN apk update && apk upgrade && \
    apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont
# npm y Yarn se usan solo durante la construcción, no en la API en ejecución.
RUN rm -rf /usr/local/lib/node_modules/npm /opt/yarn-* && \
    rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/yarn /usr/local/bin/yarnpkg
# Configuración de ejecución; Chromium se administra con los parches de Alpine.
ENV NODE_ENV=production \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
# Copiar el resto del código de la aplicación
COPY . .
# Exponer el puerto que tu aplicación utiliza (si aplica)
EXPOSE 3000
USER node
# Comando para iniciar la aplicación
CMD ["node", "index.js"]
