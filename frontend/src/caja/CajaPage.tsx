import { useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Paper,
  TextField,
  Typography,
  MenuItem,
  Select,
  Grid,
} from "@mui/material";
import { useHotkeys }
from "react-hotkeys-hook";

import { useRef } from "react";
import Autocomplete from "@mui/material/Autocomplete";



type Line = {
  id: number;
  category: string;
  description: string;
  amount: number;
};


export default function CajaPage() {
  const [customer, setCustomer] = useState("");
  const [noCustomer, setNoCustomer] = useState(false);

  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  const [lines, setLines] = useState<Line[]>([]);
  const [receiptNumber] =
    useState("00063150");

  const customers = [
    { id: 1, name: "@ Mun de San Justo" },
    { id: 2, name: "Cooperativa de Agua" },
    { id: 3, name: "Cementerio" },
  ];

  const categories = [
    { id: 1, code: "001", name: "ALQ TRACTOR Y PALA" },
    { id: 2, code: "002", name: "ALQ MINICARGADORA" },
    { id: 3, code: "003", name: "ALQUILER HIDROELEVADOR" },
  ];

  const descriptionRef =
    useRef<HTMLInputElement>(null);

  const amountRef =
    useRef<HTMLInputElement>(null);
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

  const handleAmountKeyDown = (
    e: React.KeyboardEvent
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

      {/* HEADER */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} sx={{ width: "100%" }}>

          <Grid size={6}>
            <Autocomplete
              options={customers}
              getOptionLabel={(option) => option.name}
              disabled={noCustomer}
              value={
                customers.find((c) => c.name === customer)
                || null
              }
              onChange={(_, value) =>
                setCustomer(value?.name || "")
              }
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
                  onChange={(e) => setNoCustomer(e.target.checked)}
                />
              }
              label="Sin contribuyente"
            />
          </Grid>

          <Grid size={4}>
            <TextField
              fullWidth
              label="N° Recibo"
              value={receiptNumber}
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

          <Box display="flex" flexDirection="column" gap={2}>
            <Autocomplete
              options={categories}
              getOptionLabel={(option) =>
                `${option.code} - ${option.name}`
              }
              value={
                categories.find(
                  (c) => c.name === category
                ) || null
              }
              onChange={(_, value) => {
                setCategory(value?.name || "");

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
              onChange={(e) => setDescription(e.target.value)}
            />
          

            <TextField
              fullWidth
              label="Importe"
              type="number"
              value={amount}
              inputRef={amountRef}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={handleAmountKeyDown}
            />

            <Button variant="contained" onClick={addLine}>
              Agregar línea
            </Button>
            </Box>
          </Box>
        </Grid>
      </Paper>

      {/* TABLE */}
      <Paper sx={{ p: 2 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
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
                <td colSpan={4} style={{ textAlign: "center", padding: 10 }}>
                  Sin registros
                </td>
              </tr>
            ) : (
              lines.map((l) => (
                <tr key={l.id}>
                  <td>{l.category}</td>
                  <td>{l.description}</td>
                  <td style={{ textAlign: "right" }}>
                    {
                      new Intl.NumberFormat(
                        "es-AR",
                        {
                          style: "currency",
                          currency: "ARS",
                        }
                      ).format(l.amount)
                    }
                  </td>
                  <td>
                    <Button color="error" onClick={() => removeLine(l.id)}>
                      X
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* TOTAL */}
        <Box mt={2} display="flex" justifyContent="space-between">
          <Typography variant="h5">
            TOTAL
          </Typography>

          <Typography variant="h5" fontWeight="bold">
            {
              new Intl.NumberFormat(
                "es-AR",
                {
                  style: "currency",
                  currency: "ARS",
                }
              ).format(total)
            }
          </Typography>
        </Box>

        {/* ACTIONS */}
        <Box mt={2} display="flex" gap={2}>
          <Button variant="contained">
            Registrar
          </Button>

          <Button variant="outlined">
            Imprimir
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}