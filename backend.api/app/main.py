import os

import httpx
from fastapi import FastAPI
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi import FastAPI, HTTPException
import httpx
import os

CAJA_SERVICE_URL = os.getenv(
    "CAJA_SERVICE_URL",
    "http://backend.caja:8000",
)

app = FastAPI(
    title="SanJusto API",
    version="0.1.0",
    description="Backend API for the San Justo Caja application.",
)


CAJA_SERVICE_URL = os.getenv(
    "CAJA_SERVICE_URL",
    "http://backend.caja:8000",
)

@app.get("/api/caja/parametros", tags=["caja"])
async def parametros():
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{CAJA_SERVICE_URL}/parametros",
                timeout=10.0,
            )

        if response.status_code >= 400:
            raise HTTPException(
                status_code=response.status_code,
                detail="Error en backend.caja",
            )

        return response.json()

    except httpx.RequestError:
        raise HTTPException(
            status_code=503,
            detail="backend.caja no está disponible",
        )

@app.get(
    "/api/caja/recibos/{numero_factura}/impresion",
    tags=["caja"],
)
async def recibo_para_impresion(numero_factura: str):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{CAJA_SERVICE_URL}/recibos/{numero_factura}/impresion",
                timeout=10.0,
            )

        if response.status_code >= 400:
            raise HTTPException(
                status_code=response.status_code,
                detail=response.json().get(
                    "detail",
                    "Error en backend.caja",
                ),
            )

        return response.json()

    except httpx.RequestError:
        raise HTTPException(
            status_code=503,
            detail="backend.caja no está disponible",
        )

@app.get("/", response_class=HTMLResponse, include_in_schema=False)
async def dashboard():
    return """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SanJusto API - DEV</title>

    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            background: #f4f6f8;
            color: #202124;
        }

        header {
            background: #263238;
            color: white;
            padding: 24px 32px;
        }

        header h1 {
            margin: 0 0 6px 0;
        }

        header p {
            margin: 0;
            color: #cfd8dc;
        }

        main {
            max-width: 1000px;
            margin: 32px auto;
            padding: 0 20px;
        }

        section {
            background: white;
            border-radius: 8px;
            padding: 24px;
            margin-bottom: 24px;
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
        }

        h2 {
            margin-top: 0;
        }

        .service {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 14px 0;
            border-bottom: 1px solid #eceff1;
        }

        .service:last-child {
            border-bottom: none;
        }

        .service-name {
            font-weight: 600;
        }

        .status {
            font-weight: bold;
            padding: 5px 10px;
            border-radius: 12px;
            font-size: 13px;
        }

        .status.ok {
            background: #e8f5e9;
            color: #2e7d32;
        }

        .status.error {
            background: #ffebee;
            color: #c62828;
        }

        .status.loading {
            background: #eceff1;
            color: #546e7a;
        }

        .links {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
        }

        .link {
            display: inline-block;
            padding: 10px 16px;
            background: #eceff1;
            color: #263238;
            text-decoration: none;
            border-radius: 6px;
        }

        .link:hover {
            background: #cfd8dc;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        th, td {
            text-align: left;
            padding: 10px;
            border-bottom: 1px solid #eceff1;
        }

        code {
            background: #eceff1;
            padding: 2px 5px;
            border-radius: 3px;
        }

        .footer {
            color: #78909c;
            font-size: 13px;
        }
    </style>
</head>

<body>

<header>
    <h1>SanJusto Caja API</h1>
    <p>DEV environment</p>
</header>

<main>

    <section>
        <h2>Services</h2>

        <div class="service">
            <span class="service-name">backend.api</span>
            <span id="api-status" class="status loading">CHECKING...</span>
        </div>

        <div class="service">
            <span class="service-name">backend.caja</span>
            <span id="caja-status" class="status loading">CHECKING...</span>
        </div>

        <div class="service">
            <span class="service-name">MySQL</span>
            <span id="mysql-status" class="status loading">CHECKING...</span>
        </div>
    </section>

    <section>
        <h2>API Documentation</h2>

        <div class="links">
            <a class="link" href="/docs">
                Swagger UI
            </a>

            <a class="link" href="/redoc">
                ReDoc
            </a>

            <a class="link" href="/openapi.json">
                OpenAPI JSON
            </a>
        </div>
    </section>

    <section>
        <h2>Caja API</h2>

        <table>
            <thead>
                <tr>
                    <th>Method</th>
                    <th>Endpoint</th>
                    <th>Description</th>
                </tr>
            </thead>

            <tbody>
                <tr>
                    <td>GET</td>
                    <td><code>/api/caja/health</code></td>
                    <td>Caja service and database health</td>
                </tr>

                <tr>
                    <td>GET</td>
                    <td><code>/api/caja/personas</code></td>
                    <td>Legacy contributors</td>
                </tr>

                <tr>
                    <td>GET</td>
                    <td><code>/api/caja/cuentas</code></td>
                    <td>Legacy Caja categories</td>
                </tr>
            </tbody>
        </table>
    </section>

    <section>
        <p class="footer">
            SanJusto Caja · Development environment
        </p>
    </section>

</main>

<script>
async function checkHealth() {
    const apiStatus = document.getElementById("api-status");
    const cajaStatus = document.getElementById("caja-status");
    const mysqlStatus = document.getElementById("mysql-status");

    try {
        const apiResponse = await fetch("/health");
        const apiHealth = await apiResponse.json();

        setStatus(
            apiStatus,
            apiHealth.status === "ok"
        );

        const cajaResponse = await fetch("/api/caja/health");
        const cajaHealth = await cajaResponse.json();

        setStatus(
            cajaStatus,
            cajaHealth.status === "ok"
        );

        setStatus(
            mysqlStatus,
            cajaHealth.dependencies &&
            cajaHealth.dependencies.mysql === "ok"
        );

    } catch (error) {
        setStatus(apiStatus, false);
        setStatus(cajaStatus, false);
        setStatus(mysqlStatus, false);
    }
}

function setStatus(element, healthy) {
    element.textContent = healthy ? "HEALTHY" : "ERROR";
    element.className = healthy
        ? "status ok"
        : "status error";
}

checkHealth();
</script>

</body>
</html>
"""


