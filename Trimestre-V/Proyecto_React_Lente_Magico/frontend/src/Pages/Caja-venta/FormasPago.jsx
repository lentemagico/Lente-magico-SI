import React, { useEffect, useState } from "react";
import { apiFetch } from "../../config/api";

export default function FormasPago() {
  const [datos, setDatos] = useState([]);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        // Backend real: GET /api/formas-pago
        const data = await apiFetch("/formas-pago");
        setDatos(data.formasPago || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  const totalGeneral = datos.reduce((acc, d) => acc + Number(d.total || 0), 0);

  return (
    <div className="container py-4">
      <h3 className="fw-bold text-primary mb-3">Formas de Pago</h3>

      {error && <div className="alert alert-danger">{error}</div>}

      {cargando ? (
        <p className="text-muted">Cargando...</p>
      ) : datos.length === 0 ? (
        <div className="alert alert-info">Aún no hay pagos registrados.</div>
      ) : (
        <div className="table-responsive shadow-sm rounded">
          <table className="table table-striped table-hover align-middle mb-0 bg-white">
            <thead className="table-primary">
              <tr>
                <th>Método de pago</th>
                <th className="text-center">Cantidad de pagos</th>
                <th className="text-end">Total recaudado</th>
              </tr>
            </thead>
            <tbody>
              {datos.map((d) => (
                <tr key={d.metodo_pago}>
                  <td>{d.metodo_pago}</td>
                  <td className="text-center">{d.cantidad}</td>
                  <td className="text-end font-monospace fw-bold text-success">
                    ${Number(d.total).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="table-light">
                <td colSpan={2} className="fw-bold">Total general</td>
                <td className="text-end fw-bold">${totalGeneral.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}