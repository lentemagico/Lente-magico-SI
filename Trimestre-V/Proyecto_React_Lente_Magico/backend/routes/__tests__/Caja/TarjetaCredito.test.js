
import express from 'express';
import request from 'supertest';

// Mock de la base de datos compatible con la transformación de Jest
jest.mock('../../../db.js', () => ({
  __esModule: true,
  default: {
    getConnection: jest.fn(),
    query: jest.fn(),
  },
}));

import pool from '../../../db.js';
import router from '../../Caja/TarjetaCredito.js';

const app = express();
app.use(express.json());
app.use('/tarjeta-credito', router);

const connection = {
  query: jest.fn(),
  beginTransaction: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
  release: jest.fn(),
};

describe('Pruebas de Caja Blanca - TarjetaCredito', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    pool.getConnection.mockResolvedValue(connection);

    connection.query.mockResolvedValue([
      { insertId: 25, affectedRows: 1 },
    ]);

    connection.beginTransaction.mockResolvedValue(undefined);
    connection.commit.mockResolvedValue(undefined);
    connection.rollback.mockResolvedValue(undefined);
    connection.release.mockReturnValue(undefined);

    pool.query.mockResolvedValue([[], []]);
  });

  // =========================================
  // VALIDACIONES POST
  // =========================================

  describe('Validaciones POST', () => {
    test('Rechaza cuando falta id_venta', async () => {
      const response = await request(app)
        .post('/tarjeta-credito')
        .send({ monto: 10000, cuotas: 1 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        'Venta, monto y cuotas son obligatorios'
      );
      expect(connection.release).toHaveBeenCalled();
    });

    test('Rechaza cuando id_venta es cero', async () => {
      const response = await request(app)
        .post('/tarjeta-credito')
        .send({ id_venta: 0, monto: 10000, cuotas: 1 });

      expect(response.status).toBe(400);
    });

    test('Rechaza cuando falta monto', async () => {
      const response = await request(app)
        .post('/tarjeta-credito')
        .send({ id_venta: 1, cuotas: 1 });

      expect(response.status).toBe(400);
    });

    test('Rechaza cuando monto es null', async () => {
      const response = await request(app)
        .post('/tarjeta-credito')
        .send({ id_venta: 1, monto: null, cuotas: 1 });

      expect(response.status).toBe(400);
    });

    test('Rechaza cuando faltan las cuotas', async () => {
      const response = await request(app)
        .post('/tarjeta-credito')
        .send({ id_venta: 1, monto: 10000 });

      expect(response.status).toBe(400);
    });

    test('Rechaza cuando cuotas es cero', async () => {
      const response = await request(app)
        .post('/tarjeta-credito')
        .send({ id_venta: 1, monto: 10000, cuotas: 0 });

      expect(response.status).toBe(400);
    });

    test('Rechaza cuando monto es cero', async () => {
      const response = await request(app)
        .post('/tarjeta-credito')
        .send({ id_venta: 1, monto: 0, cuotas: 1 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        'El monto debe ser mayor que 0'
      );
    });

    test('Rechaza cuando monto es negativo', async () => {
      const response = await request(app)
        .post('/tarjeta-credito')
        .send({ id_venta: 1, monto: -100, cuotas: 1 });

      expect(response.status).toBe(400);
    });

    test('Rechaza cuando cuotas son negativas', async () => {
      const response = await request(app)
        .post('/tarjeta-credito')
        .send({ id_venta: 1, monto: 10000, cuotas: -1 });

      expect(response.status).toBe(400);
    });
  });

  // =========================================
  // REGISTRO DE PAGOS
  // =========================================

  describe('Registro de pagos', () => {
    test('Registra el pago sin generar factura', async () => {
      const response = await request(app)
        .post('/tarjeta-credito')
        .send({
          id_venta: 1,
          monto: 50000,
          cuotas: 1,
          generar_factura: false,
        });

      expect(response.status).toBe(201);
      expect(response.body.mensaje).toBe(
        'Pago con tarjeta de crédito registrado'
      );
      expect(response.body.id_pagos).toBe(25);
      expect(response.body.factura_generada).toBe(false);
      expect(response.body.num_factura).toBeNull();

      expect(connection.beginTransaction).toHaveBeenCalled();
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.commit).toHaveBeenCalled();
      expect(connection.release).toHaveBeenCalled();
    });

    test('Registra el pago y genera factura', async () => {
      const response = await request(app)
        .post('/tarjeta-credito')
        .send({
          id_venta: 1,
          monto: 50000,
          cuotas: 3,
          generar_factura: true,
        });

      expect(response.status).toBe(201);
      expect(response.body.factura_generada).toBe(true);
      expect(response.body.num_factura).toBe('FAC-000025');
      expect(connection.query).toHaveBeenCalledTimes(2);
      expect(connection.commit).toHaveBeenCalled();
    });

    test('Genera factura con un ID que necesita completar ceros', async () => {
      connection.query
        .mockResolvedValueOnce([{ insertId: 7 }])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await request(app)
        .post('/tarjeta-credito')
        .send({
          id_venta: 1,
          monto: 50000,
          cuotas: 2,
          generar_factura: true,
        });

      expect(response.status).toBe(201);
      expect(response.body.num_factura).toBe('FAC-000007');
    });

    test('Convierte monto y cuotas de texto a números', async () => {
      const response = await request(app)
        .post('/tarjeta-credito')
        .send({
          id_venta: 1,
          monto: '50000',
          cuotas: '3',
          generar_factura: false,
        });

      expect(response.status).toBe(201);
      expect(response.body.monto).toBe(50000);
      expect(response.body.cuotas).toBe(3);
    });

    test('No genera factura cuando generar_factura es false', async () => {
      const response = await request(app)
        .post('/tarjeta-credito')
        .send({
          id_venta: 1,
          monto: 50000,
          cuotas: 1,
          generar_factura: false,
        });

      expect(response.status).toBe(201);
      expect(response.body.factura_generada).toBe(false);
      expect(response.body.num_factura).toBeNull();
      expect(connection.query).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================
  // ERRORES POST
  // =========================================

  describe('Manejo de errores POST', () => {
    test('Captura error al iniciar la transacción', async () => {
      connection.beginTransaction.mockRejectedValueOnce(
        new Error('Error iniciando transacción')
      );

      const response = await request(app)
        .post('/tarjeta-credito')
        .send({ id_venta: 1, monto: 10000, cuotas: 1 });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe(
        'Error iniciando transacción'
      );
      expect(connection.rollback).toHaveBeenCalled();
      expect(connection.release).toHaveBeenCalled();
    });

    test('Captura error al insertar el pago', async () => {
      connection.query.mockRejectedValueOnce(
        new Error('Error insertando pago')
      );

      const response = await request(app)
        .post('/tarjeta-credito')
        .send({ id_venta: 1, monto: 10000, cuotas: 1 });

      expect(response.status).toBe(500);
      expect(connection.rollback).toHaveBeenCalled();
    });

    test('Captura error al insertar la factura', async () => {
      connection.query
        .mockResolvedValueOnce([{ insertId: 25 }])
        .mockRejectedValueOnce(
          new Error('Error insertando factura')
        );

      const response = await request(app)
        .post('/tarjeta-credito')
        .send({
          id_venta: 1,
          monto: 10000,
          cuotas: 1,
          generar_factura: true,
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe(
        'Error insertando factura'
      );
      expect(connection.rollback).toHaveBeenCalled();
    });

    test('Captura error al confirmar la transacción', async () => {
      connection.commit.mockRejectedValueOnce(
        new Error('Error confirmando transacción')
      );

      const response = await request(app)
        .post('/tarjeta-credito')
        .send({ id_venta: 1, monto: 10000, cuotas: 1 });

      expect(response.status).toBe(500);
      expect(connection.rollback).toHaveBeenCalled();
    });

    test('Maneja error al obtener conexión', async () => {
      pool.getConnection.mockRejectedValueOnce(
        new Error('Error de conexión')
      );

      const response = await request(app)
        .post('/tarjeta-credito')
        .send({ id_venta: 1, monto: 10000, cuotas: 1 });

      expect(response.status).toBe(500);
    });
  });

  // =========================================
  // CONSULTAS GET
  // =========================================

  describe('Consultas GET', () => {
    test('GET retorna los pagos con tarjeta crédito', async () => {
      const pagos = [
        {
          id_pagos: 1,
          monto: 50000,
          metodo_pago: 'Tarjeta Crédito',
        },
        {
          id_pagos: 2,
          monto: 80000,
          metodo_pago: 'Tarjeta Crédito',
        },
      ];

      pool.query.mockResolvedValueOnce([pagos]);

      const response = await request(app)
        .get('/tarjeta-credito');

      expect(response.status).toBe(200);
      expect(response.body.pagos).toEqual(pagos);
      expect(pool.query).toHaveBeenCalled();
    });

    test('GET retorna lista vacía cuando no hay pagos', async () => {
      pool.query.mockResolvedValueOnce([[]]);

      const response = await request(app)
        .get('/tarjeta-credito');

      expect(response.status).toBe(200);
      expect(response.body.pagos).toEqual([]);
    });

    test('GET captura errores de base de datos', async () => {
      pool.query.mockRejectedValueOnce(
        new Error('Error consultando pagos')
      );

      const response = await request(app)
        .get('/tarjeta-credito');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe(
        'Error consultando pagos'
      );
    });
  });
});
