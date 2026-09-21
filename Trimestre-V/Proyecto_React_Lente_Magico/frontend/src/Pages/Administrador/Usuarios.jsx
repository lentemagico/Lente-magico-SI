import { useEffect, useState } from "react";


const URL_USUARIOS = "/api/administrador/usuarios";
const URL_AUTORIZACIONES = "/api/administrador/autorizaciones";
const URL_TIPOS_DOCUMENTO = "/api/administrador/tipos-documento";

const Usuarios = () => {

  const [usuarios, setUsuarios] = useState([]);
  const [autorizaciones, setAutorizaciones] = useState([]);
  const [tiposDocumento, setTiposDocumento] = useState([]);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState("Todos");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);

  const [idTipoDocumento, setIdTipoDocumento] = useState("");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [primerNombre, setPrimerNombre] = useState("");
  const [segundoNombre, setSegundoNombre] = useState("");
  const [primerApellido, setPrimerApellido] = useState("");
  const [segundoApellido, setSegundoApellido] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [genero, setGenero] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");

  const [contrasenia, setContrasenia] = useState("");
  const [idioma, setIdioma] = useState("es");
  const [estado, setEstado] = useState(true);
  const [idAutorizacion, setIdAutorizacion] = useState("");

  useEffect(() => {
    cargarTodo();
  }, []);

  async function cargarTodo() {
    setCargando(true);

    try {
      const [
        respuestaUsuarios,
        respuestaAutorizaciones,
        respuestaTiposDocumento,
      ] = await Promise.all([
        fetch(URL_USUARIOS),
        fetch(URL_AUTORIZACIONES),
        fetch(URL_TIPOS_DOCUMENTO),
      ]);

      if (!respuestaUsuarios.ok) {
        throw new Error("No se pudieron cargar los usuarios");
      }

      if (!respuestaAutorizaciones.ok) {
        throw new Error("No se pudieron cargar las autorizaciones");
      }

      if (!respuestaTiposDocumento.ok) {
        throw new Error("No se pudieron cargar los tipos de documento");
      }

      const dataUsuarios = await respuestaUsuarios.json();
      const dataAutorizaciones = await respuestaAutorizaciones.json();
      const dataTiposDocumento = await respuestaTiposDocumento.json();

      setUsuarios(dataUsuarios || []);
      setAutorizaciones(dataAutorizaciones || []);
      setTiposDocumento(dataTiposDocumento || []);

      setError("");
    } catch (err) {
      console.error(err);

      setError(
        "No se pudieron cargar los datos. Verifica que el backend esté funcionando.",
      );
    } finally {
      setCargando(false);
    }
  }

  function obtenerNombreRol(usuario) {
    return usuario.rol || "Sin rol asignado";
  }

  function limpiarFormulario() {
    setUsuarioEditando(null);

    setIdTipoDocumento(
      tiposDocumento[0]?.id ? String(tiposDocumento[0].id) : "",
    );

    setNumeroDocumento("");
    setPrimerNombre("");
    setSegundoNombre("");
    setPrimerApellido("");
    setSegundoApellido("");
    setFechaNacimiento("");
    setGenero("");
    setCorreo("");
    setTelefono("");
    setContrasenia("");
    setIdioma("es");
    setEstado(true);
    setIdAutorizacion(
      autorizaciones[0]?.id ? String(autorizaciones[0].id) : "",
    );
  }

  function abrirFormularioNuevo() {
    limpiarFormulario();

    setMostrarFormulario(true);
  }

  function abrirFormularioEditar(usuario) {
    setUsuarioEditando(usuario);

    setIdTipoDocumento(
      usuario.id_tipo_documento ? String(usuario.id_tipo_documento) : "",
    );

    setNumeroDocumento(usuario.numero_documento || "");
    setPrimerNombre(usuario.primer_nombre || "");
    setSegundoNombre(usuario.segundo_nombre || "");
    setPrimerApellido(usuario.primer_apellido || "");
    setSegundoApellido(usuario.segundo_apellido || "");
    setFechaNacimiento(
      usuario.fecha_nacimiento
        ? String(usuario.fecha_nacimiento).substring(0, 10)
        : "",
    );
    setGenero(usuario.genero || "");
    setCorreo(usuario.correo || "");
    setTelefono(usuario.telefono || "");
    setContrasenia("");
    setIdioma(usuario.clave_idioma || "es");
    setEstado(Boolean(usuario.activar_usuario));
    setIdAutorizacion(
      usuario.id_autorizacion ? String(usuario.id_autorizacion) : "",
    );
    setMostrarFormulario(true);
  }

  async function guardarUsuario(e) {
    e.preventDefault();

    if (!idTipoDocumento) {
      alert("El tipo de documento es obligatorio");

      return;
    }

    if (!numeroDocumento.trim()) {
      alert("El número de documento es obligatorio");

      return;
    }

    if (!primerNombre.trim()) {
      alert("El primer nombre es obligatorio");

      return;
    }

    if (!primerApellido.trim()) {
      alert("El primer apellido es obligatorio");

      return;
    }

    if (!fechaNacimiento) {
      alert("La fecha de nacimiento es obligatoria");

      return;
    }

    if (!usuarioEditando && !contrasenia.trim()) {
      alert("La contraseña es obligatoria para un usuario nuevo");

      return;
    }

    const datosUsuario = {
      id_datos_personales: usuarioEditando
        ? usuarioEditando.id_datos_personales
        : null,

      id_tipo_documento: Number(idTipoDocumento),
      numero_documento: numeroDocumento.trim(),
      primer_nombre: primerNombre.trim(),
      segundo_nombre: segundoNombre.trim() || null,
      primer_apellido: primerApellido.trim(),
      segundo_apellido: segundoApellido.trim() || null,
      fecha_nacimiento: fechaNacimiento,
      genero: genero || null,
      correo: correo.trim() || null,
      telefono: telefono.trim() || null,
      contrasenia: contrasenia.trim() ? contrasenia : undefined,
      activar_usuario: estado ? 1 : 0,
      clave_idioma: idioma,
      id_autorizacion: idAutorizacion ? Number(idAutorizacion) : null,
    };

    const esEdicion = Boolean(usuarioEditando);

    const url = esEdicion
      ? `${URL_USUARIOS}/${usuarioEditando.id}`
      : URL_USUARIOS;

    const metodo = esEdicion ? "PUT" : "POST";

    try {
      const respuesta = await fetch(url, {
        method: metodo,

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(datosUsuario),
      });

      const data = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        console.error("Error enviado por backend:", data);

        throw new Error(
          data.detalle ||
            data.error ||
            data.mensaje ||
            "Error al guardar el usuario",
        );
      }

      alert(
        esEdicion
          ? "Usuario actualizado correctamente"
          : "Usuario creado correctamente",
      );

      setMostrarFormulario(false);
      limpiarFormulario();
      cargarTodo();
    } catch (err) {
      console.error("Error al guardar usuario:", err);

      alert(err.message || "Error al procesar el usuario");
    }
  }

  async function eliminarUsuario(id) {
    const confirmar = window.confirm(
      "¿Seguro que quieres eliminar este usuario?",
    );

    if (!confirmar) return;

    try {
      const respuesta = await fetch(`${URL_USUARIOS}/${id}`, {
        method: "DELETE",
      });

      const data = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        throw new Error(
          data.detalle ||
            data.error ||
            data.mensaje ||
            "Error al eliminar el usuario",
        );
      }

      alert("Usuario eliminado correctamente");

      cargarTodo();
    } catch (err) {
      console.error("Error al eliminar usuario:", err);

      alert(err.message || "Error al eliminar el usuario");
    }
  }

  const usuariosFiltrados = usuarios.filter((usuario) => {
    const texto = busqueda.toLowerCase();

    const nombreCompleto = [
      usuario.primer_nombre,
      usuario.segundo_nombre,
      usuario.primer_apellido,
      usuario.segundo_apellido,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const documento = usuario.numero_documento
      ? String(usuario.numero_documento).toLowerCase()
      : "";

    const correoUsuario = usuario.correo ? usuario.correo.toLowerCase() : "";
    const coincideTexto =
      nombreCompleto.includes(texto) ||
      documento.includes(texto) ||
      correoUsuario.includes(texto);
    const rolUsuario = obtenerNombreRol(usuario);
    const coincideRol = filtroRol === "Todos" || rolUsuario === filtroRol;
    return coincideTexto && coincideRol;
  });

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h3 className="mb-0">Usuarios</h3>
          <p className="text-muted mb-0">
            Consulta, agrega, edita y elimina usuarios del sistema
          </p>
        </div>

        <button className="btn btn-primary" onClick={abrirFormularioNuevo}>
          + Nuevo usuario
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row mb-3 g-2">
        <div className="col-md-8">
          <input
            type="text"
            className="form-control"
            placeholder="Buscar por nombre, documento o correo"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className="col-md-4">
          <select
            className="form-select"
            value={filtroRol}
            onChange={(e) => setFiltroRol(e.target.value)}
          >
            <option value="Todos">Todos los roles</option>

            {autorizaciones.map((autorizacion) => (
              <option key={autorizacion.id} value={autorizacion.nombre}>
                {autorizacion.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {mostrarFormulario && (
        <div className="card mb-4">
          <div className="card-body">
            <h5 className="card-title mb-4">
              {usuarioEditando ? "Editar usuario" : "Nuevo usuario"}
            </h5>

            <form onSubmit={guardarUsuario}>

              <div className="row">
                <div className="col-md-4 mb-3">
                  <label className="form-label">Tipo de documento *</label>

                  <select
                    className="form-select"
                    value={idTipoDocumento}
                    onChange={(e) => setIdTipoDocumento(e.target.value)}
                    required
                  >
                    <option value="">Seleccionar</option>

                    {tiposDocumento.map((tipo) => (
                      <option key={tipo.id} value={tipo.id}>
                        {tipo.sigla} - {tipo.nombre_documento}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-8 mb-3">
                  <label className="form-label">Número de documento *</label>

                  <input
                    type="text"
                    className="form-control"
                    value={numeroDocumento}
                    onChange={(e) => setNumeroDocumento(e.target.value.replace(/\D/g, ""))}
                    placeholder="Ej: 1070806661"
                    required
                  />
                </div>
              </div>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Primer nombre *</label>

                  <input
                    type="text"
                    className="form-control"
                    value={primerNombre}
                    onChange={(e) => setPrimerNombre(e.target.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúñÑ\s]/g, ""))}
                    required
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">Segundo nombre</label>

                  <input
                    type="text"
                    className="form-control"
                    value={segundoNombre}
                    onChange={(e) => setSegundoNombre(e.target.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúñÑ\s]/g, ""))}
                  />
                </div>
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Primer apellido *</label>

                  <input
                    type="text"
                    className="form-control"
                    value={primerApellido}
                    onChange={(e) => setPrimerApellido(e.target.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúñÑ\s]/g, ""))}
                    required
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">Segundo apellido</label>

                  <input
                    type="text"
                    className="form-control"
                    value={segundoApellido}
                    onChange={(e) => setSegundoApellido(e.target.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúñÑ\s]/g, ""))}
                  />
                </div>
              </div>
              <div className="row">
                <div className="col-md-4 mb-3">
                  <label className="form-label">Fecha de nacimiento *</label>

                  <input
                    type="date"
                    className="form-control"
                    value={fechaNacimiento}
                    onChange={(e) => setFechaNacimiento(e.target.value)}
                    required
                  />
                </div>

                <div className="col-md-4 mb-3">
                  <label className="form-label">Género</label>

                  <select
                    className="form-select"
                    value={genero}
                    onChange={(e) => setGenero(e.target.value)}
                  >
                    <option value="">Seleccionar</option>
                    <option value="Femenino">Femenino</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                <div className="col-md-4 mb-3">
                  <label className="form-label">Teléfono</label>

                  <input
                    type="text"
                    className="form-control"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ""))}
                    placeholder="Ej: 3015694853"
                    
                  />
                </div>
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Correo</label>

                  <input
                    type="email"
                    className="form-control"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    placeholder="Ej: nombre@gmail.com"
                    required
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">Autorización *</label>

                  <select
                    className="form-select"
                    value={idAutorizacion}
                    onChange={(e) => setIdAutorizacion(e.target.value)}
                    required
                  >
                    <option value="">Seleccionar autorización</option>

                    {autorizaciones.map((autorizacion) => (
                      <option key={autorizacion.id} value={autorizacion.id}>
                        {autorizacion.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <h6 className="mt-3 mb-3">Datos de acceso</h6>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">
                    Contraseña {!usuarioEditando && "*"}
                  </label>

                  <input
                    type="password"
                    className="form-control"
                    value={contrasenia}
                    onChange={(e) => setContrasenia(e.target.value)}
                    placeholder={
                      usuarioEditando
                        ? "Dejar vacío para no cambiar"
                        : "Contraseña"
                    }
                    required={!usuarioEditando}
                  />
                </div>

                <div className="col-md-3 mb-3">
                  <label className="form-label">Idioma</label>

                  <select
                    className="form-select"
                    value={idioma}
                    onChange={(e) => setIdioma(e.target.value)}
                  >
                    <option value="es">Español</option>

                    <option value="en">Inglés</option>
                  </select>
                </div>

                <div className="col-md-3 mb-3">
                  <label className="form-label">Estado</label>

                  <select
                    className="form-select"
                    value={estado ? "Activo" : "Inactivo"}
                    onChange={(e) => setEstado(e.target.value === "Activo")}
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>
              </div>


              <div className="d-flex gap-2 mt-3">
                <button type="submit" className="btn btn-primary">
                  Guardar
                </button>

                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setMostrarFormulario(false);

                    limpiarFormulario();
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {cargando ? (
        <p className="text-muted">Cargando usuarios...</p>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th>Documento</th>
                  <th>Nombre completo</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Estado</th>

                  <th className="text-end">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {usuariosFiltrados.map((usuario) => (
                  <tr key={usuario.id}>
                    <td>
                      {usuario.sigla} {usuario.numero_documento}
                    </td>

                    <td>
                      {[
                        usuario.primer_nombre,
                        usuario.segundo_nombre,
                        usuario.primer_apellido,
                        usuario.segundo_apellido,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    </td>

                    <td>{usuario.correo || "-"}</td>

                    <td>{obtenerNombreRol(usuario)}</td>

                    <td>
                      <span
                        className={
                          usuario.activar_usuario
                            ? "badge text-bg-success"
                            : "badge text-bg-danger"
                        }
                      >
                        {usuario.activar_usuario ? "Activo" : "Inactivo"}
                      </span>
                    </td>

                    <td className="text-end">
                      <button
                        className="btn btn-sm btn-outline-secondary me-2"
                        onClick={() => abrirFormularioEditar(usuario)}
                      >
                         🖋️
                      </button>

                      <button
                        className="btn btn-sm btn-outline-danger me-2"
                        onClick={() => eliminarUsuario(usuario.id)}
                      >
                         🗑️
                      </button>
                    </td>
                  </tr>
                ))}

                {usuariosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center text-muted py-3">
                      No se encontraron usuarios
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="text-muted">
            {usuariosFiltrados.length} usuario(s) encontrados
          </p>
        </>
      )}
    </div>
  );
};

export default Usuarios;
