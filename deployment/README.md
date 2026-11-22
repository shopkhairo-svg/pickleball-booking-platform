# Production deployment

## Current public domains and Cloudflare Tunnel

- App and admin: https://pickleballsytems.io.vn
- API base: https://api.pickleballsytems.io.vn/api
- Swagger: https://api.pickleballsytems.io.vn/api-docs/

The regular [Compose file](../docker-compose.yml) defaults to these public URLs.
Its frontend build argument `VITE_API_BASE_URL` and backend environment variables
`FRONTEND_URL` / `CORS_ORIGINS` can be overridden in the repository root `.env`.
`FRONTEND_URL` is the app origin without a path. `CORS_ORIGINS` accepts additional
comma-separated origins and includes the API origin so Swagger can send requests.
Changing `backend/.env` alone does not override values in Compose's `environment`.

With the tunnel running on the same Windows host as Docker, publish
`pickleballsytems.io.vn` to `http://localhost:80` and
`api.pickleballsytems.io.vn` to `http://localhost:5001`. Leave the tunnel path empty:
the backend already serves `/api`, `/api-docs/` and `/uploads/`.

After backend CORS changes, run from the repository root:

```sh
docker compose up -d --no-deps --build backend
docker compose exec -T frontend nginx -s reload
```

After changing `VITE_API_BASE_URL`, rebuild the frontend too:

```sh
docker compose up -d --no-deps --build frontend
```

For a separate always-on VM, use the production stack below. Swagger is also
available directly at `https://API_DOMAIN/api-docs/`; a separate docs domain is optional.

The production Compose stack runs the frontend, API, MongoDB, Redis, and Caddy on a persistent Linux VM. Caddy is the only public container: it accepts HTTP/HTTPS, obtains and renews TLS certificates, and routes the three hostnames. The frontend and admin share the application hostname (`APP_DOMAIN`); the API and Swagger UI use `API_DOMAIN` and `DOCS_DOMAIN`.

## DNS and host setup

1. Register one domain and create A records for the root/app hostname plus `api` and `docs`, all pointing to the VM's static public IPv4 address. Use a VM firewall that permits inbound TCP 22 (ideally only from your IP), TCP 80, and TCP 443. Port 443/UDP is optional for HTTP/3.
2. Install Docker Engine with the Compose plugin on an always-on Linux VM. Do not use the laptop as the production host.
3. Clone this repository on the VM. Copy `deployment/env.example` to `deployment/env` and set the actual hostnames and Google OAuth client ID. Copy `backend/.env.example` to `backend/.env.production` and configure unique JWT secrets, Google OAuth, Gmail SMTP, and Cloudinary credentials. Keep these files private; they are ignored by Git.
4. Add the app hostname to the Google OAuth client's authorized JavaScript origins. Use the same client ID in `backend/.env.production` and `deployment/env`.
5. Start the production stack from the repository root:

   ```sh
   docker compose --env-file deployment/env -f docker-compose.production.yml up -d --build
   ```

6. Check `docker compose -f docker-compose.production.yml ps` and logs. The app/admin is `https://APP_DOMAIN`, API base is `https://API_DOMAIN/api`, and Swagger is `https://DOCS_DOMAIN`.

MongoDB and Redis have persistent Docker volumes and no public host ports. Only Caddy publishes web ports. Do not run `backend/src/seed.js` on production: it drops the selected database before seeding. Back up MongoDB off-host regularly before using real customer data. VM uptime does not protect against provider/region failure or accidental deletion.

The listed VM and domain prices are estimates that change by provider, region, tax, and registration period. The owner must register/pay for the domain and VM in their own account. This repository only prepares deployment; it does not create cloud resources or transfer local MongoDB data.
