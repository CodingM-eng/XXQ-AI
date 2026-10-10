# Firebase Google sign-in setup

Firebase proves *who* signed in; this server decides *whether they may enter* (invitation, status, expiry) and issues its own HttpOnly session cookie.

1. Firebase console > Authentication > Sign-in method > enable **Google**.
2. Authentication > Settings > Authorized domains: make sure `localhost` (and your production domain) is listed.
3. Project settings > Your apps > add a **Web app**; copy its config into `public/firebase-config.js`.
4. Copy `.env.example` to `.env`, set `FIREBASE_PROJECT_ID`, and add dev invitations in `XXQ_INVITES`.
5. `npm install` (installs `firebase-admin`), then `npm run dev` and open http://127.0.0.1:3000.
6. Sign in with `codingdevelopia@gmail.com` (bootstrapped as the protected super administrator) or an invited email.

Limits of this development server: users and sessions are in memory (lost on restart); the PostgreSQL adapter replaces them in Phase 2. The page must be served by this server (same origin) for the login API and cookie to work; it does not work from `file://` or from the claude.ai preview.
