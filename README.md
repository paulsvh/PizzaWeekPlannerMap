# Pizza Week Planner Map

A private planning app for my friends and me to coordinate our attack on
[**The Portland Mercury's Pizza Week 2026**](https://www.portlandmercury.com/pizza-week)
(April 20–26) — an interactive map of the ~70 participating restaurants
with starring, optimized bicycling routes between your starred stops,
and a community leaderboard of saved routes.

The aesthetic is "Portland alt-weekly broadsheet" — Bodoni Moda display
type, newsprint cream, pizza-sauce red accent, halftone dot texture.
Mobile-first because the primary device is a phone in one hand and a
slice in the other.

> Pizza Week itself is a project of the Portland Mercury. This app is an
> unaffiliated fan tool. All restaurant data is sourced from the public
> Pizza Week listings on [EverOut Portland](https://everout.com/portland/events/the-portland-mercurys-pizza-week-2026/e222744/).

---

## Features

- **Interactive map** of every participating Pizza Week restaurant, with
  click-to-reveal details (name, address, custom pizza, price, photo).
- **Per-user starring** — each friend has their own shortlist.
- **Plot Route mode** — toggle on, get the optimal bicycling route
  through your starred stops via the Google Directions API with
  waypoint optimization.
- **Save routes** and share them with the group.
- **Saved-routes leaderboard** with per-route detail pages and voting.
- **Shared-passcode auth** — single passcode for the group, each friend
  picks a display name on first visit. No email, no OAuth, no signup.
- **Mobile-first UI** — designed for a phone held in a grease-stained
  hand.

---

## Stack

| Layer         | Choice                                                                 |
| ------------- | ---------------------------------------------------------------------- |
| Framework     | [Next.js 16](https://nextjs.org) (App Router, Turbopack)               |
| UI            | [React 19](https://react.dev) + [Tailwind CSS v4](https://tailwindcss.com) (CSS-first config) |
| Typography    | [Bodoni Moda](https://fonts.google.com/specimen/Bodoni+Moda) + [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono) via `next/font` |
| Auth          | Shared passcode → [`jose`](https://github.com/panva/jose)-signed JWT in HttpOnly cookie |
| Database      | [Cloud Firestore](https://firebase.google.com/docs/firestore) via Firebase Admin SDK (server-side only) |
| Maps          | [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript) + Directions API (bicycling, `optimizeWaypoints: true`) |
| Validation    | [`zod`](https://zod.dev)                                               |
| Scraping      | [`undici`](https://github.com/nodejs/undici) + [`cheerio`](https://cheerio.js.org) |
| Hosting       | [Vercel](https://vercel.com)                                           |

Client code never touches Firebase directly — every read and write goes
through Next.js Server Actions or Route Handlers gated by the session
cookie, and the Firebase **Admin** SDK runs server-side with
service-account credentials. Firestore security rules are locked to
`deny-all` so even a leaked Web SDK config wouldn't expose anything.

---

## Architecture

```
Browser
  │
  │  [ passcode + display name ]
  ▼
Server Action  ──────▶  Firebase Admin SDK  ──────▶  Firestore
  │                     (bypasses rules,               │
  │                      service account auth)         │
  │  [ HttpOnly JWT cookie ]                           │
  ▼                                                    │
proxy.ts  ──── redirects unauthed visitors to /login   │
  │                                                    │
  ▼                                                    │
Server Components / Route Handlers                     │
  │  [ verifySession() from lib/auth/dal.ts ]         │
  ▼                                                    │
Data Access Layer  ──────────────────────────────────▶ ┘
```

### Data model (Firestore)

| Collection    | Document ID                        | Fields                                                                                                    |
| ------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `users`       | auto                               | `displayName`, `displayNameLower`, `createdAt`                                                            |
| `restaurants` | slug (e.g. `scotties-pizza-parlor`) | `name, address, lat, lng, pizzaName, pizzaDescription, price, imageUrl, sourceUrl, createdAt`             |
| `stars`       | `${userId}_${restaurantId}`         | `userId, restaurantId, createdAt`                                                                         |
| `routes`      | auto                               | `creatorUserId, creatorDisplayName, stopRestaurantIds[], originLat, originLng, encodedPolyline, totalDistanceMeters, voteCount, createdAt` |
| `votes`       | `${userId}_${routeId}`              | `userId, routeId, createdAt`                                                                              |

Composite document IDs (`stars`, `votes`) give free idempotency on
toggle — trying to create a star that already exists is a no-op.

### Routing

| Path                   | What it does                                                          |
| ---------------------- | --------------------------------------------------------------------- |
| `/login`               | Broadsheet login page (Server Action + `useActionState`)              |
| `/`                    | Full-screen Google Map with restaurant pins, stars, and Plot Route    |
| `/routes`              | Mobile card list of saved routes, sortable by date or votes           |
| `/routes/[routeId]`    | Route detail with embedded map, stops, creator, distance, vote button |

---

## Running locally

### Prerequisites

- **Node.js 20+** (development uses Node 24)
- A **Firebase project** with Firestore enabled
- A **Google Maps Platform** browser API key (see below)

### 1. Clone and install

```bash
git clone https://github.com/paulsvh/PizzaWeekPlannerMap.git
cd PizzaWeekPlannerMap
npm install
```

### 2. Set up Firebase

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. **Build → Firestore Database → Create database** (Production mode, pick a region close to you)
3. **Project settings → Service accounts → Generate new private key** — this downloads a JSON file. **Store it outside the project directory**, e.g. `~/.secrets/firebase/your-project-admin.json`
4. Lock down Firestore rules to `deny-all` (the app uses the Admin SDK which bypasses rules):

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if false;
       }
     }
   }
   ```

### 3. Set up Google Maps

1. Upgrade your Firebase project to the **Blaze (pay-as-you-go)** plan — required for the Maps API. The Maps Platform free tier ($200/month credit) will cover this app's usage many times over for a small private group.
2. [GCP Console → APIs & Services → Credentials → Create credentials → API key](https://console.cloud.google.com/apis/credentials)
3. Enable these APIs for the project: **Maps JavaScript API**, **Directions API**
4. On the key, set **Application restrictions → HTTP referrers** and add:
   - `http://localhost:3000/*`
   - (add your production domain later)
5. **API restrictions** → restrict to Maps JavaScript API + Directions API only
6. Set a **budget alert** at `$10/month` under GCP Billing → Budgets & alerts as a safety net

### 4. Configure environment variables

```bash
cp .env.local.example .env.local
```

Then fill in `.env.local`:

```bash
# Pick something memorable you can share verbally with friends
APP_PASSCODE=hotslice2026

# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
SESSION_SECRET=...

# From the service account JSON
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n"

# Your browser-restricted Maps key
NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY=AIzaSy...
```

`FIREBASE_PRIVATE_KEY` can contain literal `\n` escapes — `lib/env.ts`
converts them to real newlines at read time. Keep the surrounding
double quotes.

### 5. Seed the restaurant data

```bash
npm run scrape   # fetches from EverOut, writes data/restaurants.json
npm run seed     # upserts into Firestore
```

### 6. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), enter your
passcode and a display name, and you're in.

---

## Deploying

The app is designed for Vercel, but will run on anything that can host
Next.js 16 in Node.js runtime mode (Firebase Admin SDK needs Node, not
Edge).

1. Push to GitHub
2. Import the repo on [vercel.com/new](https://vercel.com/new)
3. Add all the environment variables from `.env.local` in the Vercel
   project settings. For `FIREBASE_PRIVATE_KEY`, paste the key with
   real newlines (not `\n` escapes) — Vercel's UI accepts multi-line
   values.
4. After the first deploy, go back to the GCP API key and add your
   production domain to the HTTP referrer restriction list.
5. Test on an actual phone over cellular, not just WiFi.

---

## Project structure

```
PizzaWeekPlannerMap/
├── app/
│   ├── layout.tsx             Root layout, fonts, metadata
│   ├── page.tsx               Map view (home)
│   ├── globals.css            Tailwind + broadsheet design tokens
│   ├── login/
│   │   ├── page.tsx           The broadsheet login page
│   │   └── actions.ts         Server Action — passcode validation
│   ├── routes/                Saved routes list + detail (Phase 6)
│   └── api/                   Route Handlers (Phase 3+)
├── components/                UI components (Phase 3+)
├── lib/
│   ├── env.ts                 Lazy, typed env var access
│   ├── types.ts               Shared TypeScript types
│   ├── firebase/admin.ts      Admin SDK singleton
│   └── auth/
│       ├── session.ts         jose JWT sign/verify, cookie management
│       └── dal.ts             verifySession() via React cache()
├── scripts/
│   ├── scrape-everout.ts      Restaurant data scraper (Phase 2)
│   └── seed-firestore.ts      Firestore seeder (Phase 2)
├── proxy.ts                   UX-only redirect (not a security layer)
└── .env.local.example         Env var template
```

---

## A note on auth

This app intentionally uses a **shared passcode** rather than real
per-user identity. Any friend who knows the passcode can pick any
display name they want on a fresh session — there's no impersonation
protection. This is a deliberate trade-off for a small private group
where the alternative (email/OAuth/magic links) is more friction than
it's worth for a 10-day event. Don't use this pattern for anything
that actually matters.

The **`deny-all` Firestore rules** plus **Admin SDK server-side only**
pattern means that even if the passcode leaks, the attacker still
needs to guess a valid display name or pick a fresh one to start
writing data — and they can't read anyone else's data directly from
Firestore. The worst-case breach is "someone crashes our pizza crawl,"
not "data exfiltration."

---

## Credits

- **Portland Pizza Week** is produced annually by [**The Portland Mercury**](https://www.portlandmercury.com) — go read their paper and buy slices at the participating restaurants.
- Restaurant data is sourced from the public [**EverOut Portland**](https://everout.com/portland) listings.
- Built with [Claude Code](https://claude.com/claude-code).

## License

MIT — fork it and plan your own city's pizza crawl.
