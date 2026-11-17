
// backend/routes/__tests__/Caja/ConfirmacionBanco.test.js

import request from 'supertest';
import express from 'express';

// -----------------------------------------------------
// MOCK DE LA BASE DE DATOS
// -----------------------------------------------------

jest.mock('../../../db.js', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
    getConnection: jest.fn(),
  },
}));

import pool from '../../../db.js';

// Importación correcta del controlador
import router from '../../Caja/ConfirmacionBanco.js';

// -----------------------------------------------------
// CONFIGURACIÓN DE EXPRESS
// -----------------------------------------------------

const app = express();
app.use(express.json());
app.use('/confirmacion_banco', router);

// -----------------------------------------------------
// CONEXIÓN SIMULADA
// -----------------------------------------------------

const connection = {
  query: jest.fn(),
  beginTransaction: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
  release: jest.fn(),
};

// -----------------------------------------------------
// DATOS DE PRUEBA
// -----------------------------------------------------

const bodyValido = {
  id_venta: 1,
  monto: 150000,
  metodo_pago: 'Bancolombia',
};

// -----------------------------------------------------
// PRUEBAS
// -----------------------------------------------------

describe('Pruebas de Caja Blanca - Confirmacion Banco', () => {

  beforeEach(() => {
    jest.clearAllMocks();

    pool.query.mockReset();
    pool.getConnection.mockReset();

    connection.query.mockReset();
    connection.beginTransaction.mockReset();
    connection.commit.mockReset();
    connection.rollback.mockReset();
    connection.release.mockReset();

    connection.beginTransaction.mockResolvedValue(undefined);
    connection.commit.mockResolvedValue(undefined);
    connection.rollback.mockResolvedValue(undefined);
    connection.release.mockReturnValue(undefined);

    pool.getConnection.mockResolvedValue(connection);
  });

  // -----------------------------------------------------
  // POST /
  // -----------------------------------------------------

  test('POST / debe rechazar si falta id_venta', async () => {
    const res = await request(app)
      .post('/confirmacion_banco')
      .send({
        monto: 100,
        metodo_pago: 'Bancolombia',
      });

    expect(res.statusCode).toBe(400);

    expect(res.body.error).toBe(
      'El ID de la venta es obligatorio'
    );
  });

  test('POST / debe rechazar si falta el monto', async () => {
    const res = await request(app)
      .post('/confirmacion_banco')
      .send({
        id_venta: 1,
        metodo_pago: 'Bancolombia',
      });

    expect(res.statusCode).toBe(400);

    expect(res.body.error).toBe(
      'El monto debe ser mayor que 0'
    );
  });

  test('POST / debe rechazar si el monto es menor o igual a cero', async () => {
    const res = await request(app)
      .post('/confirmacion_banco')
      .send({
        ...bodyValido,
        monto: 0,
      });

    expect(res.statusCode).toBe(400);
  });

  test('POST / debe rechazar si falta el banco', async () => {
    const res = await request(app)
      .post('/confirmacion_banco')
      .send({
        id_venta: 1,
        monto: 100,
      });

    expect(res.statusCode).toBe(400);

    expect(res.body.error).toBe(
      'Debes indicar el banco utilizado'
    );
  });

  test('POST / debe rechazar si el banco contiene solamente espacios', async () => {
    const res = await request(app)
      .post('/confirmacion_banco')
      .send({
        ...bodyValido,
        metodo_pago: '   ',
      });

    expect(res.statusCode).toBe(400);
  });

  // -----------------------------------------------------
  // POST / SIN FACTURA
  // -----------------------------------------------------

  test('POST / debe confirmar el pago sin factura', async () => {
    connection.query.mockResolvedValueOnce([
      { insertId: 5 },
    ]);

    const res = await request(app)
      .post('/confirmacion_banco')
      .send(bodyValido);

    expect(res.statusCode).toBe(201);

    expect(res.body.mensaje).toBe(
      'Pago bancario confirmado correctamente'
    );

    expect(res.body.factura_generada).toBe(false);
    expect(res.body.num_factura).toBeNull();

    expect(pool.getConnection).toHaveBeenCalled();
    expect(connection.beginTransaction).toHaveBeenCalled();
    expect(connection.commit).toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalled();
  });

  // -----------------------------------------------------
  // POST / CON FACTURA
  // -----------------------------------------------------

  test('POST / debe confirmar el pago con factura', async () => {
    connection.query
      .mockResolvedValueOnce([
        { insertId: 5 },
      ])
      .mockResolvedValueOnce([
        { insertId: 1 },
      ]);

    const res = await request(app)
      .post('/confirmacion_banco')
      .send({
        ...bodyValido,
        generar_factura: true,
      });

    expect(res.statusCode).toBe(201);

    expect(res.body.factura_generada).toBe(true);

    expect(res.body.num_factura).toBe(
      'FAC-000005'
    );

    expect(connection.commit).toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalled();
  });

  // -----------------------------------------------------
  // GET /:id
  // -----------------------------------------------------

  test('GET /:id debe retornar 404 si el pago no existe', async () => {
    pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app)
      .get('/confirmacion_banco/10');

    expect(res.statusCode).toBe(404);

    expect(res.body.error).toBe(
      'Pago no encontrado'
    );
  });

  test('GET /:id debe retornar el pago si existe', async () => {
    pool.query.mockResolvedValueOnce([
      [
        {
          id_pagos: 1,
          num_factura: 'FAC-000001',
        },
      ],
    ]);

    const res = await request(app)
      .get('/confirmacion_banco/1');

    expect(res.statusCode).toBe(200);
    expect(res.body.id_pagos).toBe(1);
  });

  // -----------------------------------------------------
  // MANEJO DE ERRORES DE BASE DE DATOS
  // -----------------------------------------------------

  describe('Manejo de errores de base de datos', () => {

    test('POST / debe capturar error de BD y retornar 500', async () => {
      connection.query.mockRejectedValueOnce(
        new Error('Fallo')
      );

      const res = await request(app)
        .post('/confirmacion_banco')
        .send(bodyValido);

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe('Fallo');

      expect(connection.rollback).toHaveBeenCalled();
      expect(connection.release).toHaveBeenCalled();
    });

    test('GET /:id debe capturar error de BD y retornar 500', async () => {
      pool.query.mockRejectedValueOnce(
        new Error('Fallo')
      );

      const res = await request(app)
        .get('/confirmacion_banco/1');

      expect(res.statusCode).toBe(500);
    });

  });

});
