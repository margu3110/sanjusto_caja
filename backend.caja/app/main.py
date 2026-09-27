from fastapi import FastAPI
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from .db import SessionLocal
from .services.caja import get_cuentas, get_personas
from fastapi import FastAPI, HTTPException

from .schemas.recibos import ReciboCreate
from .services.caja import (
    create_recibo,
    get_cuentas,
    get_personas,
)

app = FastAPI(
    title="SanJusto Caja Service",
    version="0.1.0",
)


@app.get("/health", tags=["health"])
def health():
    db: Session = SessionLocal()

    try:
        db.execute(text("SELECT 1"))

        return {
            "status": "ok",
            "service": "backend.caja",
            "dependencies": {
                "mysql": "ok",
            },
        }

    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "service": "backend.caja",
                "dependencies": {
                    "mysql": "error",
                },
                "detail": str(e),
            },
        )

    finally:
        db.close()


@app.get("/personas", tags=["caja"])
def personas():
    db = SessionLocal()

    try:
        return get_personas(db)
    finally:
        db.close()


@app.get("/cuentas", tags=["caja"])
def cuentas():
    db = SessionLocal()

    try:
        return get_cuentas(db)
    finally:
        db.close()


@app.post("/recibos", tags=["caja"])
def crear_recibo(recibo: ReciboCreate):
    db = SessionLocal()

    try:
        return create_recibo(db, recibo)

    except ValueError as e:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()