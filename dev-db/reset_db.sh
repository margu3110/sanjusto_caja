#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

ENV_FILE="${PROJECT_DIR}/.env"
SCHEMA_FILE="${SCRIPT_DIR}/schema.sql"

DB_CONTAINER="sanjusto-caja-mysql-dev"

if [[ ! -f "${ENV_FILE}" ]]; then
    echo "ERROR: .env file not found:"
    echo "  ${ENV_FILE}"
    exit 1
fi

set -a
source "${ENV_FILE}"
set +a

: "${MYSQL_ROOT_PASSWORD:?MYSQL_ROOT_PASSWORD is not set in .env}"
: "${MYSQL_DATABASE:?MYSQL_DATABASE is not set in .env}"
: "${MYSQL_BACKEND_USER:?MYSQL_BACKEND_USER is not set in .env}"
: "${MYSQL_BACKEND_PASSWORD:?MYSQL_BACKEND_PASSWORD is not set in .env}"

echo "Checking MySQL root credentials..."

ROOT_PASSWORD=""

if docker exec "${DB_CONTAINER}" \
    mysql \
    -uroot \
    -proot \
    -e "SELECT 1;" >/dev/null 2>&1; then

    echo "Existing root password: root"
    ROOT_PASSWORD="root"

elif docker exec "${DB_CONTAINER}" \
    mysql \
    -uroot \
    -p"${MYSQL_ROOT_PASSWORD}" \
    -e "SELECT 1;" >/dev/null 2>&1; then

    echo "Existing root password matches .env"
    ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD}"

else
    echo "ERROR: Could not authenticate to MySQL."
    echo
    echo "Tried:"
    echo "  root / root"
    echo "  root / MYSQL_ROOT_PASSWORD from .env"
    exit 1
fi

echo
echo "WARNING: This will completely reset the DEV database:"
echo "  Database:       ${MYSQL_DATABASE}"
echo "  Container:      ${DB_CONTAINER}"
echo "  Backend user:   ${MYSQL_BACKEND_USER}"
echo

read -r -p "Continue? [y/N] " answer

if [[ "${answer}" != "y" && "${answer}" != "Y" ]]; then
    echo "Aborted."
    exit 0
fi

echo
echo "Dropping database..."

docker exec "${DB_CONTAINER}" \
    mysql \
    -uroot \
    -p"${ROOT_PASSWORD}" \
    -e "DROP DATABASE IF EXISTS \`${MYSQL_DATABASE}\`;"

echo "Creating database..."

docker exec "${DB_CONTAINER}" \
    mysql \
    -uroot \
    -p"${ROOT_PASSWORD}" \
    -e "CREATE DATABASE \`${MYSQL_DATABASE}\`;"

echo "Loading schema..."

docker exec -i "${DB_CONTAINER}" \
    mysql \
    -uroot \
    -p"${ROOT_PASSWORD}" \
    "${MYSQL_DATABASE}" < "${SCHEMA_FILE}"

echo "Updating root passwords..."

docker exec "${DB_CONTAINER}" \
    mysql \
    -uroot \
    -p"${ROOT_PASSWORD}" \
    -e "
        ALTER USER 'root'@'localhost'
        IDENTIFIED BY '${MYSQL_ROOT_PASSWORD}';

        ALTER USER 'root'@'%'
        IDENTIFIED BY '${MYSQL_ROOT_PASSWORD}';

        FLUSH PRIVILEGES;
    "

echo "Creating/configuring backend user..."

docker exec "${DB_CONTAINER}" \
    mysql \
    -uroot \
    -p"${MYSQL_ROOT_PASSWORD}" \
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
echo "Database:       ${MYSQL_DATABASE}"
echo "Root password:  configured from .env"
echo "Backend user:   ${MYSQL_BACKEND_USER}"
echo "Backend passwd: configured from .env"