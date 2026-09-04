#!/usr/bin/env bash
#
# Crée (ou met à jour) un compte super admin dans la base de production.
#
# Usage:
#   ./scripts/create-superadmin.sh <email> <mot-de-passe> [prenom] [nom]
#
# Exemple:
#   ./scripts/create-superadmin.sh j23.dev@jean23.org 'Jean23-Admin-2026!' Jean Jean23
#
# Prérequis : le stack de PRODUCTION doit être démarré
#   (make prod-up), car le script exécute la requête via le conteneur MariaDB
#   et calcule le hash bcrypt via le conteneur backend.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/../docker-compose.prod.yml"

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <email> <mot-de-passe> [prenom] [nom]" >&2
  exit 1
fi

EMAIL="$1"
PASSWORD="$2"
FIRST_NAME="${3:-Super}"
LAST_NAME="${4:-Admin}"

# Charger les variables d'environnement (DB_USER, DB_PASSWORD, MYSQL_DATABASE...)
if [ -f "${SCRIPT_DIR}/../.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "${SCRIPT_DIR}/../.env"
  set +a
fi

DB_CONTAINER="db-defi-vdc-prod"
BACKEND_CONTAINER="backend-defi-vdc-prod"

echo "==> Calcul du hash bcrypt du mot de passe (via le conteneur backend)..."
HASH="$(
  docker compose -f "$COMPOSE_FILE" exec -T "$BACKEND_CONTAINER" \
    node -e "console.log(require('bcryptjs').hashSync(process.argv[1], 10))" "$PASSWORD"
)"

echo "==> Insertion / mise à jour du compte super admin '${EMAIL}'..."
docker compose -f "$COMPOSE_FILE" exec -T "$DB_CONTAINER" \
  mariadb -u"${MYSQL_USER}" -p"${MYSQL_PASSWORD}" "${MYSQL_DATABASE}" \
  -e "
INSERT INTO users (id, email, password_hash, first_name, last_name, role)
VALUES (UUID(), '${EMAIL}', '${HASH}', '${FIRST_NAME}', '${LAST_NAME}', 'superadmin')
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  first_name    = VALUES(first_name),
  last_name     = VALUES(last_name),
  role          = 'superadmin';
"

echo "==> Compte super admin prêt :"
echo "    Email : ${EMAIL}"
echo "    Mot de passe : ${PASSWORD}"
