# 🐷 Sou'Sou

Web app de gestion financière personnelle gamifiée pour jeunes adultes (18-40 ans, public francophone).

> Tracker tes revenus / dépenses, atteindre tes objectifs d'épargne quotidiens, gagner des points et badges, lire et publier des articles sur l'épargne.

## 🛠️ Stack

| Côté       | Tech                                                                    |
| ---------- | ----------------------------------------------------------------------- |
| Frontend   | Next.js 16 (App Router) · TypeScript · Tailwind 4 · shadcn/ui (base-nova / @base-ui) · framer-motion · recharts · react-hook-form + zod · react-markdown |
| Backend    | NestJS 11 · TypeScript · Prisma 6 · PostgreSQL 16 · JWT (httpOnly cookies) · class-validator |
| Infra dev  | Docker Compose (Postgres + pgAdmin)                                     |
| Email      | Brevo API (reset password)                                              |
| Tests      | Jest (backend, 44 tests sur fonctions pures et gamification)            |

## 📁 Arborescence

```
sou-sou/
├── frontend/              # Next.js (port 3100)
│   └── src/
│       ├── app/(public)/  # landing, login, signup, forgot/reset-password
│       ├── app/(app)/     # dashboard, transactions, epargne, badges, blog, ressources, parametres
│       ├── components/    # ui (shadcn base-nova) + tracker + savings + content + app-shell
│       ├── lib/           # api client (axios + interceptor refresh)
│       └── providers/     # AuthProvider
├── backend/               # NestJS (port 4100)
│   └── src/
│       ├── auth/          # signup/login/refresh/logout/me + forgot/reset
│       ├── users/         # PATCH /users/me
│       ├── income-sources, expense-categories, transactions/  # tracker
│       ├── savings-goal, contributions/                       # épargne
│       ├── gamification/                                       # points, streak, badges
│       ├── articles/                                          # blog markdown
│       └── resources/                                         # vidéos YouTube (oEmbed)
├── docker-compose.yml     # Postgres (5532) + pgAdmin (5150)
├── mascot.png
├── design-system.png
└── README.md
```

## 🚀 Démarrage rapide

### 1. Pré-requis

- Node ≥ 20 (testé avec **22.22**) — utiliser `nvm use 22`
- Docker + Docker Compose
- Un éditeur

### 2. Lancer la base de données

```bash
docker compose up -d
```

- **Postgres** sur `localhost:5532` (user/db = `sousou`, password = `sousou_dev_password`)
- **pgAdmin** sur `http://localhost:5150` (admin@sousou.local / admin)

### 3. Backend

```bash
cd backend
cp .env.example .env       # puis éditer .env avec vos secrets
npm install
npx prisma migrate deploy  # applique les migrations
npm run start:dev          # http://localhost:4100
```

Swagger : `http://localhost:4100/api/docs`

### 4. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev                # http://localhost:3100
```

## 🔧 Variables d'environnement

### Backend (`backend/.env`)

| Variable             | Description                              |
| -------------------- | ---------------------------------------- |
| `DATABASE_URL`       | URL Postgres (préfixée pour Docker)      |
| `JWT_ACCESS_SECRET`  | Secret JWT access token (15 min)         |
| `JWT_REFRESH_SECRET` | Secret JWT refresh token (7 j)           |
| `JWT_ACCESS_TTL`     | Format `15m`, `1h`, `30s`...              |
| `JWT_REFRESH_TTL`    | Idem                                     |
| `COOKIE_SECURE`      | `false` en dev, `true` en prod           |
| `BREVO_API_KEY`      | Clé API Brevo. Vide → emails loggés en console |
| `BREVO_SENDER_EMAIL` | Email expéditeur Brevo                   |
| `FRONTEND_URL`       | `http://localhost:3100` en dev           |

### Frontend (`frontend/.env.local`)

| Variable                | Description                    |
| ----------------------- | ------------------------------ |
| `NEXT_PUBLIC_API_URL`   | URL backend (default 4100)     |
| `NEXT_PUBLIC_SITE_URL`  | URL publique du site (sitemap) |

