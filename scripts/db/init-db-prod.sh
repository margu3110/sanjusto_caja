#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

ENV_FILE="${PROJECT_DIR}/.env"
SCHEMA_FILE="${PROJECT_DIR}/db/migrations/001_initial_schema.sql"
COMPOSE_FILE="${PROJECT_DIR}/docker-compose.prod.yml"

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
: "${MYSQL_DATABASE:?MYSQL_DATABASE is not set in .env}"
: "${MYSQL_ROOT_PASSWORD:?MYSQL_ROOT_PASSWORD is not set in .env}"
: "${MYSQL_BACKEND_USER:?MYSQL_BACKEND_USER is not set in .env}"
: "${MYSQL_BACKEND_PASSWORD:?MYSQL_BACKEND_PASSWORD is not set in .env}"

if [[ "${APP_ENV}" != "prod" ]]; then
    echo "ERROR: init-db-prod.sh can only run with APP_ENV=prod."
    echo "Current APP_ENV=${APP_ENV}"
    exit 1
fi

MYSQL_SERVICE="mysql"

echo "Environment: ${APP_ENV}"
echo "Database:    ${MYSQL_DATABASE}"
echo "MySQL:       ${MYSQL_SERVICE}:3306"
echo

echo "Checking MySQL container..."

if ! docker compose \
    -f "${COMPOSE_FILE}" \
    ps --status running --services | grep -qx "${MYSQL_SERVICE}"; then

    echo "ERROR: MySQL service '${MYSQL_SERVICE}' is not running."
    exit 1
fi

echo "MySQL container is running."

echo
echo "Checking MySQL root credentials..."

if ! docker compose \
    -f "${COMPOSE_FILE}" \
    exec -T \
    "${MYSQL_SERVICE}" \
    mysql \
        --user=root \
        --password="${MYSQL_ROOT_PASSWORD}" \
        -e "SELECT 1;" >/dev/null 2>&1; then

    echo "ERROR: Could not authenticate to MySQL."
    exit 1
fi

echo "MySQL connection OK."

echo "Creating database if it does not exist..."

docker compose \
    -f "${COMPOSE_FILE}" \
    exec -T \
    "${MYSQL_SERVICE}" \
    mysql \
        --user=root \
        --password="${MYSQL_ROOT_PASSWORD}" \
        -e "CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}\`;"

TABLE_COUNT="$(
    docker compose \
        -f "${COMPOSE_FILE}" \
        exec -T \
        "${MYSQL_SERVICE}" \
        mysql \
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
    echo "init-db-prod.sh only initializes an empty PROD database."
    echo "No changes were made to the existing schema."
    exit 1
fi

echo "Database is empty."

echo
echo "Loading schema..."

docker compose \
    -f "${COMPOSE_FILE}" \
    exec -T \
    "${MYSQL_SERVICE}" \
    mysql \
        --user=root \
        --password="${MYSQL_ROOT_PASSWORD}" \
        "${MYSQL_DATABASE}" < "${SCHEMA_FILE}"

echo "Schema loaded."

echo
echo "Creating/configuring backend user..."

docker compose \
    -f "${COMPOSE_FILE}" \
    exec -T \
    "${MYSQL_SERVICE}" \
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
echo "PROD database initialization completed successfully."
echo
echo "Environment:    ${APP_ENV}"
echo "Database:       ${MYSQL_DATABASE}"
echo "Backend user:   ${MYSQL_BACKEND_USER}"