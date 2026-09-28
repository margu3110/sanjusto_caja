#!/usr/bin/env bash

set -euo pipefail

DB_CONTAINER="sanjusto-caja-mysql-dev"
DB_NAME="sanjusto"
DB_USER="root"
DB_PASSWORD="root"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCHEMA_FILE="${SCRIPT_DIR}/schema.sql"

echo "WARNING: This will completely reset the DEV database:"
echo "  Database:  ${DB_NAME}"
echo "  Container: ${DB_CONTAINER}"
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
    -u"${DB_USER}" \
    -p"${DB_PASSWORD}" \
    -e "DROP DATABASE IF EXISTS \`${DB_NAME}\`;"

echo "Creating database..."

docker exec "${DB_CONTAINER}" \
    mysql \
    -u"${DB_USER}" \
    -p"${DB_PASSWORD}" \
    -e "CREATE DATABASE \`${DB_NAME}\`;"

echo "Loading schema..."

docker exec -i "${DB_CONTAINER}" \
    mysql \
    -u"${DB_USER}" \
    -p"${DB_PASSWORD}" \
    "${DB_NAME}" < "${SCHEMA_FILE}"

echo
echo "DEV database reset successfully."