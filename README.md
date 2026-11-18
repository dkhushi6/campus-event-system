# Campus Event Management System

A web platform where students discover and register for campus events, organizers
publish events and verify entry with QR tickets, and administrators manage users
and view registration/attendance reports.

Built for the Software Engineering mini project. The four modules named in the
project report — **Events**, **Registration**, **QR check-in** and **Alerts** —
are integrated over a single relational database.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS v4 with CSS design tokens (light + dark) |
| Database | SQLite via Prisma 7 (`better-sqlite3` driver adapter) |
| Auth | JWT session in an httpOnly cookie (`jose`), passwords hashed with bcrypt |
| QR | `qrcode` to generate tickets, `html5-qrcode` to scan them |
| Validation | Zod schemas shared by every API route |

No external accounts or services are required — the whole system runs locally.

## Getting started

```bash
npm install          # also runs `prisma generate`
cp .env.example .env # DATABASE_URL + AUTH_SECRET
npm run setup        # create the SQLite schema and seed demo data
npm run dev          # http://localhost:3000
```

### Demo accounts

All seeded accounts share the password **`password123`**.

| Role | Email | What they can do |
|---|---|---|
| Administrator | `admin@campus.edu` | Manage users and roles, view system-wide reports, scan any ticket |
| Organizer | `organizer@campus.edu` | Create/publish events, view attendees, scan tickets, send reminders |
| Organizer | `cultural@campus.edu` | Same, for the cultural events |
| Student | `student@campus.edu` | Browse and register for events, hold QR tickets |

`student2@campus.edu` … `student6@campus.edu` also exist, with registrations and
attendance already recorded so the reports page has real figures in it.

## npm scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run setup` | Generate client, push schema, seed data (first-time setup) |
| `npm run db:push` | Apply `schema.prisma` to the database |
| `npm run db:seed` | Re-seed demo data (clears existing rows first) |
| `npm run db:reset` | Drop everything and re-seed from scratch |
| `npm run db:studio` | Browse the database in Prisma Studio |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

## Data model

Four core entities, matching the ER model in the project report:

```
USER ──1:many──> REGISTRATION <──many:1── EVENT
                      │
                   1:0..1
                      ↓
                 ATTENDANCE
```

- **User** — account details and role (`STUDENT` / `ORGANIZER` / `ADMIN`).
- **Event** — title, description, category, venue, schedule, capacity, status
  (`DRAFT` / `PUBLISHED` / `CANCELLED`); belongs to an organizer.
- **Registration** — links a user to an event and carries the unique
  `ticketCode`. A `@@unique([userId, eventId])` constraint is what makes
  duplicate registration impossible at the database level.
- **Attendance** — created only when a valid QR ticket is scanned. The
  `registrationId` is unique, so one ticket can never be checked in twice.
- **Notification** — the persisted alert feed.

SQLite has no native `enum`, so status/role columns are strings constrained by
the unions in `src/lib/constants.ts`.

## How the modules work

### Events
Organizers create events as drafts and publish them when ready. Only
`PUBLISHED` events appear to students — drafts 404 for everyone but their owner
and admins. The listing supports full-text search over title/description/venue
plus category and date filters, all executed in SQL and held in the URL so a
filtered view can be bookmarked.

### Registration
`POST /api/events/:id/register` follows the order in Figure 4 of the report:
select event → submit → duplicate check → issue QR ticket. Registration is
refused when the event is unpublished, finished, full, or already registered
for. Duplicates are blocked twice over — an explicit lookup gives a readable
message, and the unique constraint catches the simultaneous-request race
(Prisma `P2002`). Cancelling and re-registering reinstates the original row with
a fresh ticket rather than creating a second one.

### QR check-in
Each ticket QR encodes `{ticket, sig}`, where `sig` is an HMAC-SHA256 of the
ticket code keyed on `AUTH_SECRET`. Nothing is written until **all** of these
pass:

1. signature verifies — a hand-crafted or edited QR is rejected as a forgery
2. the ticket code exists in the database
3. the registration is `CONFIRMED`, not cancelled
4. the event is not cancelled
5. the scanner owns that event (or is an admin)
6. the ticket has not already been checked in

