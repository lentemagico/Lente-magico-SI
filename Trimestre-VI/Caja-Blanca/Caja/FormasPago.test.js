
// backend/routes/__tests__/Caja/FormasPago.test.js

import request from 'supertest';
import express from 'express';

// Importar la ruta desde la carpeta Caja
import router from '../../Caja/FormasPago.js';

// Simular el módulo de la base de datos
jest.mock('../../../db.js', () => ({
  __esModule: true,
  default: {
    query: jest.fn()
  }
}));

import pool from '../../../db.js';

// Crear aplicación Express para las pruebas
const app = express();

app.use(express.json());
app.use('/formas_pago', router);

describe('Pruebas de Caja Blanca - Formas de Pago', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =====================================================
  // GET /
  // =====================================================

  describe('GET /', () => {

    test('debe retornar las formas de pago agrupadas', async () => {
      pool.query.mockResolvedValueOnce([[
        {
          metodo_pago: 'Efectivo',
          cantidad: 3,
          total: 150000
        },
        {
          metodo_pago: 'Tarjeta',
          cantidad: 2,
          total: 90000
        }
      ]]);

      const res = await request(app)
        .get('/formas_pago');

      expect(res.statusCode).toBe(200);
      expect(res.body.formasPago).toHaveLength(2);

      expect(res.body.formasPago[0].metodo_pago)
        .toBe('Efectivo');

      expect(res.body.formasPago[1].metodo_pago)
        .toBe('Tarjeta');

      expect(pool.query).toHaveBeenCalledTimes(1);
    });

    test('debe construir la consulta con GROUP BY y ORDER BY', async () => {
      pool.query.mockResolvedValueOnce([[]]);

      const res = await request(app)
        .get('/formas_pago');

      expect(res.statusCode).toBe(200);

      const queryEjecutada = pool.query.mock.calls[0][0];

      expect(queryEjecutada).toContain('GROUP BY metodo_pago');
      expect(queryEjecutada).toContain(
        'ORDER BY metodo_pago ASC'
      );
    });

    test('debe retornar una lista vacía cuando no hay pagos', async () => {
      pool.query.mockResolvedValueOnce([[]]);

      const res = await request(app)
        .get('/formas_pago');

      expect(res.statusCode).toBe(200);
      expect(res.body.formasPago).toEqual([]);
      expect(res.body.formasPago).toHaveLength(0);
    });

    test('debe capturar errores de base de datos', async () => {
      pool.query.mockRejectedValueOnce(
        new Error('Fallo de conexión')
      );

      const res = await request(app)
        .get('/formas_pago');

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe('Fallo de conexión');
    });
  });

  // =====================================================
  // GET /pagos
  // =====================================================

  describe('GET /pagos', () => {

    test('debe retornar la lista de pagos', async () => {
      pool.query.mockResolvedValueOnce([[
        {
          id_pago: 1,
          id_venta: 1,
          metodo_pago: 'Efectivo',
          monto: 50000
        },
        {
          id_pago: 2,
          id_venta: 2,
          metodo_pago: 'Tarjeta',
          monto: 45000
        }
      ]]);

      const res = await request(app)
        .get('/formas_pago/pagos');

      expect(res.statusCode).toBe(200);
      expect(res.body.pagos).toHaveLength(2);

      expect(res.body.pagos[0].metodo_pago)
        .toBe('Efectivo');

      expect(res.body.pagos[1].metodo_pago)
        .toBe('Tarjeta');

      expect(pool.query).toHaveBeenCalledTimes(1);
    });

    test('debe construir la consulta ordenando por fecha descendente', async () => {
      pool.query.mockResolvedValueOnce([[]]);

      const res = await request(app)
        .get('/formas_pago/pagos');

      expect(res.statusCode).toBe(200);

      const queryEjecutada = pool.query.mock.calls[0][0];

      expect(queryEjecutada).toContain('FROM Pago');
      expect(queryEjecutada).toContain(
        'ORDER BY fecha_pago DESC'
      );
    });

    test('debe retornar una lista vacía cuando no hay pagos', async () => {
      pool.query.mockResolvedValueOnce([[]]);

      const res = await request(app)
        .get('/formas_pago/pagos');

      expect(res.statusCode).toBe(200);
      expect(res.body.pagos).toEqual([]);
      expect(res.body.pagos).toHaveLength(0);
    });

    test('debe capturar errores de base de datos', async () => {
      pool.query.mockRejectedValueOnce(
        new Error('Fallo')
      );

      const res = await request(app)
        .get('/formas_pago/pagos');

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe('Fallo');
    });
  });
});
