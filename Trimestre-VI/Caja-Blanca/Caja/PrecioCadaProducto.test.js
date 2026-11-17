
import request from 'supertest';
import express from 'express';

// Importar la ruta desde Caja
import router from '../../Caja/PrecioCadaProducto.js';

// Simular la base de datos
jest.mock('../../../db.js', () => ({
  __esModule: true,
  default: {
    query: jest.fn()
  }
}));

import pool from '../../../db.js';

// Datos válidos
const bodyValido = {
  nombre: 'Lente progresivo',
  codigo: 'P001',
  precio: 150000
};

// Crear aplicación Express
const app = express();

app.use(express.json());
app.use('/precio_cada_producto', router);

describe('Pruebas de Caja Blanca - Precio Cada Producto', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =====================================================
  // GET /
  // =====================================================

  describe('GET /', () => {

    test('debe retornar la lista de precios', async () => {
      pool.query.mockResolvedValueOnce([[
        {
          id_producto: 1,
          nombre: 'Lente',
          precio_venta: 150000
        }
      ]]);

      const res = await request(app)
        .get('/precio_cada_producto');

      expect(res.statusCode).toBe(200);
      expect(res.body.productos).toHaveLength(1);
      expect(res.body.productos[0].nombre).toBe('Lente');

      expect(pool.query).toHaveBeenCalledTimes(1);
    });

    test('debe retornar una lista vacía', async () => {
      pool.query.mockResolvedValueOnce([[]]);

      const res = await request(app)
        .get('/precio_cada_producto');

      expect(res.statusCode).toBe(200);
      expect(res.body.productos).toEqual([]);
    });

    test('debe capturar error de base de datos', async () => {
      pool.query.mockRejectedValueOnce(
        new Error('Fallo de conexión')
      );

      const res = await request(app)
        .get('/precio_cada_producto');

      expect(res.statusCode).toBe(500);
      expect(res.body.detalle).toBe('Fallo de conexión');
    });
  });

  // =====================================================
  // GET /:id
  // =====================================================

  describe('GET /:id', () => {

    test('debe retornar 404 si el producto no existe', async () => {
      pool.query.mockResolvedValueOnce([[]]);

      const res = await request(app)
        .get('/precio_cada_producto/10');

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Producto no encontrado');
    });

    test('debe retornar el precio si el producto existe', async () => {
      pool.query.mockResolvedValueOnce([[
        {
          id_producto: 1,
          codigo_producto: 'P001',
          precio_venta: 150000
        }
      ]]);

      const res = await request(app)
        .get('/precio_cada_producto/1');

      expect(res.statusCode).toBe(200);
      expect(res.body.id_producto).toBe(1);
      expect(res.body.precio_venta).toBe(150000);
    });

    test('debe capturar error de base de datos', async () => {
      pool.query.mockRejectedValueOnce(
        new Error('Fallo')
      );

      const res = await request(app)
        .get('/precio_cada_producto/1');

      expect(res.statusCode).toBe(500);
    });
  });

  // =====================================================
  // POST /
  // =====================================================

  describe('POST / - Validaciones', () => {

    test('debe rechazar si falta el nombre', async () => {
      const res = await request(app)
        .post('/precio_cada_producto')
        .send({
          nombre: '   ',
          codigo: 'P001',
          precio: 100
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe(
        'El nombre del producto es obligatorio'
      );

      expect(pool.query).not.toHaveBeenCalled();
    });

    test('debe rechazar si falta el código', async () => {
      const res = await request(app)
        .post('/precio_cada_producto')
        .send({
          nombre: 'Lente',
          codigo: '   ',
          precio: 100
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe(
        'El código del producto es obligatorio'
      );

      expect(pool.query).not.toHaveBeenCalled();
    });

    test('debe rechazar si el precio es cero', async () => {
      const res = await request(app)
        .post('/precio_cada_producto')
        .send({
          nombre: 'Lente',
          codigo: 'P001',
          precio: 0
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe(
        'El precio debe ser mayor a 0'
      );

      expect(pool.query).not.toHaveBeenCalled();
    });

    test('debe rechazar si el precio es negativo', async () => {
      const res = await request(app)
        .post('/precio_cada_producto')
        .send({
          ...bodyValido,
          precio: -100
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe(
        'El precio debe ser mayor a 0'
      );

      expect(pool.query).not.toHaveBeenCalled();
    });
  });

  describe('POST / - Actualización', () => {

    test('debe retornar 404 si el producto no existe', async () => {
      pool.query.mockResolvedValueOnce([[]]);

      const res = await request(app)
        .post('/precio_cada_producto')
        .send(bodyValido);

      expect(res.statusCode).toBe(404);
    });

    test('debe retornar 400 si no se pudo actualizar', async () => {
      pool.query
        .mockResolvedValueOnce([[
          {
            id_producto: 1,
            codigo_producto: 'P001',
            nombre: 'Lente',
            precio_venta: 100
          }
        ]])
        .mockResolvedValueOnce([
          { affectedRows: 0 }
        ]);

      const res = await request(app)
        .post('/precio_cada_producto')
        .send(bodyValido);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe(
        'No fue posible actualizar el precio'
      );
    });

    test('debe actualizar el precio exitosamente', async () => {
      pool.query
        .mockResolvedValueOnce([[
          {
            id_producto: 1,
            codigo_producto: 'P001',
            nombre: 'Lente',
            precio_venta: 100
          }
        ]])
        .mockResolvedValueOnce([
          { affectedRows: 1 }
        ]);

      const res = await request(app)
        .post('/precio_cada_producto')
        .send(bodyValido);

      expect(res.statusCode).toBe(200);

      expect(res.body.mensaje).toBe(
        'Precio actualizado exitosamente'
      );

      expect(res.body.id).toBe(1);
      expect(res.body.producto.precio_venta).toBe(150000);

      expect(pool.query).toHaveBeenCalledTimes(2);
    });

    test('debe capturar error de base de datos', async () => {
      pool.query.mockRejectedValueOnce(
        new Error('Fallo')
      );

      const res = await request(app)
        .post('/precio_cada_producto')
        .send(bodyValido);

      expect(res.statusCode).toBe(500);
    });
  });

  // =====================================================
  // PUT /:id
  // =====================================================

  describe('PUT /:id', () => {

    test('debe rechazar si el precio es negativo', async () => {
      const res = await request(app)
        .put('/precio_cada_producto/1')
        .send({
          precio_venta: -5
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe(
        'El precio debe ser mayor a 0'
      );

      expect(pool.query).not.toHaveBeenCalled();
    });

    test('debe rechazar si el precio es cero', async () => {
      const res = await request(app)
        .put('/precio_cada_producto/1')
        .send({
          precio_venta: 0
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe(
        'El precio debe ser mayor a 0'
      );
    });

    test('debe retornar 404 si el producto no existe', async () => {
      pool.query.mockResolvedValueOnce([
        { affectedRows: 0 }
      ]);

      const res = await request(app)
        .put('/precio_cada_producto/10')
        .send({
          precio_venta: 100
        });

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe(
        'Producto no encontrado'
      );
    });

    test('debe actualizar exitosamente', async () => {
      pool.query
        .mockResolvedValueOnce([
          { affectedRows: 1 }
        ])
        .mockResolvedValueOnce([[
          {
            id_producto: 1,
            precio_venta: 100
          }
        ]]);

      const res = await request(app)
        .put('/precio_cada_producto/1')
        .send({
          precio_venta: 100
        });

      expect(res.statusCode).toBe(200);

      expect(res.body.mensaje).toBe(
        'Precio actualizado exitosamente'
      );

      expect(res.body.producto.id_producto).toBe(1);
      expect(pool.query).toHaveBeenCalledTimes(2);
    });

    test('debe capturar error de base de datos', async () => {
      pool.query.mockRejectedValueOnce(
        new Error('Fallo')
      );

      const res = await request(app)
        .put('/precio_cada_producto/1')
        .send({
          precio_venta: 100
        });

      expect(res.statusCode).toBe(500);
    });
  });
});
