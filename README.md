# TheCarePal - Candidate Hiring & Verification Pipeline

A full-stack hiring and compliance verification pipeline built for TheCarePal to streamline nurse and caregiver onboarding across Indian cities.

---

## Architecture Overview

The system runs as an npm workspaces monorepo with two independent web applications communicating with a single shared PostgreSQL database and private document store:

```
                          ┌────────────────────────┐
                          │     Web Browsers       │
                          └───────────┬────────────┘
                                      │
            ┌─────────────────────────┴─────────────────────────┐
            │                                                   │
            ▼                                                   ▼
┌────────────────────────┐                             ┌────────────────────────┐
│ Candidate Portal (:3000)│                             │  Admin Portal (:3001)  │
│  - Multi-step form     │                             │  - 6-stage Kanban board│
│  - Document uploads    │                             │  - Verification hub    │
│  - Self-service booking│                             │  - Duplicate review    │
│  - i18n (EN, HI, TA)   │                             │  - Audit logs & notes  │
└───────────┬────────────┘                             └───────────┬────────────┘
            │                                                   │
            │ Express API + Vite SSR / Middleware               │ Express API + Vite SSR
            │                                                   │
            └─────────────────────────┬─────────────────────────┘
                                      │
                 ┌────────────────────┼────────────────────┐
                 ▼                    ▼                    ▼
      ┌────────────────────┐ ┌─────────────────┐ ┌──────────────────┐
      │  PostgreSQL (:5432)│ │ Private Storage │ │ Mailpit (:8025)  │
      │  - Candidates      │ │ - Binary uploads│ │ - SMTP on :1025  │
      │  - Checklist items │ │ - HMAC signed   │ │ - Stage emails   │
      │  - Slots & Bookings│ │   URLs (15 min) │ │ - Localized EN,  │
      │  - Sessions & Notes│ │                 │ │   HI, and TA     │
      └────────────────────┘ └─────────────────┘ └──────────────────┘
```

### Shared Monorepo Packages
- `apps/user`: Candidate-facing application (Port 3000). Express server hosting Vite client and public REST API.
- `apps/admin`: Staff-facing operations portal (Port 3001). Express server hosting Vite client and authenticated REST API.
- `packages/shared`: Prisma ORM client, database migrations, shared Zod schemas, email delivery service, and utility functions.
- `packages/ui`: Shared Tailwind CSS design system tokens, accessible modal shells, and reusable UI components.
- `storage/uploads`: Local directory for uploaded identity and nursing credential files (git-ignored, served only via signed URLs).

---

## Quick Reference: Ports & Credentials

| Service | URL / Port | Purpose | Default Credentials |
| :--- | :--- | :--- | :--- |
| **Candidate Portal** | `http://localhost:3000` | Application form & interview booking | Public access |
| **Admin Portal** | `http://localhost:3001` | Kanban board, verification, duplicates | `admin@thecarepal.test` / `test!123` (from `.env`) |
| **Mailpit Web UI** | `http://localhost:8025` | Local email delivery inspector | Public access |
| **Mailpit SMTP** | `localhost:1025` | Local mail transfer agent | No auth required |
| **PostgreSQL** | `localhost:5432` | Relational database (`carepal_db`) | `carepal` / `carepal_secret` |

---

## Prerequisites

- **Docker & Docker Compose**: Docker Desktop on Windows/macOS, or Docker Engine on Linux.
- **Node.js**: v20.12.0 or higher (required for local development and test execution).
- **npm**: v10.0.0 or higher.

---

## Setup Instructions: Linux & macOS

### Option 1: Docker (Recommended)
Launches the entire ecosystem (PostgreSQL, Mailpit, User app, and Admin app) in isolated containers:

```bash
# 1. Clone the repository and enter directory
git clone <repo-url> carepal-onboarding
cd carepal-onboarding

# 2. Copy environment templates
cp apps/user/.env.example apps/user/.env
cp apps/admin/.env.example apps/admin/.env

# 3. Start all services
docker compose up -d

# 4. Run database migrations and seed sample records
docker compose exec user-app npm run migrate
docker compose exec user-app npm run seed
```

### Option 2: Local Node.js Development
Runs PostgreSQL and Mailpit in Docker, with Node.js servers running directly on the host machine:

```bash
# 1. Start database and mail server containers
docker compose up -d postgres mailpit

# 2. Install workspace dependencies
npm install

# 3. Prepare environment files
cp apps/user/.env.example apps/user/.env
cp apps/admin/.env.example apps/admin/.env

# 4. Migrate database schema and seed 40+ synthetic candidates
npm run migrate
npm run seed

# 5. Start both applications concurrently
npm run dev
```

