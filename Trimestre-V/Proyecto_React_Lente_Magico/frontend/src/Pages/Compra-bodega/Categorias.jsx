import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import "../../Styles/Stylec.css";
// import Nav from "../../Components/Nav.jsx";
const API_URL = "http://localhost:5000/api/categorias";

const formVacio = {
    id: '',
    nombreCategoria: '',
    descripcion: '',
    estado: 'Activo',
};

// El backend/DB usa "nombre_categoria" e "id_categoria" (snake_case),
// pero el resto de este componente trabaja con "nombreCategoria" e "id"
// (camelCase). Esta función traduce lo que llega de la API hacia el
// formato que ya usa el componente, sin tener que reescribir todo.
const normalizarCategoria = (c) => ({
    ...c,
    id: c.id ?? c.id_categoria,
    nombreCategoria: c.nombreCategoria ?? c.nombre_categoria,
});

// Y esta hace el camino inverso: del formato del formulario
// (camelCase) al formato que espera el backend (snake_case).
const aPayloadBackend = (formData) => ({
    nombre_categoria: formData.nombreCategoria,
    descripcion: formData.descripcion,
    estado: formData.estado,
});

// CORRECCIÓN: FormularioCategoria queda fuera de Categorias
const FormularioCategoria = ({
    titulo,
    onAccion,
    onCancelar,
    formData,
    handleChangeForm,
    categoriaEditando
}) => (
    <div className="card rounded-4 border-0 shadow-sm p-4 mb-4">
        <h6 className="fw-bold mb-3">{titulo}</h6>
        <div className="row g-3">
            <div className="col-md-12">
                <label className="form-label" style={{ fontSize: '13px' }}>Nombre de categoría</label>
                <input
                    type="text"
                    className="form-control"
                    name="nombreCategoria"
                    value={formData.nombreCategoria}
                    onChange={handleChangeForm}
                    placeholder="Ej: Lentes de contacto"
                />
            </div>

            <div className="col-md-12">
                <label className="form-label" style={{ fontSize: '13px' }}>Descripción</label>
                <textarea
                    className="form-control"
                    name="descripcion"
                    value={formData.descripcion}
                    onChange={handleChangeForm}
                    placeholder="Describe brevemente esta categoría"
                    rows={3}
                    style={{
                        resize: 'vertical'
                    }}
                />
            </div>

            <div className="col-md-6">
                <label className="form-label" style={{ fontSize: '13px' }}>Estado</label>
                <select
                    className="form-select"
                    name="estado"
                    value={formData.estado}
                    onChange={handleChangeForm}
                >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                </select>
            </div>
        </div>

        <div className="d-flex justify-content-end gap-2 mt-4">
            <button
                className="btn btn-outline-secondary btn-sm rounded-pill px-4"
                onClick={onCancelar}
            >
                Cancelar
            </button>

            <button
                className="btn btn-primary btn-sm rounded-pill px-4"
                onClick={onAccion}
            >
                {categoriaEditando ? 'Guardar cambios' : 'Agregar categoría'}
            </button>
        </div>
    </div>
);

