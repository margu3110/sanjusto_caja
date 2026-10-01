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
    echo "ERROR: schema migration not found:"
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

echo "Environment: ${APP_ENV}"
echo "Database:    ${MYSQL_HOST}:${MYSQL_PORT}/${MYSQL_DATABASE}"
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

echo "Creating database if it does not exist..."

mysql \
    --host="${MYSQL_HOST}" \
    --port="${MYSQL_PORT}" \
    --user=root \
    --password="${MYSQL_ROOT_PASSWORD}" \
    -e "CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}\`;"

TABLE_COUNT="$(
    mysql \
        --host="${MYSQL_HOST}" \
        --port="${MYSQL_PORT}" \
        --user=root \
        --password="${MYSQL_ROOT_PASSWORD}" \
        --batch \
        --skip-column-names \
        "${MYSQL_DATABASE}" \
        -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '${MYSQL_DATABASE}';"
)"

if [[ "${TABLE_COUNT}" != "0" ]]; then
    echo
    echo "ERROR: Database '${MYSQL_DATABASE}' is not empty."
    echo "Found ${TABLE_COUNT} existing table(s)."
    echo
    echo "migrate.sh only initializes an empty database."
    echo "For DEV, use:"
    echo "  ./scripts/db/reset-dev.sh"
    exit 1
fi

echo "Loading schema..."

mysql \
    --host="${MYSQL_HOST}" \
    --port="${MYSQL_PORT}" \
    --user=root \
    --password="${MYSQL_ROOT_PASSWORD}" \
    "${MYSQL_DATABASE}" < "${SCHEMA_FILE}"

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
echo "Database migration completed successfully."
echo
echo "Environment:    ${APP_ENV}"
echo "Database:       ${MYSQL_DATABASE}"
echo "Backend user:   ${MYSQL_BACKEND_USER}"