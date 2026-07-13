# NOT node:22-alpine: Vite 8's bundler (rolldown) ships a native binding with
# no musl build, so it fails to load on Alpine. slim (Debian, glibc) works.
FROM node:22-slim

WORKDIR /app

# Only package.json, NOT package-lock.json: the committed lockfile was
# generated on Windows, and its resolved entry for Vite 8's bundler (rolldown)
# only covers the win32 native binding — npm then skips installing the
# Linux one even with plain `npm install` (reproduced: with the lockfile
# copied in, node_modules/@rolldown has no binding-linux-x64-gnu at all; drop
# it and npm resolves optional deps fresh for the actual build platform).
COPY package.json ./

RUN npm install

COPY . .

# Vite inyecta las variables VITE_* en el bundle del cliente durante el build
# (import.meta.env.VITE_X) — a diferencia de las variables del backend, no
# sirve pasarlas recien en runtime via `environment:`, tienen que estar
# presentes ANTES de `npm run build`.
ARG VITE_API_BASE_URL
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_POSTHOG_KEY
ARG VITE_POSTHOG_HOST
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY \
    VITE_POSTHOG_KEY=$VITE_POSTHOG_KEY \
    VITE_POSTHOG_HOST=$VITE_POSTHOG_HOST

RUN npm run build

EXPOSE 3000

# `vite preview` sirve el build de TanStack Start (SSR) tal cual se sirve en
# producción — confirmado sirviendo HTML renderizado en el servidor, no solo
# el shell estatico. --host 0.0.0.0 es necesario para que el puerto publicado
# por Docker (-p 3000:3000) pueda alcanzar el proceso dentro del contenedor.
CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "3000"]
