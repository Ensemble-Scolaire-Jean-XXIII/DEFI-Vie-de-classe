# DEFI — Vie de classe

Application web de **gamification scolaire** pour l'**Ensemble Scolaire Jean XXIII**.
Les enseignants attribuent des points aux classes en validant des items ; chaque
classe progresse à travers des niveaux et débloque des médailles au fil des
trimestres. Un **classement** suit la progression de chaque classe.

Une petite compétition sympa, motivante, pilotée par les professeurs et
administrée par l'établissement.

---

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Rôles et accès](#rôles-et-accès)
- [Stack technique](#stack-technique)
- [Modèle de données](#modèle-de-données)
- [Démarrage rapide (dev)](#démarrage-rapide-dev)
- [Déploiement](#déploiement)
- [Structure du dépôt](#structure-du-dépôt)

---

## Fonctionnalités

### 1. Progression par classe (accueil / classement)
- **Colonne gauche (≈15 % de la page)** :
  - **Statistiques totales** : points remportés, items et niveaux validés sur
    toute l'école (empilés verticalement).
  - **Meilleure classe** : la classe en tête du classement du trimestre.
- **Colonne droite (≈75 % de la page) — Récapitulatif par classe** :
  - En haut : les valeurs **Points remportés**, **Items validés** et
    **Niveaux validés** de la classe sélectionnée.
  - En dessous : un carré divisé en 4 avec les détails :
    **Items validés**, **Niveaux**, **Médailles débloquées** et
    **Points attribués par professeur** (admin uniquement).
- Les quadrants et la colonne droite **scrollent en interne** : les totaux
  restent visibles sans faire défiler toute la page.

### 2. Attribuer des points (professeurs)
- Les professeurs attribuent des points à une classe en sélectionnant un item
  validé.
- Section **« Mes points attribués »** : historique des points donnés par le
  professeur connecté, avec boutons de **rafraîchissement** et de **nouveau point**
  directement dans le header de cette section.

### 3. Ma classe (professeur principal)
- Vue réservée aux professeurs **principaux** de chaque classe.
- Points remportés, items/niveaux validés, niveaux à débloquer et médailles.
- Liste des **professeurs assignés** et des points qu'ils ont attribués.

### 4. Classes & Trimestres (admin)
- **Classes** : création/édition, réinitialisation, et assignation des professeurs
  (avec désignation du **professeur principal**) via une fenêtre modale.
- **Trimestres** : création de trimestres. Un seul trimestre est **Actif** à la
  fois (badge « ACTIF » à côté du nom) — la gestion est **automatique**, il n'y a
  plus de colonne d'actions manuelle.

### 5. Niveaux & Items (admin)
- Définition des **niveaux** (avec image de médaille associée) et des **items**
  validables (chaque item a un `points_required`).

### 6. Médailles (admin)
- Gestion des **médailles globales** (image + points requis).
- Médailles **débloquées par niveau** : badge « N/A (débloquée par niveau) »
  lorsqu'une médaille est activée par la validation d'un niveau plutôt que par un
  seuil de points.

### 7. Utilisateurs & profil (admin)
- Gestion des comptes (rôles `superadmin` / `admin` / `professeur`).
- Page **Profil** pour chaque utilisateur connecté.

---

## Rôles et accès

| Rôle               | Accès                                                                  |
|--------------------|------------------------------------------------------------------------|
| **superadmin**     | Tout (accès complet, gestion des utilisateurs, réinitialisation)       |
| **admin**          | Tout sauf la création du 1er superadmin (gestion des utilisateurs)     |
| **professeur**     | « Attribuer des points », « Ma classe » si professeur principal        |
| **invité**         | Lecture du classement public (page d'accueil accessible sans connexion)|

Menus réservés aux **admins** : Classes & Trimestres, Niveaux & Items, Médailles,
Utilisateurs.

---

## Stack technique

**Frontend** (`frontend/`)
- Next.js 16 (App Router), React 19
- Tailwind CSS v4 (thèmes `shadowIslands`, `glass`, `institution`, `solid`)
- Composants : `DataTable`, `ScrollableTableCard`, `PageHeader`, squelettes de
  chargement, gestion de toast (undo/success/error)

**Backend** (`backend/`)
- Express 5 (TypeScript)
- MariaDB (`mysql2` / `mariadb`), `jsonwebtoken` (auth JWT), `bcryptjs` (mots de passe)
- Upload d'images : `multer` + `sharp`
- Envoi d'emails : `nodemailer` (+ templating)
- Tâches planifiées : `node-cron`

**Infrastructure**
- Docker Compose (dev + prod)
- Reverse proxy HTTPS + WAF ModSecurity/OWASP CRS (production) — voir `README_PROD.md`

---

## Modèle de données

| Table             | Rôle                                                                 |
|-------------------|----------------------------------------------------------------------|
| `users`           | Comptes (`role`: superadmin / admin / professeur)                    |
| `classes`         | Classes                                                              |
| `class_users`     | Professeurs assignés à une classe (+ `is_principal`)                 |
| `trimestres`      | Périodes de jeu (`is_active`)                                        |
| `levels`          | Niveaux de progression (liés à une médaille)                         |
| `items`           | Items validables (`points_required`) rattachés à un niveau           |
| `global_medals`   | Médailles globales (`points_required`, `is_level_medal`)             |
| `points_log`      | Journal des points attribués (classe × item × prof × trimestre)      |
| `class_archives`  | Archive des résultats d'une classe par trimestre                     |

---

## Démarrage rapide (dev)

Prérequis : Docker + Docker Compose (plugin v2).

```bash
cp .env.example .env
docker compose up --build
```

- Frontend : `http://localhost:3000`
- Backend API : `http://localhost:5000`

Pour initialiser la base, `init.sql` est monté dans le conteneur MariaDB (exécuté
au premier démarrage d'un volume vide). Créez ensuite un compte super admin
(voir `scripts/create-superadmin.sh` ou la section correspondante de
`README_PROD.md`).

---

## Déploiement

La production est décrite en détail dans **[`README_PROD.md`](README_PROD.md)** :
reverse proxy HTTPS (`defi6e.jean23.com`), WAF ModSecurity + OWASP CRS,
limitation de débit, certificats Let's Encrypt via Certbot, isolation du réseau
et sauvegardes.

```bash
make prod-build
make prod-up
```

---

## Structure du dépôt

```
├── frontend/               # Application Next.js / React / Tailwind v4
│   └── app/                #  Pages (accueil, ajout-points, ma-classe, classes-trimestres, niveaux-items, medailles, utilisateurs, profil)
│       ├── components/     #  DataTable, ScrollableTableCard, PageHeader, ...
│       ├── contexts/       #  Thème, toasts
│       ├── hooks/          #  useAdminGuard, useCrud, useSearch, useSort, ...
│       ├── services/       #  Appels API (class, user, point, level, item, trimestre, ...)
│       └── types/          #  Modèles TypeScript
├── backend/                # API Express / TypeScript
│   ├── routes/             #  classRoutes, userRoutes, pointRoutes, levelRoutes, ...
│   ├── services/           #  Logique métier
│   ├── middleware/         #  auth, upload
│   └── server.ts
├── init.sql                # Schéma de base de données (MariaDB)
├── docker-compose.yml      # Environnement de développement
├── docker-compose.prod.yml # Environnement de production
├── nginx/                  # Reverse proxy HTTPS + WAF (production)
├── certbot/                # Certificats Let's Encrypt (production)
├── scripts/                # Scripts utilitaires (create-superadmin.sh, ...)
└── Makefile                # Commandes rapides (prod-build, prod-up, ...)
```
