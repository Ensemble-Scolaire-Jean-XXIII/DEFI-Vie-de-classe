# Documentation technique — DEFI · Vie de classe

Documentation de référence de l'application **DEFI · Vie de classe** pour
l'Ensemble Scolaire Jean XXIII. Elle couvre l'architecture globale, le modèle
de données, l'authentification, la navigation, l'API backend et le système de
thèmes, avec des diagrammes Mermaid pour illustrer les flux.

> **Guide utilisateur** : le guide d'utilisation destiné aux professeurs et
> administrateurs est disponible dans
> [`Guide utilisateur — Défi Vie de classe.docx`](../Guide%20utilisateur%20%E2%80%94%20D%C3%A9fi%20Vie%20de%20classe.docx).
> Sa source est [`user-guide.html`](user-guide.html), régénéré par
> `build-user-guide.sh`.

---

## Sommaire

1. [Architecture globale](#architecture-globale)
2. [Base de données](#base-de-données)
3. [Authentification](#authentification)
4. [Navigation et rôles](#navigation-et-rôles)
5. [API Backend](#api-backend)
6. [Emails (SMTP)](#emails-smtp)
7. [Système de thèmes](#système-de-thèmes)
8. [Attribution de points](#attribution-de-points)
9. [Dépendances et sécurité](#dépendances-et-sécurité)

---

## Architecture globale

L'application est composée de trois services conteneurisés avec Docker Compose,
orchestrés par `Makefile`. Le frontend Next.js consomme l'API Express via des
services TypeScript (couche `frontend/app/services/`).

```mermaid
flowchart LR
    subgraph Client["Client (navigateur)"]
        FE["Frontend Next.js 16<br/>App Router + React 19"]
    end

    subgraph Serveur["Conteneurs Docker"]
        BE["Backend Express 5<br/>(TypeScript)"]
        DB[("MariaDB 10.11<br/>db-defi-vdc")]
    end

    FE -- "HTTP / JSON<br/>JWT Bearer" --> BE
    BE -- "mariadb / mysql2" --> DB

    FE --> L["LayoutWrapper<br/>navigation + thèmes"]
    BE --> R["Routes /api/*"]
```

- **Frontend** (`frontend/`) : Next.js 16 (App Router), React 19, Tailwind CSS v4.
  Toutes les pages sont enveloppées par `LayoutWrapper` (navigation, thèmes, toasts).
- **Backend** (`backend/`) : Express 5, exposé sur le port 5000, montée sur `/api/*`.
  Les fichiers statiques uploadés sont servis sur `/uploads`.
- **Base de données** : MariaDB 10.11. Le schéma est initialisé via `init.sql`
  au premier démarrage d'un volume vide.
- **Orchestration** : `docker-compose.yml` (dev) et `docker-compose.prod.yml` (prod),
  pilotées par le `Makefile`.

---

## Base de données

### Modèle relationnel

```mermaid
erDiagram
    users {
        varchar id PK
        varchar email UK
        varchar password_hash
        varchar first_name
        varchar last_name
        enum role "superadmin|admin|professeur"
    }

    classes {
        int id PK
        varchar name
    }

    class_users {
        int class_id PK,FK
        varchar user_id PK,FK
        tinyint is_principal
    }

    trimestres {
        int id PK
        varchar name
        date start_date
        date end_date
        tinyint is_active
    }

    levels {
        int id PK
        varchar name
        varchar medal_image
        int global_medal_id FK
    }

    items {
        int id PK
        int level_id FK
        varchar name
        int points_required
        varchar image
    }

    global_medals {
        int id PK
        varchar name
        int points_required
        varchar image
        tinyint is_level_medal
    }

    points_log {
        int class_id PK,FK
        int item_id PK,FK
        varchar user_id PK,FK
        int trimestre_id PK,FK
        int points_awarded
    }

    class_archives {
        int id PK
        int class_id FK
        int trimestre_id FK
        int total_points
        json levels_validated
        int global_medal_id FK
    }

    users ||--o{ class_users : "est affecté à"
    classes ||--o{ class_users : "contient"
    users ||--o{ points_log : "attribue"
    classes ||--o{ points_log : "reçoit"
    items ||--o{ points_log : "valide"
    trimestres ||--o{ points_log : "période"
    levels ||--o{ items : "regroupe"
    global_medals ||--o{ levels : "associé à"
    classes ||--o{ class_archives : "archive"
    trimestres ||--o{ class_archives : "archive"
```

### Tables et rôles

| Table            | Rôle                                                                                         |
| ---------------- | -------------------------------------------------------------------------------------------- |
| `users`          | Comptes utilisateurs, rôle `ENUM('superadmin','admin','professeur')`                         |
| `classes`        | Classes de l'établissement                                                                   |
| `class_users`    | Affectation professeur → classe, avec flag `is_principal`                                    |
| `trimestres`     | Périodes de jeu avec `is_active` (un seul actif)                                             |
| `levels`         | Niveaux de progression, éventuellement liés à une médaille globale                           |
| `items`          | Actions validables rattachées à un niveau, chacune avec un `points_required`                 |
| `global_medals`  | Médailles globales débloquées par seuil de points (`is_level_medal` pour le mode par niveau) |
| `points_log`     | Journal des points attribués (classe × item × professeur × trimestre)                        |
| `class_archives` | Snapshot des résultats d'une classe par trimestre                                            |

---

## Authentification

Le flux est basé sur un **JWT** stocké côté client (`localStorage['token']`).
Le mittelware `authenticate` décode le token ; `requireRole` restreint ensuite
aux rôles autorisés.

```mermaid
sequenceDiagram
    participant U as Utilisateur
    participant FE as Frontend (Next.js)
    participant BE as Backend (Express)
    participant DB as MariaDB

    U->>FE: Saisit email + mot de passe
    FE->>BE: POST /api/users/connexion
    BE->>DB: Vérifie hash (bcryptjs)
    DB-->>BE: ok
    BE-->>FE: { token: JWT, role, ... }
    FE->>FE: localStorage.setItem("token", ...)
    FE->>BE: GET /api/users/me (Bearer token)
    BE->>BE: authenticate → vérifie JWT
    BE-->>FE: Profil + classes (is_principal)
    FE->>FE: Détermine affichage selon rôle
```

- **Déconnexion** : `localStorage.removeItem("token")` + redirection.
- **Chargement initial** : `LayoutWrapper` parse le JWT (`parseJwt`) → met `role`.
  Pour un `professeur`, il appelle `GET /api/users/me` pour détecter les classes
  où il est professeur principal (`is_principal`).

### Cycle de vie de la session côté client

`frontend/app/services/api.ts` centralise les appels authentifiés
(`get` / `post` / `put` / `delete`) autour d'un unique `send` + `handleResponse`.
Une réponse `401` **ne clôt pas automatiquement la session** : elle n'est traitée
comme une fin de session que si le corps de la réponse est vide ou porte un
message d'authentification connu (`Unauthorized`, `Invalid token`,
`Session expirée`). Toute autre erreur `401` métier est remontée telle quelle
à l'appelant, qui l'affiche sans supprimer le token.

```mermaid
flowchart TD
    A[api.send] --> B{status = 204 ?}
    B -- Oui --> Z[Retour undefined]
    B -- Non --> C[handleResponse lit le corps JSON]
    C --> D{status = 401 ?}
    D -- Non --> E{res.ok ?}
    E -- Non --> F[throw Error(message métier)]
    E -- Oui --> G[Retour du JSON]
    D -- Oui --> H{message = Unauthorized / Invalid token / vide ?}
    H -- Oui --> I[localStorage.removeItem token + redirection /connexion]
    H -- Non --> F
```

### Changement de mot de passe

`PUT /api/users/me` avec `password_hash` + `old_password` appelle
`userService.updateSelf`. Les règles sont appliquées côté backend, qui fait
référence, et re-vérifiées côté frontend pour un retour immédiat :

| Règle | Code HTTP | Message |
| --- | --- | --- |
| Ancien mot de passe absent | `400` | L'ancien mot de passe est requis. |
| Ancien mot de passe incorrect | `400` | L'ancien mot de passe est incorrect. |
| Nouveau mot de passe identique à l'ancien | `400` | Le nouveau mot de passe doit être différent de l'ancien. |

L'ancien mot de passe est vérifié par `bcrypt.compare` contre le hash stocké
avant tout hachage du nouveau. Les erreurs de saisie sont volontairement
renvoyées en `400` et non `401` : un mot de passe mal saisi est une erreur de
validation du formulaire, pas une défaillance d'authentification, et ne doit
donc pas provoquer de déconnexion (cf. cycle de vie de session ci-dessus).

```mermaid
sequenceDiagram
    participant U as Utilisateur
    participant FE as useProfile / profil
    participant BE as PUT /api/users/me
    participant DB as MariaDB

    U->>FE: Ancien + nouveau + confirmation
    FE->>FE: Regex complexité, confirmation, nouveau ≠ ancien
    FE->>BE: { password_hash, old_password }
    BE->>DB: SELECT password_hash
    BE->>BE: bcrypt.compare(ancien, hash)
    alt ancien incorrect
        BE-->>FE: 400 "L'ancien mot de passe est incorrect."
        FE->>U: Affiche l'erreur (session conservée)
    else nouveau identique à l'ancien
        BE-->>FE: 400 "Le nouveau mot de passe doit être différent..."
        FE->>U: Affiche l'erreur (session conservée)
    else valide
        BE->>BE: bcrypt.hash(nouveau, salt)
        BE->>DB: UPDATE users SET password_hash
        BE-->>FE: 204
        FE->>U: Succès + champs vidés
    end
```

> Le champ « Ancien mot de passe » n'est `required` que lorsqu'un nouveau mot
> de passe est saisi, afin de ne pas bloquer une soumission sans modification
> de mot de passe.

---

## Navigation et rôles

La navigation est centralisée dans `frontend/app/components/LayoutWrapper.tsx`.
Le composant gère la barre desktop (>1600px), le menu hamburger mobile et le
dropdown Administration.

```mermaid
flowchart TD
    A[LayoutWrapper] --> B{Route = /connexion ?}
    B -- Oui --> Z[Page seule, sans navigation]
    B -- Non --> C[Décode JWT → role]
    C --> D{role}
    D -- null/invité --> E[Progression par classe + Connexion]
    D -- professeur --> F[Progression par classe]
    D -- professeur --> G[Attribuer des points]
    D -- professeur principal --> H[Ma classe]
    D -- admin/superadmin --> I[Administration]
    I --> I1[Classes & Trimestres]
    I --> I2[Niveaux & Items]
    I --> I3[Médailles]
    I --> I4[Utilisateurs]

    E --> M{Mobile ?}
    F --> M
    G --> M
    H --> M
    M -- <1600px --> MMA[Menu hamburger<br/>slide-in depuis la gauche]
    M -- >=1600px --> MDS[Barre de navigation desktop]
```

### Menu hamburger (mobile)

- Visible sous 1600px (breakpoint Tailwind `desktop`, défini dans `globals.css`).
- **Panneau latéral** glissant depuis la gauche (`translate-x`, transition 300 ms
  `ease-out`) sur fond assombri + flou (`backdrop-blur`).
- **Fermeture automatique** :
  - au clic sur un lien (`onNavigate`) ;
  - au changement de route (`useEffect` sur `pathname`) ;
  - au passage au viewport desktop (`matchMedia("(min-width: 1600px)")`) ;
  - au clic sur l'overlay ou sur le bouton de fermeture.

---

## API Backend

Mittelware communs : `authenticate` (JWT) et `requireRole([...])` (contrôle de rôle).

| Méthode  | Route                            | Accès                   | Description                                     |
| -------- | -------------------------------- | ----------------------- | ----------------------------------------------- |
| `POST`   | `/api/users/connexion`           | public                  | Connexion, retourne le JWT                      |
| `GET`    | `/api/users`                     | admin, superadmin       | Liste des utilisateurs                          |
| `GET`    | `/api/users/me`                  | authentifié             | Profil de l'utilisateur connecté                |
| `PUT`    | `/api/users/me`                  | authentifié             | Mise à jour de son propre profil                |
| `POST`   | `/api/users`                     | admin, superadmin       | Crée un utilisateur (+ mot de passe généré)     |
| `PUT`    | `/api/users/:id`                 | admin, superadmin       | Met à jour un utilisateur                       |
| `DELETE` | `/api/users/:id`                 | admin, superadmin       | Supprime un utilisateur                         |
| `GET`    | `/api/classes`                   | public                  | Liste des classes                               |
| `GET`    | `/api/classes/leaderboard`       | public                  | Classement (param `trimestre_id`)               |
| `POST`   | `/api/classes/reset`             | admin, superadmin       | Réinitialise toutes les classes                 |
| `GET`    | `/api/classes/points-by-teacher` | prof, admin, superadmin | Points par professeur et classe                 |
| `GET`    | `/api/classes/:id/teachers`      | public                  | Professeurs d'une classe                        |
| `GET`    | `/api/classes/:id/users`         | admin, superadmin       | Utilisateurs affectés à une classe              |
| `POST`   | `/api/classes/users`             | admin, superadmin       | Affecte un professeur à une classe              |
| `DELETE` | `/api/classes/:id/users/:userId` | admin, superadmin       | Retire un professeur d'une classe               |
| `GET`    | `/api/classes/:id`               | public                  | Détails d'une classe                            |
| `POST`   | `/api/classes`                   | admin, superadmin       | Crée une classe                                 |
| `PUT`    | `/api/classes/:id`               | admin, superadmin       | Modifie une classe                              |
| `DELETE` | `/api/classes/:id`               | admin, superadmin       | Supprime une classe                             |
| `GET`    | `/api/items`                     | public                  | Liste des items                                 |
| `POST`   | `/api/items`                     | admin, superadmin       | Crée un item                                    |
| `PUT`    | `/api/items/:id`                 | admin, superadmin       | Modifie un item                                 |
| `DELETE` | `/api/items/:id`                 | admin, superadmin       | Supprime un item                                |
| `GET`    | `/api/levels`                    | public                  | Liste des niveaux                               |
| `POST`   | `/api/levels`                    | admin, superadmin       | Crée un niveau                                  |
| `PUT`    | `/api/levels/:id`                | admin, superadmin       | Modifie un niveau                               |
| `DELETE` | `/api/levels/:id`                | admin, superadmin       | Supprime un niveau                              |
| `GET`    | `/api/global-medals`             | public                  | Liste des médailles globales                    |
| `POST`   | `/api/global-medals`             | admin, superadmin       | Crée une médaille                               |
| `PUT`    | `/api/global-medals/:id`         | admin, superadmin       | Modifie une médaille                            |
| `DELETE` | `/api/global-medals/:id`         | admin, superadmin       | Supprime une médaille                           |
| `POST`   | `/api/points`                    | prof, admin, superadmin | Attribue un point à une classe                  |
| `GET`    | `/api/points/mine`               | authentifié             | Points attribués par l'utilisateur              |
| `GET`    | `/api/points/progress/:classId`  | public                  | Progression d'une classe (param `trimestre_id`) |
| `GET`    | `/api/trimestres`                | public                  | Liste des trimestres                            |
| `POST`   | `/api/trimestres`                | admin, superadmin       | Crée un trimestre                               |
| `PUT`    | `/api/trimestres/:id`            | admin, superadmin       | Modifie un trimestre                            |
| `DELETE` | `/api/trimestres/:id`            | admin, superadmin       | Supprime un trimestre                           |
| `POST`   | `/api/trimestres/:id/archive`    | admin, superadmin       | Archive un trimestre                            |

Les images uploadées sont servies statiquement via `/uploads`.

---

## Emails (SMTP)

Les emails d'application sont envoyés avec `nodemailer` depuis
`backend/config/mail.ts`. Le template reprend la charte du **thème
`institution`** (style Ensemble Scolaire Jean 23) : fond bleu nuit `#0f172a`,
carte slate `#1e293b`, bandeau supérieur orange `#e84e1b`, texte clair
`#cbd5e1`, lien orange `#fb923c`, et **signature en pied de page**
(`<img src="cid:signature">` attaché en ligne depuis `backend/public/signature.png`).

### Configuration

Variables d'environnement définies dans `.env` (racine) et transmises au
container backend via `docker-compose.yml` (dev) et `docker-compose.prod.yml` :

| Variable     | Rôle                                          |
| ------------ | --------------------------------------------- |
| `SMTP_HOST`  | Serveur SMTP (ex. `smtp.hostinger.com`)       |
| `SMTP_PORT`  | Port (465 = SSL, sinon 587 par défaut)        |
| `SMTP_USER`  | Compte émetteur                                |
| `SMTP_PASS`  | Mot de passe du compte émetteur                |
| `SMTP_FROM`  | Adresse d'expédition (sinon `SMTP_USER`)      |
| `FRONTEND_URL` | Lien affiché dans le corps du mail          |

- En **production**, `FRONTEND_URL` doit pointer vers l'URL publique du
  frontend (le fallback dev `http://localhost:3000` ne doit pas y être utilisé).
- Après modification de `.env`, recréer le container : `make dev-up`.

### Fonctions

- `sendMail(to, subject, text, htmlContent?)` : envoi générique stylisé
  (titre = `subject`, corps = `htmlContent` ou `text`, signature en bas).
- `sendWelcomeEmail(to, password, user?)` : email de création de compte
  (lien `FRONTEND_URL`, identifiants, mot de passe temporaire).

### Comportements notables

- **SMTP non configuré** : l'envoi est journalisé en console (`[MAIL] SMTP non
  configuré …`) sans bloquer le flux de développement.
- **Échec d'envoi** : lors de la création d'un utilisateur (`POST /api/users`),
  l'envoi du mot de passe est isolé dans un `try/catch` dédié
  (`createUser` dans `backend/services/userService.ts`). Un échec n'empêche
  pas la création du compte et ne remonte pas une fausse erreur base de données.

---

## Système de thèmes

Quatre thèmes sont définis dans `frontend/app/contexts/ThemeContext.tsx` et
appliqués via des variables CSS (`globals.css`). Le choix est persisté dans
`localStorage['crm-theme']` et appliqué via l'attribut `data-theme` sur
`<html>`.

```mermaid
flowchart LR
    TC[ThemeContext] --> |localStorage.crm-theme| T0{Récupère le thème}
    T0 --> T1[shadowIslands]
    T0 --> T2[glass]
    T0 --> T3[institution]
    T0 --> T4[solid]
    T1 --> CSS[globals.css<br/>variables CSS + data-theme]
    T2 --> CSS
    T3 --> CSS
    T4 --> CSS
    CSS --> UI[Composants<br/>nav, cartes, boutons, tables]
```

| Thème                  | Style                                              |
| ---------------------- | -------------------------------------------------- |
| `shadowIslands`        | Verre sombre, arrondi généreux, accent orange      |
| `glass`                | Verre translucide, accent cyan                     |
| `institution` (défaut) | Palette bleu nuit institutionnelle, arrondi modéré |
| `solid`                | Solide, angles droits, sans flou                   |

Chaque thème expose un objet `t` (wrapper, header, main, card, tableHeader,
tableRow, input, btnPrimary, btnGhost, textMuted, title, activeNav, navHover)
consommé par les composants via le hook `useTheme()`.

---

## Attribution de points

Flux métier principal déclenchant la progression des classes.

```mermaid
sequenceDiagram
    participant Prof as Professeur
    participant FE as Frontend
    participant BE as Backend
    participant DB as MariaDB

    Prof->>FE: Sélectionne classe + item + trimestre
    FE->>BE: POST /api/points { class_id, item_id, trimestre_id }
    BE->>BE: authenticate + requireRole(prof/admin)
    BE->>DB: Insère points_log
    BE->>DB: Calcule progression (niveaux validés)
    BE-->>FE: Résultat (points, niveaux, médailles)
    FE->>Prof: Confirmation + mise à jour du tableau de bord
```

- La progression d'une classe repose sur la validation d'items
  (`points_required`) rattachés aux niveaux.
- Les **médailles globales** se débloquent soit par un seuil de points
  (`points_required`), soit, si `is_level_medal = 1`, par la validation d'un niveau.
- À la clôture d'un trimestre, `POST /api/trimestres/:id/archive` fige les
  résultats dans `class_archives`.

---

## Dépendances et sécurité

### Politique de mise à jour

- Les dépendances directes sont mises à jour **par patch uniquement**
  (`x.y.z` → `x.y.(z+1)`), sauf correctif de sécurité déjà publié dans la
  branche de version supérieure.
- `next` et `eslint-config-next` sont épinglés en version exacte ; toutes les
  autres dépendances directes utilisent un `^`.
- Les mises à jour transitives de sécurité (`npm audit`, alertes Dependabot)
  sont traitées par lockfile : la version déclarée dans `package.json` est
  rarement modifiée.

### Règle critique : ne jamais régénérer un lockfile avec npm 10

Les images de production tournent sur Alpine (musl) et s'appuient sur les
métadonnées **`libc`** présentes dans `frontend/package-lock.json`
(38 entrées). Un `npm install --package-lock-only` effectué avec npm 10
(≤ 10.9.x) **supprime silencieusement ces 38 champs**, ce qui produit un
lockfile qui s'installe en local mais casse la résolution musl en production.

Procédure validée pour toute mise à jour de lockfile :

1. régénérer dans un conteneur `node:24` (npm 11) monté en lecture-écriture,
   lancé avec l'UID de l'utilisateur pour ne pas créer de fichiers root :

   ```bash
   docker run --rm --user "$(id -u):$(id -g)" \
     -v "$PWD":/w -w /w node:24 \
     npm install --package-lock-only --no-audit --no-fund
   ```

2. vérifier que le champ `libc` est conservé :

   ```bash
   node -p 'Object.keys(require("./package-lock.json").packages)
     .filter(k => require("./package-lock.json").packages[k].libc).length'
   ```

3. `npm install --package-lock-only` et `npm update` sont **idempotents** sur un
   lockfile existant : ils ne re-valident pas les plages transitives. Pour
   corriger une incohérence, il faut **retirer l'entrée fautive du lockfile**
   puis régénérer, afin que npm la re-résolve depuis le registre.
4. `npm ls` doit rester sans marqueur `invalid`, et `npm audit` à 0 vulnérabilité.

### Versions sensibles suivies

| Paquet | Rôle | Contrainte |
| --- | --- | --- |
| `ip-address` | via `express-rate-limit`, présent en production | `>= 10.7.2` |
| `baseline-browser-mapping` | données browserslist/Next | `>= 2.11.26` |
| `brace-expansion` | outillage de dev uniquement | `>= 5.0.12` / `>= 1.1.21` |
| `browserslist` | données de navigateurs | `>= 4.29.3` |
| `qs` | parsing de query string | `>= 6.16.0` |

Un bump manuel de `browserslist` sans ses paquets de données
(`caniuse-lite`, `node-releases`, `electron-to-chromium`,
`update-browserslist-db`, `baseline-browser-mapping`) laisse un lockfile
incohérent : `npm ci` l'installe quand même, et les images Docker
(`npm ci`) embarquent alors la version vulnérable.
