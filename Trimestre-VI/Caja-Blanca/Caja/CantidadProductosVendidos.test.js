// backend/routes/__tests__/Caja/CantidadProductosVendidos.test.js

import request from 'supertest';
import express from 'express';

// Mock explícito de la base de datos
jest.mock('../../../db.js', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

import pool from '../../../db.js';

// Importación del controlador
import router from '../../Caja/CantidadProductosVendidos.js';

const app = express();
app.use(express.json());
app.use('/cantidad_productos_vendidos', router);

const bodyValido = {
  idVenta: 1,
  idProducto: 2,
  cantidadProducto: 3,
  precioUnitario: 50000,
};

describe('Pruebas de Caja Blanca - Cantidad Productos Vendidos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -----------------------------------------------------
  // GET /
  // -----------------------------------------------------

  test('GET / sin búsqueda debe retornar lista paginada', async () => {
    pool.query
      .mockResolvedValueOnce([
        [{ id: 1, nombreProducto: 'Lente' }],
      ])
      .mockResolvedValueOnce([
        [{ total: 25 }],
      ])
      .mockResolvedValueOnce([
        [{ totalVendidos: '40' }],
      ]);

    const res = await request(app).get(
      '/cantidad_productos_vendidos'
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.productos).toHaveLength(1);
    expect(res.body.totalVendidos).toBe(40);
    expect(res.body.pagination.totalPages).toBe(3);
    expect(res.body.pagination.hasPrevPage).toBe(false);
    expect(pool.query).toHaveBeenCalledTimes(3);
  });

  test('GET / con búsqueda debe construir consulta con WHERE', async () => {
    pool.query
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ total: 30 }]])
      .mockResolvedValueOnce([[{ totalVendidos: 5 }]]);

    const res = await request(app).get(
      '/cantidad_productos_vendidos?search=lente&page=2&limit=5'
    );

    expect(res.statusCode).toBe(200);

    const llamadas = pool.query.mock.calls;

    expect(llamadas).toHaveLength(3);

    const [sql, params] = llamadas[0];

    expect(sql).toContain('WHERE');
    expect(sql).toContain('p.nombre LIKE ?');

    expect(params).toEqual([
      '%lente%',
      '%lente%',
      5,
      5,
    ]);

    expect(res.body.pagination.currentPage).toBe(2);
    expect(res.body.pagination.hasPrevPage).toBe(true);
  });

  test('GET / sin filas en count y total debe devolver cero', async () => {
    pool.query
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]]);

    const res = await request(app).get(
      '/cantidad_productos_vendidos'
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.totalVendidos).toBe(0);
    expect(res.body.pagination.totalItems).toBe(0);
  });

  // -----------------------------------------------------
  // GET /resumen
  // -----------------------------------------------------

  test('GET /resumen debe retornar resumen por producto', async () => {
    pool.query.mockResolvedValueOnce([
      [{ idProducto: 1, cantidadVendida: 7 }],
    ]);

    const res = await request(app).get(
      '/cantidad_productos_vendidos/resumen'
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.productos).toHaveLength(1);
  });

  // -----------------------------------------------------
  // POST /
  // -----------------------------------------------------

  test('POST / debe rechazar si faltan campos requeridos', async () => {
    const res = await request(app)
      .post('/cantidad_productos_vendidos')
      .send({ idVenta: '' });

    expect(res.statusCode).toBe(400);

    expect(res.body.error).toBe(
      'idVenta, idProducto y una cantidad mayor a 0 son requeridos'
    );

    expect(pool.query).not.toHaveBeenCalled();
  });

  test('POST / debe retornar 404 si la venta no existe', async () => {
    pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app)
      .post('/cantidad_productos_vendidos')
      .send(bodyValido);

    expect(res.statusCode).toBe(404);

    expect(res.body.error).toBe(
      'La venta indicada no existe'
    );
  });

  test('POST / debe retornar 404 si el producto no existe', async () => {
    pool.query
      .mockResolvedValueOnce([
        [{ id_venta: 1 }],
      ])
      .mockResolvedValueOnce([[]]);

    const res = await request(app)
      .post('/cantidad_productos_vendidos')
      .send(bodyValido);

    expect(res.statusCode).toBe(404);

    expect(res.body.error).toBe(
      'El producto indicado no existe'
    );
  });

  test('POST / debe crear el detalle exitosamente', async () => {
    pool.query
      .mockResolvedValueOnce([
        [{ id_venta: 1 }],
      ])
      .mockResolvedValueOnce([
        [{ id_producto: 2 }],
      ])
      .mockResolvedValueOnce([
        { insertId: 9 },
      ])
      .mockResolvedValueOnce([
        [{ id: 9, nombreProducto: 'Lente' }],
      ]);

    const res = await request(app)
      .post('/cantidad_productos_vendidos')
      .send(bodyValido);

    expect(res.statusCode).toBe(201);

    expect(res.body.mensaje).toBe(
      'Producto vendido registrado exitosamente'
    );

    expect(res.body.producto.id).toBe(9);
  });

  test('POST / sin precioUnitario debe guardar cero', async () => {
    pool.query
      .mockResolvedValueOnce([
        [{ id_venta: 1 }],
      ])
      .mockResolvedValueOnce([
        [{ id_producto: 2 }],
      ])
      .mockResolvedValueOnce([
        { insertId: 10 },
      ])
      .mockResolvedValueOnce([
        [{ id: 10 }],
      ]);

    const res = await request(app)
      .post('/cantidad_productos_vendidos')
      .send({
        idVenta: 1,
        idProducto: 2,
        cantidadProducto: 3,
      });

    expect(res.statusCode).toBe(201);

    const llamadas = pool.query.mock.calls;

    // La tercera llamada corresponde al INSERT.
    expect(llamadas[2][1]).toEqual([
      1,
      2,
      3,
      0,
    ]);
  });

  // -----------------------------------------------------
  // PUT /:id
  // -----------------------------------------------------

  test('PUT /:id debe rechazar si faltan campos requeridos', async () => {
    const res = await request(app)
      .put('/cantidad_productos_vendidos/1')
      .send({ idVenta: '' });

    expect(res.statusCode).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('PUT /:id debe retornar 404 si no existe', async () => {
    pool.query.mockResolvedValueOnce([
      { affectedRows: 0 },
    ]);

    const res = await request(app)
      .put('/cantidad_productos_vendidos/10')
      .send({
        idVenta: 1,
        idProducto: 2,
        cantidadProducto: 3,
      });

    expect(res.statusCode).toBe(404);

    expect(res.body.error).toBe(
      'No se encontró el producto vendido'
    );

    // Verifica que el precio predeterminado sea cero.
    expect(pool.query.mock.calls[0][1]).toContain(0);
  });

  test('PUT /:id debe actualizar exitosamente', async () => {
    pool.query
      .mockResolvedValueOnce([
        { affectedRows: 1 },
      ])
      .mockResolvedValueOnce([
        [{ id: 1, nombreProducto: 'Lente' }],
      ]);

    const res = await request(app)
      .put('/cantidad_productos_vendidos/1')
      .send(bodyValido);

    expect(res.statusCode).toBe(200);

    expect(res.body.mensaje).toBe(
      'Producto vendido actualizado exitosamente'
    );

    expect(res.body.producto.id).toBe(1);
  });

  // -----------------------------------------------------
  // DELETE /:id
  // -----------------------------------------------------

  test('DELETE /:id debe retornar 404 si no existe', async () => {
    pool.query.mockResolvedValueOnce([
      { affectedRows: 0 },
    ]);

    const res = await request(app).delete(
      '/cantidad_productos_vendidos/10'
    );

    expect(res.statusCode).toBe(404);
  });

  test('DELETE /:id debe eliminar exitosamente', async () => {
    pool.query.mockResolvedValueOnce([
      { affectedRows: 1 },
    ]);

    const res = await request(app).delete(
      '/cantidad_productos_vendidos/1'
    );

    expect(res.statusCode).toBe(200);

    expect(res.body.mensaje).toBe(
      'Producto vendido eliminado exitosamente'
    );
  });

  // -----------------------------------------------------
  // MANEJO DE ERRORES DE BASE DE DATOS
  // -----------------------------------------------------

  describe('Manejo de errores de base de datos', () => {
    test('GET / debe capturar error de BD y retornar 500', async () => {
      pool.query.mockRejectedValueOnce(
        new Error('Fallo de conexión')
      );

      const res = await request(app).get(
        '/cantidad_productos_vendidos'
      );

      expect(res.statusCode).toBe(500);

      expect(res.body.error).toBe(
        'Error al obtener los productos vendidos'
      );
    });

    test('GET /resumen debe capturar error de BD y retornar 500', async () => {
      pool.query.mockRejectedValueOnce(
        new Error('Fallo')
      );

      const res = await request(app).get(
        '/cantidad_productos_vendidos/resumen'
      );

      expect(res.statusCode).toBe(500);
    });

    test('POST / debe capturar error de BD y retornar 500', async () => {
      pool.query.mockRejectedValueOnce(
        new Error('Fallo')
      );

      const res = await request(app)
        .post('/cantidad_productos_vendidos')
        .send(bodyValido);

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe('Fallo');
    });

    test('PUT /:id debe capturar error de BD y retornar 500', async () => {
      pool.query.mockRejectedValueOnce(
        new Error('Fallo')
      );

      const res = await request(app)
        .put('/cantidad_productos_vendidos/1')
        .send(bodyValido);

      expect(res.statusCode).toBe(500);
    });

    test('DELETE /:id debe capturar error de BD y retornar 500', async () => {
      pool.query.mockRejectedValueOnce(
        new Error('Fallo')
      );

      const res = await request(app).delete(
        '/cantidad_productos_vendidos/1'
      );

      expect(res.statusCode).toBe(500);
    });
  });
});
