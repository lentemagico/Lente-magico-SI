import http from 'k6/http';
import { check, sleep } from 'k6';

// 400 y 404 son respuestas esperadas (pruebas de validación): no cuentan como fallo
http.setResponseCallback(http.expectedStatuses({ min: 200, max: 299 }, 400, 404));

const BASE_URL = 'http://localhost:5000';
const API_URL = `${BASE_URL}/api/administrador/autorizaciones`;
const HEADERS = { headers: { 'Content-Type': 'application/json' } };

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
      exec: 'flujoAutorizaciones',
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
      exec: 'flujoAutorizaciones',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1500'],
  },
};

// Nombre solo con letras y espacios (igual que valida el formulario)
function nombreAleatorio(prefijo) {
  const letras = 'abcdefghijklmnopqrstuvwxyz';
  let sufijo = '';
  for (let i = 0; i < 10; i++) {
    sufijo += letras[Math.floor(Math.random() * letras.length)];
  }
  return `${prefijo} ${sufijo}`;
}

export function flujoAutorizaciones() {
  // --- GET / : listar ---
  let res = http.get(API_URL);
  check(res, { 'listar: 200': (r) => r.status === 200 });
  sleep(1);

  // --- POST sin nombre: validación (400) ---
  res = http.post(API_URL, JSON.stringify({ nombre: '' }), HEADERS);
  check(res, { 'validación sin nombre: 400': (r) => r.status === 400 });
  sleep(1);

  // --- GET /:id inexistente: 404 ---
  res = http.get(`${API_URL}/999999999`);
  check(res, { 'id inexistente: 404': (r) => r.status === 404 });
  sleep(1);

  // --- POST / : crear (responde 201 sin id) ---
  const nombre = nombreAleatorio('Prueba');
  res = http.post(API_URL, JSON.stringify({ nombre }), HEADERS);
  const creada = check(res, { 'crear: 201': (r) => r.status === 201 });
  sleep(1);
  if (!creada) return;

  // El POST no devuelve el id: se busca por nombre en la lista
  res = http.get(API_URL);
  let id = null;
  try {
    const encontrada = res.json().find((a) => a.nombre === nombre);
    id = encontrada ? encontrada.id : null;
  } catch (e) {}

  const tieneId = check(id, { 'se encontró el id de lo creado': (v) => v !== null });
  if (!tieneId) return;

  // --- GET /:id : consultar la recién creada ---
  res = http.get(`${API_URL}/${id}`);
  check(res, { 'consultar por id: 200': (r) => r.status === 200 });
  sleep(1);

  // --- PUT /:id : editar ---
  res = http.put(
    `${API_URL}/${id}`,
    JSON.stringify({ nombre: nombreAleatorio('Editada') }),
    HEADERS
  );
  check(res, { 'editar: 200': (r) => r.status === 200 });
  sleep(1);

  // --- DELETE /:id : eliminar (limpia lo que creó) ---
  res = http.del(`${API_URL}/${id}`);
  check(res, { 'eliminar: 200': (r) => r.status === 200 });
  sleep(1);
}