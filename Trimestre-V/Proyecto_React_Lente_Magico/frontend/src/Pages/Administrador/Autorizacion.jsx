import { useState, useEffect } from "react";

// Endpoint del backend para el recurso "autorizaciones" (roles del sistema)
const API_URL = "/api/administrador/autorizaciones";

const Autorizaciones = () => {
  // Lista de autorizaciones traídas del backend
  const [autorizaciones, setAutorizaciones] = useState([]);
  // Bandera para mostrar el mensaje "Cargando..." mientras llega la respuesta del fetch
  const [cargando, setCargando] = useState(true);
  // Mensaje de error para mostrar en pantalla si algo falla
  const [error, setError] = useState("");

  // Texto escrito en el input de búsqueda, usado para filtrar la tabla
  const [busqueda, setBusqueda] = useState("");

  // Controla si el formulario (crear/editar) está visible
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  // Guarda la autorización que se está editando (null cuando se está creando una nueva)
  const [autorizacionEditando, setAutorizacionEditando] = useState(null);
  // Valor del campo "nombre" dentro del formulario
  const [nombreForm, setNombreForm] = useState("");

  // Al montar el componente, se cargan las autorizaciones una sola vez
  useEffect(() => {
    cargarAutorizaciones();
  }, []);

  // Trae la lista de autorizaciones desde el backend (GET)
  function cargarAutorizaciones() {
    setCargando(true);
    fetch(API_URL)
      .then((respuesta) => respuesta.json())
      .then((data) => {
        // Soporta que el backend responda un array plano o un objeto { autorizaciones: [...] }
        const lista = Array.isArray(data)
          ? data
          : Array.isArray(data?.autorizaciones)
            ? data.autorizaciones
            : [];

        setAutorizaciones(lista);
        setError("");
      })
      .catch((err) => {
        // Si falla la petición (ej. backend apagado), se muestra un mensaje amigable
        setError(
          "No se pudieron cargar las autorizaciones. Verifica que el backend esté corriendo en http://localhost:5000",
        );
        console.error(err);
      })
      .finally(() => setCargando(false));
  }

  // Prepara el formulario vacío para crear una autorización nueva
  function abrirFormularioNuevo() {
    setAutorizacionEditando(null);
    setNombreForm("");
    setMostrarFormulario(true);
  }

  // Prepara el formulario precargado con los datos de la autorización que se va a editar
  function abrirFormularioEditar(autorizacion) {
    setAutorizacionEditando(autorizacion);
    setNombreForm(autorizacion.nombre);
    setMostrarFormulario(true);
  }

  // Envía el formulario: crea (POST) o actualiza (PUT) una autorización según el caso
  function guardarAutorizacion(e) {
    e.preventDefault();

    // Validación simple: el nombre no puede estar vacío
    if (nombreForm.trim() === "") {
      alert("El nombre de la autorización es obligatorio");
      return;
    }

    if (autorizacionEditando) {
      // Modo edición: se actualiza la autorización existente por su id
      fetch(`${API_URL}/${autorizacionEditando.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombreForm }),
      })
        .then(() => {
          cargarAutorizaciones();
          setMostrarFormulario(false);
        })
        .catch((err) => {
          alert("Error al editar la autorización");
          console.error(err);
        });
    } else {
      // Modo creación: se envía una autorización nueva
      fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombreForm }),
      })
        .then(() => {
          cargarAutorizaciones();
          setMostrarFormulario(false);
        })
        .catch((err) => {
          alert("Error al crear la autorización");
          console.error(err);
        });
    }
  }

  // Elimina una autorización previa confirmación del usuario
  function eliminarAutorizacion(id) {
    const confirmar = window.confirm(
      "¿Seguro que quieres eliminar esta autorización?",
    );
    if (!confirmar) return;

    fetch(`${API_URL}/${id}`, { method: "DELETE" })
      .then(() => cargarAutorizaciones())
      .catch((err) => {
        alert("Error al eliminar la autorización");
        console.error(err);
      });
  }

  // Lista filtrada según el texto escrito en el buscador (por nombre)
  const autorizacionesFiltradas = (autorizaciones || []).filter((a) =>
    (a?.nombre || "").toLowerCase().includes(busqueda.toLowerCase()),
  );

  return (
    <div className="container mt-4">
      {/* Encabezado con título y botón para abrir el formulario de creación */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h3 className="mb-0">Autorizaciones</h3>
          <p className="text-muted mb-0">Roles disponibles en el sistema</p>
        </div>
        <button className="btn btn-primary" onClick={abrirFormularioNuevo}>
          + Nueva autorización
        </button>
      </div>

      {/* Alerta visible solo si hubo un error al cargar/guardar/eliminar */}
      {error && <div className="alert alert-danger">{error}</div>}

      {/* Campo de búsqueda que filtra la tabla en tiempo real */}
      <div className="row mb-3 g-2">
        <div className="col-md-12">
          <input
            type="text"
            className="form-control"
            placeholder="Buscar autorización"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </div>

      {/* Formulario de creación/edición, solo se renderiza si mostrarFormulario es true */}
      {mostrarFormulario && (
        <div className="card mb-3">
          <div className="card-body">
            <h5 className="card-title">
              {autorizacionEditando
                ? "Editar autorización"
                : "Nueva autorización"}
            </h5>
            <form onSubmit={guardarAutorizacion}>
              <div className="mb-3">
                <label className="form-label">Nombre de la autorización</label>
                <input
                  type="text"
                  className="form-control"
                  value={nombreForm}
                  // Solo permite letras (incluyendo tildes/ñ) y espacios mientras se escribe
                  onChange={(e) => setNombreForm(e.target.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúñÑ\s]/g, ""))}
                  placeholder="Ej: Administrador"
                />
              </div>

              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-primary">
                  Guardar
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setMostrarFormulario(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mientras carga se muestra un texto; cuando termina se muestra la tabla */}
      {cargando ? (
        <p className="text-muted">Cargando autorizaciones...</p>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th>Id</th>
                  <th>Nombre de la autorización</th>
                  <th className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {/* Una fila por cada autorización que pasó el filtro de búsqueda */}
                {autorizacionesFiltradas.map((a) => (
                  <tr key={a.id}>
                    <td>{a.id}</td>
                    <td>{a.nombre}</td>
                    <td className="text-end">
                      {/* Botón para abrir el formulario en modo edición */}
                      <button
                        className="btn btn-sm btn-outline-secondary me-2"
                        onClick={() => abrirFormularioEditar(a)}
                      >
                        🖋️
                      </button>
                      {/* Botón para eliminar la autorización (pide confirmación) */}
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => eliminarAutorizacion(a.id)}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}

                {/* Mensaje que aparece cuando el filtro no encuentra resultados */}
                {autorizacionesFiltradas.length === 0 && (
                  <tr>
                    <td colSpan="3" className="text-center text-muted py-3">
                      No se encontraron autorizaciones
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Contador de resultados mostrados */}
          <p className="text-muted">
            {autorizacionesFiltradas.length} autorización(es) encontradas
          </p>
        </>
      )}
    </div>
  );
};

export default Autorizaciones;