import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// NUEVO: ventana emergente para el formulario de editar cliente
import { Modal } from "react-bootstrap";
import { apiFetch } from "../../config/api";

// NUEVO: valores iniciales del formulario de edición
const formularioEdicion = {
  id_tipo_documento: "",
  numero_documento: "",
  primer_nombre: "",
  segundo_nombre: "",
  primer_apellido: "",
  segundo_apellido: "",
  fecha_nacimiento: "",
  genero: "",
  correo: "",
  telefono: "",
};

// NUEVO: solo letras, espacios y tildes (para nombres y apellidos)
const soloLetras = (valor) => valor.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]/g, "");

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

  // NUEVO: mensaje de éxito (al editar o eliminar un cliente)
  const [exito, setExito] = useState(null);
  // NUEVO: total de clientes que coinciden con la búsqueda (para avisar si hay más de los que se ven)
  const [totalItems, setTotalItems] = useState(0);
  // NUEVO: última búsqueda realizada, para refrescar la lista después de editar o eliminar
  const [terminoActivo, setTerminoActivo] = useState("");
  // NUEVO: tipos de documento para el <select> del formulario de edición
  const [tiposDocumento, setTiposDocumento] = useState([]);
  // NUEVO: modal de edición (visible o no, id del cliente que se edita y sus datos)
  const [showModal, setShowModal] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [formData, setFormData] = useState(formularioEdicion);
  const [guardando, setGuardando] = useState(false);

  // NUEVO: trae los clientes del backend para el término indicado.
  // Se usa al buscar, al abrir la pantalla y al refrescar la lista.
  const cargarClientes = async (termino) => {
    setCargando(true);
    setError(null);

    try {
      // El backend busca por documento, nombre, apellido o correo con "search"
      const data = await apiFetch(
        `/clientes?search=${encodeURIComponent(termino)}&limit=10`
      );

      setClientes(data.clientes || []);
      setTotalItems(data.pagination?.totalItems || 0);
    } catch (err) {
      setError(err.message);
      setClientes([]);
    } finally {
      setCargando(false);
    }
  };

  // NUEVO: al abrir la pantalla se muestra el listado de clientes registrados
  // y se cargan los tipos de documento para el formulario de edición
  useEffect(() => {
    cargarClientes("");

    apiFetch("/administrador/tipos-documento")
      .then((data) => setTiposDocumento(data || []))
      .catch((err) => {
        setError(
          "No se pudieron cargar los tipos de documento: " + err.message
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Envía la búsqueda al backend (por documento, nombre, apellido o correo)
  const manejarBusqueda = async (e) => {
    e.preventDefault();
    setExito(null);
    setBuscado(true);
    setTerminoActivo(busqueda);

    await cargarClientes(busqueda);
  };

  // Guarda el cliente elegido y navega a la pantalla de confirmar venta
  const seleccionarCliente = (cliente) => {
    // Guardamos el cliente elegido para usarlo en Confirmar Venta
    sessionStorage.setItem("clienteSeleccionado", JSON.stringify(cliente));
    navigate("/caja/confirmar-venta");
  };

  // NUEVO: lleva a la agenda de consultas con el cliente ya seleccionado
  const agendarConsulta = (cliente) => {
    navigate("/caja/agendar-consulta", {
      state: { id_cliente: cliente.id_cliente },
    });
  };

  // NUEVO: abre el modal de edición precargado con los datos del cliente
  const abrirEdicion = (cliente) => {
    setEditingCliente(cliente.id_cliente);

    setFormData({
      id_tipo_documento: cliente.id_tipo_documento
        ? String(cliente.id_tipo_documento)
        : "",
      numero_documento: cliente.numero_documento || "",
      primer_nombre: cliente.primer_nombre || "",
      segundo_nombre: cliente.segundo_nombre || "",
      primer_apellido: cliente.primer_apellido || "",
      segundo_apellido: cliente.segundo_apellido || "",
      // El input type="date" solo necesita "YYYY-MM-DD"
      fecha_nacimiento: cliente.fecha_nacimiento
        ? String(cliente.fecha_nacimiento).substring(0, 10)
        : "",
      genero: cliente.genero || "",
      correo: cliente.correo || "",
      telefono: cliente.telefono || "",
    });

    setError(null);
    setExito(null);
    setShowModal(true);
  };

  // NUEVO: actualiza un campo del formulario de edición
  const cambiarCampo = (nombre, valor) => {
    setFormData((prev) => ({
      ...prev,
      [nombre]: valor,
    }));
  };

  // NUEVO: guarda los cambios del cliente editado
  const guardarEdicion = async (e) => {
    // Deja que el navegador valide los campos "required" primero
    if (!e.target.checkValidity()) {
      e.preventDefault();
      e.target.reportValidity();
      return;
    }

    e.preventDefault();
    setError(null);
    setGuardando(true);

    try {
      const data = await apiFetch(`/clientes/${editingCliente}`, {
        method: "PUT",
        body: JSON.stringify({
          ...formData,
          id_tipo_documento: parseInt(formData.id_tipo_documento, 10),
        }),
      });

      setExito(data?.mensaje || "Cliente actualizado exitosamente");
      setShowModal(false);

      // Se refresca la lista con la última búsqueda para ver los datos guardados
      await cargarClientes(terminoActivo);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  // NUEVO: elimina un cliente (el backend lo rechaza si tiene ventas,
  // consultas agendadas o historia clínica asociadas)
  const eliminarCliente = async (cliente) => {
    const nombre = `${cliente.primer_nombre} ${cliente.primer_apellido}`;

    // Ventana de confirmación nativa del navegador antes de borrar
    if (!window.confirm(`¿Está seguro de eliminar al cliente ${nombre}?`)) {
      return;
    }

    setError(null);
    setExito(null);

    try {
      const data = await apiFetch(`/clientes/${cliente.id_cliente}`, {
        method: "DELETE",
      });

      setExito(data?.mensaje || "Cliente eliminado exitosamente");

      // Se refresca la lista con la última búsqueda
      await cargarClientes(terminoActivo);
    } catch (err) {
      setError(err.message);
    }
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

         <button
            className="btn btn-primary btn-success"
            onClick={() => navigate("/caja/registrar-datos-cliente")}
          >
            Registrar
          </button>
      </form>


      {/* Alerta de error de la búsqueda */}
      {error && <div className="alert alert-danger">{error}</div>}

      {/* NUEVO: alerta de éxito al editar o eliminar */}
      {exito && <div className="alert alert-success">{exito}</div>}

      {/* Mensaje cuando la búsqueda no encontró resultados, con atajo para registrar un cliente nuevo */}
      {buscado && !cargando && clientes.length === 0 && !error && (
        <div className="alert alert-warning d-flex justify-content-between align-items-center">
          <span>No se encontraron clientes con ese criterio.</span>
          <button
            className="btn btn-sm btn-success"
            onClick={() => navigate("/caja/registrar-datos-cliente")}
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
                <th> Tipo documento</th>
                <th>Documento</th>
                <th>Nombre completo</th>
                <th>Correo</th>
                <th>Teléfono</th>
                <th>Fecha de Registro</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {/* Una fila por cada cliente encontrado */}
              {clientes.map((c) => (
                <tr key={c.id_cliente}>
                  <td>{c.sigla} </td>
                  <td>
                    {c.numero_documento}</td>
                  <td>
                    {c.primer_nombre} {c.segundo_nombre || ""}{" "}
                    {c.primer_apellido} {c.segundo_apellido || ""}
                  </td>
                  <td>{c.correo || "-"}</td>
                  <td>{c.telefono || "-"}</td>
                  <td>{c.fecha_registro?.substring(0, 10) || "-"}</td>
                  <td className="text-nowrap">
                    {/* Botón para elegir este cliente y continuar con la venta */}
                    <button
                      className="btn btn-sm btn-info me-2"
                      onClick={() => seleccionarCliente(c)}
                    >
                      Vender
                    </button>

                    {/* NUEVO: agendar una consulta para este cliente */}
                    <button
                      className="btn btn-sm btn-info me-1"
                      onClick={() => agendarConsulta(c)}
                    >
                      Agendar
                    </button>

                    {/* NUEVO: editar los datos del cliente */}
                    <button
                      className="btn btn-sm btn-warning me-1"
                      onClick={() => abrirEdicion(c)}
                      title="Editar"
                    >
                      ✏️
                    </button>

                    {/* NUEVO: eliminar el cliente */}
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => eliminarCliente(c)}
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* NUEVO: aviso cuando hay más clientes de los que se muestran */}
      {totalItems > clientes.length && (
        <p className="text-muted small mt-2">
          Mostrando {clientes.length} de {totalItems} clientes. Usa el
          buscador para encontrar otros.
        </p>
      )}

      {/* NUEVO: modal con el formulario de edición del cliente */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Editar Cliente</Modal.Title>
        </Modal.Header>

        <form onSubmit={guardarEdicion}>
          <Modal.Body>
            {/* Tipo de documento y número */}
            <div className="row g-2 mb-2">
              <div className="col-md-4">
                <label className="form-label small">Tipo doc. *</label>

                <select
                  className="form-select"
                  value={formData.id_tipo_documento}
                  onChange={(e) =>
                    cambiarCampo("id_tipo_documento", e.target.value)
                  }
                  required
                >
                  <option value="" disabled hidden>
                    Seleccione...
                  </option>

                  {tiposDocumento.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.sigla} — {t.nombre_documento}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-8">
                <label className="form-label small">
                  Número de documento *
                </label>

                <input
                  className="form-control"
                  value={formData.numero_documento}
                  onChange={(e) =>
                    cambiarCampo(
                      "numero_documento",
                      e.target.value.replace(/\D/g, "")
                    )
                  }
                  maxLength="20"
                  required
                />
              </div>
            </div>

            {/* Nombres */}
            <div className="row g-2 mb-2">
              <div className="col-md-6">
                <label className="form-label small">Primer nombre *</label>

                <input
                  className="form-control"
                  value={formData.primer_nombre}
                  onChange={(e) =>
                    cambiarCampo("primer_nombre", soloLetras(e.target.value))
                  }
                  required
                />
              </div>

              <div className="col-md-6">
                <label className="form-label small">Segundo nombre</label>

                <input
                  className="form-control"
                  value={formData.segundo_nombre}
                  onChange={(e) =>
                    cambiarCampo("segundo_nombre", soloLetras(e.target.value))
                  }
                />
              </div>
            </div>

            {/* Apellidos */}
            <div className="row g-2 mb-2">
              <div className="col-md-6">
                <label className="form-label small">Primer apellido *</label>

                <input
                  className="form-control"
                  value={formData.primer_apellido}
                  onChange={(e) =>
                    cambiarCampo("primer_apellido", soloLetras(e.target.value))
                  }
                  required
                />
              </div>

              <div className="col-md-6">
                <label className="form-label small">Segundo apellido</label>

                <input
                  className="form-control"
                  value={formData.segundo_apellido}
                  onChange={(e) =>
                    cambiarCampo(
                      "segundo_apellido",
                      soloLetras(e.target.value)
                    )
                  }
                />
              </div>
            </div>

            {/* Fecha de nacimiento y género */}
            <div className="row g-2 mb-2">
              <div className="col-md-6">
                <label className="form-label small">
                  Fecha de nacimiento *
                </label>

                <input
                  type="date"
                  className="form-control"
                  value={formData.fecha_nacimiento}
                  onChange={(e) =>
                    cambiarCampo("fecha_nacimiento", e.target.value)
                  }
                  required
                />
              </div>

              <div className="col-md-6">
                <label className="form-label small">Género</label>

                <select
                  className="form-select"
                  value={formData.genero}
                  onChange={(e) => cambiarCampo("genero", e.target.value)}
                >
                  <option value="">Seleccionar...</option>
                  <option value="Femenino">Femenino</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
            </div>

            {/* Correo y teléfono */}
            <div className="row g-2">
              <div className="col-md-6">
                <label className="form-label small">Correo</label>

                <input
                  type="email"
                  className="form-control"
                  value={formData.correo}
                  onChange={(e) => cambiarCampo("correo", e.target.value)}
                />
              </div>

              <div className="col-md-6">
                <label className="form-label small">Teléfono</label>

                <input
                  className="form-control"
                  value={formData.telefono}
                  onChange={(e) =>
                    cambiarCampo("telefono", e.target.value.replace(/\D/g, ""))
                  }
                />
              </div>
            </div>
          </Modal.Body>

          <Modal.Footer>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowModal(false)}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={guardando}
            >
              {guardando ? "Guardando..." : "Actualizar"}
            </button>
          </Modal.Footer>
        </form>
      </Modal>
    </div>
  );
}