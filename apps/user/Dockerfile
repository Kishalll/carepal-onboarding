FROM node:22-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json tsconfig.base.json eslint.config.js ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
COPY apps/user/package.json ./apps/user/
COPY apps/admin/package.json ./apps/admin/

RUN npm install

COPY packages ./packages
COPY apps/user ./apps/user

RUN cd packages/shared && npx prisma generate

EXPOSE 3000 24678

CMD ["npm", "run", "dev", "--workspace=@carepal/user-app"]
