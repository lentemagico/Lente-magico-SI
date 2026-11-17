
import request from 'supertest';
import express from 'express';

jest.mock('../../../db.js');

import pool from '../../../db.js';
import router from '../../Caja/TarjetaDebito.js';

const app = express();
app.use(express.json());
app.use('/pago_tarjeta_debito', router);

const bodyValido = {
  id_venta: 1,
  monto: 75000
};

describe('Pruebas de Caja Blanca - Pagos con Tarjeta Débito', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // POST / - VALIDACIONES
  // ==========================================

  test('POST / debe rechazar si falta el ID de venta', async () => {
    const res = await request(app)
      .post('/pago_tarjeta_debito')
      .send({ monto: 75000 });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Venta y monto son obligatorios');
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('POST / debe rechazar si falta el monto', async () => {
    const res = await request(app)
      .post('/pago_tarjeta_debito')
      .send({ id_venta: 1 });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Venta y monto son obligatorios');
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('POST / debe rechazar si el monto es cero', async () => {
    const res = await request(app)
      .post('/pago_tarjeta_debito')
      .send({ id_venta: 1, monto: 0 });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Venta y monto son obligatorios');
    expect(pool.query).not.toHaveBeenCalled();
  });

  // ==========================================
  // POST / - REGISTRO EXITOSO
  // ==========================================

  test('POST / debe registrar el pago exitosamente', async () => {
    pool.query.mockResolvedValueOnce([
      { insertId: 5 }
    ]);

    const res = await request(app)
      .post('/pago_tarjeta_debito')
      .send(bodyValido);

    expect(res.statusCode).toBe(201);

    expect(res.body).toEqual({
      mensaje: 'Pago con tarjeta débito registrado',
      id_pagos: 5
    });

    expect(pool.query).toHaveBeenCalledTimes(1);

    const [sql, parametros] = pool.query.mock.calls[0];

    expect(sql).toContain('INSERT INTO Pago');
    expect(sql).toContain("'Tarjeta Débito'");
    expect(sql).toContain('CURRENT_TIMESTAMP');

    expect(parametros).toEqual([
      1,
      75000,
      75000
    ]);
  });

  // ==========================================
  // GET / - CONSULTAR PAGOS
  // ==========================================

  test('GET / debe retornar los pagos con tarjeta débito', async () => {
    const pagosSimulados = [
      {
        id_pago: 1,
        id_venta: 1,
        metodo_pago: 'Tarjeta Débito',
        monto: 75000
      }
    ];

    pool.query.mockResolvedValueOnce([
      pagosSimulados
    ]);

    const res = await request(app)
      .get('/pago_tarjeta_debito');

    expect(res.statusCode).toBe(200);
    expect(res.body.pagos).toHaveLength(1);

    expect(res.body.pagos[0]).toEqual(
      pagosSimulados[0]
    );

    expect(pool.query).toHaveBeenCalledTimes(1);

    const sql = pool.query.mock.calls[0][0];

    expect(sql).toContain('SELECT * FROM Pago');
    expect(sql).toContain(
      "metodo_pago = 'Tarjeta Débito'"
    );
    expect(sql).toContain(
      'ORDER BY fecha_pago DESC'
    );
  });

  // ==========================================
  // MANEJO DE ERRORES - POST
  // ==========================================

  test('POST / debe capturar errores de base de datos', async () => {
    pool.query.mockRejectedValueOnce(
      new Error('Fallo')
    );

    const res = await request(app)
      .post('/pago_tarjeta_debito')
      .send(bodyValido);

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Fallo');
  });

  // ==========================================
  // MANEJO DE ERRORES - GET
  // ==========================================

  test('GET / debe capturar errores de conexión', async () => {
    pool.query.mockRejectedValueOnce(
      new Error('Fallo de conexión')
    );

    const res = await request(app)
      .get('/pago_tarjeta_debito');

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe(
      'Fallo de conexión'
    );
  });

});
