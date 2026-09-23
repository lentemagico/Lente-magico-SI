import React, { useEffect, useState } from "react";
import { apiFetch } from "../../config/api";

export default function FormasPago() {
  // Datos del reporte: un renglón por método de pago con su cantidad y total recaudado
  const [datos, setDatos] = useState([]);
  // Mensaje de error si falla la carga
  const [error, setError] = useState(null);
  // Bandera para mostrar "Cargando..." mientras llega la respuesta
  const [cargando, setCargando] = useState(true);

  // Al montar el componente se pide al backend el resumen de formas de pago
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

  // Suma el total recaudado de todos los métodos de pago, para mostrarlo en el pie de la tabla
  const totalGeneral = datos.reduce((acc, d) => acc + Number(d.total || 0), 0);

  return (
    <div className="container py-4">
      <h3 className="fw-bold text-primary mb-3">Formas de Pago</h3>

      {/* Alerta de error */}
      {error && <div className="alert alert-danger">{error}</div>}

      {/* Mientras carga: texto; sin datos: aviso; con datos: tabla */}
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
              {/* Una fila por cada método de pago devuelto por el backend */}
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
              {/* Fila final con el total general sumado en el frontend */}
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