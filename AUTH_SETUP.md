# Authentication setup and checks

## Google ID-token login

Use a Google OAuth client of type **Web application**. Set the same public client ID in:

- Root `.env`: `VITE_GOOGLE_CLIENT_ID` (Docker Compose build argument).
- `frontend/.env`: `VITE_GOOGLE_CLIENT_ID` (Vite development).
- `backend/.env`: `GOOGLE_CLIENT_ID` (ID-token audience verification).

Docker Compose does not automatically read `frontend/.env` for `${...}` interpolation.
The frontend receives this value at build time; restarting an old image is insufficient.
No Google client secret is needed for the current ID-token verification flow.

In Google Cloud Console, add the exact browser origins under Authorized JavaScript origins:

- `http://localhost` for Docker/Nginx.
- `http://localhost:5173` for Vite development.
- Add any other hostname/port actually used separately. Production requires HTTPS.

Use `GoogleLogin`'s `credential` response. The `useGoogleLogin` OAuth access-token response is not an ID token and cannot be passed to this API.

Google setup: https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid

## SMTP for registration and password recovery

Configure real credentials in `backend/.env`; placeholders cannot send email:

```dotenv
MAIL_HOST=smtp.gmail.com
MAIL_PORT=465
MAIL_SECURE=true
MAIL_USER=your-real-sender-address
MAIL_PASSWORD=your-app-password
```

For Gmail, use an eligible account's App Password, not its normal password. Do not paste credentials into chat or commit them. For SMTP port 587 use `MAIL_SECURE=false` (STARTTLS); TLS certificate verification stays enabled.

Missing SMTP configuration now returns HTTP 503 promptly. Registration does not create an account before OTP verification. Failed email delivery removes pending OTP data; password-recovery email failures restore the send allowance.

SMTP: https://nodemailer.com/smtp
Gmail App Passwords: https://support.google.com/accounts/answer/185833

## Local startup

```powershell
docker compose up -d --build backend frontend
```

For Vite against the Docker backend, use `VITE_API_BASE_URL=/api`; the development proxy forwards to host port 5001. For a separately started local backend on port 5000, use `VITE_API_BASE_URL=http://localhost:5000/api` instead.

`TRUST_PROXY=1` is configured for the single Nginx proxy deployment. Do not expose the backend directly on an untrusted network with this setting.

## API contracts

All paths below are under `/api/auth`:

| Method | Path | Body |
| --- | --- | --- |
| POST | `/login` | `email`, `password` |
| POST | `/google-login` | `idToken` |
| POST | `/register` | `fullName`, `email`, `password` |
| POST | `/verify-otp` | `email`, `otpCode` (six-digit string) |
| POST | `/forgot-password` | `email` |
| PUT | `/reset-password` | `email`, `otpCode`, `newPassword` |
| POST | `/refresh-token` | `refreshToken` |
| POST | `/logout` | Bearer access token in Authorization header |

OTP verification returns success, not login credentials. The registration UI redirects to login. Password reset revokes the refresh session; already issued access tokens remain valid until expiry. Logout revokes the refresh session and blacklists the submitted access token for its remaining lifetime.

## Regression tests

```powershell
cd backend
npm run test:auth
```

Requires Node 22.3+ with experimental module mocks. Tests exercise actual Express routes, validators, controllers, auth service, bcrypt, and JWT with isolated database, Redis, SMTP, Google, and rate-limit doubles. They do not send email or change existing accounts. External SMTP delivery, Google Console settings, and production Redis rate limits still require separate verification.
