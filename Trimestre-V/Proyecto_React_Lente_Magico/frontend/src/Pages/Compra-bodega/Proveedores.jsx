// ================== IMPORTS ==================
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import "../../Styles/Stylec.css";

// import Nav from "../../Components/Nav.jsx";

// Endpoint base de la API de proveedores
const API_URL = "http://localhost:5000/api/proveedores";

// ================== COMPONENTE PRINCIPAL ==================
function ConsultarProveedores() {
    const navigate = useNavigate();
    const [busqueda, setBusqueda] = useState('');
    const [proveedores, setProveedores] = useState([]);
    const [proveedorEditando, setProveedorEditando] = useState(null);
    const [mostrarAgregar, setMostrarAgregar] = useState(false);

    // El formulario vacío se inicializa directamente aquí
    const [formNuevo, setFormNuevo] = useState({
        id_tipo_documento: '1',
        nit: '',
        razon_social: '',
        contacto: '',
        telefono: '',
        correo: '',
        estado: 'Activo',
        tipo: 'Fabricante',
    });

    // Estado para la notificación tipo "toast" y para el modal de confirmación de borrado
    const [toast, setToast] = useState({ mostrar: false, mensaje: '', tipo: 'success' });
    const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
    const [proveedorAEliminar, setProveedorAEliminar] = useState(null);

    // Carga la lista de proveedores desde la API al montar el componente
    useEffect(() => {
        const cargarProveedores = async () => {
            try {
                const response = await fetch(API_URL);
                if (!response.ok) throw new Error('Error al obtener proveedores');
                const data = await response.json();
                setProveedores(data || []);
            } catch (error) {
                console.error("Error al traer proveedores:", error);
            }
        };
        cargarProveedores();
    }, []);

    // Muestra una notificación temporal (toast) que se oculta sola después de 4s
    const lanzarToast = (mensaje, tipo = 'success') => {
        setToast({ mostrar: true, mensaje, tipo });
        setTimeout(() => {
            setToast({ mostrar: false, mensaje: '', tipo: 'success' });
        }, 4000);
    };

    // Maneja los cambios de los inputs del formulario de proveedor,
    // aplicando filtros según el campo (solo números, solo letras, etc.)
    const handleChangeNuevo = (e) => {
        const { name, value } = e.target;
        let nuevoValor = value;

        if (name === 'nit' || name === 'telefono') {
            nuevoValor = value.replace(/\D/g, ''); // solo números
        } else if (name === 'contacto') {
            nuevoValor = value.replace(/[^A-Za-zÁÉÍÓÚáéíóúñÑ\s]/g, ''); // solo letras
        } else if (name === 'razon_social') {
            nuevoValor = value.replace(/[^A-Za-z0-9ÁÉÍÓÚáéíóúñÑ\s&.\-]/g, ''); // letras, números y algunos símbolos comunes de empresa
        }

        setFormNuevo({ ...formNuevo, [name]: nuevoValor });
    };

    // Lista de proveedores filtrada según el texto de búsqueda
    // (razón social, contacto, NIT o tipo)
    const proveedoresFiltrados = proveedores.filter((p) =>
        p?.razon_social?.toLowerCase().includes(busqueda.toLowerCase()) ||
        p?.contacto?.toLowerCase().includes(busqueda.toLowerCase()) ||
        p?.nit?.includes(busqueda) ||
        p?.tipo?.toLowerCase().includes(busqueda.toLowerCase())
    );

    // Totales para las tarjetas de estadísticas
    const totalActivos = proveedores.filter(p => p.estado === 'Activo').length;
    const totalInactivos = proveedores.filter(p => p.estado === 'Inactivo').length;

    // Carga los datos del proveedor seleccionado en el formulario para editarlo
    const handleEditar = (p) => {
        setProveedorEditando(p.id_proveedor || p.id);
        setFormNuevo({ ...p });
        setMostrarAgregar(true);
    };

    // Abre el modal de confirmación de eliminación para el proveedor seleccionado
    const handlePrepararEliminar = (p) => {
        setProveedorAEliminar(p);
        setMostrarConfirmar(true);
    };

    // Elimina definitivamente el proveedor confirmado (DELETE al backend)
    const confirmarEliminar = async () => {
        try {
            const idTarget = proveedorAEliminar.id_proveedor || proveedorAEliminar.id;
            if (!idTarget) {
                lanzarToast("No se pudo encontrar un ID válido para este registro.", "danger");
                return;
            }

            const response = await fetch(`${API_URL}/${idTarget}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Error al eliminar proveedor');

            setProveedores(proveedores.filter((p) =>
                String(p.id_proveedor || p.id) !== String(idTarget)
            ));

            setMostrarConfirmar(false);
            lanzarToast("Proveedor eliminado correctamente.", "danger");
        } catch (error) {
            console.error("Error al eliminar:", error);
            lanzarToast("No se pudo eliminar el proveedor en la API.", "danger");
        }
    };

    // Envía el formulario: si hay un proveedor en edición hace PUT (actualizar),
    // si no, hace POST (crear uno nuevo)
    const handleGuardarFormulario = async (e) => {
        e.preventDefault();

        if (!formNuevo.nit.trim() || !formNuevo.razon_social.trim()) {
            lanzarToast("El NIT y la Razón Social son obligatorios.", "danger");
            return;
        }

        try {
            if (proveedorEditando) {
                const response = await fetch(`${API_URL}/${proveedorEditando}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formNuevo)
                });
                if (!response.ok) throw new Error('Error al actualizar proveedor');
                const modificado = await response.json();

                setProveedores(proveedores.map((p) => String(p.id_proveedor || p.id) === String(proveedorEditando) ? modificado : p));
                lanzarToast("Proveedor actualizado con éxito.", "success");
            } else {
                // id_proveedor es AUTO_INCREMENT en MySQL: la base de datos lo genera sola,
                // no hace falta calcularlo ni enviarlo desde el frontend.
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formNuevo)
                });
                if (!response.ok) throw new Error('Error al crear proveedor');
                const guardado = await response.json();

                setProveedores([...proveedores, guardado]);
                lanzarToast("Proveedor registrado con éxito.", "success");
            }

            // Limpieza manual al estado por defecto
            setFormNuevo({ id_tipo_documento: '1', nit: '', razon_social: '', contacto: '', telefono: '', correo: '', estado: 'Activo', tipo: 'Fabricante' });
            setProveedorEditando(null);
            setMostrarAgregar(false);
        } catch (error) {
            console.error("Error al guardar proveedor:", error);
            lanzarToast("Ocurrió un error en el servidor al guardar el proveedor.", "danger");
        }
    };

    // ================== RENDER ==================
    return (
        <div className="bg-light min-vh-100">
            {/* <Nav /> */}

            {/* ===== Modal: confirmar eliminación ===== */}
            {mostrarConfirmar && (
                <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                    style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999 }}>
                    <div className="rounded-4 bg-white p-4 shadow-lg" style={{ maxWidth: '400px', width: '100%' }}>
                        <h6 className="fw-bold mb-2">Confirmar eliminación</h6>
                        <p className="text-muted mb-4" style={{ fontSize: '13px' }}>
                            ¿Estás seguro de que deseas eliminar al proveedor <strong>{proveedorAEliminar?.razon_social}</strong>? Esta acción no se puede deshacer.
                        </p>
                        <div className="d-flex justify-content-end gap-2">
                            <button className="btn btn-outline-secondary btn-sm rounded-pill px-4" onClick={() => setMostrarConfirmar(false)}>
                                Cancelar
                            </button>
                            <button className="btn btn-danger btn-sm rounded-pill px-4" onClick={confirmarEliminar}>
                                Sí, eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="container py-4">

                {/* Encabezado: título y botón para alternar entre tabla y formulario */}
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 className="fw-bold text-dark m-0">Gestión de Proveedores</h2>
                        <p className="text-muted m-0">Administra los proveedores vinculados al Módulo de Compras</p>
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            setMostrarAgregar(!mostrarAgregar);
                            if (mostrarAgregar) {
                                setFormNuevo({ id_tipo_documento: '1', nit: '', razon_social: '', contacto: '', telefono: '', correo: '', estado: 'Activo', tipo: 'Fabricante' });
                                setProveedorEditando(null);
                            }
                        }}
                    >
                        {mostrarAgregar ? 'Ver Tabla' : 'Agregar Proveedor'}
                    </button>
                </div>

                {/* Tarjetas de estadísticas (solo visibles en la vista de tabla) */}
                {!mostrarAgregar && (
                    <div className="row g-3 mb-4">
                        <div className="col-md-4">
                            <div className="card shadow-sm border-0 tarjeta-resumen p-3">
                                <span className="text-muted small fw-medium">Total Proveedores</span>
                                <h3 className="fw-bold m-0 mt-1">{proveedores.length}</h3>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="card shadow-sm border-0 tarjeta-resumen verde p-3">
                                <span className="text-muted small fw-medium">Activos</span>
                                <h3 className="fw-bold text-success m-0 mt-1">{totalActivos}</h3>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="card shadow-sm border-0 tarjeta-resumen naranja p-3">
                                <span className="text-muted small fw-medium">Inactivos</span>
                                <h3 className="fw-bold text-danger m-0 mt-1">{totalInactivos}</h3>
                            </div>
                        </div>
                    </div>
                )}

                {/* ===== Vista condicional: formulario de agregar/editar, o tabla ===== */}
                {mostrarAgregar ? (
                    <div className="card shadow-sm border-0 p-4" style={{ maxWidth: '700px', margin: '0 auto' }}>
                        <h4 className="fw-bold mb-3">{proveedorEditando ? 'Modificar Proveedor' : 'Nuevo Proveedor'}</h4>
                        <form onSubmit={handleGuardarFormulario}>
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <label className="form-label">Tipo de Documento</label>
                                    <select className="form-select" name="id_tipo_documento" value={formNuevo.id_tipo_documento} onChange={handleChangeNuevo}>
                                        <option value="1">NIT (Número de Identificación Tributaria)</option>
                                        <option value="2">Cédula de Ciudadanía</option>
                                        <option value="3">Cédula de Extranjería</option>
                                    </select>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Número de Documento / NIT</label>
                                    <input type="text" className="form-control" name="nit" value={formNuevo.nit} onChange={handleChangeNuevo} required />
                                </div>
                                <div className="col-md-12">
                                    <label className="form-label">Razón Social</label>
                                    <input type="text" className="form-control" name="razon_social" value={formNuevo.razon_social} onChange={handleChangeNuevo} required />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Contacto / Representante</label>
                                    <input type="text" className="form-control" name="contacto" value={formNuevo.contacto} onChange={handleChangeNuevo} />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Teléfono</label>
                                    <input type="text" className="form-control" name="telefono" value={formNuevo.telefono} onChange={handleChangeNuevo} />
                                </div>
                                <div className="col-md-12">
                                    <label className="form-label">Correo Electrónico</label>
                                    <input type="email" className="form-control" name="correo" value={formNuevo.correo} onChange={handleChangeNuevo} placeholder="ejemplo@correo.com" />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Tipo de Proveedor</label>
                                    <select className="form-select" name="tipo" value={formNuevo.tipo} onChange={handleChangeNuevo}>
                                        <option value="Fabricante">Fabricante</option>
                                        <option value="Distribuidor">Distribuidor</option>
                                        <option value="Mayorista">Mayorista</option>
                                        <option value="Importador">Importador</option>
                                    </select>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Estado</label>
                                    <select className="form-select" name="estado" value={formNuevo.estado} onChange={handleChangeNuevo}>
                                        <option value="Activo">Activo</option>
                                        <option value="Inactivo">Inactivo</option>
                                    </select>
                                </div>
                                <div className="col-12 mt-4 text-end">
                                    <button type="button" className="btn btn-secondary me-2" onClick={() => { setMostrarAgregar(false); setFormNuevo({ id_tipo_documento: '1', nit: '', razon_social: '', contacto: '', telefono: '', correo: '', estado: 'Activo', tipo: 'Fabricante' }); setProveedorEditando(null); }}>Cancelar</button>
                                    <button type="submit" className="btn btn-success">{proveedorEditando ? 'Guardar Cambios' : 'Registrar Proveedor'}</button>
                                </div>
                            </div>
                        </form>
                    </div>
                ) : (
                    // Tabla con el listado de proveedores filtrados
                    <div className="card shadow-sm border-0 p-3">
                        <div className="mb-3">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Buscar por NIT, razón social, contacto o tipo..."
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                            />
                        </div>

                        <div className="table-responsive">
                            <table className="table table-hover align-middle m-0">
                                <thead className="table-light">
                                    <tr>
                                        <th>ID</th>
                                        <th>NIT</th>
                                        <th>Razón Social</th>
                                        <th>Contacto</th>
                                        <th>Tipo</th>
                                        <th>Estado</th>
                                        <th className="text-end">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {proveedoresFiltrados.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="text-center text-muted py-4">No se encontraron proveedores registrados.</td>
                                        </tr>
                                    ) : (
                                        proveedoresFiltrados.map((p) => (
                                            <tr key={p.id_proveedor || p.id}>
                                                <td className="fw-medium">{p.id_proveedor || p.id}</td>
                                                <td>{p.nit}</td>
                                                <td>{p.razon_social}</td>
                                                <td className="text-secondary">{p.contacto || '---'}</td>
                                                <td>
                                                    <span className="badge" style={{
                                                        backgroundColor: TIPO_COLORES[p.tipo]?.bg || '#f3f4f6',
                                                        color: TIPO_COLORES[p.tipo]?.color || '#374151',
                                                        border: `1px solid ${TIPO_COLORES[p.tipo]?.border || '#e5e7eb'}`
                                                    }}>
                                                        {p.tipo}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`badge ${p.estado === 'Activo' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>
                                                        {p.estado}
                                                    </span>
                                                </td>
                                                <td className="text-end">
                                                    <button className="btn btn-sm btn-outline-primary me-2" onClick={() => handleEditar(p)}>  ✏️ </button>
                                                    <button className="btn btn-sm btn-outline-danger" onClick={() => handlePrepararEliminar(p)}> 🗑️ </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Notificación flotante (toast) de éxito o error */}
                {toast.mostrar && (
                    <div className={`toast-alerta flotante-${toast.tipo}`}>
                        <div className="toast-contenido">
                            <span className="toast-icono">
                                {toast.tipo === 'success' ? '✅' : '❌'}
                            </span>
                            <p className="toast-texto">{toast.mensaje}</p>
                        </div>
                        <div className="toast-barra-progreso"></div>
                    </div>
                )}

            </div>
        </div>
    );
}

// ================== CONSTANTES: colores por tipo de proveedor ==================
// Movido al final para limpiar el espacio visual de arriba sin perder los estilos en la tabla
const TIPO_COLORES = {
    Fabricante: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    Distribuidor: { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
    Mayorista: { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
    Importador: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
};

export default ConsultarProveedores;