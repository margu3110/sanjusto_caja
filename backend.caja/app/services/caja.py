from sqlalchemy import text
from sqlalchemy.orm import Session


from ..schemas.recibos import ReciboCreate

def get_parametros(db: Session):
    result = db.execute(
        text(
            """
            SELECT
                CUIT,
                DIRECCION,
                TELEFONO
            FROM PARAMETROS
            LIMIT 1
            """
        )
    )

    row = result.first()

    if row is None:
        return None

    return {
        "cuit": row.CUIT,
        "direccion": row.DIRECCION,
        "telefono": row.TELEFONO,
    }

def create_recibo(db: Session, recibo: ReciboCreate):
    account_codes = [line.accountCode for line in recibo.lines]

    placeholders = ", ".join(
        f":code_{index}"
        for index in range(len(account_codes))
    )

    account_params = {
        f"code_{index}": code
        for index, code in enumerate(account_codes)
    }

    result = db.execute(
        text(
            f"""
            SELECT CODCUENTA
            FROM CUENTAS
            WHERE CODCUENTA IN ({placeholders})
            """
        ),
        account_params,
    )

    existing_accounts = {
        row.CODCUENTA
        for row in result
    }

    missing_accounts = [
        code
        for code in account_codes
        if code not in existing_accounts
    ]

    if missing_accounts:
        raise ValueError(
            f"Cuenta(s) inexistente(s): {', '.join(missing_accounts)}"
        )

    if recibo.customerCode is not None:
        result = db.execute(
            text(
                """
                SELECT CODPERSONA
                FROM PERSONAS
                WHERE CODPERSONA = :codigo
                """
            ),
            {"codigo": recibo.customerCode},
        )

        if result.first() is None:
            raise ValueError(
                f"Contribuyente inexistente: {recibo.customerCode}"
            )

    result = db.execute(
        text(
            """
            SELECT COALESCE(
                MAX(CAST(CODFACTURA AS UNSIGNED)),
                0
            ) + 1 AS next_codfactura
            FROM FACTURAS
            """
        )
    )

    next_codfactura = int(result.scalar_one())
    codfactura = str(next_codfactura)

    result = db.execute(
        text(
            """
            SELECT COALESCE(
                MAX(CAST(NUMERO_FACTURA AS UNSIGNED)),
                0
            ) + 1 AS next_numero_factura
            FROM FACTURAS
            """
        )
    )

    next_numero_factura = int(result.scalar_one())
    numero_factura = f"{next_numero_factura:08d}"

    total = sum(line.amount for line in recibo.lines)

    db.execute(
        text(
            """
            INSERT INTO FACTURAS (
                CODFACTURA,
                NUMERO_FACTURA,
                FECHA,
                CODPERSONA,
                TPESOS,
                TCHEQUE,
                TBONOS,
                COMPROB,
                NETO,
                EXENTO,
                IVA_1,
                IVA_2,
                IMP_1,
                IMP_2
            )
            VALUES (
                :codfactura,
                :numero_factura,
                NOW(),
                :customer_code,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0
            )
            """
        ),
        {
            "codfactura": codfactura,
            "numero_factura": numero_factura,
            "customer_code": recibo.customerCode,
        },
    )

    for line in recibo.lines:
        db.execute(
            text(
                """
                INSERT INTO DETALLES (
                    CODCUENTA,
                    MONTO,
                    CODFACTURA,
                    DESCRIPCION
                )
                VALUES (
                    :account_code,
                    :amount,
                    :codfactura,
                    :description
                )
                """
            ),
            {
                "account_code": line.accountCode,
                "amount": line.amount,
                "codfactura": codfactura,
                "description": line.description,
            },
        )

    db.commit()

    return {
        "success": True,
        "codFactura": codfactura,
        "numeroFactura": numero_factura,
        "total": total,
    }


def get_personas(db: Session):
    result = db.execute(
        text(
            """
            SELECT
                CODPERSONA,
                RAZONSOCIAL,
                NUMERO_DOCUMENTO,
                DOMICILIO
            FROM PERSONAS
            ORDER BY RAZONSOCIAL
            """
        )
    )

    return [
        {
            "id": row.CODPERSONA,
            "codigo": row.CODPERSONA,
            "razonSocial": row.RAZONSOCIAL,
            "numeroDocumento": row.NUMERO_DOCUMENTO,
            "domicilio": row.DOMICILIO,
        }
        for row in result
    ]


def get_cuentas(db: Session):
    result = db.execute(
        text(
            """
            SELECT
                CODCUENTA,
                INGEG,
                DESCRIPCION
            FROM CUENTAS
            ORDER BY CODCUENTA
            """
        )
    )

    return [
        {
            "id": row.CODCUENTA,
            "codigo": row.CODCUENTA,
            "ingeg": row.INGEG,
            "descripcion": row.DESCRIPCION,
        }
        for row in result
    ]


def get_recibo_para_impresion(
    db: Session,
    numero_factura: str,
):
    result = db.execute(
        text(
            """
            SELECT
                f.CODFACTURA,
                f.NUMERO_FACTURA,
                f.FECHA,
                f.CODPERSONA,
                f.TPESOS,
                f.TCHEQUE,

                p.RAZONSOCIAL,
                p.NUMERO_DOCUMENTO,
                p.DOMICILIO

            FROM FACTURAS f
            LEFT JOIN PERSONAS p
                ON p.CODPERSONA = f.CODPERSONA

            WHERE f.NUMERO_FACTURA = :numero_factura
            """
        ),
        {
            "numero_factura": numero_factura,
        },
    )

    factura = result.first()

    if factura is None:
        raise ValueError(
            f"Recibo inexistente: {numero_factura}"
        )

    result = db.execute(
        text(
            """
            SELECT
                d.CODCUENTA,
                c.DESCRIPCION AS CUENTA_DESCRIPCION,
                d.DESCRIPCION,
                d.MONTO

            FROM DETALLES d
            LEFT JOIN CUENTAS c
                ON c.CODCUENTA = d.CODCUENTA

            WHERE d.CODFACTURA = :codfactura

            ORDER BY d.CODCUENTA
            """
        ),
        {
            "codfactura": factura.CODFACTURA,
        },
    )

    lines = [
        {
            "accountCode": row.CODCUENTA,
            "accountDescription": row.CUENTA_DESCRIPCION,
            "description": row.DESCRIPCION,
            "amount": float(row.MONTO),
        }
        for row in result
    ]

    total = sum(line["amount"] for line in lines)

    result = db.execute(
        text(
            """
            SELECT
                CUIT,
                DIRECCION,
                TELEFONO
            FROM PARAMETROS
            LIMIT 1
            """
        )
    )

    parametros = result.first()

    return {
        "numeroFactura": factura.NUMERO_FACTURA,
        "codFactura": factura.CODFACTURA,
        "fecha": factura.FECHA.isoformat()
            if factura.FECHA
            else None,

        "customer": (
            {
                "codigo": factura.CODPERSONA,
                "razonSocial": factura.RAZONSOCIAL,
                "numeroDocumento": factura.NUMERO_DOCUMENTO,
                "domicilio": factura.DOMICILIO,
            }
            if factura.CODPERSONA
            else None
        ),

        "lines": lines,
        "total": total,

        "parametros": (
            {
                "cuit": parametros.CUIT,
                "direccion": parametros.DIRECCION,
                "telefono": parametros.TELEFONO,
            }
            if parametros
            else None
        ),
    }