---

## Setup Instructions: Windows

### Option 1: Docker Desktop (PowerShell)

```powershell
# 1. Clone the repository and enter directory
git clone <repo-url> carepal-onboarding
cd carepal-onboarding

# 2. Copy environment templates
Copy-Item apps/user/.env.example apps/user/.env
Copy-Item apps/admin/.env.example apps/admin/.env

# 3. Start all containers
docker compose up -d

# 4. Run database migrations and seed sample records
docker compose exec user-app npm run migrate
docker compose exec user-app npm run seed
```

### Option 2: Local Node.js Development (PowerShell)

```powershell
# 1. Start database and mail server containers
docker compose up -d postgres mailpit

# 2. Install workspace dependencies
npm install

# 3. Prepare environment files
Copy-Item apps/user/.env.example apps/user/.env
Copy-Item apps/admin/.env.example apps/admin/.env

# 4. Migrate database schema and seed 40+ synthetic candidates
npm run migrate
npm run seed

# 5. Start both applications concurrently
npm run dev
```

> **Windows Path Note**: All file storage paths use Node.js `path.resolve` and forward-slash normalization to ensure uniform behavior across NTFS and Linux filesystems.

---

## Running the Automated Test Suite

The repository includes 56 automated tests built on the native Node.js test runner (`node:test`):

```bash
# Run all test suites in sequence (unit, integration, and e2e lifecycle)
npm test
# or
npm run test

# Run individual test suites:
npm run test:unit         # 36 pure logic tests (runs in ~200ms)
npm run test:integration  # 10 API endpoint tests (requires running containers)
npm run test:e2e          # 10 full lifecycle journey steps (requires running containers)
```

---

## Core Features & Workflow

### 1. Public Application Portal (`apps/user`)
- **Multi-Step Form**: 5-step wizard covering Personal Information, Clinical Qualifications, Work History, Document Uploads, and Final Review.
- **Three Languages**: Instant localized switching between English, Hindi, and Tamil for all instructions, field labels, dropdowns, and validation errors.
- **Honeypot & Turnstile**: Transparent bot defense with a hidden honeypot input and Cloudflare Turnstile token validation.
- **Self-Service Booking**: Candidates invite-linked to `/book/:token` can choose and claim available interview time slots with immediate calendar confirmation.

### 2. Admin Operations Portal (`apps/admin`)
- **6-Stage Pipeline Board**: Visual Kanban board (`APPLIED` -> `SCREENING` -> `VERIFIED` -> `INTERVIEW` -> `ONBOARDED`, plus `REJECTED`) with drag-and-drop powered by `@dnd-kit`.
- **Enforced State Machine**: Candidates advance one stage at a time. Backward transitions and rejections require mandatory notes. Moving to `VERIFIED` requires all mandatory compliance checklist items to be approved.
- **Verification Hub (`/checklist`)**: Dedicated compliance queue with filter tabs, batch reviews, and side drawer document inspection.
- **Duplicate Review Panel (`/duplicates`)**: Side-by-side comparison of duplicate candidate pairs flagged by email or name + date of birth, with resolution actions (Keep Primary, Merge Notes, Reject Duplicate).
- **Interviewer Slot Manager (`/slots`)**: Create and manage 30-minute interview slots. Includes schedule conflict detection preventing overlapping meetings for the same interviewer.
- **CSV Data Streaming**: Export candidate directories instantly with server-side streaming headers.
- **Audit Logging**: Every stage change, compliance status update, internal note, and dispatched email is immutably logged with timestamp and author attribution.

---

## Security Architecture

1. **Document Magic-Byte Verification**:
   All uploaded files are inspected on the server by reading their true binary header bytes (magic numbers). Files with forged extensions (such as an `.exe` file renamed to `.pdf`) are rejected before disk storage. Allowed formats: PDF (`%PDF`), PNG (`\x89PNG`), and JPEG (`\xFF\xD8\xFF`). Maximum file size: 5 MB.
2. **Private Storage & HMAC Signed URLs**:
   Uploaded identity documents are stored in `/storage/uploads` outside of the public web root. Documents can only be retrieved via short-lived HMAC-SHA256 signed URLs that expire after 15 minutes, preventing file enumeration or unauthorized scraping.
