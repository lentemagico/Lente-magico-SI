// ================== IMPORTS ==================
import { useState, useEffect } from 'react';
import "../../Styles/EstilosC.css";
// import Nav from "../../Components/Nav.jsx";


// ================== CONSTANTES: URLs de la API ==================
const API_URL = 'http://localhost:5000/api/productos';
// const API_URL_C = 'http://localhost:5000/api/productosC';
const API_URL_CATEGORIAS = 'http://localhost:5000/api/categorias';


// ================== COMPONENTE PRINCIPAL ==================
function ConsultarProducto() {

    // ---------- Estados del componente ----------
    const [productos, setProductos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [productoEditando, setProductoEditando] = useState(null);
    const [productoEliminando, setProductoEliminando] = useState(null);
    const [busqueda, setBusqueda] = useState('');
    const [mostrarInventario, setMostrarInventario] = useState(false);

    // Trae la lista de productos desde la API y normaliza el id
    const cargarProductos = async () => {

        try {

            const respuesta = await fetch(API_URL);

            if (!respuesta.ok) {
                throw new Error('No se pudieron consultar los productos');
            }

            const datos = await respuesta.json();

            // La API devuelve { productos: [...], pagination: {...} }
            const lista = Array.isArray(datos)
                ? datos
                : (datos.productos || datos.data || []);

            // Normalizamos el id: si por alguna razón el backend
            // o el estado local trae "id_producto" en vez de "id",
            // lo mapeamos igual para que nunca quede undefined.
            const datosNormalizados = lista.map(producto => ({
                ...producto,
                id: producto.id ?? producto.id_producto
            }));

            setProductos(datosNormalizados);

        } catch (error) {

            console.error(
                'Error al cargar productos:',
                error
            );

            setProductos([]);

        }

    };

    // Trae la lista de categorías activas desde la API (se usan en el selector del modal)
    const cargarCategorias = async () => {

        try {

            const respuesta = await fetch(API_URL_CATEGORIAS);

            if (!respuesta.ok) {
                throw new Error('No se pudieron consultar las categorías');
            }

            const datos = await respuesta.json();

            // Soporta tanto [...] directo como { categorias: [...] }
            const lista = Array.isArray(datos)
                ? datos
                : (datos.categorias || datos.data || []);

            // Solo mostramos categorías activas en el selector.
            // Si tu tabla no maneja "estado", esta línea deja pasar todo igual.
            const categoriasActivas = lista.filter(
                categoria => (categoria.estado ?? 'Activo') === 'Activo'
            );

            setCategorias(categoriasActivas);

        } catch (error) {

            console.error(
                'Error al cargar categorías:',
                error
            );

            setCategorias([]);

        }

    };

    // Al montar el componente: carga productos y categorías, y se suscribe
    // al evento "inventario-actualizado" para refrescar productos automáticamente
    useEffect(() => {

        cargarProductos();
        cargarCategorias();

        window.addEventListener(
            'inventario-actualizado',
            cargarProductos
        );

        return () => {

            window.removeEventListener(
                'inventario-actualizado',
                cargarProductos
            );
        };
    }, []);

    // Abre el modal de edición cargando una copia del producto seleccionado
    const abrirModal = (producto) => {

        setProductoEditando({
            ...producto
        });

    };

    // Cierra el modal de edición sin guardar
    const cerrarModal = () => {

        setProductoEditando(null);

    };

    // Envía los cambios del producto en edición al backend (PUT)
    const guardarCambios = async () => {

        if (!productoEditando) {
            return;
        }

        if (!productoEditando.id) {

            console.error(
                'No se puede guardar: el producto no tiene id',
                productoEditando
            );

            alert('No se pudo actualizar el producto: falta el identificador.');

            return;
        }

        const productoActualizado = {

            nombre: productoEditando.nombre,

            id_categoria: productoEditando.id_categoria
                ? Number(productoEditando.id_categoria)
                : null,

            precio_venta:
                Number(productoEditando.precio_venta) || 0,

            stock_actual:
                Number(productoEditando.stock_actual) || 0,

            stock_minimo:
                Number(productoEditando.stock_minimo) || 0

        };

        try {

            const respuesta = await fetch(
                `${API_URL}/${productoEditando.id}`,
                {
                    method: 'PUT',

                    headers: {
                        'Content-Type': 'application/json'
                    },

                    body: JSON.stringify(
                        productoActualizado
                    )
                }
            );

            const datos = await respuesta.json();

            if (!respuesta.ok) {

                throw new Error(
                    datos.mensaje ||
                    datos.message ||
                    'No se pudo actualizar el producto'
                );
            }

            await cargarProductos();

            cerrarModal();

        } catch (error) {

            console.error(
                'Error al editar producto:',
                error
            );

            alert(
                error.message ||
                'No se pudo actualizar el producto'
            );
        }
    };
    // Maneja los cambios de los inputs del modal de edición.
    // Para "nombre" filtra caracteres que no sean letras/espacios.
    const handleChange = (e) => {

        const { name, value } = e.target;

        const valorFinal =
            name === 'nombre'
                ? value.replace(/[^A-Za-zÁÉÍÓÚáéíóúñÑ\s]/g, "")
                : value;

        setProductoEditando(prev => ({
            ...prev,
            [name]: valorFinal
        }));
    };

    // Abre el modal de confirmación de eliminación para el producto seleccionado
    const abrirEliminar = (producto) => {

        // Guardia: si el producto no trae id (por ejemplo porque
        // fue insertado en el estado local sin pasar por
        // cargarProductos), avisamos en vez de dejar seguir con
        // un id "undefined" hacia el backend.
        if (!producto?.id) {

            console.warn(
                'Se intentó eliminar un producto sin id válido:',
                producto
            );

            alert(
                'No se pudo identificar el producto. ' +
                'Intenta recargar la página e intentarlo de nuevo.'
            );

            return;
        }

        setProductoEliminando({
            ...producto
        });
    };

    // Cierra el modal de confirmación de eliminación sin borrar nada
    const cerrarEliminar = () => {

        setProductoEliminando(null);

    };

    // Elimina definitivamente el producto confirmado (DELETE al backend)
    const confirmarEliminar = async () => {

        if (!productoEliminando?.id) {

            console.error(
                'No se puede eliminar: falta el id del producto',
                productoEliminando
            );

            alert('No se pudo eliminar el producto: falta el identificador.');

            cerrarEliminar();

            return;
        }

        try {

            const respuesta = await fetch(
                `${API_URL}/${productoEliminando.id}`,
                {
                    method: 'DELETE'
                }
            );

            const datos = await respuesta.json();

            if (!respuesta.ok) {

                throw new Error(
                    datos.mensaje ||
                    datos.message ||
                    'No se pudo eliminar el producto'
                );
            }

            await cargarProductos();

            cerrarEliminar();

        } catch (error) {

            console.error(
                'Error al eliminar producto:',
                error
            );

            alert(
                error.message ||
                'No se pudo eliminar el producto'
            );
        }
    };

    // Lista de productos filtrada según el texto de búsqueda (nombre o código)
    const productosFiltrados = productos.filter(producto => {

        const nombre =
            producto?.nombre?.toLowerCase() || '';

        const codigo =
            String(
                producto?.codigo_producto || ''
            );

        const textoBusqueda =
            busqueda.toLowerCase();

        return (
            nombre.includes(textoBusqueda) ||
            codigo.includes(textoBusqueda)
        );
    });

    // ================== RENDER ==================
    return (

        <>

            {/* <Nav /> */}

            <div className="page-container">

                {/* Barra superior: título y botón de acceso al inventario */}
                <div className="top-bar">

                    <h2>
                        Consultar Productos
                    </h2>

                    <div
                        style={{
                            display: 'flex',
                            gap: '10px'
                        }}
                    >

                        <button
                            className="btn-primary"
                            onClick={() =>
                                setMostrarInventario(true)
                            }
                        >
                            📦 Inventario
                        </button>

                    </div>

                </div>

                {/* Buscador por nombre o código de producto */}
                <input
                    type="text"
                    className="buscador"
                    placeholder="Buscar..."
                    value={busqueda}
                    onChange={(e) =>
                        setBusqueda(e.target.value)
                    }
                />

                {/* Tabla principal con el listado de productos filtrados */}
                <table className="tabla-productos">

                    <thead>

                        <tr>

                            <th>
                                Código
                            </th>

                            <th>
                                Producto
                            </th>

                            <th>
                                Categoría
                            </th>

                            <th>
                                Precio
                            </th>

                            <th>
                                Stock
                            </th>

                            <th>
                                Acciones
                            </th>

                        </tr>

                    </thead>

                    <tbody>

                        {productosFiltrados.map(producto => (

                            <tr
                                key={producto.id}
                            >

                                <td>
                                    {producto.codigo_producto}
                                </td>

                                <td>
                                    <strong>
                                        {producto.nombre}
                                    </strong>
                                </td>

                                <td>
                                    {producto.nombre_categoria || producto.categoria || '-'}
                                </td>

                                <td>
                                    $
                                    {Number(
                                        producto.precio_venta || 0
                                    ).toLocaleString()}
                                </td>

                                <td>
                                    {producto.stock_actual}
                                </td>

                                <td>

                                    <button
                                        className="btn-accion"
                                        title="Editar"
                                        aria-label="Editar"
                                        onClick={() =>
                                            abrirModal(producto)
                                        }
                                    >
                                        ✏️
                                    </button>

                                    <button
                                        className="btn-accion eliminar"
                                        title="Eliminar"
                                        aria-label="Eliminar"
                                        onClick={() =>
                                            abrirEliminar(producto)
                                        }
                                    >
                                        🗑️
                                    </button>

                                </td>

                            </tr>

                        ))}

                    </tbody>

                </table>

                {/* ===== Modal: editar producto ===== */}
                {productoEditando && (

                    <div className="modal-overlay">

                        <div
                            className="modal-editar"
                            style={{
                                maxWidth: '400px',
                                width: '90%'
                            }}
                        >

                            <h5 className="modal-titulo">
                                Editar Producto
                            </h5>

                            <div
                                className="form-container"
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px'
                                }}
                            >

                                <div className="form-group">

                                    <label
                                        style={{
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        Nombre del Producto
                                    </label>

                                    <input
                                        type="text"
                                        name="nombre"
                                        className="form-control"
                                        value={
                                            productoEditando.nombre || ''
                                        }
                                        onChange={handleChange}
                                    />

                                </div>

                                <div className="form-group">

                                    <label
                                        style={{
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        Categoría
                                    </label>

                                    <select
                                        name="id_categoria"
                                        className="form-select"
                                        value={
                                            productoEditando.id_categoria || ''
                                        }
                                        onChange={handleChange}
                                    >

                                        <option value="">
                                            Seleccione una categoría
                                        </option>

                                        {categorias.map(categoria => (

                                            <option
                                                key={categoria.id_categoria}
                                                value={categoria.id_categoria}
                                            >
                                                {categoria.nombre_categoria}
                                            </option>

                                        ))}

                                    </select>

                                </div>

                                <div
                                    style={{
                                        display: 'flex',
                                        gap: '10px'
                                    }}
                                >

                                    <div
                                        className="form-group"
                                        style={{
                                            flex: 1
                                        }}
                                    >

                                        <label
                                            style={{
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            Stock Actual
                                        </label>

                                        <input
                                            type="number"
                                            name="stock_actual"
                                            className="form-control"
                                            value={
                                                productoEditando.stock_actual ?? 0
                                            }
                                            onChange={handleChange}
                                        />

                                    </div>

                                    <div
                                        className="form-group"
                                        style={{
                                            flex: 1
                                        }}
                                    >

                                        <label
                                            style={{
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            Stock Mínimo
                                        </label>

                                        <input
                                            type="number"
                                            name="stock_minimo"
                                            className="form-control"
                                            value={
                                                productoEditando.stock_minimo ?? 0
                                            }
                                            onChange={handleChange}
                                        />

                                    </div>

                                </div>

                                <div className="form-group">

                                    <label
                                        style={{
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        Precio de Venta
                                    </label>

                                    <input
                                        type="number"
                                        name="precio_venta"
                                        className="form-control"
                                        value={
                                            productoEditando.precio_venta ?? 0
                                        }
                                        onChange={handleChange}
                                    />

                                </div>

                            </div>

                            <div
                                className="modal-btns"
                                style={{
                                    marginTop: '20px',
                                    display: 'flex',
                                    justifyContent: 'flex-end',
                                    gap: '10px'
                                }}
                            >

                                <button
                                    className="btn-cancelar"
                                    onClick={cerrarModal}
                                >
                                    Cancelar
                                </button>


                                <button
                                    className="btn-primary"
                                    onClick={guardarCambios}
                                >
                                    Guardar Cambios
                                </button>

                            </div>

                        </div>

                    </div>
                )}

                {/* ===== Modal: confirmar eliminación ===== */}
                {productoEliminando && (

                    <div className="modal-overlay">

                        <div
                            className="modal-editar"
                            style={{
                                textAlign: 'center',
                                padding: '20px'
                            }}
                        >

                            <h5
                                style={{
                                    color: '#d9534f',
                                    marginBottom: '15px'
                                }}
                            >
                                Confirmar Eliminación
                            </h5>

                            <p>

                                ¿Estás seguro de que deseas
                                eliminar

                                {' '}

                                <strong>
                                    {productoEliminando.nombre}
                                </strong>

                                ?

                                Esta acción no se puede deshacer.

                            </p>

                            <div
                                className="modal-btns"
                                style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    gap: '15px',
                                    marginTop: '20px'
                                }}
                            >

                                <button
                                    className="btn-cancelar"
                                    onClick={cerrarEliminar}
                                >
                                    Cancelar
                                </button>

                                <button
                                    className="btn-primary"
                                    style={{
                                        backgroundColor: '#d9534f'
                                    }}
                                    onClick={confirmarEliminar}
                                >
                                    Eliminar Producto
                                </button>

                            </div>

                        </div>

                    </div>
                )}

                {/* ===== Modal: estado del inventario (stock bajo / suficiente) ===== */}
                {mostrarInventario && (

                    <div className="modal-overlay">

                        <div
                            className="modal-editar"
                            style={{
                                maxWidth: '700px',
                                width: '95%'
                            }}
                        >

                            <h5 className="modal-titulo">
                                Estado del Inventario
                            </h5>


                            <table className="tabla-productos">

                                <thead>

                                    <tr>

                                        <th>
                                            Producto
                                        </th>

                                        <th>
                                            Categoría
                                        </th>

                                        <th>
                                            Stock Actual
                                        </th>

                                        <th>
                                            Stock Mínimo
                                        </th>

                                        <th>
                                            Estado
                                        </th>

                                    </tr>

                                </thead>

                                <tbody>

                                    {productos.map(producto => {

                                        const bajoStock =
                                            Number(
                                                producto.stock_actual
                                            ) <=
                                            Number(
                                                producto.stock_minimo
                                            );


                                        return (

                                            <tr
                                                key={producto.id}
                                                style={{
                                                    backgroundColor:
                                                        bajoStock
                                                            ? '#fdecea'
                                                            : 'transparent'
                                                }}
                                            >

                                                <td>
                                                    <strong>
                                                        {producto.nombre}
                                                    </strong>
                                                </td>


                                                <td>
                                                    {producto.nombre_categoria || producto.categoria || '-'}
                                                </td>


                                                <td>
                                                    {producto.stock_actual}
                                                </td>


                                                <td>
                                                    {producto.stock_minimo}
                                                </td>


                                                <td>

                                                    <span
                                                        style={{
                                                            color:
                                                                bajoStock
                                                                    ? '#d9534f'
                                                                    : '#28a745',

                                                            fontWeight:
                                                                'bold'
                                                        }}
                                                    >

                                                        {bajoStock
                                                            ? 'Stock Bajo'
                                                            : 'Suficiente'}

                                                    </span>

                                                </td>

                                            </tr>

                                        );

                                    })}

                                </tbody>

                            </table>

                            <div
                                className="modal-btns"
                                style={{
                                    marginTop: '20px',
                                    display: 'flex',
                                    justifyContent: 'flex-end'
                                }}
                            >

                                <button
                                    className="btn-cancelar"
                                    onClick={() =>
                                        setMostrarInventario(false)
                                    }
                                >
                                    Cerrar
                                </button>

                            </div>

                        </div>

                    </div>

                )}

            </div>

        </>

    );

}

export default ConsultarProducto;