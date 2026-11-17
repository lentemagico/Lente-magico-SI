
import request from 'supertest';
import express from 'express';

jest.mock('../../../db.js');

import pool from '../../../db.js';
import router from '../../Caja/VisualizarVenta.js';

const app = express();

app.use(express.json());
app.use('/ventas', router);

// ==========================================
// CONEXIÓN SIMULADA
// ==========================================

const connection = {
  query: jest.fn(),
  beginTransaction: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
  release: jest.fn()
};

pool.getConnection = jest.fn();

// ==========================================
// DATOS DE PRUEBA
// ==========================================

const ventaSimulada = {
  id_venta: 1,
  id_cliente: 1,
  id_usuario: 1,
  fecha_venta: '2023-01-01',
  estado: 'pagada',
  documento_cliente: '123456',
  cliente: 'Ana Gil'
};

const detalleSimulado = {
  id_detalle: 1,
  id_venta: 1,
  id_producto: 1,
  codigo_producto: 'P-001',
  nombre: 'Lente'
};

const pagoSimulado = {
  id_pago: 1,
  id_venta: 1,
  metodo_pago: 'Efectivo'
};

// Obtener las dos últimas consultas
const ultimasQueries = () => {
  const llamadas = pool.query.mock.calls;

  return {
    rows: llamadas[llamadas.length - 2],
    count: llamadas[llamadas.length - 1]
  };
};

