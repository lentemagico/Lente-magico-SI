// =====================================================
// CONFIGURACIÓN CENTRAL DE API
// =====================================================

export const API_BASE_URL = 'http://localhost:5000/api';


// =====================================================
// FUNCIÓN CENTRAL PARA LLAMAR AL BACKEND
// =====================================================

export async function apiFetch(path, options = {}) {

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,

    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const contentType =
    res.headers.get('content-type') || '';

  let data = null;

  if (contentType.includes('application/json')) {
    data = await res.json();
  }

  if (!res.ok) {

    throw new Error(
      data?.error ||
      data?.mensaje ||
      `Error ${res.status}`
    );

  }

  return data;
}


// =====================================================
// GUARDAR USUARIO DE LA SESIÓN
// =====================================================

export function guardarSesion(usuario) {

  if (!usuario) {
    sessionStorage.removeItem('usuario');
    return;
  }

  sessionStorage.setItem(
    'usuario',
    JSON.stringify(usuario)
  );
}


// =====================================================
// OBTENER USUARIO DE LA SESIÓN
// =====================================================

export function obtenerSesion() {

  const raw =
    sessionStorage.getItem('usuario');

  if (!raw) {
    return null;
  }

  try {

    return JSON.parse(raw);

  } catch (error) {

    console.error(
      'Error al leer la sesión:',
      error
    );

    sessionStorage.removeItem('usuario');

    return null;
  }
}


// =====================================================
// CERRAR SESIÓN
// =====================================================

export function cerrarSesion() {

  sessionStorage.removeItem('usuario');

  // Opcional: también limpiar el cliente seleccionado
  sessionStorage.removeItem(
    'clienteSeleccionado'
  );

  sessionStorage.removeItem(
    'ventaActiva'
  );
}