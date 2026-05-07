# DevTools Landing

Internal landing page for developer tools. Engineers see a directory of links;
admins sign in to add, edit and remove them.

Stack: Node.js 20 + Express + TypeScript, MongoDB, React, Docker, GitHub Actions.

## Run

```bash
cp .env.example .env          # set JWT_SECRET and ADMIN_PASSWORD
docker compose up --build
```

Open http://localhost:3000 and sign in at `/login` with the credentials from
`.env`. The first admin user is created automatically on first boot.

## API

Public:
- `GET /api/health`
- `GET /api/links`
- `POST /api/auth/login` → `{ token }`

Admin (Bearer token):
- `POST /api/links`
- `PUT /api/links/:id`
- `DELETE /api/links/:id`

A link has `title` and `url` (required), plus `description`, `icon`,
`category`, `color`, `order`.

## Config

| Variable          | Required        | Default                                |
| ----------------- | --------------- | -------------------------------------- |
| `JWT_SECRET`      | yes             | —                                      |
| `ADMIN_PASSWORD`  | first run only  | —                                      |
| `MONGO_URI`       | no              | `mongodb://mongo:27017/devtools`       |
| `JWT_EXPIRES_IN`  | no              | `12h`                                  |
| `ADMIN_USERNAME`  | no              | `admin`                                |
| `CORS_ORIGIN`     | no              | `*`                                    |

## Tests

```bash
cd server && npm test
```

Uses `mongodb-memory-server`, no external database needed.

## Kubernetes

```bash
kubectl apply -f k8s/
```

Edit `k8s/secret.yaml` and the image tag in `k8s/app.yaml` before applying.

## Security

- bcrypt-hashed passwords (cost 12)
- JWT-protected admin endpoints
- Login rate-limited (20 req / 15 min / IP)
- Helmet with CSP
- Container runs as a non-root user
- All write requests validated with Zod
