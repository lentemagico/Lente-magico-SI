// Importamos React y tres hooks:
// 1. useState: para manejar estado local del componente
// 2. useEffect: para ejecutar efectos secundarios (side effects) como llamadas a la API
// 3. useCallback: para memorizar (cachear) una función y que no se recree en cada render
import React, { useState, useEffect, useCallback } from "react";

// Importamos componentes ya armados de la librería react-bootstrap,
import {
  Modal, // Ventana para el formulario de crear/editar
  Button, // Botón
  Form, // Formulario y sus controles
  Table, // Tabla
  Pagination, // botones de páginas
  Alert, // Mensaje de alerta de error o éxito
  InputGroup, // Agrupa un input con un ícono o texto pegado al lado
} from "react-bootstrap";

// URL base del backend (API) a la que se le harán las peticiones (fetch).
// Al ser "localhost:5000" solo funciona en desarrollo local.
const API_URL = "http://localhost:5000/api/agendar-consulta";

// Objeto que define cómo se ve un formulario "vacío" o recién iniciado.
// Se usa como valor inicial del estado del formulario y también para
// resetearlo cuando se abre el modal de "Nueva Consulta".
const formularioInicial = {
  primer_nombre: "",
  segundo_nombre: "",
  primer_apellido: "",
  segundo_apellido: "",
  id_tipo_documento: "",
  numero_documento: "",
  fecha_nacimiento: "",
  motivo: "",
  fecha_hora: "",
  estado: "Pendiente", // Por defecto, toda consulta nueva nace en estado "Pendiente"
};

