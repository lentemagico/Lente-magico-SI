// Importamos React y tres hooks:
// - useState: para manejar estado local del componente
// - useEffect: para ejecutar efectos secundarios (side effects) como llamadas a la API
// - useCallback: para memorizar (cachear) una función y que no se recree en cada render
import React, {
  useState,
  useEffect,
  useCallback
} from 'react';

// Importamos componentes ya armados de react-bootstrap para no construir
// modales, botones, tablas, etc. desde cero
import {
  Modal,        // Ventana emergente (popup) para el formulario de crear/editar
  Button,       // Botón estilizado
  Form,         // Formulario y sus controles (inputs, etc.)
  Table,        // Tabla estilizada
  Pagination,   // Componente de paginación (botones de páginas)
  Alert,        // Cajas de alerta (mensajes de éxito/error)
  InputGroup    // Agrupa un input con un ícono o texto pegado al lado
} from 'react-bootstrap';


// ======================================================
// URL CORRECTA DEL BACKEND
// ======================================================

// URL base del backend (API) a la que se le harán las peticiones (fetch).
// Al ser relativa apunta al mismo dominio donde corre el frontend
const API_URL = '/api/cantidad-productos-vendidos';


// ======================================================
// COMPONENTE
// ======================================================

// Componente funcional principal: gestiona listar, buscar, registrar,
// editar y eliminar registros de productos vendidos
const CantidadProductosVendidos = () => {

  // ======================================================
  // ESTADOS
  // ======================================================

  // Lista de registros (productos vendidos) que se muestran en la tabla (la "página" actual)
  const [productos, setProductos] = useState([]);

  // Bandera para saber si se está cargando información desde la API
  // (se usa para mostrar el spinner de "Cargando...")
  const [loading, setLoading] = useState(false);

  // Guarda el mensaje de error a mostrar (o null si no hay error)
  const [error, setError] = useState(null);

  // Guarda el mensaje de éxito a mostrar (o null si no hay mensaje)
  const [success, setSuccess] = useState(null);

  // Guarda el total acumulado de unidades vendidas, que se muestra
  // en la tarjeta de resumen debajo de la tabla
  const [totalVendidos, setTotalVendidos] = useState(0);


  // ======================================================
  // PAGINACIÓN
  // ======================================================

  // Objeto que agrupa toda la información de paginación que llega del backend
  const [pagination, setPagination] = useState({
    currentPage: 1,      // página en la que estamos actualmente
    totalPages: 1,        // cuántas páginas hay en total
    totalItems: 0,         // cuántos registros hay en total (todas las páginas)
    limit: 10,             // cuántos registros se muestran por página
    hasNextPage: false,    // si existe una página siguiente
    hasPrevPage: false     // si existe una página anterior
  });


  // ======================================================
  // BÚSQUEDA
  // ======================================================

  // Texto que el usuario escribe en el input de búsqueda (se actualiza en cada tecla)
  const [searchTerm, setSearchTerm] = useState('');

  // Texto de búsqueda "con retraso" (debounce): solo se actualiza 500ms
  // después de que el usuario deja de escribir, para no llamar a la API en cada tecla
  const [debouncedSearch, setDebouncedSearch] = useState('');


  // ======================================================
  // MODAL
  // ======================================================

  // Controla si el modal (ventana emergente) de crear/editar está visible o no
  const [showModal, setShowModal] = useState(false);

  // Guarda el id del registro que se está editando.
  // Si es null => estamos creando un registro nuevo
  // Si tiene un valor => estamos editando el registro con ese id
  const [editingProducto, setEditingProducto] = useState(null);


  // ======================================================
  // VALIDACIÓN
  // ======================================================

  // Controla si el formulario ya fue "validado" por Bootstrap
  // (para mostrar los mensajes de error de cada campo tipo "El ID es requerido")
  const [validated, setValidated] = useState(false);


  // ======================================================
  // FORMULARIO
  // ======================================================

  // Estado que contiene los valores actuales de todos los campos del formulario
  const [formData, setFormData] = useState({
    idVenta: '',
    idProducto: '',
    cantidadProducto: '',
    precioUnitario: ''
  });


  // ======================================================
  // DEBOUNCE
  // ======================================================

  // Este efecto se ejecuta cada vez que "searchTerm" cambia (el usuario escribe)
  useEffect(() => {

    // Se crea un temporizador que, después de 500ms, copia searchTerm en debouncedSearch
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);

    // Función de "limpieza": si searchTerm vuelve a cambiar antes de que pasen
    // los 500ms, se cancela el temporizador anterior para no disparar la búsqueda
    // con texto viejo. Esto es lo que logra el efecto "debounce".
    return () => {
      clearTimeout(timer);
    };

  }, [searchTerm]); // se re-ejecuta cada vez que cambia searchTerm


  // ======================================================
  // CARGAR PRODUCTOS VENDIDOS
  // ======================================================

  // useCallback memoriza esta función para que no se recree en cada render,
  // solo cuando cambie "debouncedSearch" (su única dependencia)
  const loadProductos = useCallback(
    async (page = 1) => { // recibe la página a consultar, por defecto la 1

      setLoading(true); // activa el spinner
      setError(null);   // limpia cualquier error previo

      try {

        // Llamada a la API pidiendo la página, el límite fijo de 10 por página,
        // y el término de búsqueda (ya "debounced"), codificado para la URL
        const response = await fetch(
          `${API_URL}?page=${page}&limit=10&search=${encodeURIComponent(
            debouncedSearch
          )}`
        );


        // Convertimos la respuesta a JSON (se hace antes de chequear response.ok
        // para poder leer el mensaje de error que venga en el cuerpo)
        const data = await response.json();


        // Si la respuesta HTTP no fue exitosa (status fuera del rango 200-299)
        if (!response.ok) {

          throw new Error(
            data.error ||
            'Error al cargar los productos vendidos'
          );

        }


        // Guardamos los registros recibidos (o un arreglo vacío si no vino nada)
        setProductos(
          data.productos || []
        );


        // Guardamos el total vendido, convertido a número (0 si no vino nada)
        setTotalVendidos(
          Number(data.totalVendidos || 0)
        );


        // Actualizamos la paginación con lo que mandó el backend,
        // o con un objeto de "valores por defecto" si no vino nada
        setPagination(
          data.pagination || {
            currentPage: 1,
            totalPages: 1,
            totalItems: 0,
            limit: 10,
            hasNextPage: false,
            hasPrevPage: false
          }
        );

      } catch (err) {

        // Se registra el error en la consola del navegador (para depuración)
        console.error(
          'Error al cargar productos vendidos:',
          err
        );

        // Y se guarda el mensaje para mostrarlo al usuario
        setError(
          err.message ||
          'Error al cargar los productos vendidos'
        );

      } finally {

        // Pase lo que pase, se apaga el spinner al final
        setLoading(false);

      }

    },
    [debouncedSearch] // la función se vuelve a crear solo si cambia el término de búsqueda
  );


  // ======================================================
  // CARGAR AL INICIAR
  // ======================================================

  // Cada vez que "loadProductos" cambie (es decir, cada vez que cambie debouncedSearch),
  // se vuelve a cargar la página 1. Esto también corre una vez al montar el componente.
  useEffect(() => {

    loadProductos(1);

  }, [loadProductos]);


  // ======================================================
  // CAMBIAR PÁGINA
  // ======================================================

  // Handler que se llama cuando el usuario hace click en un número de página
  const handlePageChange = (page) => {

    // Validación: no permite ir a una página menor a 1
    if (page < 1) {
      return;
    }

    // Validación: no permite ir a una página mayor al total de páginas disponibles
    if (
      pagination.totalPages > 0 &&
      page > pagination.totalPages
    ) {
      return;
    }

    // Si la página pedida es válida, se cargan sus datos
    loadProductos(page);

  };


  // ======================================================
  // BUSCAR
  // ======================================================

  // Handler del input de búsqueda: actualiza searchTerm en cada tecla
  const handleSearch = (e) => {

    setSearchTerm(
      e.target.value
    );

  };


  // ======================================================
  // NUEVO PRODUCTO VENDIDO
  // ======================================================

  // Prepara y abre el modal en modo "crear"
  const handleNewProducto = () => {

    setEditingProducto(null); // null = no estamos editando, es un registro nuevo

    // Resetea el formulario a valores vacíos
    setFormData({
      idVenta: '',
      idProducto: '',
      cantidadProducto: '',
      precioUnitario: ''
    });

    setValidated(false); // quita marcas de validación previas
    setError(null);      // limpia errores previos

    setShowModal(true);  // muestra el modal

  };


  // ======================================================
  // EDITAR PRODUCTO VENDIDO
  // ======================================================

  // Prepara y abre el modal en modo "editar", precargando los datos del registro
  const handleEditProducto = (producto) => {

    // Se usa el id del registro como identificador para el PUT
    setEditingProducto(
      producto.id
    );

    // Copiamos los datos del registro seleccionado al formulario,
    // usando '' como valor por defecto si algún campo viene vacío/null
    setFormData({
      idVenta: producto.idVenta || '',
      idProducto: producto.idProducto || '',
      cantidadProducto:
        producto.cantidadProducto || '',
      precioUnitario:
        producto.precioUnitario || ''
    });

    setValidated(false); // quita marcas de validación previas
    setError(null);      // limpia errores previos

    setShowModal(true);  // muestra el modal

  };


  // ======================================================
  // CERRAR MODAL
  // ======================================================

  // Handler para cerrar el modal, reseteando todo su estado asociado
  const handleCloseModal = () => {

    setShowModal(false);       // oculta el modal

    setEditingProducto(null);  // limpia el registro en edición (vuelve a modo "crear")

    setValidated(false);       // quita marcas de validación

    // Vacía el formulario
    setFormData({
      idVenta: '',
      idProducto: '',
      cantidadProducto: '',
      precioUnitario: ''
    });

  };


  // ======================================================
  // CAMBIAR FORMULARIO
  // ======================================================

  // Handler genérico usado por TODOS los campos del formulario.
  // Gracias al atributo "name" de cada input, sabe cuál propiedad actualizar.
  const handleInputChange = (e) => {

    const {
      name,
      value
    } = e.target; // extrae el nombre del campo y su nuevo valor


    setFormData((prev) => ({
      ...prev,       // conserva todos los demás campos igual
      [name]: value  // sobreescribe solo el campo que cambió (clave calculada)
    }));

  };


  // ======================================================
  // GUARDAR
  // ======================================================

  // Handler del submit del formulario (se dispara al hacer click en "Guardar"/"Actualizar")
  const handleSaveProducto = async (e) => {

    e.preventDefault(); // evita que el navegador recargue la página al enviar el form

    const form = e.currentTarget; // referencia al elemento <form> del DOM


    // Validación nativa de HTML5/Bootstrap: revisa los "required" de cada campo
    if (form.checkValidity() === false) {

      e.stopPropagation(); // evita que el evento siga propagándose

      setValidated(true);  // activa los mensajes de error visuales en cada campo inválido

      return; // corta la ejecución, no se envía nada a la API

    }


    setValidated(true); // marca el formulario como validado (para estilos de Bootstrap)

    setError(null);     // limpia errores previos
    setSuccess(null);   // limpia mensajes de éxito previos


    try {

      // Si estamos editando, la URL incluye el id y se usa PUT;
      // si estamos creando, se usa la URL base con POST
      const url = editingProducto
        ? `${API_URL}/${editingProducto}`
        : API_URL;


      const method = editingProducto
        ? 'PUT'
        : 'POST';


      // ==================================================
      // DATOS QUE ESPERA EL BACKEND
      // ==================================================

      // Se arma el objeto que se enviará al backend, convirtiendo
      // todos los campos de texto (string) a números reales
      const productoEnviar = {
        idVenta: Number(
          formData.idVenta
        ),

        idProducto: Number(
          formData.idProducto
        ),

        cantidadProducto: Number(
          formData.cantidadProducto
        ),

        // El precio unitario es opcional: si viene vacío se manda 0,
        // si no, se convierte el texto a número
        precioUnitario:
          formData.precioUnitario === ''
            ? 0
            : Number(
                formData.precioUnitario
              )
      };


      // Se imprime en consola el objeto que se va a enviar, útil para depurar
      console.log(
        'Enviando producto vendido:',
        productoEnviar
      );


      // Se hace la petición HTTP con el método, headers y body correspondientes
      const response = await fetch(
        url,
        {
          method,

          headers: {
            'Content-Type':
              'application/json' // le decimos al backend que mandamos JSON
          },

          body: JSON.stringify(
            productoEnviar // convertimos el objeto JS a texto JSON
          )
        }
      );


      const data =
        await response.json(); // parseamos la respuesta del backend


      // Si la respuesta no fue exitosa, lanzamos un error con el mensaje del backend
      // (o uno genérico si el backend no mandó "error")
      if (!response.ok) {

        throw new Error(
          data.error ||
          'Error al guardar el producto vendido'
        );

      }


      // Mensaje de éxito distinto según si fue edición o creación
      setSuccess(
        editingProducto
          ? 'Producto vendido actualizado exitosamente'
          : 'Producto vendido registrado exitosamente'
      );


      // Cierra el modal y resetea su estado (usa el handler ya definido arriba)
      handleCloseModal();


      // Se espera (await) a que termine de traer la página actual desde la API,
      // para refrescar la tabla con los datos reales ya guardados
      await loadProductos(
        pagination.currentPage
      );


      // El mensaje de éxito desaparece solo después de 3 segundos
      setTimeout(() => {
        setSuccess(null);
      }, 3000);


    } catch (err) {

      // Se registra el error en consola para depuración
      console.error(
        'Error al guardar producto vendido:',
        err
      );


      // Se guarda el mensaje de error para mostrarlo al usuario
      setError(
        err.message ||
        'Error al guardar el producto vendido'
      );


      // El mensaje de error desaparece solo después de 5 segundos
      setTimeout(() => {
        setError(null);
      }, 5000);

    }

  };


  // ======================================================
  // ELIMINAR
  // ======================================================

  // Handler para eliminar un registro, recibe el id de la fila
  const handleDeleteProducto = async (id) => {

    // Ventana de confirmación nativa del navegador antes de borrar
    const confirmar = window.confirm(
      '¿Está seguro de eliminar este registro de producto vendido?'
    );


    // Si el usuario cancela, no se hace nada más
    if (!confirmar) {
      return;
    }


    setError(null);   // limpia errores previos
    setSuccess(null); // limpia mensajes de éxito previos


    try {

      // Petición DELETE al backend, apuntando al id específico
      const response = await fetch(
        `${API_URL}/${id}`,
        {
          method: 'DELETE'
        }
      );


      const data =
        await response.json(); // parseamos la respuesta


      // Si el backend devuelve error
      if (!response.ok) {

        throw new Error(
          data.error ||
          'Error al eliminar el producto vendido'
        );

      }


      // Mensaje de éxito: usa el que mande el backend, o uno por defecto
      setSuccess(
        data.mensaje ||
        'Producto vendido eliminado exitosamente'
      );


      // Por defecto, se recarga la misma página en la que estábamos
      let pageToLoad =
        pagination.currentPage;


      // Caso especial: si el registro eliminado era el ÚNICO de la página actual
      // y no estamos en la primera página, retrocedemos una página para no
      // quedar viendo una página vacía
      if (
        productos.length === 1 &&
        pagination.currentPage > 1
      ) {

        pageToLoad =
          pagination.currentPage - 1;

      }


      // Se recargan los datos de la página calculada (actual o la anterior)
      await loadProductos(
        pageToLoad
      );


      // El mensaje de éxito desaparece solo después de 3 segundos
      setTimeout(() => {
        setSuccess(null);
      }, 3000);


    } catch (err) {

      // Se registra el error en consola para depuración
      console.error(
        'Error al eliminar:',
        err
      );


      setError(
        err.message ||
        'Error al eliminar el producto vendido'
      );


      // El mensaje de error desaparece solo después de 5 segundos
      setTimeout(() => {
        setError(null);
      }, 5000);

    }

  };


  // ======================================================
  // PAGINACIÓN
  // ======================================================

  // Genera dinámicamente un <Pagination.Item> por cada página disponible
  const renderPagination = () => {

    const items = []; // aquí se van acumulando los elementos <Pagination.Item>


    // Recorre desde la página 1 hasta la última página
    for (
      let number = 1;
      number <= pagination.totalPages;
      number++
    ) {

      items.push(

        <Pagination.Item
          key={number} // "key" único requerido por React para listas
          active={
            number ===
            pagination.currentPage // resalta la página actual
          }
          onClick={() =>
            handlePageChange(number) // navega a esa página al hacer click
          }
        >
          {number}
        </Pagination.Item>

      );

    }


    return items; // arreglo de elementos JSX listo para renderizar

  };


  // ======================================================
  // VISTA
  // ======================================================

  // Todo lo que retorna el componente es lo que realmente se ve en pantalla (JSX)
  return (

    <div className="container-fluid">


      {/* ==================================================
          TÍTULO
      ================================================== */}

      <h2 className="mb-4">
        Cantidad de Productos Vendidos
      </h2>


      {/* ==================================================
          ALERTA ERROR
      ================================================== */}

      {/* Solo se muestra si "error" tiene contenido (renderizado condicional) */}
      {error && (

        <Alert
          variant="danger"             // estilo rojo de Bootstrap
          onClose={() =>
            setError(null)             // permite cerrarla manualmente con la "X"
          }
          dismissible                  // muestra el botón de cerrar
        >

          {error}

        </Alert>

      )}


      {/* ==================================================
          ALERTA ÉXITO
      ================================================== */}

      {/* Solo se muestra si "success" tiene contenido */}
      {success && (

        <Alert
          variant="success"            // estilo verde de Bootstrap
          onClose={() =>
            setSuccess(null)
          }
          dismissible
        >

          {success}

        </Alert>

      )}


      {/* ==================================================
          BARRA DE HERRAMIENTAS
      ================================================== */}

      <div className="row mb-3">


        {/* BÚSQUEDA */}

        <div className="col-md-6">

          <InputGroup>

            {/* Ícono de lupa pegado al input */}
            <InputGroup.Text>

              <i className="bi bi-search"></i>

            </InputGroup.Text>


            <Form.Control
              type="text"
              placeholder="Buscar producto vendido..."
              value={searchTerm}       // input "controlado" por React
              onChange={handleSearch}  // actualiza searchTerm en cada tecla
            />

          </InputGroup>

        </div>


        {/* BOTÓN NUEVO */}

        <div className="col-md-6 text-end">

          <Button
            variant="success"
            onClick={
              handleNewProducto
            }
          >

            <i className="bi bi-plus-circle me-2"></i>

            Nuevo Producto Vendido

          </Button>

        </div>

      </div>


      {/* ==================================================
          TABLA
      ================================================== */}

      <Table
        striped     // filas con colores alternados
        bordered    // bordes visibles en celdas
        hover       // resalta la fila al pasar el mouse
        responsive  // permite scroll horizontal en pantallas pequeñas
      >

        <thead className="table-dark">

          <tr>

            <th>
              ID
            </th>

            <th>
              Nombre del Producto
            </th>

            <th>
              Cantidad Vendida
            </th>

            <th>
              Acciones
            </th>

          </tr>

        </thead>


        <tbody>

          {/* Renderizado condicional de 3 escenarios distintos: */}
          {loading ? (

            // 1) Mientras está cargando: fila única con spinner centrado
            <tr>

              <td
                colSpan="4"               // ocupa las 4 columnas de la tabla
                className="text-center py-4"
              >

                <div
                  className="spinner-border text-success"
                  role="status"
                >

                  <span className="visually-hidden">
                    Cargando...
                  </span>

                </div>

              </td>

            </tr>

          ) : productos.length === 0 ? (

            // 2) Si ya cargó pero no hay resultados: mensaje de "vacío"
            <tr>

              <td
                colSpan="4"
                className="text-center"
              >

                No se encontraron productos vendidos

              </td>

            </tr>

          ) : (

            // 3) Caso normal: se recorre el arreglo "productos" y se dibuja una fila por cada uno
            productos.map(
              (producto) => (

                <tr
                  key={producto.id} // key única requerida por React
                >

                  {/* Columna: id del registro */}
                  <td>
                    {producto.id}
                  </td>


                  {/* Columna: nombre del producto vendido */}
                  <td>
                    {producto.nombreProducto}
                  </td>


                  {/* Columna: cantidad vendida, mostrada como una "badge" (etiqueta) verde
                      con la unidad "un." (unidades) al lado */}
                  <td>

                    <span className="badge bg-success fs-6">

                      {producto.cantidadProducto}

                      {' '}un.

                    </span>

                  </td>


                  {/* Columna: botones de acciones (editar / eliminar) */}
                  <td>

                    {/* Abre el modal precargado con los datos de esta fila */}
                    <Button
                      variant="warning"
                      size="sm"
                      className="me-2" // margen a la derecha para separarlo del botón eliminar
                      onClick={() =>
                        handleEditProducto(
                          producto
                        )
                      }
                    >

                      <i className="bi bi-pencil"></i>

                      {' '}Editar

                    </Button>


                    {/* Pide confirmación y borra la fila */}
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() =>
                        handleDeleteProducto(
                          producto.id
                        )
                      }
                    >

                      <i className="bi bi-trash"></i>

                      {' '}Eliminar

                    </Button>

                  </td>

                </tr>

              )
            )

          )}

        </tbody>

      </Table>


      {/* ==================================================
          TOTAL
      ================================================== */}

      {/* Tarjeta de resumen con el total acumulado de unidades vendidas
          (viene calculado desde el backend en "totalVendidos") */}
      <div className="card bg-success text-white text-center p-3 mb-4">

        <h5 className="mb-1">
          Total de Productos Vendidos
        </h5>


        <div className="display-4 fw-bold font-monospace">

          {totalVendidos}

        </div>

      </div>


      {/* ==================================================
          PAGINACIÓN
      ================================================== */}

      {/* Solo se muestra el bloque de paginación si hay más de 1 página */}
      {pagination.totalPages > 1 && (

        <div className="d-flex justify-content-between align-items-center">


          {/* Texto informativo: cuántos registros se ven de cuántos hay en total */}
          <div>

            Mostrando{' '}

            {productos.length}

            {' '}de{' '}

            {pagination.totalItems}

            {' '}registros

          </div>


          <Pagination>


            {/* Botón "ir a la primera página" */}
            <Pagination.First
              onClick={() =>
                handlePageChange(1)
              }
              disabled={
                pagination.currentPage === 1 // deshabilitado si ya estamos en la página 1
              }
            />


            {/* Botón "página anterior" */}
            <Pagination.Prev
              onClick={() =>
                handlePageChange(
                  pagination.currentPage - 1
                )
              }
              disabled={
                !pagination.hasPrevPage // deshabilitado si el backend indica que no hay anterior
              }
            />


            {/* Números de página generados dinámicamente */}
            {renderPagination()}


            {/* Botón "página siguiente" */}
            <Pagination.Next
              onClick={() =>
                handlePageChange(
                  pagination.currentPage + 1
                )
              }
              disabled={
                !pagination.hasNextPage // deshabilitado si el backend indica que no hay siguiente
              }
            />


            {/* Botón "ir a la última página" */}
            <Pagination.Last
              onClick={() =>
                handlePageChange(
                  pagination.totalPages
                )
              }
              disabled={
                pagination.currentPage ===
                pagination.totalPages // deshabilitado si ya estamos en la última
              }
            />

          </Pagination>

        </div>

      )}


      {/* ==================================================
          MODAL
      ================================================== */}

      <Modal
        show={showModal} // visible u oculto según el estado
        onHide={
          handleCloseModal // se cierra al hacer click fuera o en la "X"
        }
        centered // centra verticalmente el modal en la pantalla
      >


        <Modal.Header closeButton>

          <Modal.Title>

            {/* Título dinámico: cambia según si se está editando o creando */}
            {editingProducto
              ? 'Editar Producto Vendido'
              : 'Nuevo Producto Vendido'}

          </Modal.Title>

        </Modal.Header>


        {/* El <Form> envuelve TODO el contenido del modal (body + footer)
            porque el botón "submit" está dentro del footer */}
        <Form
          noValidate                    // desactiva la validación nativa del navegador
          validated={validated}         // le dice a Bootstrap si debe mostrar estilos de validación
          onSubmit={
            handleSaveProducto          // se ejecuta al enviar el formulario
          }
        >

          <Modal.Body>


            {/* ==================================================
                ID DE LA VENTA
            ================================================== */}

            {/* Campo numérico obligatorio */}
            <Form.Group
              className="mb-3"
            >

              <Form.Label>
                ID de la Venta *
              </Form.Label>


              <Form.Control
                type="number"
                name="idVenta"                    // debe coincidir con la clave en formData
                value={
                  formData.idVenta                // input controlado
                }
                onChange={
                  handleInputChange                // handler genérico
                }
                min="1"                             // no permite valores menores a 1
                required                            // campo obligatorio
                placeholder="Ej: 1"
              />


              {/* Mensaje que aparece solo si el campo es inválido y ya se validó el form */}
              <Form.Control.Feedback
                type="invalid"
              >

                El ID de la venta es requerido.

              </Form.Control.Feedback>

            </Form.Group>


            {/* ==================================================
                ID DEL PRODUCTO
            ================================================== */}

            {/* Campo numérico obligatorio */}
            <Form.Group
              className="mb-3"
            >

              <Form.Label>
                ID del Producto *
              </Form.Label>


              <Form.Control
                type="number"
                name="idProducto"
                value={
                  formData.idProducto
                }
                onChange={
                  handleInputChange
                }
                min="1"
                required
                placeholder="Ej: 1"
              />


              <Form.Control.Feedback
                type="invalid"
              >

                El ID del producto es requerido.

              </Form.Control.Feedback>

            </Form.Group>


            {/* ==================================================
                CANTIDAD
            ================================================== */}

            {/* Campo numérico obligatorio, solo enteros (step="1") */}
            <Form.Group
              className="mb-3"
            >

              <Form.Label>
                Cantidad Vendida *
              </Form.Label>


              <Form.Control
                type="number"
                name="cantidadProducto"
                value={
                  formData.cantidadProducto
                }
                onChange={
                  handleInputChange
                }
                min="1"       // no permite valores menores a 1
                step="1"      // solo permite incrementos de 1 en 1 (números enteros)
                required
                placeholder="Ej: 5"
              />


              <Form.Control.Feedback
                type="invalid"
              >

                La cantidad debe ser mayor a 0.

              </Form.Control.Feedback>

            </Form.Group>


            {/* ==================================================
                PRECIO UNITARIO
            ================================================== */}

            {/* Campo numérico OPCIONAL (no tiene "required" ni Feedback de error) */}
            <Form.Group
              className="mb-3"
            >

              <Form.Label>
                Precio Unitario
              </Form.Label>


              <Form.Control
                type="number"
                name="precioUnitario"
                value={
                  formData.precioUnitario
                }
                onChange={
                  handleInputChange
                }
                min="0"        // no permite valores negativos
                step="0.01"    // permite decimales de a centavos
                placeholder="Ej: 25000"
              />

            </Form.Group>


          </Modal.Body>


          <Modal.Footer>


            {/* Botón para cerrar el modal sin guardar cambios */}
            <Button
              variant="secondary"
              onClick={
                handleCloseModal
              }
            >

              Cancelar

            </Button>


            {/* Botón de envío: al ser type="submit" dispara el onSubmit del <Form> */}
            <Button
              variant="success"
              type="submit"
            >

              <i className="bi bi-save me-2"></i>

              {/* Texto dinámico según si se está editando o creando */}
              {editingProducto
                ? 'Actualizar'
                : 'Guardar'}

            </Button>


          </Modal.Footer>

        </Form>

      </Modal>

    </div>

  );

};


// Exporta el componente para que pueda importarse y usarse en otras partes de la app
export default CantidadProductosVendidos;