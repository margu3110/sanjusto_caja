#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

ENV_FILE="${PROJECT_DIR}/.env"
SCHEMA_FILE="${PROJECT_DIR}/db/migrations/001_initial_schema.sql"
COMPOSE_FILE="${PROJECT_DIR}/docker-compose.stage.yml"

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

if [[ ! -f "${COMPOSE_FILE}" ]]; then
    echo "ERROR: Docker Compose file not found:"
    echo "  ${COMPOSE_FILE}"
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

if [[ "${MYSQL_HOST}" != "mysql" || "${MYSQL_PORT}" != "3306" ]]; then
    echo "ERROR: reset-stage.sh expects the STAGE MySQL service at mysql:3306."
    echo "Current MYSQL_HOST=${MYSQL_HOST}"
    echo "Current MYSQL_PORT=${MYSQL_PORT}"
    exit 1
fi

echo "WARNING: This will completely reset the STAGE database:"
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
echo "Checking MySQL container..."

if ! docker compose \
    -f "${COMPOSE_FILE}" \
    ps --status running --services | grep -qx "mysql"; then

    echo "ERROR: MySQL container is not running."
    echo
    echo "Start the STAGE stack first with:"
    echo
    echo "  docker compose -f docker-compose.stage.yml up -d"
    exit 1
fi

echo "MySQL container is running."

echo
echo "Checking MySQL root credentials..."

if ! docker compose \
    -f "${COMPOSE_FILE}" \
    exec -T mysql \
    mysql \
        --user=root \
        --password="${MYSQL_ROOT_PASSWORD}" \
        -e "SELECT 1;" >/dev/null 2>&1; then

    echo "ERROR: Could not authenticate to MySQL."
    exit 1
fi

echo "MySQL connection OK."

echo
echo "Dropping database..."

docker compose \
    -f "${COMPOSE_FILE}" \
    exec -T mysql \
    mysql \
        --user=root \
        --password="${MYSQL_ROOT_PASSWORD}" \
        -e "DROP DATABASE IF EXISTS \`${MYSQL_DATABASE}\`;"

echo "Database dropped."

echo
echo "Creating database..."

docker compose \
    -f "${COMPOSE_FILE}" \
    exec -T mysql \
    mysql \
        --user=root \
        --password="${MYSQL_ROOT_PASSWORD}" \
        -e "CREATE DATABASE \`${MYSQL_DATABASE}\`;"

echo "Database created."

echo
echo "Loading schema..."

docker compose \
    -f "${COMPOSE_FILE}" \
    exec -T mysql \
    mysql \
        --user=root \
        --password="${MYSQL_ROOT_PASSWORD}" \
        "${MYSQL_DATABASE}" < "${SCHEMA_FILE}"

echo "Schema loaded."

echo
echo "Creating/configuring backend user..."

docker compose \
    -f "${COMPOSE_FILE}" \
    exec -T mysql \
    mysql \
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
echo "STAGE database reset successfully."
echo
echo "Environment:    ${APP_ENV}"
echo "Database:       ${MYSQL_DATABASE}"
echo "Backend user:   ${MYSQL_BACKEND_USER}"
