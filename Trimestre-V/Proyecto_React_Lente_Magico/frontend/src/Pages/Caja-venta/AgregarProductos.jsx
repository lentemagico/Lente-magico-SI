// Importamos React y tres hooks:
// - useState: para manejar estado local del componente
// - useEffect: para ejecutar efectos secundarios (side effects) como llamadas a la API
// - useCallback: para memorizar (cachear) una función y que no se recree en cada render
import React, { useState, useEffect, useCallback } from 'react';

// Importamos componentes ya armados de react-bootstrap para no construir
// modales, botones, tablas, etc. desde cero
import {
  Modal,        // Ventana emergente (popup) para el formulario de crear/editar
  Button,       // Botón estilizado
  Form,         // Formulario y sus controles (inputs, selects, etc.)
  Table,        // Tabla estilizada
  Pagination,   // Componente de paginación (botones de páginas)
  Alert,        // Cajas de alerta (mensajes de éxito/error)
  InputGroup    // Agrupa un input con un ícono o texto pegado al lado
} from 'react-bootstrap';

// URL base del backend (API) a la que se le harán las peticiones (fetch).
// Al ser relativa ("/api/productos") apunta al mismo dominio donde corre el frontend
const API_URL = '/api/productos';

// Componente funcional principal: gestiona listar, buscar, crear, editar
// y eliminar productos
const AgregarProductos = () => {

  // ==========================================
  // ESTADOS PARA DATOS
  // ==========================================

  // Lista de productos que se muestran actualmente en la tabla (la "página" actual)
  const [productos, setProductos] = useState([]);

  // Bandera para saber si se está cargando información desde la API
  // (se usa para mostrar el spinner de "Cargando...")
  const [loading, setLoading] = useState(false);

  // Guarda el mensaje de error a mostrar (o null si no hay error)
  const [error, setError] = useState(null);

  // Guarda el mensaje de éxito a mostrar (o null si no hay mensaje)
  const [success, setSuccess] = useState(null);

  // ==========================================
  // ESTADOS PARA PAGINACIÓN
  // ==========================================

  // Objeto que agrupa toda la información de paginación que llega del backend
  const [pagination, setPagination] = useState({
    currentPage: 1,   // página en la que estamos actualmente
    totalPages: 1,    // cuántas páginas hay en total
    totalItems: 0,    // cuántos registros hay en total (todas las páginas)
    limit: 10         // cuántos registros se muestran por página
  });

  // ==========================================
  // ESTADOS PARA BÚSQUEDA
  // ==========================================

  // Texto que el usuario escribe en el input de búsqueda (se actualiza en cada tecla)
  const [searchTerm, setSearchTerm] = useState('');

  // Texto de búsqueda "con retraso" (debounce): solo se actualiza 500ms
  // después de que el usuario deja de escribir, para no llamar a la API en cada tecla
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // ==========================================
  // ESTADOS PARA FORMULARIO
  // ==========================================

  // Controla si el modal (ventana emergente) de crear/editar está visible o no
  const [showModal, setShowModal] = useState(false);

  // Guarda el codigo_producto del producto que se está editando.
  // Si es null => estamos creando un producto nuevo
  // Si tiene un valor => estamos editando el producto con ese código
  const [editingProduct, setEditingProduct] = useState(null);

  // Estado que contiene los valores actuales de todos los campos del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    codigo_producto: '',
    id_categoria: '',
    precio_venta: '',
    stock_actual: ''
  });

  // ==========================================
  // ESTADO PARA VALIDACIÓN
  // ==========================================

  // Controla si el formulario ya fue "validado" por Bootstrap
  // (para mostrar los mensajes de error de cada campo tipo "El nombre es requerido")
  const [validated, setValidated] = useState(false);

  // ==========================================
  // DEBOUNCE PARA BÚSQUEDA
  // ==========================================
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

  // ==========================================
  // CARGAR PRODUCTOS
  // ==========================================
  // useCallback memoriza esta función para que no se recree en cada render,
  // solo cuando cambie "debouncedSearch" (su única dependencia)
  const loadProductos = useCallback(
    async (page = 1) => { // recibe la página a consultar, por defecto la 1
      setLoading(true);   // activa el spinner
      setError(null);     // limpia cualquier error previo

      try {
        // Llamada a la API pidiendo la página, el límite fijo de 10 por página,
        // y el término de búsqueda (ya "debounced"), codificado para la URL
        const response = await fetch(
          `${API_URL}?page=${page}&limit=10&search=${encodeURIComponent(
            debouncedSearch
          )}`
        );

        // Si la respuesta HTTP no fue exitosa (status fuera del rango 200-299)
        if (!response.ok) {
          // Intenta parsear el cuerpo del error como JSON;
          // si falla el parseo, usa un objeto vacío en su lugar (no rompe la app)
          const data = await response.json().catch(() => ({}));

          throw new Error(
            data.error || 'Error al cargar productos'
          );
        }

        // Convertimos la respuesta exitosa a JSON
        const data = await response.json();

        // Guardamos los productos recibidos (o un arreglo vacío si no vino nada)
        setProductos(data.productos || []);

        // Actualizamos la paginación con lo que mandó el backend,
        // o con un objeto de "valores por defecto" si no vino nada
        setPagination(
          data.pagination || {
            currentPage: page,
            totalPages: 1,
            totalItems: 0,
            limit: 10,
            hasNextPage: false,
            hasPrevPage: false
          }
        );

      } catch (err) {
        // Se registra el error en la consola del navegador (para depuración)
        console.error('Error cargando productos:', err);
        // Y se guarda el mensaje para mostrarlo al usuario
        setError(err.message);
      } finally {
        // Pase lo que pase, se apaga el spinner al final
        setLoading(false);
      }
    },
    [debouncedSearch] // la función se vuelve a crear solo si cambia el término de búsqueda
  );

  // ==========================================
  // CARGAR AL MONTAR Y AL BUSCAR
  // ==========================================
  // Cada vez que "loadProductos" cambie (es decir, cada vez que cambie debouncedSearch),
  // se vuelve a cargar la página 1. Esto también corre una vez al montar el componente.
  useEffect(() => {
    loadProductos(1);
  }, [loadProductos]);

  // ==========================================
  // CAMBIAR PÁGINA
  // ==========================================
  // Handler que se llama cuando el usuario hace click en un número de página
  const handlePageChange = (page) => {
    loadProductos(page);
  };

  // ==========================================
  // BÚSQUEDA
  // ==========================================
  // Handler del input de búsqueda: actualiza searchTerm en cada tecla
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  // ==========================================
  // NUEVO PRODUCTO
  // ==========================================
  // Prepara y abre el modal en modo "crear"
  const handleNewProduct = () => {
    setEditingProduct(null); // null = no estamos editando, es un producto nuevo

    // Resetea el formulario a valores vacíos
    setFormData({
      nombre: '',
      codigo_producto: '',
      id_categoria: '',
      precio_venta: '',
      stock_actual: ''
    });

    setValidated(false); // quita marcas de validación previas
    setError(null);      // limpia errores previos
    setShowModal(true);  // muestra el modal
  };

  // ==========================================
  // EDITAR PRODUCTO
  // ==========================================
  // Prepara y abre el modal en modo "editar", precargando los datos del producto
  const handleEditProduct = (producto) => {
    // Se usa codigo_producto como identificador para el PUT
    setEditingProduct(producto.codigo_producto);

    // Copiamos los datos del producto seleccionado al formulario,
    // usando '' como valor por defecto si algún campo viene vacío/null
    setFormData({
      nombre: producto.nombre || '',
      codigo_producto: producto.codigo_producto || '',
      id_categoria: producto.id_categoria || '',
      precio_venta: producto.precio_venta || '',
      stock_actual: producto.stock_actual || ''
    });

    setValidated(false); // quita marcas de validación previas
    setError(null);      // limpia errores previos
    setShowModal(true);  // muestra el modal
  };

  // ==========================================
  // CAMBIOS EN EL FORMULARIO
  // ==========================================
  // Handler genérico usado por TODOS los campos del formulario.
  // Gracias al atributo "name" de cada input, sabe cuál propiedad actualizar.
  const handleInputChange = (e) => {
    const { name, value } = e.target; // extrae el nombre del campo y su nuevo valor

    setFormData((prev) => ({
      ...prev,       // conserva todos los demás campos igual
      [name]: value  // sobreescribe solo el campo que cambió (clave calculada)
    }));
  };

  // ==========================================
  // GUARDAR PRODUCTO
  // CREAR / ACTUALIZAR
  // ==========================================
  // Handler del submit del formulario (se dispara al hacer click en "Guardar"/"Actualizar")
  const handleSaveProduct = async (e) => {
    e.preventDefault(); // evita que el navegador recargue la página al enviar el form

    const form = e.currentTarget; // referencia al elemento <form> del DOM

    // Validación nativa de HTML5/Bootstrap: revisa los "required" de cada campo
    if (form.checkValidity() === false) {
      e.stopPropagation(); // evita que el evento siga propagándose
      setValidated(true);  // activa los mensajes de error visuales en cada campo inválido
      return;               // corta la ejecución, no se envía nada a la API
    }

    setValidated(true); // marca el formulario como validado (para estilos de Bootstrap)
    setError(null);     // limpia errores previos

    try {

      // Si estamos editando, la URL incluye el código (codificado para la URL) y se usa PUT;
      // si estamos creando, se usa la URL base con POST
      const url = editingProduct
        ? `${API_URL}/${encodeURIComponent(editingProduct)}`
        : API_URL;

      const method = editingProduct ? 'PUT' : 'POST';

      // Se arma el objeto que se enviará al backend, convirtiendo los campos
      // numéricos de texto (string) a números reales, y recortando espacios
      // en blanco al inicio/fin de los campos de texto
      const productoEnviar = {
        nombre: formData.nombre.trim(),
        codigo_producto: formData.codigo_producto.trim(),
        id_categoria: parseInt(formData.id_categoria, 10),      // entero
        precio_venta: parseFloat(formData.precio_venta),        // decimal
        stock_actual: parseInt(formData.stock_actual, 10)       // entero
      };

      // Se hace la petición HTTP con el método, headers y body correspondientes
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json' // le decimos al backend que mandamos JSON
        },
        body: JSON.stringify(productoEnviar) // convertimos el objeto JS a texto JSON
      });

      const data = await response.json(); // parseamos la respuesta del backend

      // Si la respuesta no fue exitosa, lanzamos un error con el mensaje del backend
      // (o uno genérico si el backend no mandó "error")
      if (!response.ok) {
        throw new Error(
          data.error || 'Error al guardar producto'
        );
      }

      // Mensaje de éxito distinto según si fue edición o creación
      setSuccess(
        editingProduct
          ? 'Producto actualizado exitosamente'
          : 'Producto creado exitosamente'
      );

      setShowModal(false); // cierra el modal

      // Recargar tabla:
      // se espera (await) a que termine de traer la página actual desde la API,
      // para refrescar la tabla con los datos reales ya guardados
      await loadProductos(pagination.currentPage);

      // El mensaje de éxito desaparece solo después de 3 segundos
      setTimeout(() => {
        setSuccess(null);
      }, 3000);

    } catch (err) {
      // Se registra el error en consola para depuración
      console.error('Error guardando producto:', err);

      setError(err.message); // muestra el error al usuario

      // El mensaje de error desaparece solo después de 5 segundos
      setTimeout(() => {
        setError(null);
      }, 5000);
    }
  };

  // ==========================================
  // ELIMINAR PRODUCTO
  // ==========================================
  // Handler para eliminar un producto, recibe el codigo_producto de la fila
  const handleDeleteProduct = async (codigo) => {

    // Ventana de confirmación nativa del navegador antes de borrar,
    // muestra el código del producto para que el usuario confirme cuál es
    const confirmar = window.confirm(
      `¿Está seguro de eliminar el producto con código ${codigo}?`
    );

    // Si el usuario cancela, no se hace nada más
    if (!confirmar) {
      return;
    }

    try {

      setError(null);   // limpia errores previos
      setSuccess(null); // limpia mensajes de éxito previos

      // ======================================
      // ELIMINAR EN LA BASE DE DATOS
      // ======================================
      // Petición DELETE al backend, apuntando al código específico (codificado para la URL)
      const response = await fetch(
        `${API_URL}/${encodeURIComponent(codigo)}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json(); // parseamos la respuesta

      // Si el backend devuelve error
      if (!response.ok) {
        throw new Error(
          data.error || 'No se pudo eliminar el producto'
        );
      }

      // ======================================
      // ELIMINAR INMEDIATAMENTE DEL FRONTEND
      // ======================================
      // Actualización "optimista": se quita la fila del estado local
      // al instante, sin esperar a volver a pedir todo a la API,
      // para que la interfaz se sienta más rápida
      setProductos((productosActuales) =>
        productosActuales.filter(
          (producto) =>
            producto.codigo_producto !== codigo
        )
      );

      // ======================================
      // ACTUALIZAR PAGINACIÓN
      // ======================================
      // Se resta 1 al total de items mostrado en el pie de la tabla
      // (nunca deja que baje de 0, por seguridad)
      setPagination((prev) => ({
        ...prev,
        totalItems: Math.max(
          0,
          prev.totalItems - 1
        )
      }));

      // ======================================
      // MENSAJE DE ÉXITO
      // ======================================
      // Usa el mensaje que mande el backend, o uno por defecto
      setSuccess(
        data.mensaje ||
        'Producto eliminado exitosamente'
      );

      setTimeout(() => {
        setSuccess(null);
      }, 3000);

    } catch (err) {

      // Se registra el error en consola para depuración
      console.error(
        'Error eliminando producto:',
        err
      );

      setError(err.message);

      setTimeout(() => {
        setError(null);
      }, 5000);
    }
  };

  // ==========================================
  // PAGINACIÓN
  // ==========================================
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
            number === pagination.currentPage // resalta la página actual
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

  // ==========================================
  // VISTA
  // ==========================================
  // Todo lo que retorna el componente es lo que realmente se ve en pantalla (JSX)
  return (
    <div className="container-fluid">

      {/* Título principal de la página */}
      <h2 className="mb-4">
        Gestión de Productos
      </h2>

      {/* ======================================
          ALERTA ERROR
      ====================================== */}
      {/* Solo se muestra si "error" tiene contenido (renderizado condicional) */}
      {error && (
        <Alert
          variant="danger"               // estilo rojo de Bootstrap
          onClose={() => setError(null)} // permite cerrarla manualmente con la "X"
          dismissible                    // muestra el botón de cerrar
        >
          {error}
        </Alert>
      )}

      {/* ======================================
          ALERTA ÉXITO
      ====================================== */}
      {/* Solo se muestra si "success" tiene contenido */}
      {success && (
        <Alert
          variant="success"                // estilo verde de Bootstrap
          onClose={() => setSuccess(null)}
          dismissible
        >
          {success}
        </Alert>
      )}

      {/* ======================================
          BARRA DE HERRAMIENTAS
      ====================================== */}
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
              placeholder="Buscar por código o nombre..."
              value={searchTerm}      // input "controlado" por React
              onChange={handleSearch} // actualiza searchTerm en cada tecla
            />

          </InputGroup>

        </div>

        {/* Columna derecha: botón para abrir el modal de nuevo producto */}
        <div className="col-md-6 text-end">

          <Button
            variant="primary"
            onClick={handleNewProduct}
          >
            <i className="bi bi-plus-circle me-2"></i>
            Nuevo Producto
          </Button>

        </div>

      </div>

      {/* ======================================
          TABLA DE PRODUCTOS
      ====================================== */}
      <Table
        striped     // filas con colores alternados
        bordered    // bordes visibles en celdas
        hover       // resalta la fila al pasar el mouse
        responsive  // permite scroll horizontal en pantallas pequeñas
      >

        <thead className="table-dark">

          <tr>
            <th>Código</th>
            <th>Nombre</th>
            <th>Categoría</th>
            <th>Valor</th>
            <th>Cantidad</th>
            <th>Subtotal</th>
            <th>Acciones</th>
          </tr>

        </thead>

        <tbody>

          {/* Renderizado condicional de 3 escenarios distintos: */}
          {loading ? (

            // 1) Mientras está cargando: fila única con spinner centrado
            <tr>

              <td
                colSpan="7"           // ocupa las 7 columnas de la tabla
                className="text-center"
              >

                <div
                  className="spinner-border text-primary"
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
                colSpan="7"
                className="text-center"
              >
                No se encontraron productos
              </td>

            </tr>

          ) : (

            // 3) Caso normal: se recorre el arreglo "productos" y se dibuja una fila por cada uno
            productos.map((producto) => {

              // Convierte el precio a número (por si viene como string desde la API),
              // usando 0 como valor por defecto si no existe
              const valor = Number(
                producto.precio_venta || 0
              );

              // Convierte el stock a número, con 0 como valor por defecto
              const cantidad = Number(
                producto.stock_actual || 0
              );

              // Calcula el subtotal (valor unitario * cantidad en stock)
              const subtotal =
                valor * cantidad;

              return (

                <tr
                  key={producto.codigo_producto} // key única requerida por React
                >

                  {/* Columna: código del producto */}
                  <td>
                    {producto.codigo_producto}
                  </td>

                  {/* Columna: nombre del producto */}
                  <td>
                    {producto.nombre}
                  </td>

                  {/* Columna: nombre de la categoría (viene ya resuelto desde el backend) */}
                  <td>
                    {producto.nombre_categoria}
                  </td>

                  {/* Columna: precio de venta formateado con separador de miles
                      en formato colombiano (es-CO), con símbolo "$" delante */}
                  <td>
                    $
                    {valor.toLocaleString(
                      'es-CO'
                    )}
                  </td>

                  {/* Columna: cantidad en stock */}
                  <td>
                    {cantidad}
                  </td>

                  {/* Columna: subtotal calculado, también formateado en es-CO */}
                  <td>
                    $
                    {subtotal.toLocaleString(
                      'es-CO'
                    )}
                  </td>

                  {/* Columna: botones de acciones (editar / eliminar) */}
                  <td>

                    {/* =========================
                        BOTÓN EDITAR
                    ========================= */}
                    {/* Abre el modal precargado con los datos de esta fila */}
                    <Button
                      variant="warning"
                      size="sm"
                      className="me-2" // margen a la derecha para separarlo del botón eliminar
                      onClick={() =>
                        handleEditProduct(
                          producto
                        )
                      }
                    >
                      <i className="bi bi-pencil"></i>
                      {' '}✏️
                    </Button>

                    {/* =========================
                        BOTÓN ELIMINAR
                    ========================= */}
                    {/* Pide confirmación y borra la fila */}
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() =>
                        handleDeleteProduct(
                          producto.codigo_producto
                        )
                      }
                    >
                      <i className="bi bi-trash"></i>
                      {' '}🗑️
                    </Button>

                  </td>

                </tr>

              );

            })

          )}

        </tbody>

      </Table>

      {/* ======================================
          PAGINACIÓN
      ====================================== */}
      {/* Solo se muestra el bloque de paginación si hay más de 1 página */}
      {pagination.totalPages > 1 && (

        <div className="d-flex justify-content-between align-items-center">

          {/* Texto informativo: cuántos registros se ven de cuántos hay en total */}
          <div>
            Mostrando {productos.length} de{' '}
            {pagination.totalItems} productos
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

      {/* ======================================
          MODAL PRODUCTO (formulario crear/editar)
      ====================================== */}
      <Modal
        show={showModal} // visible u oculto según el estado
        onHide={() =>
          setShowModal(false) // se cierra al hacer click fuera o en la "X"
        }
      >

        <Modal.Header closeButton>

          <Modal.Title>

            {/* Título dinámico: cambia según si se está editando o creando */}
            {editingProduct
              ? 'Editar Producto'
              : 'Nuevo Producto'}

          </Modal.Title>

        </Modal.Header>

        {/* El <Form> envuelve TODO el contenido del modal (body + footer)
            porque el botón "submit" está dentro del footer */}
        <Form
          noValidate                    // desactiva la validación nativa del navegador
          validated={validated}         // le dice a Bootstrap si debe mostrar estilos de validación
          onSubmit={handleSaveProduct}  // se ejecuta al enviar el formulario
        >

          <Modal.Body>

            {/* NOMBRE (obligatorio) */}
            <Form.Group className="mb-3">

              <Form.Label>
                Nombre del Producto *
              </Form.Label>

              <Form.Control
                type="text"
                name="nombre"                   // debe coincidir con la clave en formData
                value={formData.nombre}         // input controlado
                onChange={handleInputChange}    // handler genérico
                placeholder="Ej: Montura Ray-Ban"
                required                         // campo obligatorio
              />

              {/* Mensaje que aparece solo si el campo es inválido y ya se validó el form */}
              <Form.Control.Feedback type="invalid">
                El nombre del producto es requerido
              </Form.Control.Feedback>

            </Form.Group>

            {/* CÓDIGO (obligatorio) */}
            <Form.Group className="mb-3">

              <Form.Label>
                Código del Producto *
              </Form.Label>

              <Form.Control
                type="text"
                name="codigo_producto"
                value={formData.codigo_producto}
                onChange={handleInputChange}
                placeholder="Código único"
                required
                // Se bloquea la edición del código cuando se está EDITANDO
                // un producto existente, para no permitir cambiar su identificador
                disabled={!!editingProduct}
              />

              <Form.Control.Feedback type="invalid">
                El código del producto es requerido
              </Form.Control.Feedback>

            </Form.Group>

            {/* CATEGORÍA (obligatorio, campo numérico) */}
            <Form.Group className="mb-3">

              <Form.Label>
                ID de Categoría *
              </Form.Label>

              <Form.Control
                type="number"
                name="id_categoria"
                value={formData.id_categoria}
                onChange={handleInputChange}
                placeholder="Ej: 1"
                min="1"       // no permite valores menores a 1
                required
              />

              <Form.Control.Feedback type="invalid">
                La categoría es requerida
              </Form.Control.Feedback>

            </Form.Group>

            {/* VALOR (obligatorio, campo numérico decimal) */}
            <Form.Group className="mb-3">

              <Form.Label>
                Valor del Producto *
              </Form.Label>

              <Form.Control
                type="number"
                name="precio_venta"
                value={formData.precio_venta}
                onChange={handleInputChange}
                placeholder="Precio"
                min="0"       // no permite valores negativos
                step="0.01"   // permite decimales de a centavos
                required
              />

              <Form.Control.Feedback type="invalid">
                El valor del producto es requerido
              </Form.Control.Feedback>

            </Form.Group>

            {/* CANTIDAD (obligatorio, campo numérico entero) */}
            <Form.Group className="mb-3">

              <Form.Label>
                Cantidad del Producto *
              </Form.Label>

              <Form.Control
                type="number"
                name="stock_actual"
                value={formData.stock_actual}
                onChange={handleInputChange}
                placeholder="Cantidad"
                min="0"       // no permite valores negativos
                required
              />

              <Form.Control.Feedback type="invalid">
                La cantidad del producto es requerida
              </Form.Control.Feedback>

            </Form.Group>

          </Modal.Body>

          <Modal.Footer>

            {/* Botón para cerrar el modal sin guardar cambios */}
            <Button
              variant="secondary"
              onClick={() =>
                setShowModal(false)
              }
            >
              Cancelar
            </Button>

            {/* Botón de envío: al ser type="submit" dispara el onSubmit del <Form> */}
            <Button
              variant="primary"
              type="submit"
            >
              {/* Texto dinámico según si se está editando o creando */}
              {editingProduct
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
export default AgregarProductos;