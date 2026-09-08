# DEFI — Vie de classe

Application web de **gamification scolaire** pour l'**Ensemble Scolaire Jean XXIII**.
Les enseignants attribuent des points aux classes en validant des items ; chaque
classe progresse à travers des niveaux et débloque des médailles au fil des
trimestres. Un **classement** suit la progression de chaque classe.

---

## ✨ Fonctionnalités

- **Progression par classe** — classement général, statistiques et tableaux de bord par classe.
- **Attribuer des points** — les professeurs valident des items et attribuent des points, avec historique personnel.
- **Ma classe** — vue réservée aux professeurs principaux (progression, professeurs assignés).
- **Administration** — gestion des classes, trimestres, niveaux, items, médailles et utilisateurs.
- **Profil** — chaque utilisateur gère son compte.
- **Gamification** — niveaux, items validables et médailles globales par seuil de points ou par niveau.

## 👥 Rôles et accès

| Rôle | Accès |
|------|-------|
| **superadmin** | Accès complet (gestion des utilisateurs, réinitialisation) |
| **admin** | Tout, sauf création du 1ᵉʳ superadmin |
| **professeur** | « Attribuer des points », « Ma classe » si professeur principal |
| **invité** | Lecture du classement public (sans connexion) |

Menus réservés aux admins : Classes & Trimestres, Niveaux & Items, Médailles, Utilisateurs.

## 🧱 Stack technique

**Frontend** (`frontend/`)
- Next.js 16 (App Router) + React 19
- Tailwind CSS v4 — 4 thèmes : `shadowIslands`, `glass`, `institution`, `solid`
- Navigations contextuelles (auth JWT, rôles), gestion de toasts, CRUD générique

**Backend** (`backend/`)
- Express 5 (TypeScript)
- MariaDB (`mariadb` / `mysql2`) — authentification JWT (`jsonwebtoken`) — mots de passe hashés (`bcryptjs`)
- Upload d'images : `multer` + `sharp`
- Emails : `nodemailer` — tâches planifiées : `node-cron`

**Infrastructure**
- Docker Compose (dev + prod)

## 🗄️ Modèle de données

| Table | Rôle |
|-------|------|
| `users` | Comptes (`role`: superadmin / admin / professeur) |
| `classes` | Classes |
| `class_users` | Professeurs assignés à une classe (+ `is_principal`) |
| `trimestres` | Périodes de jeu (`is_active`) |
| `levels` | Niveaux de progression (liés à une médaille) |
| `items` | Items validables (`points_required`) rattachés à un niveau |
| `global_medals` | Médailles globales (`points_required`, `is_level_medal`) |
| `points_log` | Journal des points attribués (classe × item × prof × trimestre) |
| `class_archives` | Archive des résultats d'une classe par trimestre |

Le schéma complet est illustré dans [docs/technical-doc.md](docs/technical-doc.md#base-de-donn%C3%A9es).

## 🚀 Démarrage rapide

Prérequis : Docker + Docker Compose (plugin v2).

```bash
cp .env.example .env
make dev-build
make dev-up
```

- Frontend : `http://localhost:3000`
- Backend API : `http://localhost:5000`

L'initialisation de la base se fait automatiquement au premier démarrage
(`init.sql` monté dans le conteneur MariaDB). Créez ensuite un compte super
admin pour commencer.

## 🏗️ Commandes Make

| Commande | Effet |
|----------|-------|
| `make dev-up` / `make dev-down` | Démarre / arrête l'environnement de développement |
| `make dev-build` | Construit les images de développement |
| `make dev-logs` | Suit les logs de développement |
| `make prod-up` / `make prod-down` | Démarre / arrête la production |
| `make prod-build` | Construit les images de production |
| `make prod-logs` | Suit les logs de production |

## 📂 Structure du dépôt

```
├── frontend/               # Application Next.js / React / Tailwind v4
│   └── app/
│       ├── components/     # LayoutWrapper, DataTable, PageHeader, ...
│       ├── contexts/       # Thème, toasts
│       ├── hooks/          # useAdminGuard, useCrud, useSearch, useSort, ...
│       ├── services/       # Appels API (class, user, point, level, ...)
│       ├── types/          # Modèles TypeScript
│       └── {pages}/        # accueil, ajout-points, ma-classe, classes-trimestres, ...
├── backend/                # API Express / TypeScript
│   ├── routes/             # classRoutes, userRoutes, pointRoutes, ...
│   ├── services/           # Logique métier
│   ├── middleware/         # auth, upload
│   └── server.ts
├── docs/                   # Documentation technique (diagrammes Mermaid)
├── init.sql                # Schéma de base de données (MariaDB)
├── docker-compose.yml      # Environnement de développement
├── docker-compose.prod.yml # Environnement de production
└── Makefile                # Commandes rapides (dev/prod)
```

## 📚 Documentation technique

L'architecture, le modèle de données, l'authentification, les rôles, l'API et
le système de thèmes sont décrits avec des diagrammes dans
**[`docs/technical-doc.md`](docs/technical-doc.md)**.
