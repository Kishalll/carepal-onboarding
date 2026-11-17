# TheCarePal - Candidate Hiring & Verification Pipeline

A full-stack hiring pipeline built for TheCarePal to streamline nurse and caregiver onboarding across Indian cities.

## Architecture Overview

The system consists of two separate applications connected to a single PostgreSQL database:
- User Application (Port 3000): Candidate-facing multi-step application form, document uploads, and interview booking.
- Admin Application (Port 3001): Operations portal with a 6-stage pipeline board, verification checklists, document viewer, and stage transition emails.

## Prerequisites

- Docker and Docker Compose
- Node.js v20+ (optional if running purely through Docker)
- npm v10+

## Quick Start (Docker - Recommended)

1. Start all services with one command:
   ```bash
   docker compose up -d
   ```
   This builds and starts:
   - PostgreSQL 16 on port 5432
   - Mailpit email inbox on port 8025 (SMTP port 1025)
   - Candidate Application on http://localhost:3000
   - Admin Operations Application on http://localhost:3001

2. Access the applications:
   - Candidate Portal: http://localhost:3000
   - Admin Portal: http://localhost:3001
   - Mailpit Web Inbox: http://localhost:8025

3. Default Admin Credentials:
   - Email: `admin@thecarepal.test`
   - Password: `CarePalAdmin2026!`

4. Database Migrations and Seeding:
   The database can be migrated and populated with 40+ synthetic candidates anytime:
   ```bash
   npm run migrate
   npm run seed
   ```

## Alternative: Running Locally with npm

If you prefer running Node.js directly on your host machine for development:

1. Start PostgreSQL and Mailpit:
   ```bash
   docker compose up -d postgres mailpit
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run migrations and seed:
   ```bash
   npm run migrate
   npm run seed
   ```

4. Start both applications:
   ```bash
   npm run dev
   ```

## Workspace Structure

- `apps/user`: Candidate portal (Express + Vite React on port 3000)
- `apps/admin`: Operations portal (Express + Vite React on port 3001)
- `packages/shared`: Shared database models (Prisma), validation schemas, email module, and config lists
- `packages/ui`: Shared Tailwind styling preset, design tokens, and reusable components
- `storage/uploads`: Local directory for uploaded candidate files (git-ignored)