// Componente funcional principal. Es un "componente de página" que
// contiene toda la lógica de listar, buscar, crear, editar y eliminar consultas.
const AgendarConsulta = () => {
  // ============================================================
  // ESTADOS
  // ============================================================
  // (Cada "useState" crea una variable de estado + su función para actualizarla)

  // Lista de consultas que se muestran actualmente en la tabla (la "página" actual)
  const [consultas, setConsultas] = useState([]);

  // Bandera para saber si se está cargando información desde la API
  // (se usa para mostrar el spinner de "Cargando...")
  const [loading, setLoading] = useState(false);

  // Guarda el mensaje de error a mostrar (o null si no hay error)
  const [error, setError] = useState(null);

  // Guarda el mensaje de éxito a mostrar (o null si no hay mensaje)
  const [success, setSuccess] = useState(null);

  // Objeto que agrupa toda la información de paginación que llega del backend
  const [pagination, setPagination] = useState({
    currentPage: 1, // página en la que estamos actualmente
    totalPages: 1, // cuántas páginas hay en total
    totalItems: 0, // cuántos registros hay en total (todas las páginas)
    limit: 5, // cuántos registros se muestran por página
  });

  // Texto que el usuario escribe en el input de búsqueda (se actualiza en cada tecla)
  const [searchTerm, setSearchTerm] = useState("");

  // Texto de búsqueda "con retraso" (debounce): solo se actualiza 500ms
  // después de que el usuario deja de escribir, para no llamar a la API en cada tecla
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Controla si el modal (ventana emergente) de crear/editar está visible o no
  const [showModal, setShowModal] = useState(false);

  // IMPORTANTE:
  // Aquí guardamos id_agenda, NO numero_documento
  // Si es null => estamos creando una consulta nueva
  // Si tiene un valor => estamos editando la consulta con ese id
  const [editingConsulta, setEditingConsulta] = useState(null);

  // Estado que contiene los valores actuales de todos los campos del formulario
  const [formData, setFormData] = useState(formularioInicial);

  // Controla si el formulario ya fue "validado" por Bootstrap
  // (para mostrar los mensajes de error de cada campo tipo "El nombre es requerido")
  const [validated, setValidated] = useState(false);

  // ============================================================
  // DEBOUNCE DE BÚSQUEDA
  // ============================================================
  // Este efecto se ejecuta cada vez que "searchTerm" cambia (el usuario escribe)
  useEffect(() => {
    // Se crea un temporizador que, después de 500ms, copia searchTerm en debouncedSearch
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);

    // Función de "limpieza": si searchTerm vuelve a cambiar antes de que pasen
    // los 500ms, se cancela el temporizador anterior para no disparar la búsqueda
    // con texto viejo. Esto es lo que logra el efecto "debounce".
    return () => clearTimeout(timer);
  }, [searchTerm]); // se re-ejecuta cada vez que cambia searchTerm

  // ============================================================
  // CARGAR CONSULTAS
  // ============================================================
  // useCallback memoriza esta función para que no se recree en cada render,
  // solo cuando cambie "debouncedSearch" (su única dependencia)
  const loadConsultas = useCallback(
    async (page = 1) => {
      // recibe la página a consultar, por defecto la 1
      setLoading(true); // activa el spinner
      setError(null); // limpia cualquier error previo

      try {
        // Llamada a la API pidiendo la página, el límite fijo de 5 por página,
        // y el término de búsqueda (ya "debounced"), codificado para la URL
        const response = await fetch(
          `${API_URL}?page=${page}&limit=5&search=${encodeURIComponent(
            debouncedSearch,
          )}`,
        );

        // Si la respuesta HTTP no fue exitosa (status fuera del rango 200-299)
        if (!response.ok) {
          throw new Error("Error al cargar consultas");
        }

        // Convertimos la respuesta a JSON
        const data = await response.json();

        // Guardamos las consultas recibidas (o un arreglo vacío si no vino nada)
        setConsultas(data.consultas || []);

        // Si el backend mandó info de paginación, actualizamos el estado de paginación
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } catch (err) {
        // Si algo falla (red, parseo, etc.), guardamos el mensaje de error
        setError(err.message);
      } finally {
        // Pase lo que pase, se apaga el spinner al final
        setLoading(false);
      }
    },
    [debouncedSearch], // la función se vuelve a crear solo si cambia el término de búsqueda
  );

  // ============================================================
  // CARGAR AL INICIAR Y AL BUSCAR
  // ============================================================
  // Cada vez que "loadConsultas" cambie (es decir, cada vez que cambie debouncedSearch),
  // se vuelve a cargar la página 1. Esto también corre una vez al montar el componente.
  useEffect(() => {
    loadConsultas(1);
  }, [loadConsultas]);

  // ============================================================
  // CAMBIAR PÁGINA
  // ============================================================
  // Handler que se llama cuando el usuario hace click en un número de página
  const handlePageChange = (page) => {
    loadConsultas(page);
  };

  // ============================================================
  // BÚSQUEDA
  // ============================================================
  // Handler del input de búsqueda: actualiza searchTerm en cada tecla
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  // ============================================================
  // NUEVA CONSULTA
  // ============================================================
  // Prepara y abre el modal en modo "crear"
  const handleNewConsulta = () => {
    setEditingConsulta(null); // null = no estamos editando, es una consulta nueva
    setFormData(formularioInicial); // resetea el formulario a valores vacíos
    setValidated(false); // quita marcas de validación previas
    setError(null); // limpia errores previos
    setShowModal(true); // muestra el modal
  };

  // ============================================================
  // EDITAR CONSULTA
  // ============================================================
  // Prepara y abre el modal en modo "editar", precargando los datos de la consulta
  const handleEditConsulta = (consulta) => {
    // IMPORTANTE:
    // Usamos id_agenda para el PUT (identificador único de la fila a actualizar)
    setEditingConsulta(consulta.id_agenda);

    // Copiamos los datos de la consulta seleccionada al formulario,
    // usando '' como valor por defecto si algún campo viene vacío/null
    setFormData({
      primer_nombre: consulta.primer_nombre || "",
      segundo_nombre: consulta.segundo_nombre || "",
      primer_apellido: consulta.primer_apellido || "",
      segundo_apellido: consulta.segundo_apellido || "",
      id_tipo_documento: consulta.id_tipo_documento || "",
      numero_documento: consulta.numero_documento || "",
      // La fecha viene en formato completo (con hora), pero el input type="date"
      // solo necesita "YYYY-MM-DD", por eso se recortan los primeros 10 caracteres
      fecha_nacimiento: consulta.fecha_nacimiento
        ? String(consulta.fecha_nacimiento).substring(0, 10)
        : "",
      motivo: consulta.motivo || "",
      // El input type="datetime-local" espera "YYYY-MM-DDTHH:mm",
      // por eso se recortan los primeros 16 caracteres
      fecha_hora: consulta.fecha_hora
        ? String(consulta.fecha_hora).substring(0, 16)
        : "",
      estado: consulta.estado || "Pendiente",
    });

    setValidated(false); // quita marcas de validación previas
    setError(null); // limpia errores previos
    setShowModal(true); // muestra el modal
  };

  // ============================================================
  // CAMBIOS DEL FORMULARIO
  // ============================================================
  // Handler genérico usado por TODOS los campos del formulario.
  // Gracias al atributo "name" de cada input, sabe cuál propiedad actualizar.
  const handleInputChange = (e) => {
    const { name, value } = e.target; // extrae el nombre del campo y su nuevo valor

    setFormData((prev) => ({
      ...prev, // conserva todos los demás campos igual
      [name]: value, // sobreescribe solo el campo que cambió (clave calculada)
    }));
  };

  // ============================================================
  // TIPO DE DOCUMENTO
  // ============================================================
  // Traduce el id numérico del tipo de documento a su abreviatura legible
  const getTipoDocumentoNombre = (id) => {
    const tipos = {
      1: "C.C.", // Cédula de Ciudadanía
      2: "C.E.", // Cédula de Extranjería
      3: "T.I.", // Tarjeta de Identidad
      4: "Pasaporte",
    };

    // Si el id no está en el diccionario, se devuelve el id tal cual (fallback)
    return tipos[id] || id;
  };

  // ============================================================
  // GUARDAR / ACTUALIZAR CONSULTA
  // ============================================================
  // Handler del submit del formulario (se dispara al hacer click en "Guardar"/"Actualizar")
  const handleSaveConsulta = async (e) => {
    e.preventDefault(); // evita que el navegador recargue la página al enviar el form

    const form = e.currentTarget; // referencia al elemento <form> del DOM

    // Validación nativa de HTML5/Bootstrap: revisa los "required" de cada campo
    if (form.checkValidity() === false) {
      e.stopPropagation(); // evita que el evento siga propagándose
      setValidated(true); // activa los mensajes de error visuales en cada campo inválido
      return; // corta la ejecución, no se envía nada a la API
    }

    setValidated(true); // marca el formulario como validado (para estilos de Bootstrap)
    setError(null); // limpia errores previos

    // Se arma el objeto que se enviará al backend, a partir de formData
    const payload = {
      ...formData,
      // Convierte el tipo de documento (string del <select>) a número entero
      id_tipo_documento: parseInt(formData.id_tipo_documento, 10),
      // Los campos opcionales, si están vacíos, se envían como null en vez de ''
      segundo_nombre: formData.segundo_nombre || null,
      segundo_apellido: formData.segundo_apellido || null,
    };

    try {
      // Si estamos editando, la URL incluye el id y se usa PUT;
      // si estamos creando, se usa la URL base con POST
      const url = editingConsulta ? `${API_URL}/${editingConsulta}` : API_URL;

      const method = editingConsulta ? "PUT" : "POST";

      // Se hace la petición HTTP con el método, headers y body correspondientes
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json", // le decimos al backend que mandamos JSON
        },
        body: JSON.stringify(payload), // convertimos el objeto JS a texto JSON
      });

      const data = await response.json(); // parseamos la respuesta del backend

      // Si la respuesta no fue exitosa, lanzamos un error con el mensaje del backend
      // (o uno genérico si el backend no mandó "error")
      if (!response.ok) {
        throw new Error(data.error || "Error al guardar la consulta");
      }

      // Mensaje de éxito distinto según si fue edición o creación
      setSuccess(
        editingConsulta
          ? "Consulta actualizada exitosamente"
          : "Consulta agendada exitosamente",
      );

      setShowModal(false); // cierra el modal

      // Se vuelve a pedir la página actual a la API para refrescar la tabla
      // con los datos reales que quedaron guardados en la base de datos
      loadConsultas(pagination.currentPage);

      // El mensaje de éxito desaparece solo después de 3 segundos
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      setError(err.message); // muestra el error al usuario

      // El mensaje de error desaparece solo después de 5 segundos
      setTimeout(() => {
        setError(null);
      }, 5000);
    }
  };

  // ============================================================
  // ELIMINAR CONSULTA
  // ============================================================
  // Handler para eliminar una consulta, recibe el id_agenda de la fila
  const handleDeleteConsulta = async (idAgenda) => {
    // Chequeo defensivo: si por algún motivo no llega el id, no se continúa
    if (!idAgenda) {
      setError("No se encontró el ID de la consulta");

      setTimeout(() => {
        setError(null);
      }, 5000);

      return;
    }

    // Ventana de confirmación nativa del navegador antes de borrar
    const confirmar = window.confirm("¿Está seguro de eliminar esta consulta?");

    // Si el usuario cancela, no se hace nada más
    if (!confirmar) {
      return;
    }

    try {
      setError(null); // limpia errores previos

      // Petición DELETE al backend, apuntando al id específico
      const response = await fetch(`${API_URL}/${idAgenda}`, {
        method: "DELETE",
      });

      const data = await response.json(); // parseamos la respuesta

      // Si la eliminación falló en el backend, se lanza un error
      if (!response.ok) {
        throw new Error(data.error || "Error al eliminar la consulta");
      }

      // ========================================================
      // QUITAR INMEDIATAMENTE DE LA TABLA
      // ========================================================
      // Actualización "optimista": se quita la fila del estado local
      // al instante, sin esperar a volver a pedir todo a la API,
      // para que la interfaz se sienta más rápida
      setConsultas((prev) =>
        prev.filter((consulta) => consulta.id_agenda !== idAgenda),
      );

      // Se resta 1 al total de items mostrado en el pie de la tabla
      // (nunca deja que baje de 0, por seguridad)
      setPagination((prev) => ({
        ...prev,
        totalItems: Math.max(0, prev.totalItems - 1),
      }));

      // Mensaje de éxito: usa el que mande el backend, o uno por defecto
      setSuccess(data.mensaje || "Consulta eliminada exitosamente");

      // ========================================================
      // VOLVER A CONSULTAR LA BASE DE DATOS
      // ========================================================
      // Además de la actualización optimista, se vuelve a pedir la página
      // actual para asegurarse de que la tabla y la paginación queden
      // exactamente sincronizadas con lo que hay en la base de datos
      loadConsultas(pagination.currentPage);

      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      setError(err.message);

      setTimeout(() => {
        setError(null);
      }, 5000);
    }
  };

  // ============================================================
  // PAGINACIÓN
  // ============================================================
  // Genera dinámicamente un <Pagination.Item> por cada página disponible
  const renderPagination = () => {
    const items = []; // aquí se van acumulando los elementos <Pagination.Item>

    // Recorre desde la página 1 hasta la última página
    for (let number = 1; number <= pagination.totalPages; number++) {
      items.push(
        <Pagination.Item
          key={number} // "key" único requerido por React para listas
          active={number === pagination.currentPage} // resalta la página actual
          onClick={() => handlePageChange(number)} // navega a esa página al hacer click
        >
          {number}
        </Pagination.Item>,
      );
    }

    return items; // arreglo de elementos JSX listo para renderizar
  };

  // ============================================================
  // RENDER
  // ============================================================
  // Todo lo que retorna el componente es lo que realmente se ve en pantalla (JSX)
  return (
    <div className="container-fluid">
      {/* Título principal de la página */}
      <h2 className="mb-4">Gestión de Consultas</h2>

      {/* ======================================================
          ALERTAS
      ====================================================== */}

      {/* Solo se muestra si "error" tiene contenido (renderizado condicional) */}
      {error && (
        <Alert
          variant="danger" // estilo rojo de Bootstrap
          onClose={() => setError(null)} // permite cerrarla manualmente con la "X"
          dismissible // muestra el botón de cerrar
        >
          {error}
        </Alert>
      )}

      {/* Solo se muestra si "success" tiene contenido */}
      {success && (
        <Alert
          variant="success" // estilo verde de Bootstrap
          onClose={() => setSuccess(null)}
          dismissible
        >
          {success}
        </Alert>
      )}

      {/* ======================================================
          BARRA DE HERRAMIENTAS
      ====================================================== */}

      <div className="row mb-3">
        {/* Columna izquierda: input de búsqueda */}
        <div className="col-md-6">
          <InputGroup>
            {/* Ícono de lupa pegado al input */}
            <InputGroup.Text>
              <i className="bi bi-search"></i>
            </InputGroup.Text>

            <Form.Control
              type="text"
              placeholder="Buscar por documento, paciente o motivo..."
              value={searchTerm} // input "controlado" por React
              onChange={handleSearch} // actualiza searchTerm en cada tecla
            />
          </InputGroup>
        </div>

        {/* Columna derecha: botón para abrir el modal de nueva consulta */}
        <div className="col-md-6 text-end">
          <Button variant="primary" onClick={handleNewConsulta}>
            <i className="bi bi-plus-circle me-2"></i>
            Nueva Consulta
          </Button>
        </div>
      </div>

      {/* ======================================================
          TABLA
      ====================================================== */}

      <Table
        striped // filas con colores alternados
        bordered // bordes visibles en celdas
        hover // resalta la fila al pasar el mouse
        responsive // permite scroll horizontal en pantallas pequeñas
      >
        <thead className="table-dark">
          <tr>
            <th>Documento</th>
            <th>Tipo Doc.</th>
            <th>Paciente</th>
            <th>F. Nacimiento</th>
            <th>Motivo</th>
            <th>Fecha y Hora</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {/* Renderizado condicional de 3 escenarios distintos: */}
          {loading ? (
            // 1) Mientras está cargando: fila única con spinner centrado
            <tr>
              <td
                colSpan="8" // ocupa las 8 columnas de la tabla
                className="text-center"
              >
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Cargando...</span>
                </div>
              </td>
            </tr>
          ) : consultas.length === 0 ? (
            // 2) Si ya cargó pero no hay resultados: mensaje de "vacío"
            <tr>
              <td colSpan="8" className="text-center">
                No se encontraron consultas
              </td>
            </tr>
          ) : (
            // 3) Caso normal: se recorre el arreglo "consultas" y se dibuja una fila por cada una
            consultas.map((consulta) => (
              <tr
                key={consulta.id_agenda} // key única requerida por React
              >
                {/* Columna: número de documento */}
                <td>{consulta.numero_documento}</td>

                {/* Columna: tipo de documento traducido a abreviatura */}
                <td>{getTipoDocumentoNombre(consulta.id_tipo_documento)}</td>

                {/* Columna: nombre completo del paciente,
                    concatenando los 4 campos y limpiando espacios extra
                    (por si algún nombre intermedio viene vacío) */}
                <td>
                  {`${consulta.primer_nombre || ""} ${
                    consulta.segundo_nombre || ""
                  } ${consulta.primer_apellido || ""} ${
                    consulta.segundo_apellido || ""
                  }`
                    .replace(/\s+/g, " ")
                    .trim()}
                </td>

                {/* Columna: fecha de nacimiento formateada al formato local,
                    o "-" si no hay fecha */}
                <td>
                  {consulta.fecha_nacimiento
                    ? new Date(consulta.fecha_nacimiento).toLocaleDateString()
                    : "-"}
                </td>

                {/* Columna: motivo de la consulta, tal cual */}
                <td>{consulta.motivo}</td>

                {/* Columna: fecha y hora de la consulta formateadas,
                    o "-" si no hay valor */}
                <td>
                  {consulta.fecha_hora
                    ? new Date(consulta.fecha_hora).toLocaleString()
                    : "-"}
                </td>

                {/* Columna: estado como una "badge" (etiqueta) de color,
                    verde si está Completada, roja si Cancelada,
                    amarilla (warning) para cualquier otro caso (ej. Pendiente) */}
                <td>
                  <span
                    className={`badge bg-${
                      consulta.estado === "Completada"
                        ? "success"
                        : consulta.estado === "Cancelada"
                          ? "danger"
                          : "warning"
                    }`}
                  >
                    {consulta.estado || "Pendiente"}
                  </span>
                </td>

                {/* Columna: botones de acciones (editar / eliminar) */}
                <td>
                  {/* EDITAR: abre el modal precargado con los datos de esta fila */}
                  <Button
                    variant="warning"
                    size="sm"
                    className="me-2" // margen a la derecha para separarlo del botón eliminar
                    onClick={() => handleEditConsulta(consulta)}
                    title="Editar" // texto que aparece al pasar el mouse (tooltip nativo)
                  >
                    <i className="bi bi-pencil me-1"></i>
                    ✏️
                  </Button>

                  {/* ELIMINAR: pide confirmación y borra la fila */}
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDeleteConsulta(consulta.id_agenda)}
                    title="Eliminar"
                  >
                    <i className="bi bi-trash me-1"></i>
                    🗑️
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      {/* ======================================================
          PAGINACIÓN
      ====================================================== */}

      {/* Solo se muestra el bloque de paginación si hay más de 1 página */}
      {pagination.totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center">
          {/* Texto informativo: cuántos registros se ven de cuántos hay en total */}
          <div>
            Mostrando {consultas.length} de {pagination.totalItems} consultas
          </div>

          <Pagination>
            {/* Botón "ir a la primera página" */}
            <Pagination.First
              onClick={() => handlePageChange(1)}
              disabled={
                pagination.currentPage === 1 // deshabilitado si ya estamos en la página 1
              }
            />

            {/* Botón "página anterior" */}
            <Pagination.Prev
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={
                !pagination.hasPrevPage // deshabilitado si el backend indica que no hay anterior
              }
            />

            {/* Números de página generados dinámicamente */}
            {renderPagination()}

            {/* Botón "página siguiente" */}
            <Pagination.Next
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={
                !pagination.hasNextPage // deshabilitado si el backend indica que no hay siguiente
              }
            />

            {/* Botón "ir a la última página" */}
            <Pagination.Last
              onClick={() => handlePageChange(pagination.totalPages)}
              disabled={
                pagination.currentPage === pagination.totalPages // deshabilitado si ya estamos en la última
              }
            />
          </Pagination>
        </div>
      )}

      {/* ======================================================
          MODAL (formulario de crear/editar consulta)
      ====================================================== */}

      <Modal
        show={showModal} // visible u oculto según el estado
        onHide={() => setShowModal(false)} // se cierra al hacer click fuera o en la "X"
        size="lg" // tamaño grande del modal
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {/* Título dinámico: cambia según si se está editando o creando */}
            {editingConsulta ? "Editar Consulta" : "Nueva Consulta"}
          </Modal.Title>
        </Modal.Header>

        {/* El <Form> envuelve TODO el contenido del modal (body + footer)
            porque el botón "submit" está dentro del footer */}
        <Form
          noValidate // desactiva la validación nativa del navegador
          validated={validated} // le dice a Bootstrap si debe mostrar estilos de validación
          onSubmit={handleSaveConsulta} // se ejecuta al enviar el formulario
        >
          <Modal.Body>
            <div className="row">
              {/* PRIMER NOMBRE (obligatorio) */}
              <div className="col-md-6 mb-3">
                <Form.Group>
                  <Form.Label>Primer Nombre *</Form.Label>

                  {/* PRIMER NOMBRE */}
                  <Form.Control
                    type="text"
                    name="primer_nombre"
                    value={formData.primer_nombre}
                    onChange={(e) =>
                      handleInputChange({
                        target: {
                          name: "primer_nombre",
                          value: e.target.value.replace(
                            /[^A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]/g,
                            "",
                          ),
                        },
                      })
                    }
                    required
                    placeholder="Primer nombre del paciente"
                  />

                  {/* Mensaje que aparece solo si el campo es inválido y ya se validó el form */}
                  <Form.Control.Feedback type="invalid">
                    El primer nombre es requerido
                  </Form.Control.Feedback>
                </Form.Group>
              </div>

              {/* SEGUNDO NOMBRE (opcional, sin "required") */}
              <div className="col-md-6 mb-3">
                <Form.Group>
                  <Form.Label>Segundo Nombre</Form.Label>

                  {/* SEGUNDO NOMBRE */}
                  <Form.Control
                    type="text"
                    name="segundo_nombre"
                    value={formData.segundo_nombre}
                    onChange={(e) =>
                      handleInputChange({
                        target: {
                          name: "segundo_nombre",
                          value: e.target.value.replace(
                            /[^A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]/g,
                            "",
                          ),
                        },
                      })
                    }
                    placeholder="Segundo nombre (opcional)"
                  />
                </Form.Group>
              </div>

              {/* PRIMER APELLIDO (obligatorio) */}
              <div className="col-md-6 mb-3">
                <Form.Group>
                  <Form.Label>Primer Apellido *</Form.Label>

                  {/* PRIMER APELLIDO */}
                  <Form.Control
                    type="text"
                    name="primer_apellido"
                    value={formData.primer_apellido}
                    onChange={(e) =>
                      handleInputChange({
                        target: {
                          name: "primer_apellido",
                          value: e.target.value.replace(
                            /[^A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]/g,
                            "",
                          ),
                        },
                      })
                    }
                    required
                    placeholder="Primer apellido del paciente"
                  />

                  <Form.Control.Feedback type="invalid">
                    El primer apellido es requerido
                  </Form.Control.Feedback>
                </Form.Group>
              </div>

              {/* SEGUNDO APELLIDO (opcional) */}
              <div className="col-md-6 mb-3">
                <Form.Group>
                  <Form.Label>Segundo Apellido</Form.Label>

                  {/* SEGUNDO APELLIDO */}
                  <Form.Control
                    type="text"
                    name="segundo_apellido"
                    value={formData.segundo_apellido}
                    onChange={(e) =>
                      handleInputChange({
                        target: {
                          name: "segundo_apellido",
                          value: e.target.value.replace(
                            /[^A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]/g,
                            "",
                          ),
                        },
                      })
                    }
                    placeholder="Segundo apellido (opcional)"
                  />
                </Form.Group>
              </div>

              {/* TIPO DE DOCUMENTO (obligatorio, es un <select>) */}
              <div className="col-md-6 mb-3">
                <Form.Group>
                  <Form.Label>Tipo Documento *</Form.Label>

                  <Form.Select
                    name="id_tipo_documento"
                    value={formData.id_tipo_documento}
                    onChange={handleInputChange}
                    required
                  >
                    {/* Opción "placeholder": no seleccionable directamente,
                        disabled evita elegirla, hidden la oculta de la lista desplegable */}
                    <option value="" disabled hidden>
                      Seleccione un tipo
                    </option>

                    <option value="1">Cédula de Ciudadanía (C.C.)</option>

                    <option value="2">Cédula de Extranjería (C.E.)</option>

                    <option value="3">Tarjeta de Identidad (T.I.)</option>

                    <option value="4">Pasaporte</option>
                  </Form.Select>

                  <Form.Control.Feedback type="invalid">
                    El tipo de documento es requerido
                  </Form.Control.Feedback>
                </Form.Group>
              </div>

              {/* NÚMERO DE DOCUMENTO (obligatorio) */}
              <div className="col-md-6 mb-3">
                <Form.Group>
                  <Form.Label>Número de Documento *</Form.Label>

                  <Form.Control
                    type="text"
                    name="numero_documento"
                    value={formData.numero_documento}
                    onChange={(e) =>
                      handleInputChange({
                        target: {
                          name: "numero_documento",
                          value: e.target.value.replace(/\D/g, ""),
                        },
                      })
                    }
                    required
                    disabled={editingConsulta !== null}
                    placeholder="Número de documento"
                    maxLength="20"
                  />

                  <Form.Control.Feedback type="invalid">
                    El número de documento es requerido
                  </Form.Control.Feedback>
                </Form.Group>
              </div>

              {/* FECHA DE NACIMIENTO (obligatorio, selector de fecha) */}
              <div className="col-md-6 mb-3">
                <Form.Group>
                  <Form.Label>Fecha de Nacimiento *</Form.Label>

                  <Form.Control
                    type="date" // muestra el selector de calendario nativo del navegador
                    name="fecha_nacimiento"
                    value={formData.fecha_nacimiento}
                    onChange={handleInputChange}
                    required
                  />

                  <Form.Control.Feedback type="invalid">
                    La fecha de nacimiento es requerida
                  </Form.Control.Feedback>
                </Form.Group>
              </div>

              {/* FECHA Y HORA DE LA CONSULTA (obligatorio, fecha + hora) */}
              <div className="col-md-6 mb-3">
                <Form.Group>
                  <Form.Label>Fecha y Hora de la Consulta *</Form.Label>

                  <Form.Control
                    type="datetime-local" // selector nativo de fecha y hora
                    name="fecha_hora"
                    value={formData.fecha_hora}
                    onChange={handleInputChange}
                    required
                  />

                  <Form.Control.Feedback type="invalid">
                    La fecha y hora son requeridas
                  </Form.Control.Feedback>
                </Form.Group>
              </div>

              {/* MOTIVO DE LA CONSULTA (obligatorio, texto largo -> textarea) */}
              <div className="col-12 mb-3">
                <Form.Group>
                  <Form.Label>Motivo de la Consulta *</Form.Label>

                  <Form.Control
                    as="textarea" // renderiza un <textarea> en vez de un <input>
                    rows={3} // alto inicial de 3 líneas
                    name="motivo"
                    value={formData.motivo}
                    onChange={handleInputChange}
                    required
                    placeholder="Ej: Valoración de agudeza visual y control de fórmula"
                  />

                  <Form.Control.Feedback type="invalid">
                    El motivo es requerido
                  </Form.Control.Feedback>
                </Form.Group>
              </div>
            </div>
          </Modal.Body>

          <Modal.Footer>
            {/* Botón para cerrar el modal sin guardar cambios */}
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>

            {/* Botón de envío: al ser type="submit" dispara el onSubmit del <Form> */}
            <Button variant="primary" type="submit">
              {/* Texto dinámico según si se está editando o creando */}
              {editingConsulta ? "Actualizar" : "Guardar"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

// Exporta el componente para que pueda importarse y usarse en otras partes de la app
export default AgendarConsulta;
