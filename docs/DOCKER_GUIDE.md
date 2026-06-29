# Docker Deployment Guide — UHAMKA Bot

## Quick Start

```bash
# 1. Clone / upload project
cd /opt && mkdir uhamka-bot && cd uhamka-bot
# Upload files

# 2. Setup environment
cp .env.example .env
nano .env   # Isi semua API key

# 3. Build dan jalankan
docker-compose up -d --build

# 4. Cek status
docker-compose ps
docker-compose logs -f bot
```

## Perintah Berguna

```bash
# Restart bot
docker-compose restart bot

# Update setelah perubahan code
docker-compose down && docker-compose up -d --build

# Lihat logs real-time
docker-compose logs -f bot

# Masuk ke container
docker exec -it uhamka-bot sh

# Backup database
docker exec uhamka-postgres pg_dump -U uhamka uhamka_bot > backup.sql

# Health check
curl http://localhost:3000/api/health
```