## 🔐 Authentification

JWT en cookies httpOnly, refresh token opaque (random 48B hash sha256 stocké en DB), rotation à chaque refresh, throttling sur signup/login/forgot.

**Promouvoir un user en admin** (pour gérer les ressources YouTube) :

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'votre@email.com';
```

L'utilisateur doit ensuite **se relogger** pour que son JWT contienne le nouveau rôle.

## 🎨 Design system

Voir `design-system.png`.

| Token        | Valeur                          |
| ------------ | ------------------------------- |
| Primary      | `#10B981` (vert émeraude)       |
| Secondary    | `#1E293B` (bleu nuit)           |
| Tertiary     | `#FC7C78` (corail)              |
| Neutral      | `#717973`                       |
| Background   | `#F8FAFC`                       |
| Card         | `#FFFFFF`                       |
| Font titres  | Newsreader (serif)              |
| Font body    | Plus Jakarta Sans (sans-serif)  |

## 📱 Mobile-first

L'app est conçue **mobile-first** avec bottom nav 5 onglets (Dashboard, Transactions, Épargne, Blog, Paramètres) et sidebar desktop élargie (+ Vidéos, Badges).

## 🧪 Tests

```bash
cd backend
npm test                   # 44 tests sur slug, youtube, parseDuration, gamification
```

## 🏗️ Architecture

### Backend
- Guards globaux : `ThrottlerGuard` → `JwtAuthGuard` (avec `@Public()` decorator) → `RolesGuard` (avec `@Roles(Role.ADMIN)` decorator)
- Toute la logique gamification dans une `prisma.$transaction` (atomique)
- Resources : `extractYoutubeVideoId` parse 5 formats d'URL, oEmbed avec timeout 6s + fallback gracieux

### Frontend
- `app/(public)` : pages non-authentifiées (landing, auth)
- `app/(app)` : protégé par layout client qui redirige vers `/login` si pas de session
- Auto-refresh sur 401 via interceptor axios (single in-flight, skip si déjà sur endpoint auth)
- Markdown : `react-markdown` + `remark-gfm`, éditeur 3 modes (Éditer / Côte-à-côte / Aperçu)
- Vidéos YouTube : carte avec play overlay, modale centrée desktop / **bottom sheet plein écran mobile**, iframe embed responsive

## 🪜 Avancement

- [x] Étape 1 — Setup initial du monorepo
- [x] Étape 2 — Backend : Auth complète
- [x] Étape 3 — Frontend : Landing + pages d'auth
- [x] Étape 4 — Backend : Tracker
- [x] Étape 5 — Frontend : Tracker + Dashboard
- [x] Étape 6 — Backend : Épargne + gamification
- [x] Étape 7 — Frontend : Épargne gamifiée (confettis, progress ring, badges)
- [x] Étape 8 — Backend : Articles + Resources YouTube (oEmbed) + Frontend Blog/Vidéos
- [x] Étape 9 — *(fusionné dans l'étape 8)*
- [x] Étape 10 — Polish & tests (404, error boundaries, SEO, sitemap, tests Jest)


bug quand je publie un article j'ai cette erreur : ## Error Type
Console Error

## Error Message
Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every render.


    at CommentList.useCallback[loadPage] (src/components/content/comment-list.tsx:55:9)

## Code Frame
  53 |       try {
  54 |         const res = await listComments(articleId, { page: p, limit: PAGE_SIZE });
> 55 |         setComments((prev) =>
     |         ^
  56 |           append ? [...prev, ...res.items] : res.items,
  57 |         );
  58 |         setPage(res.page);

Next.js version: 16.2.4 (Turbopack)
 je ne peux pas liker l'article que j'ai publier 
 quand je crée un nouveau compte l'onboarding mets juste étape 1/5 mais rien ne se passe, je ne peux pas sauter ça ni rien, il n'y a pas de bouton ignorer et meme l'onbording ne marche pas