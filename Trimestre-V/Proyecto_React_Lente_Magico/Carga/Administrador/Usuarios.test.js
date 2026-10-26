import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = 'http://localhost:5000';
const API_USUARIOS = `${BASE_URL}/api/administrador/usuarios`;
const API_AUTORIZACIONES = `${BASE_URL}/api/administrador/autorizaciones`;
const HEADERS = { headers: { 'Content-Type': 'application/json' } };

// CAMBIA ESTE VALOR: id de un tipo de documento que exista en tu tabla Tipo_documento
const ID_TIPO_DOCUMENTO = 1;

export let options = {
  scenarios: {
    // PRUEBA DE CARGA
    prueba_de_carga: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '10s', target: 10 },
        { duration: '20s', target: 10 },
        { duration: '10s', target: 0 },
      ],
      exec: 'flujoUsuarios',
    },

    // PRUEBA DE ESTRÉS (arranca cuando termina la de carga)
    prueba_de_estres: {
      executor: 'ramping-vus',
      startVUs: 1,
      startTime: '50s',
      stages: [
        { duration: '20s', target: 20 },
        { duration: '20s', target: 35 },
        { duration: '20s', target: 50 },
        { duration: '20s', target: 0 },
      ],
      exec: 'flujoUsuarios',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2000'],
  },
};

// Se ejecuta UNA vez antes de la prueba: obtiene un rol válido
export function setup() {
  const res = http.get(API_AUTORIZACIONES);
  let idAutorizacion = null;
  try {
    const lista = res.json();
    if (Array.isArray(lista) && lista.length > 0) idAutorizacion = lista[0].id;
  } catch (e) {}

  if (!idAutorizacion) {
    throw new Error('No hay autorizaciones en la base de datos; crea al menos una antes de probar.');
  }
  return { idAutorizacion };
}

// --- Utilidades para generar datos únicos ---
function digitosAleatorios(n) {
  let s = String(1 + Math.floor(Math.random() * 9)); // primer dígito distinto de 0
  for (let i = 1; i < n; i++) s += Math.floor(Math.random() * 10);
  return s;
}

function letrasAleatorias(n) {
  const letras = 'abcdefghijklmnopqrstuvwxyz';
  let s = '';
  for (let i = 0; i < n; i++) s += letras[Math.floor(Math.random() * letras.length)];
  return s;
}

function datosUsuario(idAutorizacion) {
  return {
    id_tipo_documento: ID_TIPO_DOCUMENTO,
    numero_documento: digitosAleatorios(10),
    primer_nombre: 'Prueba' + letrasAleatorias(5),
    primer_apellido: 'Carga' + letrasAleatorias(5),
    fecha_nacimiento: '1990-01-01',
    correo: `k6_${letrasAleatorias(10)}@prueba.com`,
    telefono: '3' + digitosAleatorios(9),
    id_autorizacion: idAutorizacion,
    contrasenia: 'Clave12345',
  };
}

export function flujoUsuarios(data) {
  // --- GET / : listar usuarios ---
  let res = http.get(API_USUARIOS);
  check(res, { 'listar: 200': (r) => r.status === 200 });
  sleep(1);

  // --- POST / : crear (responde 201 con { id }) ---
  const usuario = datosUsuario(data.idAutorizacion);
  res = http.post(API_USUARIOS, JSON.stringify(usuario), HEADERS);
  const creado = check(res, { 'crear: 201': (r) => r.status === 201 });
  sleep(1);

  if (!creado) return;

  let id = null;
  try {
    id = res.json().id;
  } catch (e) {}
  if (!id) return;

  // --- PUT /:id : editar (cambia nombre y deja la misma contraseña) ---
  const edicion = Object.assign({}, usuario, {
    primer_nombre: 'Editado' + letrasAleatorias(5),
    contrasenia: '', // vacío: el backend no rehace el hash
  });
  res = http.put(`${API_USUARIOS}/${id}`, JSON.stringify(edicion), HEADERS);
  check(res, { 'editar: 200': (r) => r.status === 200 });
  sleep(1);

  // --- DELETE /:id : eliminar (limpia usuario, rol y datos personales) ---
  res = http.del(`${API_USUARIOS}/${id}`);
  check(res, { 'eliminar: 200': (r) => r.status === 200 });

  sleep(1);
}