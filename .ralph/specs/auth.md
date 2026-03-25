# Authentication Specification

JWT-based auth using httpOnly cookies. Same pattern as MarchMadness.

## Dependencies
- `jsonwebtoken` for token signing/verification
- `bcryptjs` for password hashing
- `cookie` for cookie parsing

## Registration
- POST `/api/auth/register` — accepts `{ username, email, password }`.
- Validate: username 3-20 chars alphanumeric, email valid format, password min 6 chars.
- Hash password with bcryptjs (10 rounds).
- Create User in database.
- Sign JWT with `{ userId, username }`, 7-day expiry.
- Set `token` as httpOnly cookie, return `{ user: { id, username, email } }`.

## Login
- POST `/api/auth/login` — accepts `{ email, password }`.
- Look up user by email, compare password hash.
- Sign JWT, set cookie, return user object.

## Logout
- POST `/api/auth/logout` — clear the `token` cookie.

## Current User
- GET `/api/auth/me` — read JWT from cookie, return user object or 401.

## Middleware Pattern
- API routes call a shared `getAuthUser(req)` helper from `src/lib/auth.ts`.
- This reads the `token` cookie, verifies the JWT, returns the user payload or null.

## Socket.io Auth
- On connection, Socket.io reads the cookie from the handshake headers.
- Parse and verify the JWT. If invalid, reject the connection.
- Attach `userId` and `username` to the socket object for use in event handlers.

## JWT Secret
- `JWT_SECRET` environment variable. Required.

## useAuth Hook (Frontend)
- React context provider wrapping the app (same pattern as MarchMadness).
- On mount, calls `/api/auth/me` to check session.
- Exposes `{ user, login, register, logout, loading }`.
