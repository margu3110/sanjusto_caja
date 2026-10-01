import csv
import os
from datetime import datetime
from pathlib import Path

import pymysql


SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_DIR = SCRIPT_DIR.parent.parent
ENV_FILE = PROJECT_DIR / ".env"

if ENV_FILE.exists():
    with ENV_FILE.open() as env_file:
        for line in env_file:
            line = line.strip()

            if not line or line.startswith("#") or "=" not in line:
                continue

            key, value = line.split("=", 1)

            os.environ.setdefault(
                key.strip(),
                value.strip(),
            )


BASE_DIR = PROJECT_DIR / "dev-db" / "csv"

APP_ENV = os.environ.get("APP_ENV")

if not APP_ENV:
    raise RuntimeError("APP_ENV is not set in .env")

if APP_ENV not in {"dev", "prod"}:
    raise RuntimeError(
        f"Unsupported APP_ENV: {APP_ENV!r}"
    )

DB_HOST = os.environ.get("MYSQL_HOST")
DB_PORT = os.environ.get("MYSQL_PORT")
DB_NAME = os.environ.get("MYSQL_DATABASE")
DB_USER = os.environ.get("MYSQL_BACKEND_USER")
DB_PASSWORD = os.environ.get("MYSQL_BACKEND_PASSWORD")

required = {
    "MYSQL_HOST": DB_HOST,
    "MYSQL_PORT": DB_PORT,
    "MYSQL_DATABASE": DB_NAME,
    "MYSQL_BACKEND_USER": DB_USER,
    "MYSQL_BACKEND_PASSWORD": DB_PASSWORD,
}

missing = [
    name
    for name, value in required.items()
    if not value
]

if missing:
    raise RuntimeError(
        "Missing environment variables: "
        + ", ".join(missing)
    )

DB_PORT = int(DB_PORT)

TABLES = [
    "ADMINISTRACIONCAJA",
    "BANCOS",
    "CHEQUES",
    "CIUDADES",
    "CLASIFICACIONPERSONAS",
    "CLAVES",
    "CUENTAS",
    "CUENTASRECLASIFICADAS",
    "DETALLES",
    "IVA",
    "PARAMETROS",
    "PCHEQUESCAJA",
    "PERSONAS",
    "PROVINCIAS",
    "SCUENTAS",
    "USUARIOS",
    "FACTURAS",
    "T_DOCUMENTO",
]


DATE_FORMATS = [
    "%m/%d/%y %H:%M:%S",
    "%m/%d/%Y %H:%M:%S",
]


def convert_value(value, column_type):
    if value == "":
        return None

    if column_type in {"date", "datetime", "timestamp"}:
        for fmt in DATE_FORMATS:
            try:
                return datetime.strptime(value, fmt)
            except ValueError:
                pass

        raise ValueError(
            f"Cannot parse date value {value!r}"
        )

    return value


def get_column_types(connection, table):
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT COLUMN_NAME, DATA_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = %s
              AND TABLE_NAME = %s
            ORDER BY ORDINAL_POSITION
            """,
            (DB_NAME, table),
        )

        return {
            row[0]: row[1]
            for row in cursor.fetchall()
        }

def filter_duplicate_rows(table, reader):
    if table != "FACTURAS":
        yield from reader
        return

    seen_codfactura = set()
    duplicate_count = 0

    for row in reader:
        codfactura = row["CODFACTURA"]

        if codfactura in seen_codfactura:
            duplicate_count += 1
            continue

        seen_codfactura.add(codfactura)
        yield row

    if duplicate_count:
        print(
            f"\n  Filtered {duplicate_count} duplicate "
            f"FACTURAS.CODFACTURA rows"
        )
        
def import_table(connection, table):
    csv_path = BASE_DIR / f"{table}.csv"

    if not csv_path.exists():
        raise FileNotFoundError(csv_path)

    column_types = get_column_types(connection, table)

    with csv_path.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as csv_file:
        reader = csv.DictReader(csv_file)

        columns = reader.fieldnames

        if not columns:
            raise ValueError(
                f"{table}: CSV has no header"
            )

        unknown_columns = set(columns) - set(column_types)

        if unknown_columns:
            raise ValueError(
                f"{table}: unknown columns: "
                f"{sorted(unknown_columns)}"
            )

        quoted_columns = ", ".join(
            f"`{column}`"
            for column in columns
        )

        placeholders = ", ".join(
            ["%s"] * len(columns)
        )

        sql = (
            f"INSERT INTO `{table}` "
            f"({quoted_columns}) "
            f"VALUES ({placeholders})"
        )

        batch = []
        total = 0

        with connection.cursor() as cursor:
            for row in filter_duplicate_rows(table, reader):
                values = [
                    convert_value(
                        row[column],
                        column_types[column],
                    )
                    for column in columns
                ]

                batch.append(values)

                if len(batch) >= 1000:
                    cursor.executemany(sql, batch)
                    total += len(batch)
                    batch.clear()

            if batch:
                cursor.executemany(sql, batch)
                total += len(batch)

    connection.commit()

    return total


def main():
    print(f"CSV directory: {BASE_DIR.resolve()}")
    print(
        f"Database: "
        f"{DB_USER}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )

    connection = pymysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        charset="utf8mb4",
        autocommit=False,
    )

    try:
        for table in TABLES:
            print(f"Importing {table}...", end=" ", flush=True)

            count = import_table(
                connection,
                table,
            )

            print(f"{count:,} rows")

    finally:
        connection.close()

    print("Import completed.")


if __name__ == "__main__":
    main()