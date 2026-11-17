
import request from 'supertest';
import express from 'express';

// Ruta correcta desde __tests__/Caja hasta routes/Caja
import router from '../../Caja/Efectivo.js';

// Simular la base de datos.
// Desde este archivo, ../../../db.js apunta a backend/db.js
jest.mock('../../../db.js', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
    getConnection: jest.fn()
  }
}));

import pool from '../../../db.js';

// Conexión simulada
const connection = {
  query: jest.fn(),
  beginTransaction: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
  release: jest.fn()
};

// Datos válidos para registrar un pago
const bodyValido = {
  id_venta: 1,
  monto: 50000,
  monto_recibido: 60000,
  generar_factura: false
};

// Aplicación Express para pruebas
const app = express();
app.use(express.json());
app.use('/pago_efectivo', router);

describe('Pruebas de Caja Blanca - Pagos en Efectivo', () => {

  beforeEach(() => {
    jest.resetAllMocks();

    pool.getConnection.mockResolvedValue(connection);

    connection.beginTransaction.mockResolvedValue(undefined);
    connection.commit.mockResolvedValue(undefined);
    connection.rollback.mockResolvedValue(undefined);
    connection.release.mockReturnValue(undefined);
  });

  // =====================================================
  // GET /
  // =====================================================

  describe('GET /', () => {

    test('debe retornar la lista de pagos en efectivo', async () => {
      pool.query.mockResolvedValueOnce([[
        {
          id_pago: 1,
          id_venta: 1,
          metodo_pago: 'Efectivo',
          monto: 50000,
          monto_recibido: 60000,
          cambio: 10000
        }
      ]]);

      const res = await request(app)
        .get('/pago_efectivo');

      expect(res.statusCode).toBe(200);
      expect(res.body.pagos).toHaveLength(1);
      expect(pool.query).toHaveBeenCalledTimes(1);

      expect(pool.query.mock.calls[0][0]).toContain(
        "metodo_pago = 'Efectivo'"
      );
    });

    test('debe retornar una lista vacía cuando no hay pagos', async () => {
      pool.query.mockResolvedValueOnce([[]]);

      const res = await request(app)
        .get('/pago_efectivo');

      expect(res.statusCode).toBe(200);
      expect(res.body.pagos).toEqual([]);
    });

    test('debe capturar error de base de datos', async () => {
      pool.query.mockRejectedValueOnce(
        new Error('Fallo de conexión')
      );

      const res = await request(app)
        .get('/pago_efectivo');

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe('Fallo de conexión');
    });
  });

  // =====================================================
  // POST /
  // =====================================================

  describe('POST /', () => {

    test('debe rechazar cuando faltan campos requeridos', async () => {
      const res = await request(app)
        .post('/pago_efectivo')
        .send({
          id_venta: 1
        });

      expect(res.statusCode).toBe(400);

      expect(connection.query).not.toHaveBeenCalled();
      expect(connection.beginTransaction).not.toHaveBeenCalled();
    });

    test('debe rechazar cuando el dinero recibido es insuficiente', async () => {
      const res = await request(app)
        .post('/pago_efectivo')
        .send({
          ...bodyValido,
          monto_recibido: 100
        });

      expect(res.statusCode).toBe(400);

      expect(res.body.error).toBe(
        'El dinero recibido es insuficiente'
      );

      expect(connection.query).not.toHaveBeenCalled();
    });

    test('debe registrar el pago sin generar factura', async () => {
      connection.query.mockResolvedValueOnce([
        { insertId: 5 }
      ]);

      const res = await request(app)
        .post('/pago_efectivo')
        .send(bodyValido);

      expect(res.statusCode).toBe(201);
      expect(res.body.id_pago).toBe(5);
      expect(res.body.cambio).toBe(10000);
      expect(res.body.factura_generada).toBe(false);
      expect(res.body.num_factura).toBeNull();

      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.commit).toHaveBeenCalled();
      expect(connection.rollback).not.toHaveBeenCalled();
      expect(connection.release).toHaveBeenCalled();
    });

    test('debe registrar el pago y generar la factura', async () => {
      connection.query
        .mockResolvedValueOnce([
          { insertId: 5 }
        ])
        .mockResolvedValueOnce([
          { insertId: 1 }
        ]);

      const res = await request(app)
        .post('/pago_efectivo')
        .send({
          ...bodyValido,
          generar_factura: true
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.factura_generada).toBe(true);
      expect(res.body.num_factura).toBe('FAC-000005');

      expect(connection.query).toHaveBeenCalledTimes(2);
      expect(connection.commit).toHaveBeenCalled();
      expect(connection.rollback).not.toHaveBeenCalled();
      expect(connection.release).toHaveBeenCalled();
    });

    test('debe permitir el pago con monto exacto y cambio cero', async () => {
      connection.query.mockResolvedValueOnce([
        { insertId: 7 }
      ]);

      const res = await request(app)
        .post('/pago_efectivo')
        .send({
          ...bodyValido,
          monto_recibido: 50000
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.cambio).toBe(0);
      expect(connection.commit).toHaveBeenCalled();
    });

    test('debe hacer rollback cuando falla el registro del pago', async () => {
      connection.query.mockRejectedValueOnce(
        new Error('Fallo')
      );

      const res = await request(app)
        .post('/pago_efectivo')
        .send(bodyValido);

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe('Fallo');

      expect(connection.rollback).toHaveBeenCalled();
      expect(connection.release).toHaveBeenCalled();
      expect(connection.commit).not.toHaveBeenCalled();
    });

    test('debe hacer rollback si falla la creación de la factura', async () => {
      connection.query
        .mockResolvedValueOnce([
          { insertId: 5 }
        ])
        .mockRejectedValueOnce(
          new Error('Fallo factura')
        );

      const res = await request(app)
        .post('/pago_efectivo')
        .send({
          ...bodyValido,
          generar_factura: true
        });

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe('Fallo factura');

      expect(connection.commit).not.toHaveBeenCalled();
      expect(connection.rollback).toHaveBeenCalled();
      expect(connection.release).toHaveBeenCalled();
    });

    test('debe manejar error al iniciar la transacción', async () => {
      connection.beginTransaction.mockRejectedValueOnce(
        new Error('Error al iniciar transacción')
      );

      const res = await request(app)
        .post('/pago_efectivo')
        .send(bodyValido);

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe(
        'Error al iniciar transacción'
      );

      expect(connection.rollback).toHaveBeenCalled();
      expect(connection.release).toHaveBeenCalled();
    });

    test('debe manejar error al confirmar la transacción', async () => {
      connection.query.mockResolvedValueOnce([
        { insertId: 5 }
      ]);

      connection.commit.mockRejectedValueOnce(
        new Error('Error al confirmar transacción')
      );

      const res = await request(app)
        .post('/pago_efectivo')
        .send(bodyValido);

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe(
        'Error al confirmar transacción'
      );

      expect(connection.rollback).toHaveBeenCalled();
      expect(connection.release).toHaveBeenCalled();
    });

    test('debe manejar error al obtener la conexión', async () => {
      pool.getConnection.mockRejectedValueOnce(
        new Error('Error al obtener conexión')
      );

      const res = await request(app)
        .post('/pago_efectivo')
        .send(bodyValido);

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe(
        'Error al obtener conexión'
      );
    });
  });
});
