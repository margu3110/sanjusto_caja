#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

ENV_FILE="${PROJECT_DIR}/.env"
SCHEMA_FILE="${PROJECT_DIR}/db/migrations/001_initial_schema.sql"

if [[ ! -f "${ENV_FILE}" ]]; then
    echo "ERROR: .env file not found:"
    echo "  ${ENV_FILE}"
    exit 1
fi

if [[ ! -f "${SCHEMA_FILE}" ]]; then
    echo "ERROR: schema file not found:"
    echo "  ${SCHEMA_FILE}"
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
: "${MYSQL_BACKEND_USER:?MYSQL_BACKEND_USER is not set in .env}"
: "${MYSQL_BACKEND_PASSWORD:?MYSQL_BACKEND_PASSWORD is not set in .env}"

if [[ "${APP_ENV}" != "stage" ]]; then
    echo "ERROR: reset-stage.sh can only run with APP_ENV=stage."
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
echo "Checking MySQL root credentials..."

if ! mysql \
    --host="${MYSQL_HOST}" \
    --port="${MYSQL_PORT}" \
    --user=root \
    --password="${MYSQL_ROOT_PASSWORD}" \
    -e "SELECT 1;" >/dev/null 2>&1; then

    echo "ERROR: Could not authenticate to MySQL."
    exit 1
fi

echo "MySQL connection OK."

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
echo "Creating database..."

mysql \
    --host="${MYSQL_HOST}" \
    --port="${MYSQL_PORT}" \
    --user=root \
    --password="${MYSQL_ROOT_PASSWORD}" \
    -e "CREATE DATABASE \`${MYSQL_DATABASE}\`;"

echo "Database created."

echo
echo "Loading schema..."

mysql \
    --host="${MYSQL_HOST}" \
    --port="${MYSQL_PORT}" \
    --user=root \
    --password="${MYSQL_ROOT_PASSWORD}" \
    "${MYSQL_DATABASE}" < "${SCHEMA_FILE}"

echo "Schema loaded."

echo
echo "Creating/configuring backend user..."

mysql \
    --host="${MYSQL_HOST}" \
    --port="${MYSQL_PORT}" \
    --user=root \
    --password="${MYSQL_ROOT_PASSWORD}" \
    -e "
        CREATE USER IF NOT EXISTS
            '${MYSQL_BACKEND_USER}'@'%'
            IDENTIFIED BY '${MYSQL_BACKEND_PASSWORD}';

        ALTER USER
            '${MYSQL_BACKEND_USER}'@'%'
            IDENTIFIED BY '${MYSQL_BACKEND_PASSWORD}';

        GRANT ALL PRIVILEGES
            ON \`${MYSQL_DATABASE}\`.*
            TO '${MYSQL_BACKEND_USER}'@'%';

        FLUSH PRIVILEGES;
    "

echo
echo "DEV database reset successfully."
echo
echo "Environment:    ${APP_ENV}"
echo "Database:       ${MYSQL_DATABASE}"
echo "Backend user:   ${MYSQL_BACKEND_USER}"