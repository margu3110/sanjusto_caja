import { Card, CardContent, Typography } from "@mui/material";

export default function CajaPage() {
  return (
    <Card>
      <CardContent>
        <Typography variant="h4">
          Programa de Caja
        </Typography>

        <Typography mt={2}>
          Aquí irá el sistema de carga de recibos (POS).
        </Typography>
      </CardContent>
    </Card>
  );
}