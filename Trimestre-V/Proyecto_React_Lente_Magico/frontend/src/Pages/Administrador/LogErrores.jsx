import { useState, useEffect } from "react";

// Endpoint del backend que devuelve el log de errores del sistema
const API_URL = "/api/administrador/logErrores";

function LogErrores() {
  // Lista completa de errores traída del backend
  const [errores, setErrores] = useState([]);
  // Bandera para mostrar "Cargando..." mientras se resuelve el fetch
  const [cargando, setCargando] = useState(true);
  // Mensaje de error a mostrar si falla la carga
  const [error, setError] = useState("");

  // Texto del buscador (filtra por usuario o mensaje)
  const [busqueda, setBusqueda] = useState("");
  // Nivel seleccionado en el select de filtro ("Todos", "Crítico", "Advertencia", "Info")
  const [filtroNivel, setFiltroNivel] = useState("Todos");

  useEffect(() => {
    // Bandera local para evitar actualizar el estado si el componente ya se desmontó
    let abort = false;

    fetch(API_URL)
      .then(async (respuesta) => {
        if (!respuesta.ok) {
          // Si la respuesta no es OK, intenta leer el detalle del error en JSON
          const errData = await respuesta.json().catch(() => ({}));
          throw new Error(errData.error || `Error ${respuesta.status}`);
        }
        return respuesta.json();
      })
      .then((data) => {
        if (!abort) {
          const lista = Array.isArray(data) ? data : [];

          setErrores(lista);
          setError("");
        }
      })
      .catch((err) => {
        if (!abort) {
          setError("No se pudieron cargar los errores. ¿Está corriendo el servidor Backend?");
          console.error("Error al obtener los logs de errores:", err);
          setErrores([]);
        }
      })
      .finally(() => {
        if (!abort) setCargando(false);
      });

    // Función de limpieza: se ejecuta si el componente se desmonta antes de que termine el fetch
    return () => {
      abort = true;
    };
  }, []);

  // Devuelve la clase de Bootstrap para el badge según el nivel de severidad del error
  function colorBadge(nivel) {
    if (nivel === "Crítico") return "badge text-bg-danger";
    if (nivel === "Advertencia") return "badge text-bg-warning";
    return "badge text-bg-secondary";
  }

  // Lista filtrada combinando el texto buscado (usuario/mensaje) y el nivel seleccionado
  const erroresFiltrados = errores.filter((e) => {

    const usuario = (e.nombre_usuario || "").toLowerCase();
    const mensaje = (e.mensaje || "").toLowerCase();
    const textoBuscar = busqueda.toLowerCase();

    // Coincide si el texto buscado aparece en el nombre del usuario o en el mensaje
    const coincideTexto = usuario.includes(textoBuscar) || mensaje.includes(textoBuscar);
    // Coincide si el filtro está en "Todos" o si el nivel del error es igual al filtro
    const coincideNivel = filtroNivel === "Todos" || e.nivel === filtroNivel;

    return coincideTexto && coincideNivel;
  });

  return (
    <div className="container mt-4">
      {/* Título y descripción de la vista */}
      <div className="mb-3">
        <h3 className="mb-0">Log de errores</h3>
        <p className="text-muted mb-0">
          Registro automático de errores generados por el sistema
        </p>
      </div>

      {/* Alerta visible solo si hubo un error al cargar los datos */}
      {error && <div className="alert alert-danger">{error}</div>}

      {/* Barra de filtros: búsqueda por texto y selector de nivel */}
      <div className="row mb-3 g-2">
        <div className="col-md-8">
          <input
            type="text"
            className="form-control"
            placeholder="Buscar por usuario o mensaje"
            value={busqueda}
            // Solo permite letras (incluyendo tildes/ñ) y espacios mientras se escribe
            onChange={(e) => setBusqueda(e.target.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúñÑ\s]/g, ""))}
          />
        </div>
        <div className="col-md-4">
          <select
            className="form-select"
            value={filtroNivel}
            onChange={(e) => setFiltroNivel(e.target.value)}
          >
            <option value="Todos">Todos los niveles</option>
            <option value="Crítico">Crítico</option>
            <option value="Advertencia">Advertencia</option>
            <option value="Info">Info</option>
          </select>
        </div>
      </div>

      {/* Mientras carga se muestra un texto; cuando termina se muestra la tabla */}
      {cargando ? (
        <p className="text-muted">Cargando registros...</p>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th>Nivel</th>
                  <th>Usuario</th>
                  <th>Mensaje</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {/* Una fila por cada registro de error que pasó los filtros */}
                {erroresFiltrados.map((e, index) => (
                  <tr key={e.id || index}>
                    <td>
                      {/* Badge de color según el nivel de severidad */}
                      <span className={colorBadge(e.nivel)}>
                        {e.nivel || "Info"}
                      </span>
                    </td>
                    <td>{e.nombre_usuario || "Sistema"}</td>
                    <td>{e.mensaje || "-"}</td>
                    <td>
                      {/* Formatea la fecha al formato local si existe */}
                      {e.fecha
                        ? new Date(e.fecha).toLocaleString()
                        : "-"}
                    </td>
                  </tr>
                ))}

                {/* Mensaje que aparece cuando el filtro no encuentra resultados */}
                {erroresFiltrados.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center text-muted py-3">
                      No se encontraron registros de error
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Contador de resultados mostrados */}
          <p className="text-muted">
            {erroresFiltrados.length} registro(s) encontrados
          </p>
        </>
      )}
    </div>
  );
}

export default LogErrores;