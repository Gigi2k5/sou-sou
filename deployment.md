# 🚀 Déploiement Sou'Sou — Vercel + Render

Guide pas-à-pas pour mettre Sou'Sou en production : frontend Next.js sur **Vercel**, backend NestJS + Postgres sur **Render**.

> **Temps total estimé** : ~45 min pour un premier déploiement, ~10 min pour les suivants.

---

## Sommaire

- [Architecture cible](#architecture-cible)
- [Phase 0 — Prérequis](#phase-0--prérequis-5-min)
- [Phase 1 — Base de données Postgres](#phase-1--base-de-données-postgres-sur-render-5-min)
- [Phase 2 — Backend sur Render](#phase-2--backend-sur-render-15-min)
- [Phase 3 — Frontend sur Vercel](#phase-3--frontend-sur-vercel-10-min)
- [Phase 4 — Promotion d'un admin](#phase-4--promotion-dun-admin-5-min)
- [Phase 5 — Vérifications finales](#phase-5--vérifications-finales-5-min)
- [Phase 6 — Domaine custom (optionnel)](#phase-6--domaine-custom-optionnel)
- [Storage des images / avatars uploadés](#storage-des-images--avatars-uploadés)
- [Coût estimé](#coût-estimé)
- [Gotchas connus](#gotchas-connus)
- [Maintenance courante](#maintenance-courante)

---

## Architecture cible

```
┌─────────────────────┐         ┌──────────────────────┐
│  Vercel (Hobby)     │         │  Render (Starter)    │
│  ─────────────────  │         │  ──────────────────  │
│  Next.js 16         │ ◄────► │  NestJS 11           │
│  sousou.vercel.app  │ HTTPS   │  sousou-api.         │
│                     │ cookies │    onrender.com      │
└─────────────────────┘         └──────────┬───────────┘
                                            │
                                            ▼
                                ┌──────────────────────┐
                                │  Render Postgres 16  │
                                │  (interne au réseau) │
                                └──────────────────────┘
```

- Le **front Vercel** appelle l'**API Render** en cross-origin avec cookies (auth)
- Le **back Render** parle à **Postgres Render** via l'URL interne (pas de latence externe)
- Les **emails** sortent via **Brevo** (API externe)

---

## Phase 0 — Prérequis (5 min)

1. **Comptes** à créer (tous via GitHub) :
   - [Vercel](https://vercel.com)
   - [Render](https://render.com)
   - [Brevo](https://app.brevo.com) (si pas déjà fait)
2. **Code sur GitHub** : repo public ou privé, peu importe.
3. **Générer 2 secrets JWT longs** — note-les, tu vas les coller dans Render :
   ```bash
   openssl rand -base64 64   # → JWT_ACCESS_SECRET
   openssl rand -base64 64   # → JWT_REFRESH_SECRET
   ```
   ⚠️ Les **2 doivent être différents** — ne réutilise pas le même.

---

## Phase 1 — Base de données Postgres sur Render (5 min)

1. Render dashboard → **New +** → **PostgreSQL**
2. Réglages :
   - **Name** : `sousou-db`
   - **Region** : `Frankfurt` (proche de l'Europe, faible latence avec Vercel EU)
   - **Plan** :
     - **Free** : valide 90 jours puis suppression → OK pour tester
     - **Starter** ($7/mois) : recommandé en prod long-terme
   - **PostgreSQL Version** : **16**
3. Click **Create Database** → attendre ~2 min que la DB démarre.
4. Une fois `Available`, dans la page de la DB :
   - **Internal Database URL** → c'est l'URL que ton backend utilisera (DB Render → API Render = même réseau interne, plus rapide). **Copie-la, garde-la pour Phase 2**.
   - **External Database URL** → utile pour te connecter en SQL depuis ton poste (Beekeeper, TablePlus, `psql`).

> 💡 Tu peux déjà tester la connexion externe depuis ton poste avec un client SQL pour vérifier que la DB répond.

---

## Phase 2 — Backend sur Render (15 min)

### 2.1 Créer le Web Service

1. Render dashboard → **New +** → **Web Service** → **Build and deploy from a Git repository** → connecter le repo GitHub.
2. Réglages :

| Champ | Valeur |
|---|---|
| **Name** | `sousou-api` |
| **Region** | **Frankfurt** (la même que la DB — critique pour la latence) |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npx prisma generate && npx prisma migrate deploy && npm run build` |
| **Start Command** | `node dist/main` |
| **Plan** | **Starter** ($7/mois) — recommandé. Le Free dort après 15 min d'inactivité et la première requête met ~30s à répondre, ce qui casse l'UX au login. |
| **Health Check Path** | `/health` |

### 2.2 Variables d'environnement

Sur la page de configuration du service, section **Environment** → **Add Environment Variable** :

| Clé | Valeur | Explication |
|---|---|---|
| `NODE_ENV` | `production` | active les optimisations Nest |
| `PORT` | `10000` | port que Render écoute en interne |
| `DATABASE_URL` | *coller l'**Internal URL** de la DB* | ⚠️ pas l'External |
| `JWT_ACCESS_SECRET` | *secret #1 généré phase 0* | ne le commit jamais |
| `JWT_REFRESH_SECRET` | *secret #2 généré phase 0* | différent du #1 |
| `JWT_ACCESS_TTL` | `15m` | durée de vie de l'access token |
| `JWT_REFRESH_TTL` | `7d` | durée de vie du refresh token |
| `FRONTEND_URL` | `https://sousou.vercel.app` | tu connaîtras cette URL après Phase 3 — laisse `https://sousou.vercel.app` en attendant, on reviendra la corriger |
| `COOKIE_SECURE` | `true` | **obligatoire en prod HTTPS** |
| `COOKIE_SAMESITE` | `none` | **obligatoire pour Vercel↔Render cross-domain** — sans ça, le browser refuse les cookies |
| `COOKIE_DOMAIN` | *(laisser vide)* | ne pas remplir — chaque domaine gère ses propres cookies |
| `BREVO_API_KEY` | *ta clé Brevo* | clé `xkeysib-...` |
| `BREVO_SENDER_EMAIL` | *email validé chez Brevo* | l'expéditeur doit être validé dans Brevo |
| `BREVO_SENDER_NAME` | `Sou'Sou` | nom affiché aux destinataires |
| `CLOUDINARY_URL` | `cloudinary://api_key:api_secret@cloud_name` | storage des avatars uploadés — cf. [section dédiée](#storage-des-images--avatars-uploadés-cloudinary) |

> ⚠️ **`COOKIE_SECURE=true` + `COOKIE_SAMESITE=none`** : c'est la combinaison qui rend possible l'auth cross-domain Vercel↔Render. Si tu mets `lax` ou pas de `secure`, le navigateur **refuse silencieusement** le cookie et tu auras des 401 partout.

### 2.3 Déployer

1. Click **Create Web Service**.
2. Render lance le premier build (~5-8 min). Surveille les logs en bas de la page.
3. **Indicateurs de succès dans les logs** :
   ```
   Applying migration `20260505100000_likes_comments`
   ...
   All migrations have been successfully applied.
   ...
   Badges synchronisés (10).
   🐷 Sou'Sou API running on http://localhost:10000
   📚 Swagger docs: http://localhost:10000/api/docs
   ```
4. L'URL publique de ton API est `https://sousou-api.onrender.com` (Render te la donne en haut du service).

> 💡 **Test rapide** : ouvre `https://sousou-api.onrender.com/health` dans ton navigateur. Tu dois voir un JSON `{ "status": "ok" }` ou similaire.

---

## Phase 3 — Frontend sur Vercel (10 min)

### 3.1 Créer le projet

1. Vercel dashboard → **Add New...** → **Project** → importer le repo GitHub.
2. Vercel détecte automatiquement Next.js. Configure :

| Champ | Valeur |
|---|---|
| **Framework Preset** | Next.js (auto-détecté) |
| **Root Directory** | `frontend` |
| **Build Command** | `next build` (default) |
| **Output Directory** | `.next` (default) |
| **Install Command** | `npm install` (default) |
| **Node.js Version** | **22.x** (Settings → General après le premier deploy si besoin) |

### 3.2 Variables d'environnement

Avant le premier deploy, déroule **Environment Variables** :

| Clé | Valeur | Note |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://sousou-api.onrender.com` | ⚠️ **sans `/api` à la fin** — l'axios baseURL ajoute `/api` automatiquement |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | *ton cloud_name Cloudinary* | la partie après le `@` dans `CLOUDINARY_URL` — cf. [section dédiée](#storage-des-images--avatars-uploadés-cloudinary) |

> 💡 Le préfixe `NEXT_PUBLIC_` est obligatoire pour que la variable soit accessible depuis le navigateur. Sans ce préfixe, elle ne serait dispo que côté serveur (Server Components / API Routes).

### 3.3 Déployer

Click **Deploy**. Vercel build pendant ~2-3 min, puis te donne une URL :
- `https://sousou.vercel.app` (l'URL de production stable)
- `https://sousou-<hash>.vercel.app` (preview URLs auto pour chaque commit)

### 3.4 Reboucler le CORS sur Render

Maintenant que tu as l'URL Vercel **exacte**, retourne sur Render :

1. Service `sousou-api` → **Environment**
2. Trouve `FRONTEND_URL` → **Edit** → mets l'URL Vercel exacte (sans slash final) : `https://sousou.vercel.app`
3. **Save Changes** → Render redéploie automatiquement (~30 s).

---

## Phase 4 — Promotion d'un admin (5 min)

Le seed admin **n'est pas automatique** (pas de compte admin par défaut en prod, pour la sécurité). Il faut promouvoir manuellement un compte user existant :

1. Ouvre ton site Vercel (`https://sousou.vercel.app`) → **/signup** → crée un compte normal avec ton email.
2. Sur Render → service Postgres `sousou-db` → **Connect** → **External Database URL** (clic sur l'icône œil pour révéler).
3. Connecte-toi à la DB avec un client SQL (TablePlus, Beekeeper, DBeaver, ou `psql`) et exécute :
   ```sql
   UPDATE "User"
   SET role = 'ADMIN'
   WHERE email = 'ton-email@example.com';
   ```
4. **Logout puis re-login** côté front (le cookie de session doit être renouvelé avec le nouveau rôle).
5. Tu verras apparaître le bouton **"Mode administrateur"** dans la sidebar → accès à `/admin`.

> 💡 Tu peux aussi promouvoir/dégrader des admins depuis `/admin/users` une fois le premier admin créé.

---

## Phase 5 — Vérifications finales (5 min)

Tester dans l'ordre, avec un compte fraîchement créé :

- [ ] `https://sousou-api.onrender.com/health` → JSON OK
- [ ] `https://sousou-api.onrender.com/api/docs` → Swagger accessible
- [ ] Site Vercel s'ouvre sans erreur 500
- [ ] **Signup** depuis le site → redirige sur le dashboard
- [ ] **Cookie d'auth bien posé** : DevTools (F12) → onglet **Application** → **Cookies** → tu dois voir `access_token` avec :
  - ✅ `HttpOnly`
  - ✅ `Secure`
  - ✅ `SameSite=None`
  Si tu vois `SameSite=Lax`, retourne sur Render et vérifie `COOKIE_SAMESITE=none`.
- [ ] **Onboarding modal** : 5 steps cliquables, le bouton "Plus tard" (X) ferme la modale, "C'est parti !" donne +50 pts + badge Bienvenue
- [ ] **Création d'une transaction** → apparaît dans `/transactions` et le dashboard
- [ ] **Création d'un budget** → dépasser le seuil → notification `BUDGET_WARNING` reçue
- [ ] **/insights** → graphes affichés (peut-être vides si pas assez de data)
- [ ] **/blog** : créer un article → un autre compte le like → l'auteur reçoit la notif
- [ ] **Upload d'un avatar custom** : sélectionne une image, valide → vérifier qu'elle s'affiche bien (cf. section storage ci-dessous si bug)
- [ ] **Dark mode** : toggle dans la sidebar → toute l'app suit

---

## Phase 6 — Domaine custom (optionnel)

Si tu as un domaine perso (ex: `sousou.app`) :

### Vercel
1. Project → **Domains** → ajouter `sousou.app` et `www.sousou.app`
2. Vercel te donne les enregistrements DNS à créer chez ton registrar (CNAME ou A)
3. Ajoute-les chez ton registrar → attendre la propagation DNS (5 min à 24h)

### Render
1. Service `sousou-api` → **Settings** → **Custom Domain** → ajouter `api.sousou.app`
2. Render te donne un CNAME → ajoute-le chez ton registrar

### Reboucler les env vars
- **Render** : `FRONTEND_URL=https://sousou.app`
- **Vercel** : `NEXT_PUBLIC_API_URL=https://api.sousou.app`
- Si tu veux des cookies partagés sous `*.sousou.app` (ex: SSO entre `sousou.app` et `api.sousou.app`) : ajoute `COOKIE_DOMAIN=.sousou.app` côté Render. **Sinon laisse vide** — `SameSite=None` fonctionne aussi sans `domain` partagé.

---

## Storage des images / avatars uploadés (Cloudinary)

**Le problème** : le filesystem de Render est **éphémère** par défaut — sans persistence, les avatars uploadés (`backend/uploads/avatars/`) **disparaissent à chaque redeploy**.

**Solution choisie** : **[Cloudinary](https://cloudinary.com)** — free tier ultra généreux (25 GB stockage + 25k transformations/mois + CDN mondial). Pour Sou'Sou avec quelques centaines d'avatars de ~50 KB chacun, le free tier couvre des **années** d'utilisation.

L'intégration est déjà codée dans le projet ([backend/src/users/avatar.ts](backend/src/users/avatar.ts)) — il suffit de configurer les env vars.

### Comportement du code

- Si **`CLOUDINARY_URL` est défini** côté backend → les uploads partent sur Cloudinary, le `public_id` est stocké en DB sous la forme `upload:sousou/avatars/<userId>`.
- Si **`CLOUDINARY_URL` est absent** → fallback automatique sur le filesystem local (`backend/uploads/avatars/`). Utile en dev local pour ne pas avoir à configurer Cloudinary.

Le frontend ([frontend/src/lib/avatar.ts](frontend/src/lib/avatar.ts)) résout l'URL automatiquement :
- Si le public_id contient un `/` (ex: `sousou/avatars/u123`) ET `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` est défini → URL Cloudinary avec transformations `q_auto,f_auto` (qualité et format optimaux selon le navigateur, WebP/AVIF inclus).
- Sinon → fallback `${API_URL}/uploads/avatars/<filename>`.

### Setup Cloudinary (3 min)

1. **Créer un compte** : [cloudinary.com/users/register/free](https://cloudinary.com/users/register/free) (login Google/GitHub OK).
2. **Dashboard** → en haut tu vois ton **Cloud Name**, **API Key**, **API Secret**. Ouvre la section **API Environment variable** (clic sur l'œil) — tu vois quelque chose comme :
   ```
   CLOUDINARY_URL=cloudinary://123456789012345:AbcDef_ghIjKlMnOpQrSt-uvWxYz@dxxxxxx
   ```
   👉 **Copie cette ligne en entier** — c'est le format attendu par le SDK.

3. **Cloud Name** : c'est la partie après le `@` dans l'URL ci-dessus (ex: `dxxxxxx`). Tu la verras aussi dans le dashboard. Note-la.

### Configuration prod

**Sur Render (backend)** — ajouter dans **Environment** :

| Clé | Valeur |
|---|---|
| `CLOUDINARY_URL` | `cloudinary://...` *(la ligne copiée ci-dessus)* |

**Sur Vercel (frontend)** — ajouter dans **Environment Variables** :

| Clé | Valeur |
|---|---|
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | `dxxxxxx` *(le cloud name)* |

⚠️ Après modification d'une env var publique côté Vercel : **redeploy** le projet (Vercel inline ces variables au build, pas de hot-reload).

### Vérification

- Sur Render, dans les logs au boot du backend, tu dois voir :
  ```
  [AvatarStorage] Cloudinary configuré pour le storage des avatars uploadés.
  ```
  (Si tu vois `CLOUDINARY_URL absent — fallback filesystem local`, c'est que la var n'a pas été prise en compte.)
- Upload un avatar custom depuis l'app → ouvre DevTools → onglet **Network** → l'image affichée doit venir de `https://res.cloudinary.com/<cloud_name>/image/upload/...`.
- Dans le dashboard Cloudinary → **Media Library** → tu vois le dossier `sousou/avatars/` se remplir.

### Notes

- **Overwrite automatique** : chaque user a un `public_id` déterministe (`sousou/avatars/<userId>`). Un nouvel upload écrase l'ancien automatiquement, pas de fichiers orphelins.
- **Cleanup** : la suppression d'avatar (passage à un preset ou `remove`) appelle `cloudinary.uploader.destroy()` pour libérer la ressource.
- **Coût** : tant que tu restes sous 25 GB / 25k transformations / 25 GB de bande passante / mois → **gratuit à vie**. Au-delà, plan Plus à $89/mois — irréaliste pour notre échelle.
- **Migration future** : si un jour tu veux changer (Vercel Blob, Backblaze, S3...), seuls 2 fichiers à modifier : `backend/src/users/avatar.ts` (upload/destroy) et `frontend/src/lib/avatar.ts` (résolution d'URL). Le contrat DB (`upload:<value>`) ne change pas.

### Alternative : Render Disk persistent (si tu ne veux pas Cloudinary)

Si tu préfères rester sur le filesystem local sans Cloudinary :
- Render Service → **Disks** → **Add Disk**
- **Name** : `uploads`
- **Mount Path** : `/opt/render/project/src/backend/uploads`
- **Size** : 1 GB ($0.25/mois)
- Laisse `CLOUDINARY_URL` vide → le code utilisera automatiquement le filesystem (qui sera maintenant persistant grâce au Disk).
- ⚠️ Inconvénient : pas de CDN, les avatars passent par le backend qui peut être plus lent que Cloudinary, et tu paies $0.25/mois.

---

## Coût estimé

### Phase démo (3 premiers mois, gratuit)

| Service | Plan | Coût/mois |
|---|---|---|
| Vercel | Hobby | **0 €** |
| Render Postgres | Free (90j) | **0 €** |
| Render Web Service | Free | **0 €** *(mais dort après 15min)* |
| Brevo | Free (300 emails/jour) | **0 €** |
| Cloudinary | Free (25 GB) | **0 €** |
| **Total** | | **0 €/mois** |

### Phase prod stable (à partir du 4e mois)

| Service | Plan | Coût/mois |
|---|---|---|
| Vercel | Hobby | **0 €** |
| Render Postgres | Starter | **$7** |
| Render Web Service | Starter | **$7** |
| Brevo | Free (300/j) ou Lite ($25 pour 20k/mois) | **0 à $25** |
| Cloudinary | Free (25 GB) | **0 €** |
| **Total** | | **~$14-39/mois** |

Avec Cloudinary on **n'a pas besoin** du Render Disk persistant ($0.25/mois économisés) et on bénéficie en plus du CDN mondial pour les avatars.

---

## Gotchas connus

### 1. Render Free dort après 15 min d'inactivité

- **Symptôme** : la première requête après une période d'inactivité prend 30-60 secondes.
- **Solution** : prendre le plan Starter ($7/mois), ou ping cron-job.org gratuit pour ping `/health` toutes les 10 min (hack qui marche).

### 2. Render Postgres Free expire à 90 jours

- **Symptôme** : la DB est supprimée définitivement après 90 jours.
- **Solution** : migrer vers Starter avant J-80, ou exporter la DB régulièrement :
  ```bash
  pg_dump $EXTERNAL_DATABASE_URL > backup_$(date +%Y%m%d).sql
  ```

### 3. Cookies cross-origin invisibles

- **Symptôme** : après login, le user est immédiatement déconnecté / 401 partout.
- **Causes possibles** :
  - `COOKIE_SECURE` n'est pas `true` → en HTTPS avec `SameSite=None`, le browser exige `Secure`.
  - `COOKIE_SAMESITE` n'est pas `none` → en cross-domain, `lax` bloque les cookies.
  - `FRONTEND_URL` (Render) ne matche pas exactement l'URL Vercel (attention au slash final, au www, etc.)
- **Debug** : DevTools → Application → Cookies → vérifier les flags du cookie `access_token`.

### 4. Migrations Prisma non appliquées

- **Symptôme** : erreurs SQL au runtime (`column "..." does not exist`).
- **Cause** : les migrations dans `backend/prisma/migrations/` n'ont pas été commitées sur GitHub.
- **Solution** :
  ```bash
  cd backend
  git add prisma/migrations
  git commit -m "Add Prisma migrations"
  git push
  ```
  → Render relance le build et applique les migrations.

### 5. Vercel cache les env vars publiques

- **Symptôme** : tu modifies `NEXT_PUBLIC_API_URL` mais le site continue d'appeler l'ancienne URL.
- **Cause** : `NEXT_PUBLIC_*` sont **inlinées au build** — un re-deploy est nécessaire.
- **Solution** : Vercel → ton projet → **Deployments** → dernier déploiement → **⋯** → **Redeploy** (sans cocher "Use existing Build Cache").

### 6. Onboarding modale ne se ferme jamais

- **Symptôme** : tu cliques "C'est parti !" mais la modale ne disparaît pas.
- **Cause** : l'appel `PATCH /users/me/onboarding` échoue (CORS, cookie, ou backend down).
- **Solution** : check DevTools → Network → identifier l'erreur (401 → cookie problem, 403 → CORS, 500 → backend log).

### 7. Avatars qui ne s'affichent pas (mais ont été uploadés)

- **Symptôme** : avatar uploadé OK côté UI, mais affichage en placeholder/initiales après refresh.
- **Causes possibles** :
  - `CLOUDINARY_URL` absent côté Render → fallback filesystem éphémère → l'image disparaît au prochain redeploy. Check les logs au boot : doit afficher `Cloudinary configuré pour le storage des avatars uploadés.`
  - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` absent côté Vercel → le front ne sait pas construire l'URL Cloudinary, fait un fallback vers `${API_URL}/uploads/avatars/...` qui 404.
  - Mismatch entre les deux : si tu changes le cloud_name, il faut redéployer Vercel pour que la variable publique soit ré-inlinée.
- **Debug** : DevTools → Network → cherche la requête de l'image. L'URL doit être `https://res.cloudinary.com/<cloud_name>/image/upload/q_auto,f_auto/sousou/avatars/<userId>`.

---

## Maintenance courante

### Déploiement d'une nouvelle version
1. `git push origin main` → Vercel **et** Render redéploient automatiquement
2. Le build Render relance `prisma migrate deploy` à chaque fois — les migrations s'appliquent automatiquement si elles sont commitées

### Voir les logs en prod
- **Render** : Service `sousou-api` → onglet **Logs** (temps réel)
- **Vercel** : Project → onglet **Logs** (filtrer par route, statut)

### Rollback rapide
- **Vercel** : Deployments → ancien déploiement OK → **⋯** → **Promote to Production**
- **Render** : Service → **Events** → ancien deploy → **Rollback to this Deploy**

### Inspecter la DB
- Render → DB → **External Database URL** → connecter avec un client SQL
- ⚠️ Toujours **backup avant de modifier** des données critiques :
  ```bash
  pg_dump "$EXTERNAL_DATABASE_URL" > backup_$(date +%Y%m%d_%H%M).sql
  ```

### Régénérer un secret JWT (panique sécurité)
1. Générer un nouveau secret : `openssl rand -base64 64`
2. Mettre à jour `JWT_ACCESS_SECRET` (ou `JWT_REFRESH_SECRET`) sur Render
3. Render redéploie → **tous les users sont déconnectés** (les anciens tokens deviennent invalides)
4. Les users devront se relogger

---

## ✅ Checklist finale avant mise en prod publique

- [ ] DB Postgres `Available` sur Render
- [ ] Backend `Live` sur Render, `/health` répond
- [ ] Frontend déployé sur Vercel
- [ ] `FRONTEND_URL` (Render) = URL Vercel exacte
- [ ] `NEXT_PUBLIC_API_URL` (Vercel) = URL Render exacte
- [ ] `COOKIE_SECURE=true` + `COOKIE_SAMESITE=none` (Render)
- [ ] Signup + login fonctionnels en cross-origin
- [ ] Un compte admin promu en DB
- [ ] Cloudinary configuré (`CLOUDINARY_URL` côté Render, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` côté Vercel)
- [ ] Upload d'un avatar test → l'image vient bien de `res.cloudinary.com`
- [ ] Variables `JWT_*_SECRET` régénérées (pas les valeurs dev par défaut)
- [ ] Brevo connecté + email de test envoyé OK
- [ ] Build du backend applique bien les migrations Prisma à chaque deploy

---

**Bon déploiement ! 🐷✨**

Si tu rencontres un blocage, les **logs Render** et la console DevTools du navigateur sont tes 2 meilleurs alliés pour identifier la cause en 90% des cas.
