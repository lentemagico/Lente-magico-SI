import { useState, useEffect } from "react";

const API_URL = "/api/administrador/logErrores";

function LogErrores() {
  const [errores, setErrores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [filtroNivel, setFiltroNivel] = useState("Todos");

  useEffect(() => {
    let abort = false;

    fetch(API_URL)
      .then(async (respuesta) => {
        if (!respuesta.ok) {
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

    return () => {
      abort = true;
    };
  }, []);

  function colorBadge(nivel) {
    if (nivel === "Crítico") return "badge text-bg-danger";
    if (nivel === "Advertencia") return "badge text-bg-warning";
    return "badge text-bg-secondary";
  }

  const erroresFiltrados = errores.filter((e) => {
    
    const usuario = (e.nombre_usuario || "").toLowerCase();
    const mensaje = (e.mensaje || "").toLowerCase();
    const textoBuscar = busqueda.toLowerCase();

    const coincideTexto = usuario.includes(textoBuscar) || mensaje.includes(textoBuscar);
    const coincideNivel = filtroNivel === "Todos" || e.nivel === filtroNivel;

    return coincideTexto && coincideNivel;
  });

  return (
    <div className="container mt-4">
      <div className="mb-3">
        <h3 className="mb-0">Log de errores</h3>
        <p className="text-muted mb-0">
          Registro automático de errores generados por el sistema
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      
      <div className="row mb-3 g-2">
        <div className="col-md-8">
          <input
            type="text"
            className="form-control"
            placeholder="Buscar por usuario o mensaje"
            value={busqueda}
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
                {erroresFiltrados.map((e, index) => (
                  <tr key={e.id || index}>
                    <td>
                      <span className={colorBadge(e.nivel)}>
                        {e.nivel || "Info"}
                      </span>
                    </td>
                    <td>{e.nombre_usuario || "Sistema"}</td>
                    <td>{e.mensaje || "-"}</td>
                    <td>
                      {e.fecha
                        ? new Date(e.fecha).toLocaleString()
                        : "-"}
                    </td>
                  </tr>
                ))}

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

          <p className="text-muted">
            {erroresFiltrados.length} registro(s) encontrados
          </p>
        </>
      )}
    </div>
  );
}

export default LogErrores;