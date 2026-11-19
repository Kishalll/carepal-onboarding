# Decisions Log

This document records the technical choices made during development, the alternatives considered, and the rationale behind each choice.

### 1) Monorepo Structure with npm Workspaces

- Choice: npm workspaces with two standalone apps (`apps/user` on port 3000, `apps/admin` on port 3001) and two shared packages (`packages/shared`, `packages/ui`).
- Rationale: npm workspaces comes built into Node.js with zero extra tooling to install. It keeps shared types, database models, and validation logic in one place without requiring package publishing.This also improves security by isoloating admin code, cookies , failures etc

### 2) PostgreSQL with Prisma ORM

- Choice: PostgreSQL 16 shared between both apps, accessed via Prisma ORM located in `packages/shared`.
- Rationale: Prisma provides end to end type safety with auto-generated TypeScript types, declarative migrations, and relational integrity. Storing models in a shared package avoids code duplication between user and admin services.

### 3) Unified Docker Compose Setup

- Choice: Containerized both the user app and admin app in `docker-compose.yml` alongside PostgreSQL and Mailpit with live code volume mounts.
- Rationale: Enables a single `docker compose up` command to launch the entire full-stack ecosystem with zero manual process orchestration while preserving live code editing.

### 4) Shared Zod Validation and Anti-Bot Form Pipeline

- Choice: Single Zod schema in `packages/shared` enforcing identical validation rules on client and server, paired with normalized phone numbers, Cloudflare Turnstile token checks, and a hidden honeypot.
- Rationale: Eliminates client and server schema drift, prevents spam and automated bot submissions, and ensures duplicate phone numbers are safely intercepted with clear user feedback.

### 5) Private Document Storage and Magic-Byte Verification

- Choice: Files are saved to a private storage directory outside the web root and served exclusively through short-lived HMAC-signed URLs (15-minute expiration). File uploads undergo server-side magic-byte header inspection (checking true binary headers for PDF, JPEG, and PNG).
- Rationale: Storing files outside public web paths prevents direct enumeration or unauthorized scraping of sensitive identity documents. Magic-byte verification prevents renamed executable files or corrupted uploads from penetrating the pipeline.

### 6) Database-Backed Sessions with httpOnly Cookies and Isolated Secrets

- Choice: Database-backed sessions stored in PostgreSQL via the `Session` model, referenced by an `httpOnly`, `sameSite: lax` cookie (`carepal_admin_session`), combined with strict `.env` loading via Docker `env_file` without hardcoded secrets in compose or code.
- Rationale: Database sessions allow instant invalidation on logout or security revocation, unlike stateless JWTs which cannot be recalled before expiry without a separate blacklist. Using `httpOnly` cookies blocks client-side JavaScript access to prevent session theft via XSS, while passing secrets solely via gitignored `.env` keeps passwords out of version control and Docker configs.

### 7) URL-Synchronized Multi-Filter Search and CSV Streaming

- Choice: Two-way URL synchronization for search queries and filters using React Router search parameters, backed by Prisma compound filtering and server-side CSV streaming.
- Rationale: Storing active filter state directly in the URL ensures full bookmarkability, page refresh persistence, and link-sharing for operations staff without requiring complex client-side cache stores. Server-side streaming generates CSV exports directly from PostgreSQL with minimal memory overhead.

### 8) Server-Enforced Stage Transition State Machine and Atomic Stage History

- Choice: Enforce all stage transition rules (forward one step at a time, reason required for backward moves, rejection requiring reason, reopening restricted to screening, verified gate checking required checklist items) strictly on the server in a Prisma `$transaction`, combined with dnd-kit drag-and-drop and optimistic UI rollback.
- Rationale: Client-side only validation is easily bypassed or desynchronized. Atomic transactions ensure that a candidate stage cannot change without simultaneously recording a valid audit history entry. Optimistic UI updates provide immediate feedback while retaining safety via automated rollback if the server rejects a transition.

### 9) Localized Automated Stage-Change Emails and Delivery History Log

- Choice: Localized email notifications (English, Hindi, and Tamil) dispatched automatically to Mailpit whenever candidate stages change or applications are submitted. Every delivery is recorded in an `EmailLog` database table and exposed in the admin candidate drawer with a one-click Resend button.
- Rationale: Healthcare caregivers and nurses across India communicate in different regional languages. Localizing candidate emails into English, Hindi, and Tamil ensures clear instructions at each hiring stage. Storing every email event in PostgreSQL provides complete operational visibility and allows coordinators to quickly resend notifications if a candidate reports delivery issues.
- Client Internationalization: The user-facing application uses `i18next` and `react-i18next` with bundled in-repo JSON dictionary files and localized label mappings. It does not rely on third-party translation APIs or runtime cloud services, avoiding latency and recurring costs. All form dropdowns and multi-select chips display localized text in English, Hindi, or Tamil while preserving canonical enum values (`FULL_TIME`, `GNM`, `Mumbai`) for server validation and database integrity.

### 10) Compliance Verification Hub and Stage Gate Enforcement

- Choice: Centralized verification hub (`/checklist`) and per-candidate verification drawer (`CandidateVerificationDrawer.tsx`) enforcing document status checks and mandatory verification gates before candidates can move to the `VERIFIED` stage.
- Rationale: In healthcare and eldercare onboarding, safety and credential verification are legal requirements. Moving a candidate directly into clinical interviews or deployment without verified nursing council certificates, identity proofs, and background checks introduces patient risk. Enforcing this gate in the server-side state machine guarantees that no administrative shortcut or UI bypass can advance an unverified candidate.

### 11) Atomic Slot Booking with Compare-and-Swap Concurrency Control

- Choice: Self-service candidate booking on `/book/:token` paired with admin slot management on `/slots`. Concurrency protection is implemented using an atomic `updateMany` condition (`candidateId: null`) within a PostgreSQL transaction, automatically creating an audit note and triggering localized confirmation emails.
- Rationale: High-demand interview slots can trigger race conditions when multiple candidates attempt to claim the same appointment simultaneously. Atomic compare-and-swap ensures that exactly one transaction succeeds while concurrent attempts receive immediate 409 Conflict responses without data corruption or double booking.

### 12) Multi-Vector Duplicate Candidate Detection and Side-by-Side Review Panel

- Choice: Multi-vector duplicate candidate detection matching either normalized email or full name plus date of birth, integrated with an executive operational dashboard header and dedicated `/duplicates` review screen.
- Rationale: While phone numbers are indexed uniquely to block identical re-submissions at the public form level, candidates frequently apply using different phone numbers while sharing the same email or identity details. Grouping candidate clusters dynamically on the server provides zero-lag detection across all active pipelines. The side-by-side review panel allows hiring coordinators to inspect primary and secondary applications, merge timeline notes, and reject duplicate submissions with an immutable audit trail without losing historical records.