3. **Atomic Slot Concurrency Control**:
   Interview slot bookings use an atomic SQL `updateMany` condition (`where: { id: slotId, candidateId: null }`) inside a Prisma transaction. If two candidates attempt to claim the same slot simultaneously, exactly one transaction succeeds while the other receives an instant 409 Conflict response.
4. **Schedule Conflict Prevention**:
   Admin slot creation validates time intervals for the same interviewer name and role, preventing double-booking overlapping meeting windows.
5. **Database-Backed Sessions**:
   Admin authentication uses bcrypt password hashing and database-persisted session tokens stored in `httpOnly`, `SameSite: Lax` cookies, protecting against XSS session theft.

---

## Requirement Mapping Table

| Project Requirement | Implementation File(s) | Key Functions / Details |
| :--- | :--- | :--- |
| **Public Multi-Step Form** | `apps/user/client/src/features/apply/ApplyWizardPage.tsx` | 5-step form wizard with state preservation |
| **Shared Zod Validation** | `packages/shared/src/validators/applicationSchema.ts` | Unified client and server validation schema |
| **Anti-Bot Defense** | `apps/user/server/src/middleware/turnstile.ts` | Cloudflare Turnstile token check and honeypot trap |
| **Document Uploads & Magic Bytes** | `packages/shared/src/utils/fileValidation.ts` | Binary header inspection (PDF, PNG, JPG) and 5MB limit |
| **HMAC Signed Document URLs** | `packages/shared/src/utils/storage.ts` | 15-minute signed URL generator and timing-safe verify |
| **Admin Authentication & Sessions** | `apps/admin/server/src/controllers/authController.ts` | Database session model, bcrypt hash, httpOnly cookie |
| **Pipeline Kanban Board** | `apps/admin/client/src/features/board/PipelineBoardPage.tsx` | `@dnd-kit` drag-and-drop with optimistic UI updates |
| **Stage Transition State Machine** | `apps/admin/server/src/controllers/candidateController.ts` | Strict sequential advance, required notes, audit log |
| **Compliance Verification Hub** | `apps/admin/client/src/features/checklist/VerificationHubPage.tsx` | Dedicated compliance queue and status action modals |
| **Verification Gate Enforcement** | `apps/admin/server/src/controllers/candidateController.ts` | Blocks transition to `VERIFIED` until checklist items pass |
| **Candidate Detail Drawer** | `apps/admin/client/src/features/candidates/CandidateDetailDrawer.tsx` | Full profile, signed document links, notes, email log |
| **Localized Stage Change Emails** | `packages/shared/src/services/emailService.ts` | Localized templates (EN, HI, TA) dispatched to Mailpit |
| **Email Delivery Log & Resend** | `apps/admin/server/src/controllers/candidateController.ts` | `EmailLog` database tracking with one-click resend |
| **Self-Service Slot Booking** | `apps/user/client/src/features/booking/CandidateBookingPage.tsx` | Secure booking on `/book/:token` with calendar view |
| **Slot Concurrency Lock** | `apps/user/server/src/controllers/bookingController.ts` | Compare-and-swap atomic update preventing double-booking |
| **Interviewer Schedule Conflicts** | `apps/admin/server/src/controllers/slotController.ts` | Blocks overlapping slots for same interviewer with 409 |
| **Duplicate Candidate Clustering** | `apps/admin/server/src/controllers/candidateController.ts` | Dynamic clustering by email and name + date of birth |
| **Duplicate Review Panel** | `apps/admin/client/src/features/duplicates/DuplicateReviewPage.tsx` | Side-by-side comparison with Keep Primary & Reject |
| **URL-Synchronized Filters & Search** | `apps/admin/client/src/features/candidates/CandidateListPage.tsx` | Two-way URL search query synchronization |
| **CSV Export Streaming** | `apps/admin/server/src/controllers/candidateController.ts` | Server-side streaming CSV download |
| **Automated Test Suite** | `tests/unit/`, `tests/integration/`, `tests/e2e/` | 56 automated tests verifying entire pipeline |

---

## Production Considerations

- **Virus Scanning**: In production cloud environments, incoming files should be routed through a streaming antivirus scanner (such as ClamAV or AWS GuardDuty) prior to persistent storage.
- **Cloud Object Storage**: The storage adapter in `packages/shared/src/utils/storage.ts` is modular and designed to be swapped with an AWS S3, Cloudflare R2, or Google Cloud Storage client for multi-server deployments.
- **Production Mail Delivery**: In production, Mailpit is replaced with an enterprise SMTP relay (such as Amazon SES, Postmark, or SendGrid) by updating the `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, and `MAIL_PASS` environment variables.
