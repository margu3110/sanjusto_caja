#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

ENV_FILE="${PROJECT_DIR}/.env"

if [[ ! -f "${ENV_FILE}" ]]; then
    echo "ERROR: .env file not found:"
    echo "  ${ENV_FILE}"
    exit 1
fi

set -a
source "${ENV_FILE}"
set +a

: "${APP_ENV:?APP_ENV is not set in .env}"
: "${MYSQL_HOST:?MYSQL_HOST is not set in .env}"
: "${MYSQL_PORT:?MYSQL_PORT is not set in .env}"
: "${MYSQL_DATABASE:?MYSQL_DATABASE is not set in .env}"
: "${MYSQL_ROOT_PASSWORD:?MYSQL_ROOT_PASSWORD is not set in .env}"

if [[ "${APP_ENV}" != "dev" ]]; then
    echo "ERROR: reset-dev.sh can only run with APP_ENV=dev."
    echo "Current APP_ENV=${APP_ENV}"
    exit 1
fi

echo "WARNING: This will completely reset the DEV database:"
echo
echo "  Environment: ${APP_ENV}"
echo "  Database:    ${MYSQL_DATABASE}"
echo "  MySQL:       ${MYSQL_HOST}:${MYSQL_PORT}"
echo
echo "ALL DATA IN THIS DATABASE WILL BE DESTROYED."
echo

read -r -p "Continue? [y/N] " answer

if [[ "${answer}" != "y" && "${answer}" != "Y" ]]; then
    echo "Aborted."
    exit 0
fi

echo
echo "Dropping database..."

mysql \
    --host="${MYSQL_HOST}" \
    --port="${MYSQL_PORT}" \
    --user=root \
    --password="${MYSQL_ROOT_PASSWORD}" \
    -e "DROP DATABASE IF EXISTS \`${MYSQL_DATABASE}\`;"

echo "Database dropped."

echo
echo "Running database migration..."

"${SCRIPT_DIR}/migrate.sh"

echo
echo "DEV database reset successfully."