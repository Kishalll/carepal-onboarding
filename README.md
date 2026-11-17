# TheCarePal - Candidate Hiring & Verification Pipeline

A full-stack hiring pipeline built for TheCarePal to streamline nurse and caregiver onboarding across Indian cities.

## Architecture Overview

The system consists of two separate applications connected to a single PostgreSQL database:
- User Application (Port 3000): Candidate-facing multi-step application form, document uploads, and interview booking.
- Admin Application (Port 3001): Operations portal with a 6-stage pipeline board, verification checklists, document viewer, and stage transition emails.

## Prerequisites

- Node.js v20+ (developed on v26.13.1)
- npm v10+
- Docker and Docker Compose (for PostgreSQL and Mailpit)

## Quick Start (Development)

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development servers:
   ```bash
   npm run dev
   ```

3. Open in your browser:
   - Candidate Portal: http://localhost:3000
   - Admin Portal: http://localhost:3001

## Workspace Layout

- `apps/user`: Candidate portal (Express + Vite React on port 3000)
- `apps/admin`: Operations portal (Express + Vite React on port 3001)
- `packages/shared`: Shared database schema, Zod validators, email client, and config
- `packages/ui`: Shared Tailwind preset, design tokens, and UI components
- `storage/uploads`: Local directory for uploaded candidate documents (git-ignored)
