import { useEffect, useRef, useState } from "react";
import { crearRecibo } from "../api/caja";
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
  getCuentas,
  getPersonas,
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

      setLines([]);
      setCategory("");
      setDescription("");
      setAmount("");
      setSelectedCustomer(null);
      setNoCustomer(false);

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
              disabled={noCustomer}
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
          <Typography color="success.main" sx={{ mb: 2 }}>
            Recibo registrado: {savedReceipt}
          </Typography>
        )}
        <Box mt={2} display="flex" gap={2}>
          <Button
            variant="contained"
            onClick={handleRegistrar}
            disabled={saving || lines.length === 0}
          >
            {saving ? "Registrando..." : "Registrar"}
          </Button>

          <Button variant="outlined">
            Imprimir
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}