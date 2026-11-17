
import request from 'supertest';
import express from 'express';

import router from '../../Caja/RegistrarServicio.js';

// Simular la base de datos
jest.mock('../../../db.js');
import pool from '../../../db.js';

const app = express();
app.use(express.json());
app.use('/registrar_servicio', router);

const bodyValido = {
  tipo_servicio: 'Consulta Médica',
  nombre_servicio: 'Examen visual completo',
  costo_servicio: 80000,
};

describe('Pruebas de Caja Blanca - Registrar Servicio', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================
  // POST / VALIDACIONES
  // =========================

  test('POST / rechaza si falta el tipo de servicio', async () => {
    const res = await request(app)
      .post('/registrar_servicio')
      .send({
        nombre_servicio: 'Examen',
        costo_servicio: 80000,
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe(
      'El tipo, nombre y costo del servicio son obligatorios'
    );
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('POST / rechaza si falta el nombre del servicio', async () => {
    const res = await request(app)
      .post('/registrar_servicio')
      .send({
        tipo_servicio: 'Consulta Médica',
        costo_servicio: 80000,
      });

    expect(res.statusCode).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('POST / rechaza si falta el costo', async () => {
    const res = await request(app)
      .post('/registrar_servicio')
      .send({
        tipo_servicio: 'Consulta Médica',
        nombre_servicio: 'Examen',
      });

    expect(res.statusCode).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('POST / rechaza si el costo es null', async () => {
    const res = await request(app)
      .post('/registrar_servicio')
      .send({
        ...bodyValido,
        costo_servicio: null,
      });

    expect(res.statusCode).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('POST / rechaza si el costo está vacío', async () => {
    const res = await request(app)
      .post('/registrar_servicio')
      .send({
        ...bodyValido,
        costo_servicio: '',
      });

    expect(res.statusCode).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('POST / rechaza si el costo no es numérico', async () => {
    const res = await request(app)
      .post('/registrar_servicio')
      .send({
        ...bodyValido,
        costo_servicio: 'abc',
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe(
      'El costo del servicio debe ser mayor a 0'
    );
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('POST / rechaza si el costo es cero', async () => {
    const res = await request(app)
      .post('/registrar_servicio')
      .send({
        ...bodyValido,
        costo_servicio: 0,
      });

    expect(res.statusCode).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('POST / rechaza si el costo es negativo', async () => {
    const res = await request(app)
      .post('/registrar_servicio')
      .send({
        ...bodyValido,
        costo_servicio: -500,
      });

    expect(res.statusCode).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  // =========================
  // POST / VALIDACIONES BD
  // =========================

  test('POST / retorna 404 si la categoría no existe', async () => {
    pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app)
      .post('/registrar_servicio')
      .send(bodyValido);

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toContain(
      'No se encontró la categoría "Consulta Médica"'
    );
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test('POST / retorna 409 si el servicio ya existe', async () => {
    pool.query
      .mockResolvedValueOnce([[{ id_categoria: 3 }]])
      .mockResolvedValueOnce([[
        {
          id_producto: 7,
          codigo_producto: 'SERV-1',
          nombre: 'Examen visual completo',
        },
      ]]);

    const res = await request(app)
      .post('/registrar_servicio')
      .send(bodyValido);

    expect(res.statusCode).toBe(409);
    expect(res.body.error).toBe(
      'Ya existe un producto o servicio con ese nombre'
    );
    expect(res.body.producto.id_producto).toBe(7);
  });

  test('POST / registra el servicio exitosamente', async () => {
    pool.query
      .mockResolvedValueOnce([[{ id_categoria: 3 }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ insertId: 12 }]);

    const res = await request(app)
      .post('/registrar_servicio')
      .send({
        ...bodyValido,
        costo_servicio: '80000',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.mensaje).toBe(
      'Servicio registrado exitosamente'
    );
    expect(res.body.id_producto).toBe(12);
    expect(res.body.servicio.id_categoria).toBe(3);
    expect(res.body.servicio.codigo_producto).toMatch(/^SERV-\d+$/);
    expect(res.body.servicio.costo_servicio).toBe(80000);

    const llamadas = pool.query.mock.calls;
    const ultimaLlamada = llamadas[llamadas.length - 1];

    expect(ultimaLlamada[0]).toContain('INSERT INTO Producto');
    expect(ultimaLlamada[1][0]).toBe(3);
    expect(ultimaLlamada[1][1]).toMatch(/^SERV-\d+$/);
    expect(ultimaLlamada[1][2]).toBe(
      'Examen visual completo'
    );
    expect(ultimaLlamada[1][3]).toBe(80000);
  });

  // =========================
  // GET /
  // =========================

  test('GET / retorna la lista de servicios', async () => {
    pool.query.mockResolvedValueOnce([[
      {
        id_producto: 1,
        id_categoria: 3,
        codigo_producto: 'SERV-1',
        nombre: 'Examen visual completo',
        precio_venta: 80000,
      },
    ]]);

    const res = await request(app)
      .get('/registrar_servicio');

    expect(res.statusCode).toBe(200);
    expect(res.body.servicios).toHaveLength(1);

    const llamadas = pool.query.mock.calls;
    const queryEjecutada = llamadas[llamadas.length - 1][0];

    expect(queryEjecutada).toContain(
      "c.nombre_categoria = 'Consulta Médica'"
    );
    expect(queryEjecutada).toContain(
      'ORDER BY p.nombre ASC'
    );
  });

  test('GET / retorna una lista vacía cuando no hay servicios', async () => {
    pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app)
      .get('/registrar_servicio');

    expect(res.statusCode).toBe(200);
    expect(res.body.servicios).toEqual([]);
  });

  // =========================
  // MANEJO DE ERRORES
  // =========================

  describe('Manejo de errores de base de datos', () => {
    test('POST / captura error al consultar la categoría', async () => {
      pool.query.mockRejectedValueOnce(
        new Error('Fallo')
      );

      const res = await request(app)
        .post('/registrar_servicio')
        .send(bodyValido);

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe('Fallo');
    });

    test('POST / captura error al consultar duplicados', async () => {
      pool.query
        .mockResolvedValueOnce([[{ id_categoria: 3 }]])
        .mockRejectedValueOnce(
          new Error('Error al consultar duplicados')
        );

      const res = await request(app)
        .post('/registrar_servicio')
        .send(bodyValido);

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe(
        'Error al consultar duplicados'
      );
    });

    test('POST / captura error al insertar el servicio', async () => {
      pool.query
        .mockResolvedValueOnce([[{ id_categoria: 3 }]])
        .mockResolvedValueOnce([[]])
        .mockRejectedValueOnce(
          new Error('Error al insertar')
        );

      const res = await request(app)
        .post('/registrar_servicio')
        .send(bodyValido);

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe('Error al insertar');
    });

    test('GET / captura error de conexión', async () => {
      pool.query.mockRejectedValueOnce(
        new Error('Fallo de conexión')
      );

      const res = await request(app)
        .get('/registrar_servicio');

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe(
        'Fallo de conexión'
      );
    });
  });
});