Anything else returns an explicit result code (`INVALID`, `DUPLICATE`,
`CANCELLED`, `WRONG_EVENT`) and stores nothing. The scanner screen also accepts
a typed ticket code as a fallback when no camera is available — the same six
checks still apply.

### Alerts
Every alert is persisted to the `Notification` table for the in-app feed and
handed to `deliverEmail` in `src/lib/notifications.ts`. Confirmations fire on
registration; organizers can send reminders to attendees who have not checked
in; attendees are notified automatically when an event's venue, time or status
changes. The email transport is a logging stub so the project needs no mail
account — replace the body of `deliverEmail` with nodemailer or Resend to send
real mail.

### Administration and reports
Admins manage roles and deactivate accounts (with guards so they cannot lock
themselves out). `src/lib/reports.ts` derives every figure — registrations,
attendance, attendance rate, fill rate, per-category breakdown — from stored
rows, so the numbers on `/admin/reports` can be quoted directly in the report's
Results section.

## API reference

| Method | Route | Access |
|---|---|---|
| `POST` | `/api/auth/signup` · `/login` · `/logout` | public |
| `GET` | `/api/auth/session` | any |
| `GET` | `/api/events` | public (filters: `q`, `category`, `status`, `mine`, `upcoming`) |
| `POST` | `/api/events` | organizer, admin |
| `GET` `PATCH` `DELETE` | `/api/events/:id` | read public · write owner/admin |
| `POST` `DELETE` | `/api/events/:id/register` | signed in |
| `GET` | `/api/events/:id/registrations` | owner, admin |
| `POST` | `/api/events/:id/remind` | owner, admin |
| `GET` | `/api/registrations` | signed in (own tickets) |
| `POST` | `/api/checkin` | organizer, admin |
| `GET` | `/api/notifications` | signed in |
| `POST` | `/api/notifications/read-all` | signed in |
| `GET` | `/api/admin/users` | admin |
| `PATCH` | `/api/admin/users/:id` | admin |
| `GET` | `/api/admin/reports` | admin |

## Project layout

```
prisma/
  schema.prisma          four core entities + notifications
  seed.ts                demo users, events, registrations, attendance
prisma.config.ts         Prisma 7 config (connection URL lives here)
src/
  app/
    page.tsx             public landing page
    login/ signup/       authentication screens
    (app)/               signed-in shell — session checked once in layout.tsx
      dashboard/         role-aware overview
      events/            listing with search + filters, detail + register
      tickets/           student QR tickets
      organizer/         manage events, attendee lists, QR scanner
      admin/             user management, reports
      notifications/     alert feed
    api/                 route handlers (table above)
  components/            nav, forms, event cards, QR scanner, UI primitives
  lib/
    auth.ts              sessions, password hashing, role checks
    db.ts                Prisma client singleton
    tickets.ts           ticket codes, HMAC signing, QR rendering
    notifications.ts     alerts module
    reports.ts           report aggregation
    validation.ts        Zod schemas
    constants.ts         roles, categories, statuses
```

## Testing the key rules by hand

Duplicate registration, forged tickets and repeat check-ins are the behaviours
worth demonstrating in a viva:

1. Sign in as `student@campus.edu`, register for an event, then press register
   again on the same event → *"You have already registered for this event."*
2. Copy the ticket code from **My tickets**. Sign in as `organizer@campus.edu`,
   open **Scan QR**, paste the code → attendance recorded. Paste it a second
   time → *"Already checked in at …"*.
3. Paste `CES-DEADBEEF-DEADBEEF` → *"Ticket not recognised."* Paste any other
   QR content → *"This QR code is not a campus event ticket."*
4. As the organizer of a different event, scan someone else's ticket → rejected
   as belonging to an event you do not manage.
5. Cancel a registration as a student, then scan that ticket → entry denied.

## Notes for deployment

SQLite writes to a local file, which suits a local demo and single-server
hosting. For a platform with an ephemeral filesystem (Vercel and similar),
point `DATABASE_URL` at Postgres and swap the adapter in `src/lib/db.ts` for
`@prisma/adapter-pg`; the schema and all application code are unchanged apart
from `provider = "postgresql"`. Set a long random `AUTH_SECRET` in production —
it signs both session cookies and QR tickets.
# campus-event-system
