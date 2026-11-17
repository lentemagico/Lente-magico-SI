
import request from 'supertest';
import express from 'express';

// Ruta correcta del módulo Plataformas
import router from '../../Caja/Plataformas.js';

// Simular la base de datos
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

// Datos válidos para el POST
const bodyValido = {
  id_venta: 1,
  monto: 50000,
  plataforma: 'Nequi',
  numero: '3001234567',
  generar_factura: false
};

// Aplicación Express
const app = express();

app.use(express.json());
app.use('/pago_plataforma', router);

describe('Pruebas de Caja Blanca - Pagos por Plataforma', () => {

  beforeEach(() => {
    jest.clearAllMocks();

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

    test('debe retornar las plataformas disponibles', async () => {
      const res = await request(app)
        .get('/pago_plataforma');

      expect(res.statusCode).toBe(200);

      expect(res.body.plataformas).toHaveLength(4);

      expect(
        res.body.plataformas.map(p => p.nombre)
      ).toEqual([
        'Nequi',
        'Daviplata',
        'PSE',
        'Otros'
      ]);

      expect(pool.query).not.toHaveBeenCalled();
      expect(pool.getConnection).not.toHaveBeenCalled();
    });

    test('debe retornar las plataformas en el formato esperado', async () => {
      const res = await request(app)
        .get('/pago_plataforma');

      expect(res.statusCode).toBe(200);

      expect(res.body).toHaveProperty('plataformas');
      expect(Array.isArray(res.body.plataformas)).toBe(true);
    });

    test('debe capturar errores al responder', async () => {
      const spy = jest
        .spyOn(express.response, 'json')
        .mockImplementationOnce(() => {
          throw new Error('Fallo al responder');
        });

      const res = await request(app)
        .get('/pago_plataforma');

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe('Fallo al responder');

      spy.mockRestore();
    });
  });

  // =====================================================
  // POST / - VALIDACIONES
  // =====================================================

  describe('POST / - Validaciones', () => {

    test('debe rechazar cuando faltan campos requeridos', async () => {
      const res = await request(app)
        .post('/pago_plataforma')
        .send({
          id_venta: 1
        });

      expect(res.statusCode).toBe(400);

      expect(res.body.error).toBe(
        'Faltan datos del pago'
      );

      expect(connection.query).not.toHaveBeenCalled();
      expect(connection.beginTransaction).not.toHaveBeenCalled();
    });

    test('debe rechazar cuando el monto es cero', async () => {
      const res = await request(app)
        .post('/pago_plataforma')
        .send({
          ...bodyValido,
          monto: 0
        });

      expect(res.statusCode).toBe(400);

      expect(res.body.error).toBe(
        'El valor del pago debe ser mayor que 0'
      );

      expect(connection.query).not.toHaveBeenCalled();
    });

    test('debe rechazar cuando el monto es negativo', async () => {
      const res = await request(app)
        .post('/pago_plataforma')
        .send({
          ...bodyValido,
          monto: -100
        });

      expect(res.statusCode).toBe(400);

      expect(res.body.error).toBe(
        'El valor del pago debe ser mayor que 0'
      );

      expect(connection.query).not.toHaveBeenCalled();
    });

    test('debe rechazar cuando la plataforma está vacía', async () => {
      const res = await request(app)
        .post('/pago_plataforma')
        .send({
          ...bodyValido,
          plataforma: ''
        });

      expect(res.statusCode).toBe(400);

      expect(res.body.error).toBe(
        'Debe indicar una plataforma de pago'
      );

      expect(connection.query).not.toHaveBeenCalled();
    });

    test('debe rechazar cuando la plataforma contiene espacios', async () => {
      const res = await request(app)
        .post('/pago_plataforma')
        .send({
          ...bodyValido,
          plataforma: '   '
        });

      expect(res.statusCode).toBe(400);

      expect(res.body.error).toBe(
        'Debe indicar una plataforma de pago'
      );

      expect(connection.query).not.toHaveBeenCalled();
    });
  });

  // =====================================================
  // POST / - REGISTRO EXITOSO
  // =====================================================

  describe('POST / - Registro exitoso', () => {

    test('debe registrar el pago sin generar factura', async () => {
      connection.query.mockResolvedValueOnce([
        { insertId: 5 }
      ]);

      const res = await request(app)
        .post('/pago_plataforma')
        .send(bodyValido);

      expect(res.statusCode).toBe(201);

      expect(res.body.id_pago).toBe(5);
      expect(res.body.plataforma).toBe('Nequi');
      expect(res.body.monto).toBe(50000);
      expect(res.body.factura_generada).toBe(false);
      expect(res.body.num_factura).toBeNull();

      expect(connection.beginTransaction).toHaveBeenCalled();
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
        .post('/pago_plataforma')
        .send({
          ...bodyValido,
          generar_factura: true
        });

      expect(res.statusCode).toBe(201);

      expect(res.body.id_pago).toBe(5);
      expect(res.body.factura_generada).toBe(true);
      expect(res.body.num_factura).toBe('FAC-000005');

      expect(connection.query).toHaveBeenCalledTimes(2);
      expect(connection.commit).toHaveBeenCalled();

      const ultimaLlamada =
        connection.query.mock.calls[
          connection.query.mock.calls.length - 1
        ];

      expect(ultimaLlamada[0]).toContain(
        'INSERT INTO factura'
      );

      expect(ultimaLlamada[1]).toEqual([
        5,
        'FAC-000005'
      ]);
    });

    test('debe aceptar generar_factura como texto true', async () => {
      connection.query
        .mockResolvedValueOnce([
          { insertId: 8 }
        ])
        .mockResolvedValueOnce([
          { insertId: 2 }
        ]);

      const res = await request(app)
        .post('/pago_plataforma')
        .send({
          ...bodyValido,
          generar_factura: 'true'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.factura_generada).toBe(true);
      expect(res.body.num_factura).toBe('FAC-000008');
    });

    test('debe limpiar los espacios del nombre de la plataforma', async () => {
      connection.query.mockResolvedValueOnce([
        { insertId: 9 }
      ]);

      const res = await request(app)
        .post('/pago_plataforma')
        .send({
          ...bodyValido,
          plataforma: '  Daviplata  '
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.plataforma).toBe('Daviplata');

      const ultimaLlamada =
        connection.query.mock.calls[
          connection.query.mock.calls.length - 1
        ];

      expect(ultimaLlamada[1]).toEqual([
        1,
        'Daviplata',
        50000,
        50000
      ]);
    });

    test('debe aceptar la plataforma Otros', async () => {
      connection.query.mockResolvedValueOnce([
        { insertId: 10 }
      ]);

      const res = await request(app)
        .post('/pago_plataforma')
        .send({
          ...bodyValido,
          plataforma: 'Otros'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.plataforma).toBe('Otros');
    });

    test('debe aceptar la plataforma PSE', async () => {
      connection.query.mockResolvedValueOnce([
        { insertId: 11 }
      ]);

      const res = await request(app)
        .post('/pago_plataforma')
        .send({
          ...bodyValido,
          plataforma: 'PSE'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.plataforma).toBe('PSE');
    });
  });

  // =====================================================
  // POST / - ERRORES DE BASE DE DATOS
  // =====================================================

  describe('POST / - Manejo de errores', () => {

    test('debe manejar error al obtener la conexión', async () => {
      pool.getConnection.mockRejectedValueOnce(
        new Error('Error al obtener conexión')
      );

      const res = await request(app)
        .post('/pago_plataforma')
        .send(bodyValido);

      expect(res.statusCode).toBe(500);

      expect(res.body.error).toBe(
        'Error al obtener conexión'
      );
    });

    test('debe hacer rollback si falla el inicio de la transacción', async () => {
      connection.beginTransaction.mockRejectedValueOnce(
        new Error('Error al iniciar transacción')
      );

      const res = await request(app)
        .post('/pago_plataforma')
        .send(bodyValido);

      expect(res.statusCode).toBe(500);

      expect(res.body.error).toBe(
        'Error al iniciar transacción'
      );

      expect(connection.rollback).toHaveBeenCalled();
      expect(connection.release).toHaveBeenCalled();
    });

    test('debe hacer rollback si falla el registro del pago', async () => {
      connection.query.mockRejectedValueOnce(
        new Error('Fallo')
      );

      const res = await request(app)
        .post('/pago_plataforma')
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
        .post('/pago_plataforma')
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

    test('debe manejar error al confirmar la transacción', async () => {
      connection.query.mockResolvedValueOnce([
        { insertId: 5 }
      ]);

      connection.commit.mockRejectedValueOnce(
        new Error('Error al confirmar transacción')
      );

      const res = await request(app)
        .post('/pago_plataforma')
        .send(bodyValido);

      expect(res.statusCode).toBe(500);

      expect(res.body.error).toBe(
        'Error al confirmar transacción'
      );

      expect(connection.rollback).toHaveBeenCalled();
      expect(connection.release).toHaveBeenCalled();
    });
  });
});
