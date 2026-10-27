import http from 'k6/http';
import { check, sleep } from 'k6';

// 1. Opciones: define el patrón de carga con "etapas" (stages)
export let options = {
  stages: [
    { duration: '30s', target: 10 }, // Sube de 1 a 10 usuarios virtuales en 30s
    { duration: '1m', target: 10 },  // Mantiene 10 usuarios durante 1 minuto
    { duration: '30s', target: 0 },  // Baja de 10 a 0 usuarios en 30s
  ],
};

// 2. Función principal: el código que ejecuta cada usuario virtual
export default function () {
  let res = http.get('http://localhost:5000'); // Cambia esta URL por la de tu API o web
  check(res, {
    'el estado es 200': (r) => r.status === 200,
  });
  sleep(1); // Pausa de 1 segundo entre peticiones
}
