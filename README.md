# PBCTF 5.0

> Registration, team formation, and evaluation platform for **PBCTF 5.0** — Point Blank's Capture the Flag competition.

PBCTF 5.0 is a Capture the Flag competition spanning web exploitation, reverse
engineering, cryptography, forensics, and more. This repository is the web
platform that powers it: a public landing page plus authenticated portals for
participants, admins, and evaluators.

## Features

### Participants

- Email/Google sign-in and individual registration (resume + profile photo upload)
- Team creation and joining via unique team codes (teams of two)
- "Looking for a team" / "looking for members" discovery and join requests
- Personal dashboard with team status and RSVP for shortlisted teams

### Admins

- Browse and search all participants and teams
- Assign teams to evaluators and promote users to admin/evaluator
- Export registration data

### Evaluators

- View assigned teams, score submissions, and vote

## Tech Stack

- **Framework:** [Next.js 13](https://nextjs.org) (App Router) + React 18 + TypeScript
- **Database:** MongoDB via [Mongoose](https://mongoosejs.com)
- **Auth:** [Firebase Authentication](https://firebase.google.com/docs/auth) (client SDK + Admin SDK for token verification)
- **File storage:** [Cloudinary](https://cloudinary.com) (resumes, profile photos)
- **Styling:** Tailwind CSS + a small set of [shadcn/ui](https://ui.shadcn.com) primitives
- **Landing visuals:** GSAP, Framer Motion, Three.js / postprocessing, face-api.js, Tone.js
- **Analytics & abuse prevention:** PostHog, Google reCAPTCHA v3

## Getting Started

### Prerequisites

- Node.js 18+
- A MongoDB database (Atlas or self-hosted)
- Firebase project (Authentication enabled) + service-account credentials
- Cloudinary account
- Google reCAPTCHA v3 keys

### Installation

```bash
git clone https://github.com/pointblank-club/pbctf.git
cd pbctf
npm install
```

### Environment variables

Create a `.env.local` file in the project root:

```bash
# Database
MONGODB_URI=

# Firebase — client (public)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

# Firebase — Admin SDK (server)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Cloudinary (server)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# reCAPTCHA v3
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=
RECAPTCHA_SECRET_KEY=
RECAPTCHA_MIN_SCORE=0.5

# PostHog analytics
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=

# Role registration codes & misc secrets
ADMIN_CODE=
EVALUATOR_CODE=
FLAG_SECRET=
VALID_REFERRAL_CODES=
```

### Run

```bash
npm run dev      # start the dev server at http://localhost:3000
npm run build    # production build
npm run start    # serve the production build
npm run lint     # run ESLint
```

## Project Structure

```text
app/                 Next.js App Router
  api/               Route handlers (REST API)
  dashboard/         Participant, admin, and evaluator dashboards
  (auth pages)       login, register, forgot-password, evaluator/*, admin/*
  page.tsx           Public landing page
components/
  landing/           Marketing landing page (GSAP/Three.js/face-api)
  registration/      Dashboard & registration UI
  ui/                shadcn/ui primitives in use
  providers/         Auth and PostHog context providers
  auth/              Role guards and email verification
hooks/               Reusable React hooks (auth, recaptcha, toast)
lib/                 DB connection, middleware, API config, utilities
models/              Mongoose schemas (User, Team, Evaluator, ...)
data/                Static content (shortlisted teams)
public/              Static assets
```

## API

REST endpoints live under [`app/api`](app/api) as Next.js route handlers and are
grouped by area: `user/`, `team/`, `admin/`, `evaluator/`, plus `me/bootstrap`
(aggregated dashboard data), `analytics`, and `config/deadline`. Requests are
authenticated with a Firebase ID token (`Authorization: Bearer <token>`) and
authorized by role in [`lib/middleware/auth.ts`](lib/middleware/auth.ts). The
client-side endpoint map is centralized in [`lib/api-config.ts`](lib/api-config.ts).