function Categorias() {
    const navigate = useNavigate();
    const [busqueda, setBusqueda] = useState('');
    const [categorias, setCategorias] = useState([]); // Iniciamos el arreglo vacío
    const [categoriaEditando, setCategoriaEditando] = useState(null);
    const [mostrarAgregar, setMostrarAgregar] = useState(false);
    const [formData, setFormData] = useState(formVacio);

    const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
    const [categoriaAEliminar, setCategoriaAEliminar] = useState(null);

    // Cargar los datos desde la API al montar el componente
    useEffect(() => {
        const cargarCategorias = async () => {
            try {
                const response = await fetch(API_URL);
                if (!response.ok) throw new Error('Error al obtener categorías');
                const data = await response.json();
                setCategorias((data || []).map(normalizarCategoria));
            } catch (error) {
                console.error("Error al traer las categorías de la API:", error);
            }
        };
        cargarCategorias();
    }, []);

 const handleChangeForm = (e) => {
    const { name, value } = e.target;
    const camposSoloLetras = ['nombreCategoria', 'descripcion'];
    const nuevoValor = camposSoloLetras.includes(name)
        ? value.replace(/[^A-Za-zÁÉÍÓÚáéíóúñÑ\s]/g, '')
        : value;
    setFormData({ ...formData, [name]: nuevoValor });
};

    const categoriasFiltradas = categorias.filter((c) =>
        c?.nombreCategoria?.toLowerCase().includes(busqueda.toLowerCase()) ||
        c?.descripcion?.toLowerCase().includes(busqueda.toLowerCase())
    );

    const totalActivas = categorias.filter(c => c.estado === 'Activo').length;
    const totalInactivas = categorias.filter(c => c.estado === 'Inactivo').length;

    const handleEditar = (c) => {
        setMostrarAgregar(false);
        setCategoriaEditando(c.id);
        setFormData({ ...c });
    };

    const handleGuardarCambios = async () => {
        try {
            const idTarget = formData.id;

            const response = await fetch(`${API_URL}/${idTarget}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(aPayloadBackend(formData))
            });

            if (!response.ok) throw new Error('Error al actualizar categoría');

            const modificado = normalizarCategoria(await response.json());

            setCategorias(categorias.map((c) =>
                c.id === idTarget ? modificado : c
            ));

            setCategoriaEditando(null);
            setFormData(formVacio);
        } catch (error) {
            console.error("Error al actualizar la categoría:", error);
            alert(error.message || 'No se pudo actualizar la categoría');
        }
    };

    const handleAgregarNueva = async () => {
        try {
            // El id_categoria es AUTO_INCREMENT en MySQL: la base de datos lo genera sola,
            // no hace falta calcularlo ni enviarlo desde el frontend.
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(aPayloadBackend(formData))
            });

            if (!response.ok) throw new Error('Error al crear categoría');

            const guardado = normalizarCategoria(await response.json());

            setCategorias([...categorias, guardado]);
            setFormData(formVacio);
            setMostrarAgregar(false);
        } catch (error) {
            console.error("Error al guardar la categoría:", error);
            alert(error.message || 'No se pudo crear la categoría');
        }
    };

    const handleEliminar = (c) => {
        setCategoriaAEliminar(c);
        setMostrarConfirmar(true);
    };

    const confirmarEliminar = async () => {
        try {
            const idTarget = categoriaAEliminar.id;
            const response = await fetch(`${API_URL}/${idTarget}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Error al eliminar categoría');

            // Remover del estado local
            setCategorias(categorias.filter((c) => c.id !== idTarget));
            setMostrarConfirmar(false);
            setCategoriaAEliminar(null);
        } catch (error) {
            console.error("Error al eliminar la categoría:", error);
            alert(error.message || 'No se pudo eliminar la categoría');
        }
    };

    const estadoColor = (estado) =>
        estado === 'Activo'
            ? { bg: '#d1fae5', color: '#065f46', border: '#6ee7b7' }
            : { bg: '#f3f4f6', color: '#374151', border: '#d1d5db' };

    return (
        <>
             {/* <Nav /> */}

            {/* Modal confirmación eliminar */}
            {mostrarConfirmar && (
                <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                    style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999 }}>
                    <div className="rounded-4 bg-white p-4 shadow-lg" style={{ maxWidth: '400px', width: '100%' }}>
                        <h6 className="fw-bold mb-2">Confirmar eliminación</h6>
                        <p className="text-muted mb-4" style={{ fontSize: '13px' }}>
                            ¿Estás seguro de que deseas eliminar la categoría <strong>{categoriaAEliminar?.nombreCategoria}</strong>? Esta acción no se puede deshacer.
                        </p>
                        <div className="d-flex justify-content-end gap-2">
                            <button className="btn btn-outline-secondary btn-sm rounded-pill px-4" onClick={() => setMostrarConfirmar(false)}>Cancelar</button>
                            <button className="btn btn-danger btn-sm rounded-pill px-4" onClick={confirmarEliminar}>Sí, eliminar</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="container py-4">

                {/* Encabezado con stats */}
                <div className="row g-3 mb-4 align-items-center">
                    <div className="col-md-5">
                        <h4 className="fw-bold mb-0">Categorías</h4>
                        <p className="text-muted mb-0" style={{ fontSize: '13px' }}>Gestión de categorías de productos</p>
                    </div>
                    <div className="col-md-7">
                        <div className="d-flex gap-3 justify-content-md-end flex-wrap">
                            {[
                                { label: 'Total', value: categorias.length, color: '#3b82f6', bg: '#eff6ff' },
                                { label: 'Activas', value: totalActivas, color: '#10b981', bg: '#ecfdf5' },
                                { label: 'Inactivas', value: totalInactivas, color: '#6b7280', bg: '#f3f4f6' },
                            ].map(({ label, value, color, bg }) => (
                                <div key={label} className="rounded-3 px-3 py-2 text-center" style={{ backgroundColor: bg, minWidth: '90px' }}>
                                    <div className="fw-bold" style={{ color, fontSize: '20px' }}>{value}</div>
                                    <div style={{ fontSize: '11px', color: '#64748b' }}>{label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Formulario agregar */}
                {mostrarAgregar && (
                    <FormularioCategoria
                        titulo="Agregar nueva categoría"
                        onAccion={handleAgregarNueva}
                        onCancelar={() => { setFormData(formVacio); setMostrarAgregar(false); }}
                        formData={formData}
                        handleChangeForm={handleChangeForm}
                        categoriaEditando={categoriaEditando}
                    />
                )}

                {/* Formulario editar */}
                {categoriaEditando && (
                    <FormularioCategoria
                        titulo={`✏️ Editando categoría — ${formData.id}`}
                        onAccion={handleGuardarCambios}
                        onCancelar={() => { setFormData(formVacio); setCategoriaEditando(null); }}
                        formData={formData}
                        handleChangeForm={handleChangeForm}
                        categoriaEditando={categoriaEditando}
                    />
                )}

                {/* Barra búsqueda + botón */}
                <div className="d-flex gap-2 mb-4 align-items-center">
                    <div className="input-group" style={{ maxWidth: '380px' }}>
                        <span className="input-group-text bg-white border-end-0">🔍</span>
                        <input
                            type="text"
                            className="form-control border-start-0"
                            placeholder="Buscar por nombre o descripción..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúñÑ\s]/g, ''))}
                            style={{ boxShadow: 'none' }}
                        />
                    </div>
                    <button className="btn btn-primary rounded-pill px-4 ms-auto"
                        onClick={() => { setMostrarAgregar(true); setCategoriaEditando(null); setFormData(formVacio); }}>
                        + Agregar categoría
                    </button>
                </div>

                {/* Cards de categorías */}
                <div className="row g-3 mb-4">
                    {categoriasFiltradas.length > 0 ? categoriasFiltradas.map((c) => {
                        const currentId = c.id;
                        const est = estadoColor(c.estado);
                        return (
                            <div className="col-12" key={currentId}>
                                <div className={`rounded-4 bg-white shadow-sm p-3 d-flex align-items-center gap-3 ${categoriaEditando === currentId ? 'border border-warning' : ''}`}
                                    style={{ border: '1px solid #e2e8f0' }}>

                                    {/* ID badge */}
                                    <div className="rounded-3 d-flex align-items-center justify-content-center fw-bold"
                                        style={{ minWidth: '60px', height: '50px', backgroundColor: '#f0fdf4', color: '#10b981', fontSize: '12px' }}>
                                        {currentId}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-grow-1">
                                        <div className="fw-semibold" style={{ fontSize: '14px' }}>{c.nombreCategoria}</div>
                                        <div className="text-muted" style={{ fontSize: '12px' }}>{c.descripcion}</div>
                                    </div>

                                    {/* Estado */}
                                    <span className="rounded-pill px-3 py-1 me-2"
                                        style={{ backgroundColor: est.bg, color: est.color, border: `1px solid ${est.border}`, fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                                        {c.estado}
                                    </span>

                                    {/* Acciones */}
                                    <div className="d-flex gap-2">
                                        <button className="btn btn-sm rounded-pill px-3"
                                            style={{ backgroundColor: '#fffbeb', border: '1px solid #fcd34d', color: '#92400e', fontSize: '12px' }}
                                            onClick={() => handleEditar(c)}>
                                            ✏️
                                        </button>
                                        <button className="btn btn-sm rounded-pill px-3"
                                            style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', fontSize: '12px' }}
                                            onClick={() => handleEliminar(c)}>
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="col-12 text-center text-muted py-5" style={{ fontSize: '14px' }}>
                            No se encontraron categorías con ese criterio.
                        </div>
                    )}
                </div>

                {/* Resumen */}
                <div className="rounded-4 p-3 mb-4 d-flex justify-content-between align-items-center"
                    style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <span className="text-muted" style={{ fontSize: '13px' }}>
                        {categoriasFiltradas.length} categoría(s) encontrada(s)
                    </span>
                </div>

                <button className="btn btn-outline-secondary btn-sm rounded-pill px-4" onClick={() => navigate('/index')}>
                    ← Volver al inicio
                </button>

            </div>
        </>
    );
}

export default Categorias;