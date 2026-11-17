# Decisions Log

This document records the technical choices made during development, the alternatives considered, and the rationale behind each choice.


### 1) Monorepo Structure with npm Workspaces
- Choice: npm workspaces with two standalone apps (`apps/user` on port 3000, `apps/admin` on port 3001) and two shared packages (`packages/shared`, `packages/ui`).
- Rationale: npm workspaces comes built into Node.js with zero extra tooling to install. It keeps shared types, database models, and validation logic in one place without requiring package publishing.This also improves security by isoloating admin code, cookies , failures etc


