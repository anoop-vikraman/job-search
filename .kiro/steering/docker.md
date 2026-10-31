---
inclusion: fileMatch
fileMatchPattern: ['docker-compose*.yml', 'compose*.yml', '**/Dockerfile*', 'backend/alembic/**', 'backend/app/db/**', 'backend/app/core/config.py']
---

# Docker (Local Dev & Integration Tests)

## Database Container
- Image: `postgres:16-alpine`
- Container name: `tweak_postgres`
- Port: `5432` (bind to `127.0.0.1` on host; not exposed to LAN)
- Credentials from `.env` (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`); never hard-code passwords in compose files.

## Healthcheck
- Must use `pg_isready -U postgres`.
- Dependent services start only when DB is healthy (`depends_on.condition: service_healthy`).

## Persistence
- Named volume `postgres_data` mounted at `/var/lib/postgresql/data`.
- `docker compose down -v` deletes all data; avoid unless a reset is intended.

## Network
- Bridge network linking `backend` and `postgres` services.
- Backend connects via service name, not `localhost`:
  `postgresql+asyncpg://<user>:<password>@postgres:5432/<db>`

## Reference
```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: tweak_postgres
    env_file: .env
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 10
    networks:
      - tweak_network

  backend:
    build: ./backend
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - tweak_network

volumes:
  postgres_data:

networks:
  tweak_network:
    driver: bridge
```
