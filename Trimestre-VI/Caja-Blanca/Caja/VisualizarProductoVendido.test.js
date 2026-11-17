
import request from 'supertest';
import express from 'express';

jest.mock('../../../db.js');

import pool from '../../../db.js';
import router from '../../Caja/VisualizarProductoVendido.js';

const app = express();

app.use(express.json());
app.use('/productos_vendidos', router);

// Datos de prueba
const productoSimulado = {
  id_detalle: 1,
  id_venta: 1,
  id_producto: 1,
  cantidad: 2,
  precio_unitario: 50000,
  codigo_producto: 'P-001',
  nombre_producto: 'Lente',
  fecha_venta: '2023-01-01'
};

// Obtener las dos últimas consultas
const ultimasQueries = () => {
  const llamadas = pool.query.mock.calls;

  return {
    rows: llamadas[llamadas.length - 2],
    count: llamadas[llamadas.length - 1]
  };
};

describe('Pruebas de Caja Blanca - Productos Vendidos', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // GET / - PAGINACIÓN
  // ==========================================

  test('GET / sin parámetros debe retornar valores por defecto', async () => {
    pool.query
      .mockResolvedValueOnce([[productoSimulado]])
      .mockResolvedValueOnce([[{ total: 12 }]]);

    const res = await request(app)
      .get('/productos_vendidos');

    expect(res.statusCode).toBe(200);

    expect(res.body.productosVendidos).toHaveLength(1);

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
      .get('/productos_vendidos?page=2&limit=10');

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

  test('GET / última página no debe tener página siguiente', async () => {
    pool.query
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ total: 25 }]]);

    const res = await request(app)
      .get('/productos_vendidos?page=3&limit=10');

    expect(res.statusCode).toBe(200);
    expect(res.body.pagination.hasNextPage).toBe(false);
    expect(res.body.pagination.hasPrevPage).toBe(true);
  });

  test('GET / primera página sin registros debe retornar cero páginas', async () => {
    pool.query
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ total: 0 }]]);

    const res = await request(app)
      .get('/productos_vendidos');

    expect(res.statusCode).toBe(200);
    expect(res.body.pagination.totalPages).toBe(0);
    expect(res.body.pagination.hasNextPage).toBe(false);
    expect(res.body.pagination.hasPrevPage).toBe(false);
  });

  // ==========================================
  // VALIDACIÓN DE PARÁMETROS
  // ==========================================

  test('GET / con parámetros inválidos debe utilizar valores por defecto', async () => {
    pool.query
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ total: 0 }]]);

    const res = await request(app)
      .get('/productos_vendidos?page=abc&limit=abc');

    expect(res.statusCode).toBe(200);
    expect(res.body.pagination.currentPage).toBe(1);
    expect(res.body.pagination.limit).toBe(5);
  });

  test('GET / con valores negativos debe utilizar valores por defecto', async () => {
    pool.query
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ total: 0 }]]);

    const res = await request(app)
      .get('/productos_vendidos?page=-2&limit=-10');

    expect(res.statusCode).toBe(200);
    expect(res.body.pagination.currentPage).toBe(1);
    expect(res.body.pagination.limit).toBe(5);

    const { rows } = ultimasQueries();

    expect(rows[1]).toEqual([5, 0]);
  });

  // ==========================================
  // BÚSQUEDAS
  // ==========================================

  test('GET / sin búsqueda no debe incluir WHERE', async () => {
    pool.query
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ total: 0 }]]);

    const res = await request(app)
      .get('/productos_vendidos');

    expect(res.statusCode).toBe(200);

    const { rows, count } = ultimasQueries();

    expect(rows[0]).not.toContain('WHERE');
    expect(count[0]).not.toContain('WHERE');
  });

  test('GET / con búsqueda debe construir consultas WHERE', async () => {
    pool.query
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ total: 0 }]]);

    const res = await request(app)
      .get('/productos_vendidos?search=lente');

    expect(res.statusCode).toBe(200);

    const { rows, count } = ultimasQueries();

    expect(rows[0]).toContain('WHERE');
    expect(rows[0]).toContain('p.codigo_producto LIKE ?');
    expect(rows[0]).toContain('p.nombre LIKE ?');

    expect(count[0]).toContain('WHERE');

    expect(rows[1]).toEqual([
      '%lente%',
      '%lente%',
      5,
      0
    ]);

    expect(count[1]).toEqual([
      '%lente%',
      '%lente%'
    ]);
  });

  test('GET / con búsqueda vacía no debe construir WHERE', async () => {
    pool.query
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ total: 0 }]]);

    const res = await request(app)
      .get('/productos_vendidos?search=');

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
      .get('/productos_vendidos?search[]=lente');

    expect(res.statusCode).toBe(200);

    const { rows, count } = ultimasQueries();

    expect(rows[0]).not.toContain('WHERE');
    expect(count[0]).not.toContain('WHERE');
  });

  // ==========================================
  // GET /:id - CONSULTAR POR ID
  // ==========================================

  test('GET /:id debe retornar 404 si no existe el producto vendido', async () => {
    pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app)
      .get('/productos_vendidos/10');

    expect(res.statusCode).toBe(404);

    expect(res.body.error).toBe(
      'Producto vendido no encontrado'
    );

    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test('GET /:id debe retornar el producto vendido si existe', async () => {
    const producto = {
      id_detalle: 1,
      id_venta: 1,
      id_producto: 1,
      cantidad: 2,
      precio_unitario: 50000,
      codigo_producto: 'P-001',
      nombre: 'Lente'
    };

    pool.query.mockResolvedValueOnce([[producto]]);

    const res = await request(app)
      .get('/productos_vendidos/1');

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(producto);

    const ultimaLlamada =
      pool.query.mock.calls[pool.query.mock.calls.length - 1];

    expect(ultimaLlamada[0]).toContain(
      'WHERE dv.id_detalle = ?'
    );

    expect(ultimaLlamada[1]).toEqual(['1']);
  });

  // ==========================================
  // MANEJO DE ERRORES - GET /
  // ==========================================

  test('GET / debe capturar error en consulta de productos', async () => {
    pool.query.mockRejectedValueOnce(
      new Error('Fallo de conexión')
    );

    const res = await request(app)
      .get('/productos_vendidos');

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Fallo de conexión');
  });

  test('GET / debe capturar error en consulta COUNT', async () => {
    pool.query
      .mockResolvedValueOnce([[]])
      .mockRejectedValueOnce(
        new Error('Error al contar productos')
      );

    const res = await request(app)
      .get('/productos_vendidos');

    expect(res.statusCode).toBe(500);

    expect(res.body.error).toBe(
      'Error al contar productos'
    );
  });

  // ==========================================
  // MANEJO DE ERRORES - GET /:id
  // ==========================================

  test('GET /:id debe capturar error de base de datos', async () => {
    pool.query.mockRejectedValueOnce(
      new Error('Fallo')
    );

    const res = await request(app)
      .get('/productos_vendidos/1');

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Fallo');
  });

});
