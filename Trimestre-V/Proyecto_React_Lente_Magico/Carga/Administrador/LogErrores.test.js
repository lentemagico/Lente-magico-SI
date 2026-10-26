import http from 'k6/http';
import { check, sleep } from 'k6';

// El 400 de la validación es intencional: no cuenta como fallo
http.setResponseCallback(http.expectedStatuses({ min: 200, max: 299 }, 400));

const BASE_URL = 'http://localhost:5000';
const API_LOG = `${BASE_URL}/api/administrador/logErrores`;
const API_USUARIOS = `${BASE_URL}/api/administrador/usuarios`;
const HEADERS = { headers: { 'Content-Type': 'application/json' } };

const NIVELES = ['ERROR', 'WARN', 'INFO'];

export let options = {
  scenarios: {
    // PRUEBA DE CARGA (40 s, 10 usuarios)
    prueba_de_carga: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '10s', target: 10 },
        { duration: '20s', target: 10 },
        { duration: '10s', target: 0 },
      ],
      gracefulRampDown: '5s',
      exec: 'flujoLog',
    },

    // PRUEBA DE ESTRÉS (80 s, hasta 50 usuarios), arranca cuando termina la de carga
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
      gracefulRampDown: '5s',
      exec: 'flujoLog',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1500'],
  },
};

// Se ejecuta UNA vez: toma un usuario real para usarlo como id_usuario
export function setup() {
  let idUsuario = null;
  try {
    const lista = http.get(API_USUARIOS).json();
    if (Array.isArray(lista) && lista.length > 0) idUsuario = lista[0].id;
  } catch (e) {}
  return { idUsuario };
}

function letrasAleatorias(n) {
  const letras = 'abcdefghijklmnopqrstuvwxyz';
  let s = '';
  for (let i = 0; i < n; i++) s += letras[Math.floor(Math.random() * letras.length)];
  return s;
}

export function flujoLog(data) {
  // --- POST /: registrar error (201) ---
  const cuerpo = {
    id_usuario: data.idUsuario,
    nivel: NIVELES[Math.floor(Math.random() * NIVELES.length)],
    nombre_usuario: 'k6_prueba',
    mensaje: 'Mensaje de prueba k6 ' + letrasAleatorias(12),
  };
  let res = http.post(API_LOG, JSON.stringify(cuerpo), HEADERS);
  check(res, {
    'registrar: 201': (r) => r.status === 201,
    'devuelve id': (r) => {
      try { return r.json().id !== undefined; } catch (e) { return false; }
    },
  });
  sleep(1);

  // --- POST sin nivel: validación (400) ---
  res = http.post(API_LOG, JSON.stringify({ mensaje: 'sin nivel' }), HEADERS);
  check(res, { 'validación sin nivel: 400': (r) => r.status === 400 });
  sleep(1);

  // --- POST sin mensaje: validación (400) ---
  res = http.post(API_LOG, JSON.stringify({ nivel: 'ERROR' }), HEADERS);
  check(res, { 'validación sin mensaje: 400': (r) => r.status === 400 });
  sleep(1);

  // --- GET /usuario/:id : filtrado por un usuario real ---
  if (data.idUsuario) {
    res = http.get(`${API_LOG}/usuario/${data.idUsuario}`);
    check(res, { 'por usuario: 200': (r) => r.status === 200 });
    sleep(1);
  }

  // --- GET /usuario/:id inexistente: 200 con lista vacía ---
  res = http.get(`${API_LOG}/usuario/999999999`);
  check(res, {
    'usuario inexistente: 200': (r) => r.status === 200,
    'usuario inexistente: lista vacía': (r) => {
      try { return Array.isArray(r.json()) && r.json().length === 0; } catch (e) { return false; }
    },
  });
  sleep(1);

  // --- GET / : listar todo el log (sin LIMIT, el más costoso) ---
  res = http.get(API_LOG);
  check(res, { 'listar: 200': (r) => r.status === 200 });
  sleep(1);
}