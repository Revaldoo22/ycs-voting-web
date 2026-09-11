# ---- build stage ----
FROM node:22-alpine AS build
WORKDIR /app

# Install semua deps (termasuk dev) untuk build.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Variabel NEXT_PUBLIC_* dibaca Next saat BUILD, bukan saat container jalan,
# karena nilainya ikut ter-bundle ke JavaScript yang dikirim ke browser.
# Karena itu harus lewat build arg, bukan environment variable biasa.
# Di Dokploy: isi di bagian Build Arguments, bukan Environment.
#
# ARG diberi nilai bawaan, bukan dibiarkan kosong. ARG tanpa nilai disetel
# Docker menjadi string KOSONG, bukan tidak ada, sehingga fallback di kode
# terlewati dan build gagal jauh dari penyebabnya.
ARG NEXT_PUBLIC_SITE_URL=https://idola.stekom.ac.id
ARG NEXT_PUBLIC_GA_ID=
ARG NEXT_PUBLIC_CLARITY_ID=
ARG NEXT_PUBLIC_GOOGLE_VERIFICATION=
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_GA_ID=$NEXT_PUBLIC_GA_ID \
    NEXT_PUBLIC_CLARITY_ID=$NEXT_PUBLIC_CLARITY_ID \
    NEXT_PUBLIC_GOOGLE_VERIFICATION=$NEXT_PUBLIC_GOOGLE_VERIFICATION \
    NODE_OPTIONS=--dns-result-order=ipv4first

RUN npm run build

# ---- runtime stage ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Jalan sebagai pengguna biasa, bukan root.
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Output standalone sudah memuat node_modules yang benar-benar dipakai saja,
# jadi tidak perlu menyalin seluruh folder node_modules.
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

# server.js dihasilkan output standalone, bukan file buatan sendiri.
CMD ["node", "server.js"]
