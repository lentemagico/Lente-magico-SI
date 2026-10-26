import http from 'k6/http';
import { check, sleep } from 'k6';

// 400 y 404 son respuestas esperadas (validaciones): no cuentan como fallo
http.setResponseCallback(http.expectedStatuses({ min: 200, max: 299 }, 400, 404));

const BASE_URL = 'http://localhost:5000';
const API_CLIENTES = `${BASE_URL}/api/optometra/cliente`;
const API_HISTORIA = `${BASE_URL}/api/optometra/historia-clinica`;
const HEADERS = { headers: { 'Content-Type': 'application/json' } };

export let options = {
  scenarios: {
    prueba_de_carga: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '10s', target: 10 },
        { duration: '20s', target: 10 },
        { duration: '10s', target: 0 },
      ],
      gracefulRampDown: '5s',
      exec: 'flujoHistoria',
    },
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
      exec: 'flujoHistoria',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1500'],
  },
};

// Toma un cliente que ya tenga historia (para probar el rechazo con 400)
export function setup() {
  const lista = http.get(API_CLIENTES).json();
  const conHistoria = lista.find((c) => c.id_historia !== null);
  return { idConHistoria: conHistoria ? conHistoria.id_cliente : null };
}

export function flujoHistoria(data) {
  // GET: listar clientes (2 JOIN, sin paginación)
  let res = http.get(API_CLIENTES);
  check(res, { 'listar clientes: 200': (r) => r.status === 200 });
  sleep(1);

  // POST sin fecha: validación (400)
  res = http.post(API_HISTORIA, JSON.stringify({ id_cliente: 3 }), HEADERS);
  check(res, { 'validación sin fecha: 400': (r) => r.status === 400 });
  sleep(1);

  // POST cliente que ya tiene historia: 400 (hace 2 SELECT)
  if (data.idConHistoria) {
    res = http.post(
      API_HISTORIA,
      JSON.stringify({ id_cliente: data.idConHistoria, fecha_apertura: '2026-10-26' }),
      HEADERS
    );
    check(res, { 'ya tiene historia: 400': (r) => r.status === 400 });
    sleep(1);
  }

  // POST cliente inexistente: 404
  res = http.post(
    API_HISTORIA,
    JSON.stringify({ id_cliente: 999999999, fecha_apertura: '2026-10-26' }),
    HEADERS
  );
  check(res, { 'cliente inexistente: 404': (r) => r.status === 404 });
  sleep(1);
}