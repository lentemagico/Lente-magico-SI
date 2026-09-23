import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../config/api";

export default function VisualizarVenta() {
  // Lista de ventas a mostrar en el historial
  const [ventas, setVentas] = useState([]);
  // Mensaje de error si falla la carga
  const [error, setError] = useState(null);
  // Bandera para mostrar "Cargando..." mientras llega la respuesta
  const [cargando, setCargando] = useState(true);
  const navigate = useNavigate();

  // Al montar el componente se cargan las últimas ventas
  useEffect(() => {
    const cargar = async () => {
      try {
        // Backend real: GET /api/ventas
        const data = await apiFetch("/ventas?limit=20");
        setVentas(data.ventas || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setCargando(false);
      }
    };

    cargar();
  }, []);

  // Suma el total de todas las ventas cargadas (no es necesariamente el total histórico, solo el de esta lista)
  const totalRecaudado = ventas.reduce(
    (acc, v) => acc + Number(v.total || 0),
    0
  );

  return (
    <div className="container py-4">
      {/* Encabezado con título y botón para ir a registrar una venta nueva */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold text-primary mb-0">Historial de Ventas</h3>
          <small className="text-muted">Óptica Lente Mágico</small>
        </div>
        <button className="btn btn-outline-primary" onClick={() => navigate("/caja/confirmar-venta")}>
          + Nueva Venta
        </button>
      </div>

      {/* Alerta de error */}
      {error && <div className="alert alert-danger">{error}</div>}

      {/* Mientras carga: texto; sin ventas: tarjeta de aviso; con ventas: tabla */}
      {cargando ? (
        <p className="text-muted">Cargando ventas...</p>
      ) : ventas.length === 0 ? (
        <div className="card text-center p-5 border-0 shadow-sm">
          <h5 className="text-muted mb-3">No hay ventas registradas aún</h5>
          <button className="btn btn-success" onClick={() => navigate("/caja/confirmar-venta")}>
            Registrar primera venta
          </button>
        </div>
      ) : (
        <div className="table-responsive shadow-sm rounded">
          <table className="table table-striped table-hover align-middle mb-0 bg-white">
            <thead className="table-primary">
              <tr>
                <th>#</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Documento</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {/* Una fila por cada venta del historial */}
              {ventas.map((venta) => (
                <tr key={venta.id_venta}>
                  <td>{venta.id_venta}</td>
                  <td>{String(venta.fecha_venta).substring(0, 16).replace("T", " ")}</td>
                  <td className="fw-semibold">{venta.cliente}</td>
                  <td>{venta.documento_cliente}</td>
                  <td>
                    <span className="badge bg-success">{venta.estado}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}