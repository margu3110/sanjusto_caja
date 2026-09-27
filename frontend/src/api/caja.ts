export interface Persona {
  id: string;
  codigo: string;
  razonSocial: string;
  numeroDocumento: string | null;
  domicilio: string | null;
}

export interface Cuenta {
  id: string;
  codigo: string;
  ingeg: string;
  descripcion: string;
}

const API_URL = "/api/caja";

export async function getPersonas(): Promise<Persona[]> {
  const response = await fetch(`${API_URL}/personas`);

  if (!response.ok) {
    throw new Error("No se pudieron cargar los contribuyentes");
  }

  return response.json();
}

export async function getCuentas(): Promise<Cuenta[]> {
  const response = await fetch(`${API_URL}/cuentas`);

  if (!response.ok) {
    throw new Error("No se pudieron cargar las categorías");
  }

  return response.json();
}

export interface ReciboDetalle {
  accountCode: string;
  description: string;
  amount: number;
}

export interface ReciboCreate {
  customerCode: string | null;
  lines: ReciboDetalle[];
}

export interface ReciboResponse {
  success: boolean;
  codFactura: string;
  numeroFactura: string;
  total: number;
}

export async function crearRecibo(
  recibo: ReciboCreate,
): Promise<ReciboResponse> {
  const response = await fetch(`${API_URL}/recibos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(recibo),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    throw new Error(
      body?.detail || "No se pudo registrar el recibo",
    );
  }

  return response.json();
}

export interface Parametros {
  cuit: string;
  direccion: string;
  telefono: string;
}

export async function getParametros(): Promise<Parametros> {
  const response = await fetch(`${API_URL}/parametros`);

  if (!response.ok) {
    throw new Error(
      "No se pudieron cargar los parámetros de Caja",
    );
  }

  return response.json();
}

export interface ReciboParaImpresion {
  numeroFactura: string;
  codFactura: string;
  fecha: string;

  customer: {
    codigo: string;
    razonSocial: string;
    numeroDocumento: string | null;
    domicilio: string | null;
  } | null;

  lines: {
    accountCode: string;
    accountDescription: string | null;
    description: string;
    amount: number;
  }[];

  total: number;

  parametros: {
    cuit: string;
    direccion: string;
    telefono: string;
  } | null;
}

export async function getReciboParaImpresion(
  numeroFactura: string,
): Promise<ReciboParaImpresion> {
  const response = await fetch(
    `${API_URL}/recibos/${encodeURIComponent(numeroFactura)}/impresion`,
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    throw new Error(
      body?.detail || "No se pudo cargar el recibo",
    );
  }

  return response.json();
}