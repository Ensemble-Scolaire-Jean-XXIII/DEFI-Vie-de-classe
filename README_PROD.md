# Déploiement en production — DEFI Vie de classe

Ce document décrit le déploiement **en production** de l'application sur le
sous-domaine **`https://defi6e.jean23.com`**, avec un reverse proxy HTTPS et un
pare-feu applicatif (**WAF ModSecurity + OWASP CRS**).

> ⚠️ Dépoyer **en production uniquement**. L'environnement de développement
> (`docker-compose.yml`) n'est **pas** modifié ni exposé (aucun reverse proxy,
> aucun WAF en dev).

---

## 1. Architecture

```
                   Internet
                      │  :80 / :443
              ┌───────▼────────┐
              │   nginx-proxy-prod        (WAF ModSecurity + OWASP CRS + TLS)
              │   (conteneur)             /api → backend, /uploads → backend, / → frontend
              └───────┬─────────────────┬────────────┐
                      │                 │            │
              ┌───────▼───────┐ ┌───────▼──────┐ ┌───▼────────────┐
              │ frontend-defi │ │ backend-defi │ │ db-defi-vdc    │
              │ -vdc-prod     │ │ -vdc-prod    │ │ -prod (MariaDB)│
              │ (:3000)       │ │ (:5000)      │ │ (:3306, interne│
              └───────────────┘ └──────────────┘ │  uniquement)   │
                                                 └────────────────┘
```

- **frontend** : Next.js (`npm start`, port 3000), conteneur interne.
- **backend** : Express (`server.ts`, port 5000), conteneur interne.
- **db** : MariaDB, **réseau `internal` uniquement**, jamais exposée sur l'hôte.
- **nginx + certbot** : reverse proxy HTTPS + renouvellement Let's Encrypt + WAF.

Le frontend appelle l'API en **même origine** (`/api`) — `NEXT_PUBLIC_API_URL=/api`
étant la valeur par défaut du code — ce qui passe simplement par le reverse proxy.

---

## 2. Prérequis

- Un serveur Linux (Debian/Ubuntu recommandé) avec **Docker** et **Docker Compose** (plugin, ≥ v2).
- Le DNS configuré : **`defi6e.jean23.com` → <IP_du_serveur>** (record A).
- Les ports **80** et **443** ouverts ; le reste fermé.
- Accès `root` ou un utilisateur avec `sudo`.

---

## 3. Configuration de l'environnement (`.env`)

Copier le fichier d'exemple puis adapter les valeurs pour la production :

```bash
cp .env.example .env
```

Valeurs **obligatoires / recommandées pour la prod** :

| Variable              | Valeur prod recommandée                                  | Pourquoi                                                          |
|-----------------------|----------------------------------------------------------|-------------------------------------------------------------------|
| `FRONTEND_URL`        | `https://defi6e.jean23.com`                              | Lien de bienvenue / CORS dans l'email                             |
| `NEXT_PUBLIC_API_URL` | `/api` (même origine)                                    | Le frontend appelle l'API via le reverse proxy                    |
| `MYSQL_ROOT_PASSWORD` | mot de passe fort, **différent** de l'exemple            | Sécurité de la base                                                |
| `MYSQL_PASSWORD`      | mot de passe fort, **différent** de l'exemple            | Sécurité de la base                                                |
| `JWT_SECRET`          | secret aléatoire long (`openssl rand -hex 64`)           | Signe les jetons d'authentification                                |

> ⚠️ Ne pas réutiliser les secrets de l'exemple en production.

---

## 4. Initialisation de la base de données

Le fichier `init.sql` (qui contient désormais la colonne `is_level_medal` de la
table `global_medals`) est monté dans le conteneur MariaDB de production :

```yaml
# docker-compose.prod.yml
db-defi-vdc:
  volumes:
    - db_data_prod:/var/lib/mysql
    - ./init.sql:/docker-entrypoint-initdb.d/init.sql:ro
```

