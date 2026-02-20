# TextOps Backend

Backend API for TextOps Dashboard. Auth and jobs are stored in **PostgreSQL**; uploaded files are stored on disk.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

3. Start PostgreSQL with Docker Compose:
```bash
docker-compose up -d
```

4. Start the server:
```bash
npm run dev
```

The server will run on `http://localhost:3001`

## API Endpoints

### Auth (no token required)
- `POST /api/auth/register` - Register (body: `{ email, password }`). First user becomes admin.
- `POST /api/auth/login` - Login (body: `{ email, password }`). Returns `{ token, user }`.
- `GET /api/auth/me` - Current user (requires `Authorization: Bearer <token>`).

### Jobs (all require `Authorization: Bearer <token>`)
- `GET /api/jobs` - List jobs (own jobs only; admins see all)
- `GET /api/jobs/:id` - Get a job (owner or admin)
- `POST /api/jobs` - Create a job (multipart/form-data with file)
- `POST /api/jobs/:id/cancel` - Cancel a job
- `DELETE /api/jobs/:id` - Delete a job
- `GET /api/jobs/:id/result` - Get job result

## Environment Variables

See `.env.example` for a full list. Main variables:

- `NODE_ENV` - `development` or `production` (affects logging format)
- `PORT` - Server port (default: 3001)
- `LOG_LEVEL` - Log level: `trace`, `debug`, `info`, `warn`, `error` (default: `debug` in dev, `info` in prod)
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - PostgreSQL connection (required for auth and jobs)
- `JWT_SECRET` - Secret for JWT signing (set in production)
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` - Optional; if set, an admin user is created on startup when it does not exist (logged)
- `CORS_ORIGIN` - Allowed origin for frontend (e.g. `http://localhost:5173`)
- `UPLOAD_DIR`, `MAX_FILE_SIZE` - File upload settings
