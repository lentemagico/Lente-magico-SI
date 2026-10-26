import http from 'k6/http';
import { check, sleep } from 'k6';

// El 400 de validación es intencional: no cuenta como fallo
http.setResponseCallback(http.expectedStatuses({ min: 200, max: 299 }, 400));

const BASE_URL = 'http://localhost:5000';
const API_CONSULTA = `${BASE_URL}/api/optometra/consulta`;
const API_USUARIOS = `${BASE_URL}/api/administrador/usuarios`;
const HEADERS = { headers: { 'Content-Type': 'application/json' } };

// Id de un cliente que exista en tu tabla Cliente
const ID_CLIENTE = 3;

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
      exec: 'flujoConsulta',
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
      exec: 'flujoConsulta',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1500'],
  },
};

function letrasAleatorias(n) {
  const letras = 'abcdefghijklmnopqrstuvwxyz';
  let s = '';
  for (let i = 0; i < n; i++) s += letras[Math.floor(Math.random() * letras.length)];
  return s;
}

// Se ejecuta UNA vez: toma un usuario real y asegura que el cliente tenga historia clínica
export function setup() {
  let idUsuario = null;
  try {
    const lista = http.get(API_USUARIOS).json();
    if (Array.isArray(lista) && lista.length > 0) idUsuario = lista[0].id;
  } catch (e) {}

  if (!idUsuario) {
    throw new Error('No hay usuarios en la base de datos; crea al menos uno antes de probar.');
  }

  const res = http.post(
    API_CONSULTA,
    JSON.stringify({ id_cliente: ID_CLIENTE, id_usuario: idUsuario, motivo: 'Prueba k6 setup' }),
    HEADERS
  );
  if (res.status !== 201) {
    throw new Error(
      `El POST inicial devolvió ${res.status}: ${res.body}. Revisa ID_CLIENTE y la ruta ${API_CONSULTA}`
    );
  }
  return { idUsuario };
}

export function flujoConsulta(data) {
  // POST: registrar consulta sin cita previa (201)
  const cuerpo = {
    id_cliente: ID_CLIENTE,
    id_usuario: data.idUsuario,
    motivo: 'Prueba k6 ' + letrasAleatorias(8),
    resultado_examen: 'Resultado de prueba',
    diagnostico: 'Diagnostico de prueba',
    recomendaciones: 'Recomendaciones de prueba',
    evolucion: 'Evolucion de prueba',
  };
  let res = http.post(API_CONSULTA, JSON.stringify(cuerpo), HEADERS);
  check(res, {
    'registrar consulta: 201': (r) => r.status === 201,
    'devuelve id_consulta': (r) => {
      try { return r.json().id_consulta !== undefined; } catch (e) { return false; }
    },
  });
  sleep(1);

  // POST sin motivo: validación (400)
  res = http.post(
    API_CONSULTA,
    JSON.stringify({ id_cliente: ID_CLIENTE, id_usuario: data.idUsuario }),
    HEADERS
  );
  check(res, { 'validación sin motivo: 400': (r) => r.status === 400 });
  sleep(1);

  // POST sin cliente: validación (400)
  res = http.post(
    API_CONSULTA,
    JSON.stringify({ id_usuario: data.idUsuario, motivo: 'sin cliente' }),
    HEADERS
  );
  check(res, { 'validación sin cliente: 400': (r) => r.status === 400 });
  sleep(1);
}