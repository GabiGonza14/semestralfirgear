FROM oven/bun:1-alpine

WORKDIR /app

# Copiar package.json y bun.lock para aprovechar la cache de capas
COPY package.json bun.lock ./

# Instalar dependencias usando el lockfile (evita resolver versiones nuevas/incompatibles)
RUN bun install --frozen-lockfile

# Copiar el código fuente
COPY . .

# Exponemos el puerto
EXPOSE 4000

# Comando para ejecutar la aplicación
CMD ["bun", "src/server.ts"]
