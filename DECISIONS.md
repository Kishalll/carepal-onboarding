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





