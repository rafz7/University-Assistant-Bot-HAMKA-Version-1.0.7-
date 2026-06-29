# UHAMKA Bot REST API Documentation

Base URL: `http://localhost:3000`

## Endpoints

### GET /api/health
Health check — no auth required.

**Response:**
```json
{
  "status": "ok",
  "uptime": 3600,
  "version": "1.0.0",
  "memory": { "used": "128MB", "total": "512MB" }
}
```

### GET /api/stats
System statistics — requires Bearer token.

**Response:**
```json
{
  "users": 1000,
  "knowledge": { "total": 50, "byCategory": [] },
  "ai": { "healthy": 4, "providers": [] }
}
```

### POST /api/sync
Trigger knowledge base sync — requires Bearer token.

### GET /api/users?page=1&limit=20
List users — requires Bearer token.

## Authentication
Gunakan JWT token dari sistem admin internal.

## Swagger UI
Akses: `http://localhost:3000/api-docs`
