FROM oven/bun:1-alpine

WORKDIR /app

# Copiar package.json y package-lock (si existe)
COPY package.json package-lock.json* ./

# Instalar dependencias
RUN bun install --frozen-lockfile

# Copiar el código fuente
COPY . .

# Exponemos el puerto
EXPOSE 4000

# Comando para ejecutar la aplicación
CMD ["bun", "src/server.ts"]