@app.get("/health", tags=["health"])
async def health():
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(
                f"{CAJA_SERVICE_URL}/health"
            )

        caja_ok = response.status_code == 200

        return JSONResponse(
            status_code=200 if caja_ok else 503,
            content={
                "status": "ok" if caja_ok else "error",
                "service": "backend.api",
                "dependencies": {
                    "backend.caja": (
                        "ok" if caja_ok else "error"
                    ),
                },
            },
        )

    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "service": "backend.api",
                "dependencies": {
                    "backend.caja": "error",
                },
                "detail": str(e),
            },
        )


@app.get("/api/caja/health", tags=["caja"])
async def caja_health():
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(
                f"{CAJA_SERVICE_URL}/health"
            )

        return JSONResponse(
            status_code=response.status_code,
            content=response.json(),
        )

    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "service": "backend.caja",
                "detail": str(e),
            },
        )


@app.get("/api/caja/personas", tags=["caja"])
async def caja_personas():
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{CAJA_SERVICE_URL}/personas"
        )

    return JSONResponse(
        status_code=response.status_code,
        content=response.json(),
    )


@app.get("/api/caja/cuentas", tags=["caja"])
async def caja_cuentas():
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{CAJA_SERVICE_URL}/cuentas"
        )

    return JSONResponse(
        status_code=response.status_code,
        content=response.json(),
    )

@app.post("/api/caja/recibos", tags=["caja"])
async def crear_recibo(payload: dict):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{CAJA_SERVICE_URL}/recibos",
                json=payload,
                timeout=30.0,
            )

        if response.status_code >= 400:
            raise HTTPException(
                status_code=response.status_code,
                detail=response.json().get(
                    "detail",
                    "Error en backend.caja",
                ),
            )

        return response.json()

    except httpx.RequestError:
        raise HTTPException(
            status_code=503,
            detail="backend.caja no está disponible",
        )