MariaDB exécute `init.sql` **uniquement au premier démarrage d'un volume vide**
(`db_data_prod`). Le schéma (tables et `README`) est donc créé automatiquement.

- **Volume vide (première mise en service)** : rien à faire, le schéma est chargé automatiquement.
- **Volume déjà initialisé** : l'`init.sql` **ne s'exécute plus**. Si un schéma plus
  récent ajoute des colonnes (ex. `is_level_medal`), appliquer les migrations à la main :

```bash
docker compose -f docker-compose.prod.yml exec -T db-defi-vdc-prod \
  mariadb -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" \
  -e "ALTER TABLE global_medals ADD COLUMN IF NOT EXISTS is_level_medal TINYINT(1) NOT NULL DEFAULT 0 AFTER image;"
```

---

## 5. Création du compte super admin

Le 1er accès administratif se fait en créant un **super admin** directement en base
(l'application ne permet pas de créer un super admin sans en avoir déjà un).

### 5.1 Utiliser le script fourni

Après avoir démarré le stack de production (voir §6), lancer :

```bash
./scripts/create-superadmin.sh <email> '<mot-de-passe>' <prenom> <nom>
# ex. :
./scripts/create-superadmin.sh j23.dev@jean23.org 'Jean23-Admin-2026!' Jean Jean23
```

Le script :
1. calcule le hash **bcrypt** du mot de passe via le conteneur backend (`bcryptjs`) ;
2. insère l'utilisateur avec le rôle `superadmin` dans la table `users`
   (ou **met à jour** son mot de passe/rôle s'il existe déjà, grâce à `ON DUPLICATE KEY`).

Les colonnes cibles : `id UUID()`, `email`, `password_hash` (bcrypt),
`first_name`, `last_name`, `role='superadmin'`.

### 5.2 Faire soi-même (équivalent manuel)

Obtenir un hash bcrypt puis insérer :

```bash
HASH=$(docker compose -f docker-compose.prod.yml exec -T backend-defi-vdc-prod \
  node -e "console.log(require('bcryptjs').hashSync(process.argv[1], 10))" 'MonMdp!')

docker compose -f docker-compose.prod.yml exec -T db-defi-vdc-prod \
  mariadb -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" \
  -e "INSERT IGNORE INTO users (id, email, password_hash, first_name, last_name, role)
      VALUES (UUID(), 'admin@jean23.org', '$HASH', 'Admin', 'Jean23', 'superadmin');"
```

### 5.3 Réinitialiser un mot de passe

Depuis l'application, un compte **super admin** peut réinitialiser le mot de passe
de n'importe quel utilisateur (et créer des admins). Pour un secondary,
utiliser le même script `create-superadmin.sh` (il met à jour le mot de passe).

---

## 6. Déploiement

### 6.1 Le fichier `docker-compose.prod.yml`

Les services de production :
- `db-defi-vdc` (MariaDB, interne) + `init.sql` monté.
- `backend-defi-vdc` (Express, interne) **+ volume persistant `uploads_data:/app/uploads`**
  (les images uploadées survivent aux redéploiements).
- `frontend-defi-vdc` (Next.js, interne).
- `nginx` construit depuis `nginx/Dockerfile.prod` (WAF + TLS) : ports 80/443.
- `certbot` : renouvellement automatique des certificats (cycle 12 jours).

Le réseau `internal` est **isolé** (`internal: true`) : seul `proxy-net` est public.

### 6.2 Premier démarrage — bootstrap du certificat TLS

Le bloc HTTPS (`nginx/conf.d/defi6e-https.conf`) référence le certificat
`/etc/letsencrypt/live/defi6e.jean23.com/...` qui **n'existe pas encore** au
premier démarrage. Il faut donc obtenir le certificat **avant** d'activer le HTTPS :

**Étape 1 — Démarrer en HTTP uniquement.**

Pendant le bootstrap, déplacer temporairement le bloc HTTPS hors du dossier monté :

```bash
mkdir -p /tmp/nginx-bootstrap
mv nginx/conf.d/defi6e-https.conf /tmp/nginx-bootstrap/
```

**Étape 2 — Démarrer le stack.**

```bash
make prod-build   # construit les images (backend, frontend, nginx WAF)
make prod-up      # docker compose -f docker-compose.prod.yml up -d
```

**Étape 3 — Émettre le certificat** Let's Encrypt (webroot, via le nginx HTTP) :

```bash
mkdir -p certbot/www
docker compose -f docker-compose.prod.yml run --rm \
  -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  -v "$(pwd)/certbot/www:/var/www/certbot" \
  certbot/certbot certonly --webroot -w /var/www/certbot \
  -d defi6e.jean23.com --email admin@jean23.org --agree-tos --no-eff-email
```

**Étape 4 — Réactiver le HTTPS puis relancer nginx.**

```bash
mv /tmp/nginx-bootstrap/defi6e-https.conf nginx/conf.d/
make prod-down && make prod-up
```

> Sur les démarrages suivants, le certificat existe déjà : le stack monte
> directement en HTTPS, et `certbot` renouvelle automatiquement les certificats
> arrivant à expiration (entrée du conteneur `certbot`).

### 6.3 Redéploiement après mise à jour du code

Depuis le serveur, récupérer le code puis relancer :

```bash
git pull
make prod-build && make prod-up
```

---

## 7. Reverse proxy HTTPS

Fichiers **uniquement utilisés par la prod** (le dev les ignore) :

| Fichier                                | Rôle                                                        |
|----------------------------------------|-------------------------------------------------------------|
| `nginx/Dockerfile.prod`                | Image nginx basée sur `owasp/modsecurity-crs:nginx`         |
| `nginx/conf.d/defi6e.conf`             | Port 80 : challenge ACME + redirection vers HTTPS           |
| `nginx/conf.d/defi6e-https.conf`       | Port 443 : TLS + reverse proxy `/api`, `/uploads`, `/`     |
| `certbot/conf` / `certbot/www`         | Certificats Let's Encrypt + dossier webroot (persistants)   |

Règles de routage :
- `/.well-known/acme-challenge/` → webroot certbot (pour le challenge HTTP).
- `/api/` → backend `backend-defi-vdc-prod:5000` (avec en-têtes SSL/X-Forwarded-For).
- `/uploads/` → backend (fichiers statiques, mise en cache 30 jours).
- `/` → frontend `frontend-defi-vdc-prod:3000`.

Le reverse proxy conserve l'en-tête `Authorization` et propage l'IP réelle
(`X-Forwarded-For`) pour les logs et la limitation de débit.

---

## 8. Pare-feu applicatif (WAF) — ModSecurity + OWASP CRS

L'image `nginx` de production embarque **ModSecurity** avec **OWASP Core Rule Set**
(CRS 3.x) : détection SQL injection (SQLi), XSS, path traversal (LFI), exécution
de code, etc.

Où est activé le WAF :
- `nginx/Dockerfile.prod` base sur `owasp/modsecurity-crs:nginx` (WAF pré-configuré).
- Le bloc `location /api/` est protégé par ModSecurity + les règles CRS.

### 8.1 Modes d'exploitation

Le mode est défini dans `SecRuleEngine` (fichier ModSecurity de l'image,
`/etc/modsecurity/modsecurity.conf`) :

| Valeur            | Effet                                                        |
|-------------------|--------------------------------------------------------------|
| `DetectionOnly`   | Journalise les blocages sans bloquer (**recommandé au début**)|
| `On`              | Bloque activement les requêtes malveillantes                 |

Pour passer du mode journalisation au mode bloquant (après une période de test
sans faux positifs), y compris en production survolante :

```bash
# Inspecter les journaux ModSecurity
docker compose -f docker-compose.prod.yml exec nginx-proxy-prod \
  tail -f /var/log/modsec_audit.log
```

### 8.2 Limitation de débit (anti brute-force)

Déjà en place dans `defi6e-https.conf` :

```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=20r/s;     # API générale
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;    # connexion (lente)
```

Les requêtes vers `/api/` sont limitées à 20 req/s (par IP) avec un burst court.
On peut durcir davantage la connexion (`POST /api/users/connexion`) en ajoutant un
`location` dédié avec `limit_req zone=login`.

### 8.3 En-têtes de sécurité

Déjà ajoutés au bloc HTTPS : `Strict-Transport-Security`, `X-Content-Type-Options`,
`X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`.

---

## 9. Durcissement de sécurité (recommandations)

1. **CORS restreint**. Actuellement `app.use(cors())` autorise toutes les origines.
   Le restreindre au domaine production dans `backend/server.ts` :
   ```ts
   app.use(cors({ origin: process.env.FRONTEND_URL }));
   ```
   → `FRONTEND_URL=https://defi6e.jean23.com`.

2. **Backend en mode prod (non dev)**. Le `backend/Dockerfile` (partagé dev/prod)
   lance `npm run dev` (nodemon+tsx). Pour la production, il est recommandé de
   démarrer sans nodemon. Ajouter un script `start` dans `backend/package.json` :
   ```json
   "start": "tsx server.ts"
   ```
   et, pour les images de prod uniquement, utiliser `CMD ["npm", "start"]`
   (ou un `Dockerfile.prod` dédié au backend) afin de ne pas affecter le dev.

3. **Secrets** : `JWT_SECRET` et mots de passe DB sont chargés depuis `.env` ;
   les **changer** par rapport à `.env.example` en prod.

4. **Firewall de l'hôte (`ufw`)** — n'exposer que le reverse proxy :
   ```bash
   sudo ufw default deny incoming
   sudo ufw allow 22/tcp      # SSH
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```
   MariaDB/backend/frontend restent sur le réseau `internal` (non exposés).

5. **Sauvegarde de la base** (cron) :
   ```bash
   docker compose -f docker-compose.prod.yml exec -T db-defi-vdc-prod \
    mariadb-dump -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" > backup.sql
   ```
   Sauvegarder aussi les volumes `uploads_data` (images) et `certbot/conf` (certificats).

6. **Workflow GitHub (`.github/workflows/deploy.yml`)** : le chemin et/ou le domaine
   référencés doivent être alignés sur ce déploiement (`defi6e.jean23.com` et le
   répertoire du projet sur le runner), et utiliser `make prod-build/prod-up`.

---

## 10. Résolution de problèmes

| Problème                                   | Cause probable                              | Remède                                                        |
|--------------------------------------------|---------------------------------------------|---------------------------------------------------------------|
| `nginx` ne démarre pas au premier boot     | Certificat Let's Encrypt absent             | Suivre le bootstrap §6.2                                        |
| `502 Bad Gateway` sur `/api`               | Backend non démarré / réseau                | `make prod-logs` ; `docker compose -f docker-compose.prod.yml ps` |
| Images uploadées perdues                   | Volume `uploads_data` non monté (ancienne version) | Monter `uploads_data:/app/uploads` (fait dans ce README)   |
| Table `global_medals` sans `is_level_medal`| Volume DB déjà initialisé (ancien schéma)   | Appliquer le `ALTER TABLE` du §4                              |
| Requêtes légitimes bloquées par le WAF     | Faux positifs CRS                           | Passer `SecRuleEngine` en `DetectionOnly`, ajuster, puis `On`  |
| Renouvellement cert échoue                 | Serveur injoignable sur `:80` / `.well-known`| Vérifier `ufw` (80/443) et le webroot `certbot/www`          |

---

## 11. Commandes rapides (`Makefile`)

```bash
make prod-build   # build des images (y compris nginx WAF)
make prod-up      # démarre la stack de production
make prod-down    # arrête la stack de production
make prod-logs    # journalise en continu
```
