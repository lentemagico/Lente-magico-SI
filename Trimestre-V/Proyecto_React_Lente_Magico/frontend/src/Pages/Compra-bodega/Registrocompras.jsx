// ================== IMPORTS ==================
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import "../../Styles/Stylec.css";
// import Nav from "../../Components/Nav.jsx";

// ================== CONSTANTES: URLs de la API ==================
const COMPRAS_API_URL = "http://localhost:5000/api/compras";
const PRODUCTOS_API_URL = "http://localhost:5000/api/productos";
const PROVEEDORES_API_URL = "http://localhost:5000/api/proveedores";
const CATEGORIAS_API_URL = "http://localhost:5000/api/categorias";

// Estado inicial/limpio del formulario de compra (para "registrar" y para resetear)
const formVacio = {
    idProveedor: '',
    fechaCompra: '',
    numComprobante: '',
    estado: 'Pendiente',
    detalle: [{ nombreProducto: '', cantidad: '', costoUnitario: '' }],
};

// ================== COMPONENTE PRINCIPAL ==================
function RegistroCompras() {
    const navigate = useNavigate();

    // ---------- Estados del componente ----------
    const [busqueda, setBusqueda] = useState('');
    const [compras, setCompras] = useState([]);
    const [productos, setProductos] = useState([]);
    const [proveedoresLista, setProveedoresLista] = useState([]);
    const [categorias, setCategorias] = useState([]);

    const [mostrarAgregar, setMostrarAgregar] = useState(false);
    const [formNuevo, setFormNuevo] = useState(formVacio);

    const [facturaVista, setFacturaVista] = useState(null);

    // NUEVO: controla si estamos editando
    const [editando, setEditando] = useState(false);
    const [compraEditando, setCompraEditando] = useState(null);

    // Al montar el componente, carga compras, productos, proveedores y categorías
    useEffect(() => {
        cargarCompras();
        cargarProductos();
        cargarProveedores();
        cargarCategorias();
    }, []);

    // Trae la lista de compras desde la API
    const cargarCompras = async () => {
        try {
            const response = await fetch(COMPRAS_API_URL);

            if (!response.ok) {
                throw new Error('Error al obtener compras');
            }

            const data = await response.json();

            // Soporta tanto [...] directo como { compras: [...] }
            const lista = Array.isArray(data)
                ? data
                : (data.compras || data.data || []);

            setCompras(lista);

        } catch (error) {
            console.error("Error al traer las compras de la API:", error);
            setCompras([]);
        }
    };

    // Trae la lista de productos desde la API
    const cargarProductos = async () => {
        try {
            const response = await fetch(PRODUCTOS_API_URL);

            if (!response.ok) {
                throw new Error('Error al obtener productos');
            }

            const data = await response.json();

            // La API devuelve { productos: [...], pagination: {...} }
            setProductos(Array.isArray(data.productos) ? data.productos : []);

        } catch (error) {
            console.error("Error al traer los productos de la API:", error);
            setProductos([]);
        }
    };

    // Trae la lista de proveedores desde la API (para el selector del formulario)
    const cargarProveedores = async () => {
        try {
            const response = await fetch(PROVEEDORES_API_URL);

            if (!response.ok) {
                throw new Error('Error al obtener proveedores');
            }

            const data = await response.json();

            // Soporta tanto [...] directo como { proveedores: [...] }
            const lista = Array.isArray(data)
                ? data
                : (data.proveedores || data.data || []);

            setProveedoresLista(lista);

        } catch (error) {
            console.error("Error al traer los proveedores de la API:", error);
            setProveedoresLista([]);
        }
    };

    // Trae la lista de categorías desde la API (se usa para asignar categoría
    // por defecto a productos nuevos creados desde una compra)
    const cargarCategorias = async () => {
        try {
            const response = await fetch(CATEGORIAS_API_URL);

            if (!response.ok) {
                throw new Error('Error al obtener categorías');
            }

            const data = await response.json();

            // Soporta tanto [...] directo como { categorias: [...] }
            const lista = Array.isArray(data)
                ? data
                : (data.categorias || data.data || []);

            setCategorias(lista);

        } catch (error) {
            console.error("Error al traer las categorías de la API:", error);
            setCategorias([]);
        }
    };

    // Lista de compras filtrada según el texto de búsqueda (ID, proveedor, comprobante o estado)
    const comprasFiltradas = compras.filter((c) =>
        c.id?.toString().toLowerCase().includes(busqueda.toLowerCase()) ||
        c.idProveedor?.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.numComprobante?.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.estado?.toLowerCase().includes(busqueda.toLowerCase())
    );

    // Suma el total de una compra a partir de su detalle (cantidad x costo unitario)
    const calcularTotal = (detalle) =>
        detalle
            ? detalle.reduce(
                (acc, d) =>
                    acc +
                    (Number(d.cantidad) * Number(d.costoUnitario)),
                0
            )
            : 0;

    // Da formato de moneda colombiana (COP) a un valor numérico
    const formatPeso = (valor) =>
        '$' + Number(valor).toLocaleString('es-CO');

    // Totales para las tarjetas de estadísticas del encabezado
    const totalCompletadas = compras.filter(
        c => c.estado === 'Completada'
    ).length;

    const totalPendientes = compras.filter(
        c => c.estado === 'Pendiente'
    ).length;

    // Maneja los cambios de los campos generales del formulario de compra
    // (proveedor, fecha, comprobante, estado)
    const handleChangeNuevo = (e) => {
        setFormNuevo({
            ...formNuevo,
            [e.target.name]: e.target.value
        });
    };

    // Maneja los cambios de una línea del detalle de la compra
    // (producto, cantidad, costo unitario). Filtra letras para el nombre del producto.
    const handleChangeDetalleNuevo = (index, e) => {
        const nuevaLinea = [...formNuevo.detalle];
        const { name, value } = e.target;

        nuevaLinea[index][name] =
            name === 'nombreProducto'
                ? value.replace(/[^A-Za-zÁÉÍÓÚáéíóúñÑ\s]/g, '')
                : value;

        setFormNuevo({
            ...formNuevo,
            detalle: nuevaLinea
        });
    };

    // Agrega una nueva línea vacía al detalle de la compra
    const handleAgregarLineaNuevo = () =>
        setFormNuevo({
            ...formNuevo,
            detalle: [
                ...formNuevo.detalle,
                {
                    nombreProducto: '',
                    cantidad: '',
                    costoUnitario: ''
                }
            ]
        });

    // Elimina una línea del detalle de la compra por su índice
    const handleEliminarLineaNuevo = (index) =>
        setFormNuevo({
            ...formNuevo,
            detalle: formNuevo.detalle.filter(
                (_, i) => i !== index
            )
        });

    // ==========================================================
    // ACTUALIZAR INVENTARIO
    // ==========================================================

    const actualizarInventario = async (detalle) => {
        try {
            const categoriaDefault = categorias.find(
                (cat) =>
                    (cat.nombre_categoria || '')
                        .trim()
                        .toLowerCase() === 'monturas'
            );

            const id_categoria_default =
                categoriaDefault?.id_categoria ?? null;

            // Por cada línea del detalle: si el producto ya existe, suma stock;
            // si no existe, lo crea con el stock inicial de la compra.
            for (const linea of detalle) {

                const nombreBuscado =
                    linea.nombreProducto.trim().toLowerCase();

                const producto = productos.find(
                    (p) =>
                        p.nombre?.trim().toLowerCase() === nombreBuscado
                );

                if (producto) {

                    const nuevoStock =
                        Number(producto.stock_actual || 0) +
                        Number(linea.cantidad || 0);

                    const resp = await fetch(
                        `${PRODUCTOS_API_URL}/${producto.id_producto}`,
                        {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                ...producto,
                                stock_actual: nuevoStock
                            })
                        }
                    );

                    if (!resp.ok) {
                        console.error(
                            `No se pudo actualizar el stock de "${producto.nombre}"`
                        );
                    }

                } else {

                    const codigo_producto =
                        `PRD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

                    const resp = await fetch(
                        PRODUCTOS_API_URL,
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                id_categoria: id_categoria_default,
                                codigo_producto,
                                nombre: linea.nombreProducto.trim(),
                                descripcion: '',
                                precio_venta: Number(
                                    linea.costoUnitario || 0
                                ),
                                estado: 'Activo',
                                stock_actual: Number(
                                    linea.cantidad || 0
                                ),
                                stock_minimo: 0,
                            })
                        }
                    );

                    if (!resp.ok) {
                        console.error(
                            `No se pudo crear el producto "${linea.nombreProducto}"`
                        );
                    }
                }
            }

            await cargarProductos();

            window.dispatchEvent(
                new Event('inventario-actualizado')
            );

        } catch (error) {
            console.error(
                "Error al actualizar el inventario:",
                error
            );
        }
    };

    // ==========================================================
    // AGREGAR COMPRA
    // ==========================================================

    const handleAgregar = async () => {
        try {

            const objetoAEnviar = {
                ...formNuevo,

                detalle: formNuevo.detalle.map(d => ({
                    nombreProducto: d.nombreProducto.trim(),
                    cantidad: Number(d.cantidad),
                    costoUnitario: Number(d.costoUnitario)
                }))
            };

            const response = await fetch(
                COMPRAS_API_URL,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(objetoAEnviar)
                }
            );

            if (!response.ok) {

                let detalle = null;

                try {
                    detalle = await response.json();
                } catch {
                    // Sin respuesta JSON
                }

                console.error(
                    'Detalle del error del servidor:',
                    detalle
                );

                throw new Error(
                    detalle?.message ||
                    detalle?.error ||
                    `Error al crear la compra (HTTP ${response.status})`
                );
            }

            if (objetoAEnviar.estado !== 'Anulada') {
                await actualizarInventario(
                    objetoAEnviar.detalle
                );
            }

            await cargarCompras();

            setFormNuevo(formVacio);
            setMostrarAgregar(false);

        } catch (error) {

            console.error(
                "Error al guardar la compra en el servidor:",
                error
            );
        }
    };

    // ==========================================================
    // NUEVO: EDITAR COMPRA
    // ==========================================================

    const handleEditar = (compra) => {

        setCompraEditando(compra);

        setFormNuevo({
            idProveedor: compra.idProveedor || '',
            fechaCompra: compra.fechaCompra || '',
            numComprobante: compra.numComprobante || '',
            estado: compra.estado || 'Pendiente',

            detalle: compra.detalle?.length
                ? compra.detalle.map(d => ({
                    nombreProducto: d.nombreProducto || '',
                    cantidad: d.cantidad || '',
                    costoUnitario: d.costoUnitario || ''
                }))
                : [
                    {
                        nombreProducto: '',
                        cantidad: '',
                        costoUnitario: ''
                    }
                ]
        });

        setEditando(true);
        setMostrarAgregar(false);
    };

    // ==========================================================
    // NUEVO: ACTUALIZAR COMPRA
    // ==========================================================

    const handleActualizar = async () => {

        try {

            if (!compraEditando) {
                return;
            }

            const objetoAEnviar = {
                ...formNuevo,

                detalle: formNuevo.detalle.map(d => ({
                    nombreProducto: d.nombreProducto.trim(),
                    cantidad: Number(d.cantidad),
                    costoUnitario: Number(d.costoUnitario)
                }))
            };

            const response = await fetch(
                `${COMPRAS_API_URL}/${compraEditando.id}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(objetoAEnviar)
                }
            );

            if (!response.ok) {

                let detalle = null;

                try {
                    detalle = await response.json();
                } catch {
                    // Sin respuesta JSON
                }

                console.error(
                    'Detalle del error del servidor:',
                    detalle
                );

                throw new Error(
                    detalle?.message ||
                    detalle?.error ||
                    `Error al actualizar la compra (HTTP ${response.status})`
                );
            }

            await cargarCompras();

            setFormNuevo(formVacio);
            setEditando(false);
            setCompraEditando(null);

        } catch (error) {

            console.error(
                "Error al actualizar la compra:",
                error
            );
        }
    };

    // ==========================================================
    // NUEVO: ELIMINAR COMPRA
    // ==========================================================

    const handleEliminar = async (compra) => {

        const confirmar = window.confirm(
            `¿Está seguro de eliminar la compra #${compra.id}?`
        );

        if (!confirmar) {
            return;
        }

        try {

            const response = await fetch(
                `${COMPRAS_API_URL}/${compra.id}`,
                {
                    method: 'DELETE'
                }
            );

            if (!response.ok) {

                let detalle = null;

                try {
                    detalle = await response.json();
                } catch {
                    // Sin respuesta JSON
                }

                throw new Error(
                    detalle?.message ||
                    detalle?.error ||
                    `Error al eliminar la compra (HTTP ${response.status})`
                );
            }

            await cargarCompras();

        } catch (error) {

            console.error(
                "Error al eliminar la compra:",
                error
            );

            alert(
                "No se pudo eliminar la compra."
            );
        }
    };

    // ==========================================================
    // CANCELAR EDICIÓN
    // ==========================================================

    const cancelarEdicion = () => {

        setFormNuevo(formVacio);
        setEditando(false);
        setCompraEditando(null);
    };

    // Devuelve los colores (fondo/texto/borde) según el estado de la compra
    const estadoColor = (estado) => {

        if (estado === 'Completada') {
            return {
                bg: '#d1fae5',
                color: '#065f46',
                border: '#6ee7b7'
            };
        }

        if (estado === 'Pendiente') {
            return {
                bg: '#fef3c7',
                color: '#92400e',
                border: '#fcd34d'
            };
        }

        return {
            bg: '#f3f4f6',
            color: '#374151',
            border: '#d1d5db'
        };
    };

    // ================== RENDER ==================
    return (
        <>
            {/* <Nav/> */}

            {/* ==================================================
                MODAL VER FACTURA
            ================================================== */}

            {facturaVista && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                    style={{
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        zIndex: 9999
                    }}
                >

                    <div
                        className="shadow-lg rounded-4 bg-white p-4"
                        style={{
                            maxWidth: '580px',
                            width: '100%'
                        }}
                    >

                        <div className="d-flex justify-content-between align-items-center mb-3">

                            <div>

                                <h5 className="fw-bold mb-0">
                                    🧾 Factura de compra
                                </h5>

                                <small className="text-muted">
                                    {facturaVista.numComprobante}
                                </small>

                            </div>

                            <span
                                style={{
                                    ...(() => {
                                        const s =
                                            estadoColor(
                                                facturaVista.estado
                                            );

                                        return {
                                            backgroundColor: s.bg,
                                            color: s.color,
                                            border: `1px solid ${s.border}`
                                        };
                                    })(),

                                    padding: '4px 12px',
                                    borderRadius: '20px',
                                    fontSize: '12px',
                                    fontWeight: '600'
                                }}
                            >
                                {facturaVista.estado}
                            </span>

                        </div>

                        <hr />

                        <div
                            className="row g-2 mb-3"
                            style={{ fontSize: '13px' }}
                        >

                            {[
                                ['N° Compra', facturaVista.id],
                                ['Proveedor', facturaVista.idProveedor],
                                ['Fecha', facturaVista.fechaCompra],
                                ['Comprobante', facturaVista.numComprobante],
                            ].map(([label, val]) => (

                                <div
                                    className="col-6"
                                    key={label}
                                >

                                    <div
                                        className="rounded-3 p-2"
                                        style={{
                                            backgroundColor: '#f8fafc',
                                            border: '1px solid #e2e8f0'
                                        }}
                                    >

                                        <div
                                            className="text-muted"
                                            style={{ fontSize: '11px' }}
                                        >
                                            {label}
                                        </div>

                                        <div className="fw-semibold">
                                            {val}
                                        </div>

                                    </div>

                                </div>

                            ))}

                        </div>

                        <table
                            className="table table-sm mb-3"
                            style={{ fontSize: '13px' }}
                        >

                            <thead
                                style={{
                                    backgroundColor: '#f1f5f9'
                                }}
                            >

                                <tr>
                                    <th>Producto</th>
                                    <th className="text-center">
                                        Cant.
                                    </th>
                                    <th className="text-end">
                                        Costo unit.
                                    </th>
                                    <th className="text-end">
                                        Subtotal
                                    </th>
                                </tr>

                            </thead>

                            <tbody>

                                {facturaVista.detalle.map(
                                    (d, i) => (

                                        <tr key={i}>

                                            <td>
                                                {d.nombreProducto}
                                            </td>

                                            <td className="text-center">
                                                {d.cantidad}
                                            </td>

                                            <td className="text-end">
                                                {formatPeso(
                                                    d.costoUnitario
                                                )}
                                            </td>

                                            <td className="text-end">
                                                {formatPeso(
                                                    Number(d.cantidad) *
                                                    Number(d.costoUnitario)
                                                )}
                                            </td>

                                        </tr>

                                    )
                                )}

                            </tbody>

                            <tfoot>

                                <tr>

                                    <td
                                        colSpan="3"
                                        className="text-end fw-bold"
                                    >
                                        Total
                                    </td>

                                    <td
                                        className="text-end fw-bold"
                                        style={{
                                            color: '#0f172a'
                                        }}
                                    >
                                        {formatPeso(
                                            calcularTotal(
                                                facturaVista.detalle
                                            )
                                        )}
                                    </td>

                                </tr>

                            </tfoot>

                        </table>

                        <div className="d-flex justify-content-end">

                            <button
                                className="btn btn-sm btn-outline-secondary rounded-pill px-4"
                                onClick={() =>
                                    setFacturaVista(null)
                                }
                            >
                                Cerrar
                            </button>

                        </div>

                    </div>

                </div>
            )}

            <div className="container py-4">

                {/* ==================================================
                    ENCABEZADO
                ================================================== */}

                <div className="row g-3 mb-4 align-items-center">

                    <div className="col-md-5">

                        <h4 className="fw-bold mb-0">
                            Registro de compras
                        </h4>

                        <p
                            className="text-muted mb-0"
                            style={{ fontSize: '13px' }}
                        >
                            Gestión de compras a proveedores
                        </p>

                    </div>

                    <div className="col-md-7">

                        <div className="d-flex gap-3 justify-content-md-end flex-wrap">

                            {[
                                {
                                    label: 'Total compras',
                                    value: compras.length,
                                    color: '#3b82f6',
                                    bg: '#eff6ff'
                                },
                                {
                                    label: 'Completadas',
                                    value: totalCompletadas,
                                    color: '#10b981',
                                    bg: '#ecfdf5'
                                },
                                {
                                    label: 'Pendientes',
                                    value: totalPendientes,
                                    color: '#f59e0b',
                                    bg: '#fffbeb'
                                },
                            ].map(
                                ({
                                    label,
                                    value,
                                    color,
                                    bg
                                }) => (

                                    <div
                                        key={label}
                                        className="rounded-3 px-3 py-2 text-center"
                                        style={{
                                            backgroundColor: bg,
                                            minWidth: '90px'
                                        }}
                                    >

                                        <div
                                            className="fw-bold"
                                            style={{
                                                color,
                                                fontSize: '20px'
                                            }}
                                        >
                                            {value}
                                        </div>

                                        <div
                                            style={{
                                                fontSize: '11px',
                                                color: '#64748b'
                                            }}
                                        >
                                            {label}
                                        </div>

                                    </div>

                                )
                            )}

                        </div>

                    </div>

                </div>

                {/* ==================================================
                    FORMULARIO REGISTRAR / EDITAR
                ================================================== */}

                {(mostrarAgregar || editando) && (

                    <div
                        className="card rounded-4 border-0 shadow-sm p-4 mb-4"
                        style={{
                            borderLeft:
                                '4px solid #3b82f6 !important'
                        }}
                    >

                        <h6 className="fw-bold mb-3">

                            {editando
                                ? 'Editar compra'
                                : 'Registrar nueva compra'}

                        </h6>

                        <div className="row g-3">

                            {/* PROVEEDOR */}

                            <div className="col-md-6">

                                <label
                                    className="form-label"
                                    style={{ fontSize: '13px' }}
                                >
                                    Proveedor
                                </label>

                                <select
                                    className="form-select"
                                    name="idProveedor"
                                    value={formNuevo.idProveedor}
                                    onChange={handleChangeNuevo}
                                >

                                    <option value="">
                                        Seleccionar proveedor
                                    </option>

                                    {proveedoresLista.map(
                                        (p) => (

                                            <option
                                                key={p.id_proveedor}
                                                value={p.razon_social}
                                            >
                                                {p.razon_social}
                                            </option>

                                        )
                                    )}

                                </select>

                            </div>

                            {/* FECHA */}

                            <div className="col-md-6">

                                <label
                                    className="form-label"
                                    style={{ fontSize: '13px' }}
                                >
                                    Fecha de compra
                                </label>

                                <input
                                    type="date"
                                    className="form-control"
                                    name="fechaCompra"
                                    value={formNuevo.fechaCompra}
                                    onChange={handleChangeNuevo}
                                />

                            </div>

                            {/* COMPROBANTE */}

                            <div className="col-md-6">

                                <label
                                    className="form-label"
                                    style={{ fontSize: '13px' }}
                                >
                                    N° Comprobante
                                </label>

                                <input
                                    type="text"
                                    className="form-control"
                                    name="numComprobante"
                                    value={formNuevo.numComprobante}
                                    onChange={handleChangeNuevo}
                                    placeholder="FAC-0000"
                                />

                            </div>

                            {/* ESTADO */}

                            <div className="col-md-6">

                                <label
                                    className="form-label"
                                    style={{ fontSize: '13px' }}
                                >
                                    Estado
                                </label>

                                <select
                                    className="form-select"
                                    name="estado"
                                    value={formNuevo.estado}
                                    onChange={handleChangeNuevo}
                                >

                                    <option value="Pendiente">
                                        Pendiente
                                    </option>

                                    <option value="Completada">
                                        Completada
                                    </option>

                                    <option value="Anulada">
                                        Anulada
                                    </option>

                                </select>

                                <small
                                    className="text-muted"
                                    style={{ fontSize: '11px' }}
                                >
                                    El inventario se actualiza en
                                    cualquier estado, excepto
                                    "Anulada".
                                </small>

                            </div>

                            {/* DETALLE */}

                            <div className="col-12">

                                <label
                                    className="form-label fw-bold"
                                    style={{ fontSize: '13px' }}
                                >
                                    Detalle de compra
                                </label>

                                <datalist id="lista-productos">

                                    {productos.map(
                                        (p) => (

                                            <option
                                                key={p.id_producto}
                                                value={p.nombre}
                                            />

                                        )
                                    )}

                                </datalist>

                                <table
                                    className="table table-bordered table-sm"
                                >

                                    <thead className="table-light">

                                        <tr>

                                            <th
                                                style={{
                                                    fontSize: '12px'
                                                }}
                                            >
                                                Producto
                                            </th>

                                            <th
                                                style={{
                                                    fontSize: '12px'
                                                }}
                                            >
                                                Cantidad
                                            </th>

                                            <th
                                                style={{
                                                    fontSize: '12px'
                                                }}
                                            >
                                                Costo unitario
                                            </th>

                                            <th
                                                style={{
                                                    fontSize: '12px'
                                                }}
                                            >
                                                Subtotal
                                            </th>

                                            <th></th>

                                        </tr>

                                    </thead>

                                    <tbody>

                                        {formNuevo.detalle.map(
                                            (d, index) => (

                                                <tr key={index}>

                                                    <td>

                                                        <input
                                                            type="text"
                                                            list="lista-productos"
                                                            className="form-control form-control-sm"
                                                            name="nombreProducto"
                                                            placeholder="Escribe o elige un producto"
                                                            value={d.nombreProducto}
                                                            onChange={(e) =>
                                                                handleChangeDetalleNuevo(
                                                                    index,
                                                                    e
                                                                )
                                                            }
                                                        />

                                                    </td>

                                                    <td>

                                                        <input
                                                            type="number"
                                                            className="form-control form-control-sm"
                                                            name="cantidad"
                                                            value={d.cantidad}
                                                            onChange={(e) =>
                                                                handleChangeDetalleNuevo(
                                                                    index,
                                                                    e
                                                                )
                                                            }
                                                            min="1"
                                                        />

                                                    </td>

                                                    <td>

                                                        <input
                                                            type="number"
                                                            className="form-control form-control-sm"
                                                            name="costoUnitario"
                                                            value={d.costoUnitario}
                                                            onChange={(e) =>
                                                                handleChangeDetalleNuevo(
                                                                    index,
                                                                    e
                                                                )
                                                            }
                                                            min="0"
                                                        />

                                                    </td>

                                                    <td
                                                        style={{
                                                            fontSize: '13px',
                                                            verticalAlign:
                                                                'middle'
                                                        }}
                                                    >

                                                        {formatPeso(
                                                            Number(
                                                                d.cantidad ||
                                                                0
                                                            ) *
                                                            Number(
                                                                d.costoUnitario ||
                                                                0
                                                            )
                                                        )}

                                                    </td>

                                                    <td>

                                                        {formNuevo.detalle.length >
                                                            1 && (

                                                                <button
                                                                    className="btn btn-sm btn-outline-danger"
                                                                    onClick={() =>
                                                                        handleEliminarLineaNuevo(
                                                                            index
                                                                        )
                                                                    }
                                                                >
                                                                    ✕
                                                                </button>

                                                            )}

                                                    </td>

                                                </tr>

                                            )
                                        )}

                                    </tbody>

                                    <tfoot>

                                        <tr>

                                            <td
                                                colSpan="3"
                                                className="text-end fw-bold"
                                                style={{
                                                    fontSize: '13px'
                                                }}
                                            >
                                                Total
                                            </td>

                                            <td
                                                className="fw-bold"
                                                style={{
                                                    fontSize: '13px'
                                                }}
                                            >
                                                {formatPeso(
                                                    calcularTotal(
                                                        formNuevo.detalle
                                                    )
                                                )}
                                            </td>

                                            <td></td>

                                        </tr>

                                    </tfoot>

                                </table>

                                <button
                                    className="btn btn-outline-primary btn-sm"
                                    onClick={
                                        handleAgregarLineaNuevo
                                    }
                                >
                                    + Agregar producto
                                </button>

                            </div>

                        </div>

                        {/* BOTONES */}

                        <div className="d-flex justify-content-end gap-2 mt-3">

                            <button
                                className="btn btn-outline-secondary btn-sm rounded-pill px-4"
                                onClick={() => {

                                    if (editando) {
                                        cancelarEdicion();
                                    } else {
                                        setFormNuevo(formVacio);
                                        setMostrarAgregar(false);
                                    }

                                }}
                            >
                                Cancelar
                            </button>

                            {editando ? (

                                <button
                                    className="btn btn-primary btn-sm rounded-pill px-4"
                                    onClick={handleActualizar}
                                >
                                    Actualizar compra
                                </button>

                            ) : (

                                <button
                                    className="btn btn-primary btn-sm rounded-pill px-4"
                                    onClick={handleAgregar}
                                >
                                    Registrar compra
                                </button>

                            )}

                        </div>

                    </div>

                )}

                {/* ==================================================
                    BUSCADOR
                ================================================== */}

                <div className="d-flex gap-2 mb-4 align-items-center">

                    <div
                        className="input-group"
                        style={{
                            maxWidth: '380px'
                        }}
                    >

                        <span className="input-group-text bg-white border-end-0">
                            🔍
                        </span>

                        <input
                            type="text"
                            className="form-control border-start-0"
                            placeholder="Buscar por ID, proveedor, estado..."
                            value={busqueda}
                            onChange={(e) =>
                                setBusqueda(e.target.value)
                            }
                            style={{
                                boxShadow: 'none'
                            }}
                        />

                    </div>

                    {!mostrarAgregar && !editando && (

                        <button
                            className="btn btn-primary rounded-pill px-4 ms-auto"
                            onClick={() => {

                                setFormNuevo(formVacio);
                                setMostrarAgregar(true);

                            }}
                        >
                            + Registrar compra
                        </button>

                    )}

                </div>

                {/* ==================================================
                    CARDS DE COMPRAS
                ================================================== */}

                <div className="row g-3 mb-4">

                    {comprasFiltradas.length > 0
                        ? comprasFiltradas.map((c) => {

                            const est =
                                estadoColor(c.estado);

                            return (

                                <div
                                    className="col-12"
                                    key={c.id}
                                >

                                    <div
                                        className="rounded-4 bg-white shadow-sm p-3 d-flex align-items-center gap-3"
                                        style={{
                                            border:
                                                '1px solid #e2e8f0',
                                            transition:
                                                'box-shadow 0.2s'
                                        }}
                                    >

                                        {/* ID */}

                                        <div
                                            className="rounded-3 d-flex align-items-center justify-content-center fw-bold"
                                            style={{
                                                minWidth: '60px',
                                                height: '50px',
                                                backgroundColor:
                                                    '#eff6ff',
                                                color: '#3b82f6',
                                                fontSize: '13px'
                                            }}
                                        >
                                            {c.id}
                                        </div>

                                        {/* INFO */}

                                        <div className="flex-grow-1">

                                            <div
                                                className="fw-semibold"
                                                style={{
                                                    fontSize: '14px'
                                                }}
                                            >
                                                {c.idProveedor}
                                            </div>

                                            <div
                                                className="text-muted"
                                                style={{
                                                    fontSize: '12px'
                                                }}
                                            >
                                                📅 {c.fechaCompra}
                                                &nbsp;·&nbsp;
                                                📄 {c.numComprobante}
                                            </div>

                                        </div>

                                        {/* TOTAL */}

                                        <div
                                            className="text-end me-3"
                                        >

                                            <div
                                                className="fw-bold"
                                                style={{
                                                    fontSize: '15px',
                                                    color: '#0f172a'
                                                }}
                                            >
                                                {formatPeso(
                                                    calcularTotal(
                                                        c.detalle
                                                    )
                                                )}
                                            </div>

                                            <div
                                                className="text-muted"
                                                style={{
                                                    fontSize: '11px'
                                                }}
                                            >
                                                Total
                                            </div>

                                        </div>

                                        {/* ESTADO */}

                                        <span
                                            className="rounded-pill px-3 py-1 me-2"
                                            style={{
                                                backgroundColor:
                                                    est.bg,
                                                color: est.color,
                                                border:
                                                    `1px solid ${est.border}`,
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {c.estado}
                                        </span>

                                        {/* VER FACTURA */}

                                        <button
                                            className="btn btn-sm rounded-pill px-3"
                                            style={{
                                                backgroundColor:
                                                    '#f8fafc',
                                                border:
                                                    '1px solid #e2e8f0',
                                                fontSize: '12px',
                                                whiteSpace:
                                                    'nowrap'
                                            }}
                                            onClick={() =>
                                                setFacturaVista(c)
                                            }
                                        >
                                            🧾 Ver factura
                                        </button>

                                        {/* EDITAR */}

                                        <button
                                            className="btn btn-sm rounded-pill px-3"
                                            style={{
                                                backgroundColor:
                                                    '#f8fafc',
                                                border:
                                                    '1px solid #e2e8f0',
                                                fontSize: '12px',
                                                whiteSpace:
                                                    'nowrap'
                                            }}
                                            onClick={() =>
                                                handleEditar(c)
                                            }
                                            title="Editar"
                                        >
                                            ✏️
                                        </button>

                                        {/* ELIMINAR */}

                                        <button
                                            className="btn btn-sm rounded-pill px-3"
                                            style={{
                                                backgroundColor:
                                                    '#f8fafc',
                                                border:
                                                    '1px solid #e2e8f0',
                                                fontSize: '12px',
                                                whiteSpace:
                                                    'nowrap'
                                            }}
                                            onClick={() =>
                                                handleEliminar(c)
                                            }
                                            title="Eliminar"
                                        >
                                            🗑️
                                        </button>

                                    </div>

                                </div>

                            );

                        })
                        : (

                            <div
                                className="col-12 text-center text-muted py-5"
                                style={{
                                    fontSize: '14px'
                                }}
                            >
                                No se encontraron compras con ese criterio.
                            </div>

                        )}

                </div>

                {/* ==================================================
                    RESUMEN
                ================================================== */}

                <div
                    className="rounded-4 p-3 mb-4 d-flex justify-content-between align-items-center"
                    style={{
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0'
                    }}
                >

                    <span
                        className="text-muted"
                        style={{ fontSize: '13px' }}
                    >
                        {comprasFiltradas.length}
                        compra(s) encontrada(s)
                    </span>

                    <span
                        className="fw-bold"
                        style={{ fontSize: '15px' }}
                    >

                        Total general:

                        <span
                            style={{
                                color: '#3b82f6'
                            }}
                        >
                            {' '}
                            {formatPeso(
                                comprasFiltradas.reduce(
                                    (a, c) =>
                                        a +
                                        calcularTotal(
                                            c.detalle
                                        ),
                                    0
                                )
                            )}
                        </span>

                    </span>

                </div>

                {/* VOLVER */}

                <button
                    className="btn btn-outline-secondary btn-sm rounded-pill px-4"
                    onClick={() =>
                        navigate('/index')
                    }
                >
                    ← Volver al inicio
                </button>

            </div>
        </>
    );
}

export default RegistroCompras;