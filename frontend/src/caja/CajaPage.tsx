import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Paper,
  TextField,
  Typography,
  Grid,
} from "@mui/material";
import { useHotkeys } from "react-hotkeys-hook";
import Autocomplete from "@mui/material/Autocomplete";

import {
  crearRecibo,
  getCuentas,
  getPersonas,
  getReciboParaImpresion,
  type Cuenta,
  type Persona,
} from "../api/caja";

type Line = {
  id: number;
  category: string;
  description: string;
  amount: number;
};

export default function CajaPage() {
  const [selectedCustomer, setSelectedCustomer] =
  useState<Persona | null>(null);
  const [noCustomer, setNoCustomer] = useState(false);

  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  const [lines, setLines] = useState<Line[]>([]);
  const [receiptNumber, setReceiptNumber] =
    useState<string | null>(null);

  const [customers, setCustomers] = useState<Persona[]>([]);
  const [categories, setCategories] = useState<Cuenta[]>([]);

  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState("");

  const descriptionRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedReceipt, setSavedReceipt] = useState<string | null>(null);



  useEffect(() => {
    async function loadData() {
      try {
        setLoadingData(true);
        setLoadError("");

        const [personas, cuentas] = await Promise.all([
          getPersonas(),
          getCuentas(),
        ]);

        setCustomers(personas);
        setCategories(cuentas);
      } catch (error) {
        console.error(error);
        setLoadError("No se pudieron cargar los datos de Caja.");
      } finally {
        setLoadingData(false);
      }
    }

    loadData();
  }, []);

  const addLine = () => {
    if (!category || !description || !amount) return;

    setLines((prev) => [
      ...prev,
      {
        id: Date.now(),
        category,
        description,
        amount: Number(amount),
      },
    ]);

    setCategory("");
    setDescription("");
    setAmount("");
  };

  const removeLine = (id: number) => {
    setLines(lines.filter((l) => l.id !== id));
  };

  const total = lines.reduce((acc, l) => acc + l.amount, 0);

  const handleRegistrar = async () => {
    if (lines.length === 0) {
      setSaveError("Debe agregar al menos una línea.");
      return;
    }

    setSaving(true);
    setSaveError("");
    setSavedReceipt(null);

    try {
      const result = await crearRecibo({
        customerCode: noCustomer
          ? null
          : selectedCustomer?.codigo ?? null,

        lines: lines.map((line) => ({
          accountCode: line.category,
          description: line.description,
          amount: line.amount,
        })),
      });

      setSavedReceipt(result.numeroFactura);
      setReceiptNumber(result.numeroFactura);

    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "No se pudo registrar el recibo",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleNuevoRecibo = () => {
    setSavedReceipt(null);
    setReceiptNumber(null);

    setSelectedCustomer(null);
    setNoCustomer(false);

    setCategory("");
    setDescription("");
    setAmount("");

    setLines([]);
    setSaveError("");
  };
  
  const handleImprimir = async () => {
    if (!savedReceipt) {
      return;
    }

    try {
      const recibo = await getReciboParaImpresion(
        savedReceipt,
      );

      const printWindow = window.open(
        "",
        "_blank",
        "width=900,height=700",
      );

      if (!printWindow) {
        alert(
          "No se pudo abrir la ventana de impresión. Verifique que las ventanas emergentes estén permitidas.",
        );
        return;
      }

      const formatCurrency = (value: number) =>
        new Intl.NumberFormat("es-AR", {
          style: "currency",
          currency: "ARS",
        }).format(value);

      const formatDate = (value: string) =>
        new Intl.DateTimeFormat("es-AR", {
          dateStyle: "short",
          timeStyle: "short",
        }).format(new Date(value));

      const customerHtml = recibo.customer
        ? `
          <div class="customer">
            <div>
              <strong>Contribuyente:</strong>
              ${recibo.customer.codigo} -
              ${recibo.customer.razonSocial}
            </div>

            ${
              recibo.customer.numeroDocumento
                ? `
                  <div>
                    <strong>Documento:</strong>
                    ${recibo.customer.numeroDocumento}
                  </div>
                `
                : ""
            }

            ${
              recibo.customer.domicilio
                ? `
                  <div>
                    <strong>Domicilio:</strong>
                    ${recibo.customer.domicilio}
                  </div>
                `
                : ""
            }
          </div>
        `
        : `
          <div class="customer">
            <strong>Contribuyente:</strong>
            Sin contribuyente
          </div>
        `;

      const linesHtml = recibo.lines
        .map(
          (line) => `
            <tr>
              <td class="code">
                ${line.accountCode}
              </td>

              <td>
                <strong>
                  ${line.accountDescription ?? ""}
                </strong>

                <div class="line-description">
                  ${line.description}
                </div>
              </td>

              <td class="amount">
                ${formatCurrency(line.amount)}
              </td>
            </tr>
          `,
        )
        .join("");

      const copies = (copyLabel: string) => `
        <section class="copy">

          <header>
            <div class="logo-placeholder">
              LOGO
            </div>

            <div class="header-text">
              <h1>PROGRAMA DE CAJA</h1>
              <div>Municipalidad de San Justo</div>
              <div>CUIT: ${recibo.parametros?.cuit ?? ""}</div>
              <div>
                ${recibo.parametros?.direccion ?? ""}
              </div>
              <div>
                Teléfono: ${recibo.parametros?.telefono ?? ""}
              </div>
            </div>
          </header>

          <div class="title">
            <h2>COMPROBANTE DE CAJA</h2>
          </div>

          <div class="receipt-info">
            <div>
              <strong>N.º de comprobante:</strong>
              ${recibo.numeroFactura}
            </div>

            <div>
              <strong>Fecha:</strong>
              ${formatDate(recibo.fecha)}
            </div>
          </div>

          ${customerHtml}

          <table>
            <thead>
              <tr>
                <th class="code">Código</th>
                <th>Concepto</th>
                <th class="amount">Importe</th>
              </tr>
            </thead>

            <tbody>
              ${linesHtml}
            </tbody>

            <tfoot>
              <tr>
                <td colspan="2">
                  <strong>TOTAL</strong>
                </td>
                <td class="amount">
                  <strong>
                    ${formatCurrency(recibo.total)}
                  </strong>
                </td>
              </tr>
            </tfoot>
          </table>

          <div class="cashier">
            <strong>Cajero:</strong>
            __________________________________________
          </div>

          <div class="signature">
            <strong>Firma / aclaración:</strong>
            __________________________________________
          </div>

          <div class="copy-label">
            ${copyLabel}
          </div>

        </section>
      `;

      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="es">
          <head>
            <meta charset="UTF-8">

            <title>
              Recibo ${recibo.numeroFactura}
            </title>

            <style>
              @page {
                size: A4;
                margin: 15mm;
              }

              * {
                box-sizing: border-box;
              }

              html,
              body {
                margin: 0;
                padding: 0;
                font-family:
                  Arial,
                  Helvetica,
                  sans-serif;
                color: #000;
                font-size: 11pt;
              }

              .copy {
                width: 100%;
                min-height: 267mm;
                position: relative;
                page-break-after: always;
              }

              .copy:last-child {
                page-break-after: auto;
              }

              header {
                display: flex;
                align-items: center;
                border-bottom: 1px solid #000;
                padding-bottom: 8mm;
              }

              .logo-placeholder {
                width: 30mm;
                height: 22mm;
                border: 1px solid #777;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 9pt;
                color: #555;
                margin-right: 8mm;
              }

              .header-text {
                flex: 1;
              }

              .header-text h1 {
                margin: 0 0 2mm 0;
                font-size: 18pt;
              }

              .header-text div {
                margin: 1mm 0;
              }

              .title {
                text-align: center;
                margin: 8mm 0;
              }

              .title h2 {
                margin: 0;
                font-size: 15pt;
              }

              .receipt-info {
                display: flex;
                justify-content: space-between;
                border: 1px solid #000;
                padding: 4mm;
                margin-bottom: 6mm;
              }

              .customer {
                border: 1px solid #000;
                padding: 4mm;
                margin-bottom: 8mm;
                line-height: 1.6;
              }

              table {
                width: 100%;
                border-collapse: collapse;
              }

              th,
              td {
                border: 1px solid #000;
                padding: 3mm;
                vertical-align: top;
              }

              th {
                text-align: left;
              }

              .code {
                width: 25mm;
              }

              .amount {
                width: 35mm;
                text-align: right;
                white-space: nowrap;
              }

              .line-description {
                margin-top: 1mm;
                font-size: 10pt;
              }

              tfoot td {
                border-top: 2px solid #000;
                font-size: 12pt;
              }

              .cashier {
                margin-top: 20mm;
              }

              .signature {
                margin-top: 12mm;
              }

              .copy-label {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                text-align: center;
                border-top: 1px dashed #000;
                padding-top: 4mm;
                font-weight: bold;
                font-size: 10pt;
              }

              @media screen {
                body {
                  background: #eee;
                  padding: 15mm;
                }

                .copy {
                  background: white;
                  width: 210mm;
                  min-height: 297mm;
                  margin: 0 auto 15mm auto;
                  padding: 15mm;
                  box-shadow:
                    0 0 8px rgba(0, 0, 0, 0.2);
                }
              }

              @media print {
                .copy {
                  min-height: 267mm;
                }
              }
            </style>
          </head>

          <body>
            ${copies("COPIA CLIENTE")}
            ${copies("COPIA CAJERO")}
          </body>
        </html>
      `);

      printWindow.document.close();

      printWindow.focus();

      printWindow.onload = () => {
        printWindow.print();
      };
    } catch (error) {
      console.error(
        "Error al preparar la impresión:",
        error,
      );

      alert(
        error instanceof Error
          ? error.message
          : "No se pudo preparar la impresión.",
      );
    }
  };

  const handleAmountKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter") {
      addLine();
    }
  };

  useHotkeys("f2", () => {
    console.log("Guardar");
  });

  useHotkeys("f3", () => {
    console.log("Imprimir");
  });

  useHotkeys("esc", () => {
    setCategory("");
    setDescription("");
    setAmount("");
  });

  return (
    <Box p={2}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Programa de Caja
      </Typography>

      {loadError && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography color="error">
            {loadError}
          </Typography>
        </Paper>
      )}

      {/* HEADER */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} sx={{ width: "100%" }}>
          <Grid size={6}>
            <Autocomplete
              options={customers}
              getOptionLabel={(option) =>
                `${option.codigo} - ${option.razonSocial}`
              }
              disabled={
                loadingData ||
                noCustomer ||
                savedReceipt !== null
              }
              value={selectedCustomer}
              onChange={(_, value) => setSelectedCustomer(value)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Contribuyente"
                />
              )}
            />
          </Grid>

          <Grid size={6}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={noCustomer}
                  disabled={savedReceipt !== null}
                  onChange={(e) => {
                    const checked = e.target.checked;

                    setNoCustomer(checked);

                    if (checked) {
                      setSelectedCustomer(null);
                    }
                  }}
                />
              }
              label="Sin contribuyente"
            />
          </Grid>

          <Grid size={4}>
            <TextField
              fullWidth
              label="N° Recibo"
              value={receiptNumber || "Nuevo"}
              slotProps={{
                input: {
                  readOnly: true,
                },
              }}
            />
          </Grid>

          <Grid size={4}>
            <TextField
              fullWidth
              label="Fecha"
              value={new Date().toLocaleDateString()}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* INPUT LINE */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Box
            display="flex"
            flexDirection="column"
            gap={2}
          >
            <Autocomplete
              options={categories}
              disabled={savedReceipt !== null}
              getOptionLabel={(option) =>
                `${option.codigo} - ${option.descripcion}`
              }
              value={
                categories.find(
                  (c) => c.codigo === category
                ) || null
              }
              onChange={(_, value) => {
                setCategory(value?.codigo || "");

                setTimeout(() => {
                  descriptionRef.current?.focus();
                }, 0);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Categoría"
                />
              )}
            />

            <Box
              display="grid"
              gridTemplateColumns="4fr 1fr"
              gap={2}
            >
              <TextField
                fullWidth
                disabled={savedReceipt !== null}
                label="Descripción"
                value={description}
                inputRef={descriptionRef}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
              />

              <TextField
                fullWidth
                label="Importe"
                disabled={savedReceipt !== null}
                type="number"
                value={amount}
                inputRef={amountRef}
                onChange={(e) =>
                  setAmount(e.target.value)
                }
                onKeyDown={handleAmountKeyDown}
              />

              <Button
                variant="contained"
                onClick={addLine}
              >
                Agregar línea
              </Button>
            </Box>
          </Box>
        </Grid>
      </Paper>

      {/* TABLE */}
      <Paper sx={{ p: 2 }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr>
              <th align="left">Categoría</th>
              <th align="left">Descripción</th>
              <th align="right">Importe</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  style={{
                    textAlign: "center",
                    padding: 10,
                  }}
                >
                  Sin registros
                </td>
              </tr>
            ) : (
              lines.map((l) => (
                <tr key={l.id}>
                  <td>{l.category}</td>
                  <td>{l.description}</td>
                  <td style={{ textAlign: "right" }}>
                    {new Intl.NumberFormat("es-AR", {
                      style: "currency",
                      currency: "ARS",
                    }).format(l.amount)}
                  </td>
                  <td>
                    <Button
                      color="error"
                      onClick={() => removeLine(l.id)}
                    >
                      X
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* TOTAL */}
        <Box
          mt={2}
          display="flex"
          justifyContent="space-between"
        >
          <Typography variant="h5">
            TOTAL
          </Typography>

          <Typography
            variant="h5"
            fontWeight="bold"
          >
            {new Intl.NumberFormat("es-AR", {
              style: "currency",
              currency: "ARS",
            }).format(total)}
          </Typography>
        </Box>

        {/* ACTIONS */}
        {saveError && (
          <Typography color="error" sx={{ mb: 2 }}>
            {saveError}
          </Typography>
        )}

        {savedReceipt && (
          <Paper
            sx={{
              p: 2,
              mb: 2,
            }}
          >
            <Typography
              variant="h6"
              color="success.main"
              fontWeight="bold"
            >
              Recibo registrado
            </Typography>

            <Typography>
              N° {savedReceipt}
            </Typography>
          </Paper>
        )}
        <Box mt={2} display="flex" gap={2}>
          {savedReceipt ? (
            <>
              <Button
                variant="contained"
                onClick={handleNuevoRecibo}
              >
                Nuevo recibo
              </Button>

              <Button 
                  variant="outlined"
                  onClick={handleImprimir}
                >
                Imprimir
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="contained"
                onClick={handleRegistrar}
                disabled={saving || lines.length === 0}
              >
                {saving ? "Registrando..." : "Registrar"}
              </Button>

              <Button variant="outlined" disabled>
                Imprimir
              </Button>
            </>
          )}
        </Box>
      </Paper>
    </Box>
  );
}