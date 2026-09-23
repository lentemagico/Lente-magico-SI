import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../config/api";

export default function ConsultarCliente() {
  // Texto escrito en el campo de búsqueda
  const [busqueda, setBusqueda] = useState("");
  // Resultados de la búsqueda de clientes
  const [clientes, setClientes] = useState([]);
  // Indica si ya se realizó al menos una búsqueda (para mostrar el mensaje de "no encontrado")
  const [buscado, setBuscado] = useState(false);
  // Bandera para mostrar "Buscando..." mientras llega la respuesta
  const [cargando, setCargando] = useState(false);
  // Mensaje de error si la búsqueda falla
  const [error, setError] = useState(null);
  // Permite redirigir a otras rutas de la app
  const navigate = useNavigate();

  // Envía la búsqueda al backend (por documento, nombre, apellido o correo)
  const manejarBusqueda = async (e) => {
    e.preventDefault();
    setCargando(true);
    setError(null);
    setBuscado(true);

    try {
      // El backend busca por documento, nombre, apellido o correo con "search"
      const data = await apiFetch(
        `/clientes?search=${encodeURIComponent(busqueda)}&limit=10`
      );

      setClientes(data.clientes || []);
    } catch (err) {
      setError(err.message);
      setClientes([]);
    } finally {
      setCargando(false);
    }
  };

  // Guarda el cliente elegido y navega a la pantalla de confirmar venta
  const seleccionarCliente = (cliente) => {
    // Guardamos el cliente elegido para usarlo en Confirmar Venta
    sessionStorage.setItem("clienteSeleccionado", JSON.stringify(cliente));
    navigate("/caja/confirmar-venta");
  };

  return (
    <div className="container py-4">
      <h3 className="fw-bold text-primary mb-3">Consultar Cliente</h3>

      {/* Formulario de búsqueda */}
      <form onSubmit={manejarBusqueda} className="d-flex gap-2 mb-4">
        <input
          type="text"
          className="form-control"
          placeholder="Documento, nombre, apellido o correo..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={cargando}>
          {cargando ? "Buscando..." : "Buscar"}
        </button>
      </form>

      {/* Alerta de error de la búsqueda */}
      {error && <div className="alert alert-danger">{error}</div>}

      {/* Mensaje cuando la búsqueda no encontró resultados, con atajo para registrar un cliente nuevo */}
      {buscado && !cargando && clientes.length === 0 && !error && (
        <div className="alert alert-warning d-flex justify-content-between align-items-center">
          <span>No se encontraron clientes con ese criterio.</span>
          <button
            className="btn btn-sm btn-success"
            onClick={() => navigate("/caja/registrar-cliente")}
          >
            + Registrar nuevo cliente
          </button>
        </div>
      )}

      {/* Tabla de resultados, solo se muestra si hay clientes */}
      {clientes.length > 0 && (
        <div className="table-responsive shadow-sm rounded">
          <table className="table table-striped table-hover align-middle mb-0 bg-white">
            <thead className="table-primary">
              <tr>
                <th>Documento</th>
                <th>Nombre completo</th>
                <th>Correo</th>
                <th>Teléfono</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {/* Una fila por cada cliente encontrado */}
              {clientes.map((c) => (
                <tr key={c.id_cliente}>
                  <td>{c.sigla} {c.numero_documento}</td>
                  <td>
                    {c.primer_nombre} {c.segundo_nombre || ""}{" "}
                    {c.primer_apellido} {c.segundo_apellido || ""}
                  </td>
                  <td>{c.correo || "-"}</td>
                  <td>{c.telefono || "-"}</td>
                  <td>
                    {/* Botón para elegir este cliente y continuar con la venta */}
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => seleccionarCliente(c)}
                    >
                      Vender a este cliente
                    </button>
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