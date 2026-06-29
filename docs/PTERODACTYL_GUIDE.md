# Pterodactyl Deployment Guide — UHAMKA Bot

## Persyaratan Server
- RAM: 512MB minimum (rekomendasi 1GB)
- Storage: 2GB+
- Node.js Egg (versi 20+)

## Langkah-Langkah

### 1. Buat Server di Pterodactyl
- Admin → Servers → Create New
- Pilih Node.js egg
- Docker Image: `ghcr.io/pterodactyl/yolks:nodejs_20`

### 2. Startup Command
```
npm install && npx prisma generate && npx prisma migrate deploy && npm run build && npm start
```

### 3. Environment Variables
Tambahkan semua dari `.env.example` di tab Startup.
`DATABASE_URL` harus berupa PostgreSQL eksternal (Supabase/Railway).

### 4. Upload Files
Upload isi folder project (kecuali `node_modules/`, `dist/`, `.env`, `logs/`).

### 5. Start
Klik Start. Monitor log untuk memastikan bot berjalan.
