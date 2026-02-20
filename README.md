# TextOps Backend

Simple backend API for TextOps Dashboard that accepts API calls from the frontend.

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

- `PORT` - Server port (default: 3001)
- `DB_HOST` - Database host (default: localhost)
- `DB_PORT` - Database port (default: 5432)
- `DB_NAME` - Database name (default: textops)
- `DB_USER` - Database user (default: textops_user)
- `DB_PASSWORD` - Database password (default: textops_password)
- `MAX_FILE_SIZE` - Maximum file size in bytes (default: 104857600 = 100MB)
- `UPLOAD_DIR` - Directory for uploaded files (default: ./uploads)
- `JWT_SECRET` - Secret for JWT signing (default: dev-only secret; set in production)