describe('Pruebas de Caja Blanca - Ventas', () => {

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
  });

  // ==========================================
  // GET / - LISTAR VENTAS
  // ==========================================

  test('GET / sin parámetros debe retornar lista paginada por defecto', async () => {
    pool.query
      .mockResolvedValueOnce([[ventaSimulada]])
      .mockResolvedValueOnce([[{ total: 12 }]]);

    const res = await request(app).get('/ventas');

    expect(res.statusCode).toBe(200);
    expect(res.body.ventas).toHaveLength(1);

    expect(res.body.pagination).toEqual({
      currentPage: 1,
      limit: 5,
      totalItems: 12,
      totalPages: 3,
      hasNextPage: true,
      hasPrevPage: false
    });

    expect(pool.query).toHaveBeenCalledTimes(2);

    const { rows, count } = ultimasQueries();

    expect(rows[1]).toEqual([5, 0]);
    expect(count[1]).toEqual([]);
  });

  test('GET / debe calcular correctamente el offset', async () => {
    pool.query
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ total: 25 }]]);

    const res = await request(app)
      .get('/ventas?page=2&limit=10');

    expect(res.statusCode).toBe(200);

    expect(res.body.pagination).toEqual({
      currentPage: 2,
      limit: 10,
      totalItems: 25,
      totalPages: 3,
      hasNextPage: true,
      hasPrevPage: true
    });

    const { rows } = ultimasQueries();

    expect(rows[1]).toEqual([10, 10]);
  });

  test('GET / en la última página no debe tener página siguiente', async () => {
    pool.query
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ total: 25 }]]);

    const res = await request(app)
      .get('/ventas?page=3&limit=10');

    expect(res.statusCode).toBe(200);
    expect(res.body.pagination.hasNextPage).toBe(false);
    expect(res.body.pagination.hasPrevPage).toBe(true);
  });

  test('GET / con página y límite inválidos debe usar valores por defecto', async () => {
    pool.query
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ total: 0 }]]);

    const res = await request(app)
      .get('/ventas?page=abc&limit=abc');

    expect(res.statusCode).toBe(200);
    expect(res.body.pagination.currentPage).toBe(1);
    expect(res.body.pagination.limit).toBe(5);
    expect(res.body.pagination.totalPages).toBe(0);
  });

  test('GET / con página y límite negativos debe usar valores por defecto', async () => {
    pool.query
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ total: 0 }]]);

    const res = await request(app)
      .get('/ventas?page=-2&limit=-10');

    expect(res.statusCode).toBe(200);
    expect(res.body.pagination.currentPage).toBe(1);
    expect(res.body.pagination.limit).toBe(5);

    const { rows } = ultimasQueries();

    expect(rows[1]).toEqual([5, 0]);
  });

  test('GET / sin búsqueda no debe incluir WHERE', async () => {
    pool.query
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ total: 0 }]]);

    const res = await request(app).get('/ventas');

    expect(res.statusCode).toBe(200);

    const { rows, count } = ultimasQueries();

    expect(rows[0]).not.toContain('WHERE');
    expect(count[0]).not.toContain('WHERE');
  });

  // ==========================================
  // GET / - BÚSQUEDAS
  // ==========================================

  test('GET / con búsqueda debe construir WHERE correctamente', async () => {
    pool.query
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ total: 0 }]]);

    const res = await request(app)
      .get('/ventas?search=Ana');

    expect(res.statusCode).toBe(200);

    const { rows, count } = ultimasQueries();

    expect(rows[0]).toContain('WHERE');
    expect(rows[0]).toContain('dp.numero_documento LIKE ?');
    expect(rows[0]).toContain('dp.nombre LIKE ?');
    expect(rows[0]).toContain('dp.apellido LIKE ?');
    expect(rows[0]).toContain('v.estado LIKE ?');

    expect(count[0]).toContain('WHERE');

    expect(rows[1]).toEqual([
      '%Ana%',
      '%Ana%',
      '%Ana%',
      '%Ana%',
      5,
      0
    ]);

    expect(count[1]).toEqual([
      '%Ana%',
      '%Ana%',
      '%Ana%',
      '%Ana%'
    ]);
  });

  test('GET / con búsqueda vacía no debe incluir WHERE', async () => {
    pool.query
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ total: 0 }]]);

    const res = await request(app)
      .get('/ventas?search=');

    expect(res.statusCode).toBe(200);

    const { rows, count } = ultimasQueries();

    expect(rows[0]).not.toContain('WHERE');
    expect(count[0]).not.toContain('WHERE');
  });

  test('GET / con búsqueda que no sea texto debe tratarla como vacía', async () => {
    pool.query
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ total: 0 }]]);

    const res = await request(app)
      .get('/ventas?search[]=Ana');

    expect(res.statusCode).toBe(200);

    const { rows, count } = ultimasQueries();

    expect(rows[0]).not.toContain('WHERE');
    expect(count[0]).not.toContain('WHERE');
  });

  test('GET / debe manejar un total indefinido', async () => {
    pool.query
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]]);

    const res = await request(app).get('/ventas');

    expect(res.statusCode).toBe(200);
    expect(res.body.pagination.totalItems).toBe(0);
    expect(res.body.pagination.totalPages).toBe(0);
  });

  // ==========================================
  // GET /:id - CONSULTAR VENTA
  // ==========================================

  test('GET /:id debe retornar 404 si la venta no existe', async () => {
    pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app).get('/ventas/10');

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Venta no encontrada');

    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test('GET /:id debe retornar venta, detalles y pagos', async () => {
    pool.query
      .mockResolvedValueOnce([[ventaSimulada]])
      .mockResolvedValueOnce([[detalleSimulado]])
      .mockResolvedValueOnce([[pagoSimulado]]);

    const res = await request(app).get('/ventas/1');

    expect(res.statusCode).toBe(200);

    expect(res.body.venta.id_venta).toBe(1);
    expect(res.body.detalle).toHaveLength(1);
    expect(res.body.pagos).toHaveLength(1);

    expect(res.body.detalle[0]).toEqual(detalleSimulado);
    expect(res.body.pagos[0]).toEqual(pagoSimulado);

    const llamadas = pool.query.mock.calls;

    expect(llamadas).toHaveLength(3);

    expect(llamadas[0][1]).toEqual(['1']);
    expect(llamadas[1][1]).toEqual(['1']);
    expect(llamadas[2][1]).toEqual(['1']);
  });

  // ==========================================
  // DELETE /:id - ELIMINAR VENTA
  // ==========================================

  test('DELETE /:id debe retornar 404 y hacer rollback si la venta no existe', async () => {
    pool.getConnection.mockResolvedValueOnce(connection);

    connection.query
      .mockResolvedValueOnce([{ affectedRows: 0 }])
      .mockResolvedValueOnce([{ affectedRows: 0 }])
      .mockResolvedValueOnce([{ affectedRows: 0 }]);

    const res = await request(app).delete('/ventas/10');

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Venta no encontrada');

    expect(connection.beginTransaction).toHaveBeenCalled();
    expect(connection.rollback).toHaveBeenCalled();
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalled();
  });

  test('DELETE /:id debe eliminar exitosamente', async () => {
    pool.getConnection.mockResolvedValueOnce(connection);

    connection.query
      .mockResolvedValueOnce([{ affectedRows: 2 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const res = await request(app).delete('/ventas/1');

    expect(res.statusCode).toBe(200);

    expect(res.body.mensaje).toBe(
      'Venta eliminada exitosamente'
    );

    expect(connection.beginTransaction).toHaveBeenCalled();
    expect(connection.commit).toHaveBeenCalled();
    expect(connection.rollback).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalled();

    expect(connection.query).toHaveBeenCalledTimes(3);

    const ultimaLlamada =
      connection.query.mock.calls[
        connection.query.mock.calls.length - 1
      ];

    expect(ultimaLlamada[0]).toContain('DELETE FROM Venta');
    expect(ultimaLlamada[1]).toEqual(['1']);
  });

  // ==========================================
  // MANEJO DE ERRORES - GET /
  // ==========================================

  test('GET / debe capturar error en consulta de ventas', async () => {
    pool.query.mockRejectedValueOnce(
      new Error('Fallo de conexión')
    );

    const res = await request(app).get('/ventas');

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Fallo de conexión');
  });

  test('GET / debe capturar error en consulta COUNT', async () => {
    pool.query
      .mockResolvedValueOnce([[]])
      .mockRejectedValueOnce(
        new Error('Error al contar ventas')
      );

    const res = await request(app).get('/ventas');

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Error al contar ventas');
  });

  // ==========================================
  // MANEJO DE ERRORES - GET /:id
  // ==========================================

  test('GET /:id debe capturar error de base de datos', async () => {
    pool.query.mockRejectedValueOnce(
      new Error('Fallo')
    );

    const res = await request(app).get('/ventas/1');

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Fallo');
  });

  // ==========================================
  // MANEJO DE ERRORES - DELETE /:id
  // ==========================================

  test('DELETE /:id debe capturar error y hacer rollback', async () => {
    pool.getConnection.mockResolvedValueOnce(connection);

    connection.query.mockRejectedValueOnce(
      new Error('Fallo')
    );

    const res = await request(app).delete('/ventas/1');

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Fallo');

    expect(connection.rollback).toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalled();
    expect(connection.commit).not.toHaveBeenCalled();
  });

  test('DELETE /:id debe manejar error al obtener conexión', async () => {
    pool.getConnection.mockRejectedValueOnce(
      new Error('No se pudo conectar')
    );

    const res = await request(app).delete('/ventas/1');

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('No se pudo conectar');

    expect(connection.rollback).not.toHaveBeenCalled();
    expect(connection.release).not.toHaveBeenCalled();
  });

});
