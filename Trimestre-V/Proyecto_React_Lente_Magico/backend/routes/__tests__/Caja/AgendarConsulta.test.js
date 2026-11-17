import request from 'supertest';
import express from 'express';

// =====================================================
// MOCK DE MYSQL
// =====================================================

jest.mock('../../../db.js', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
    getConnection: jest.fn(),
  },
}));

import pool from '../../../db.js';
import router from '../../Caja/AgendarConsulta.js';

// =====================================================
// CONEXIÓN SIMULADA
// =====================================================

const connection = {
  query: jest.fn(),
  beginTransaction: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
  release: jest.fn(),
};

// =====================================================
// CONFIGURACIÓN DE EXPRESS
// =====================================================

const app = express();

app.use(express.json());
app.use('/agendar_consulta', router);

// =====================================================
// DATOS DE PRUEBA
// =====================================================

const bodyValido = {
  id_cliente: 1,
  fecha_hora: '2026-10-20 10:00:00',
  motivo: 'Consulta general',
  estado: 'pendiente',
};

const clienteMock = {
  id_cliente: 1,
  id_datos_personales: 10,
  id_tipo_documento: 1,
  numero_documento: '123456',
  primer_nombre: 'Ana',
  primer_apellido: 'Gil',
};

const consultaMock = {
  id_agenda: 1,
  id_cliente: 1,
  fecha_hora: bodyValido.fecha_hora,
  motivo: bodyValido.motivo,
  estado: bodyValido.estado,
};

// =====================================================
// PRUEBAS DE CAJA BLANCA
// =====================================================

describe('Pruebas de caja blanca - AgendarConsulta', () => {

  beforeEach(() => {
    jest.clearAllMocks();

    pool.query.mockReset();
    pool.getConnection.mockReset();

    connection.query.mockReset();
    connection.beginTransaction.mockReset();
    connection.commit.mockReset();
    connection.rollback.mockReset();
    connection.release.mockReset();

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

    test('debe listar las consultas con paginación por defecto', async () => {
      pool.query
        .mockResolvedValueOnce([[consultaMock]])
        .mockResolvedValueOnce([[{ total: 10 }]]);

      const res = await request(app).get('/agendar_consulta');

      expect(res.statusCode).toBe(200);
      expect(res.body.consultas).toHaveLength(1);

      expect(res.body.pagination).toEqual({
        currentPage: 1,
        totalPages: 2,
        totalItems: 10,
        limit: 5,
        hasNextPage: true,
        hasPrevPage: false,
      });

      expect(pool.query).toHaveBeenCalledTimes(2);
      expect(pool.query.mock.calls[0][1]).toEqual([5, 0]);
      expect(pool.query.mock.calls[1][1]).toEqual([]);
    });

    test('debe aplicar página y límite indicados', async () => {
      pool.query
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[{ total: 20 }]]);

      const res = await request(app)
        .get('/agendar_consulta?page=3&limit=4');

      expect(res.statusCode).toBe(200);
      expect(res.body.pagination.currentPage).toBe(3);
      expect(res.body.pagination.limit).toBe(4);
      expect(res.body.pagination.totalPages).toBe(5);
      expect(res.body.pagination.hasNextPage).toBe(true);
      expect(res.body.pagination.hasPrevPage).toBe(true);

      expect(pool.query.mock.calls[0][1]).toEqual([4, 8]);
    });

    test('debe buscar por documento, nombre, apellido, motivo y estado', async () => {
      pool.query
        .mockResolvedValueOnce([[consultaMock]])
        .mockResolvedValueOnce([[{ total: 1 }]]);

      const res = await request(app)
        .get('/agendar_consulta?search=Ana');

      expect(res.statusCode).toBe(200);

      const query = pool.query.mock.calls[0][0];

      expect(query).toContain('WHERE');
      expect(query).toContain('dp.numero_documento LIKE ?');
      expect(query).toContain('dp.primer_nombre LIKE ?');
      expect(query).toContain('dp.primer_apellido LIKE ?');
      expect(query).toContain('a.motivo LIKE ?');
      expect(query).toContain('a.estado LIKE ?');

      expect(pool.query.mock.calls[0][1]).toEqual([
        '%Ana%',
        '%Ana%',
        '%Ana%',
        '%Ana%',
        '%Ana%',
        5,
        0,
      ]);

      expect(pool.query.mock.calls[1][1]).toEqual([
        '%Ana%',
        '%Ana%',
        '%Ana%',
        '%Ana%',
        '%Ana%',
      ]);
    });

    test('debe indicar que no hay páginas cuando no hay resultados', async () => {
      pool.query
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[{ total: 0 }]]);

      const res = await request(app).get('/agendar_consulta');

      expect(res.statusCode).toBe(200);
      expect(res.body.consultas).toEqual([]);
      expect(res.body.pagination.totalPages).toBe(0);
      expect(res.body.pagination.hasNextPage).toBe(false);
      expect(res.body.pagination.hasPrevPage).toBe(false);
    });

    test('debe retornar 500 si falla la consulta de agenda', async () => {
      pool.query.mockRejectedValueOnce(
        new Error('Fallo de conexión')
      );

      const res = await request(app).get('/agendar_consulta');

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe('Fallo de conexión');
    });

    test('debe retornar 500 si falla el conteo de resultados', async () => {
      pool.query
        .mockResolvedValueOnce([[consultaMock]])
        .mockRejectedValueOnce(new Error('Error de conteo'));

      const res = await request(app).get('/agendar_consulta');

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe('Error de conteo');
    });

  });

  // =====================================================
  // GET /:id
  // =====================================================

  describe('GET /:id', () => {

    test('debe retornar una consulta existente', async () => {
      pool.query.mockResolvedValueOnce([[consultaMock]]);

      const res = await request(app).get('/agendar_consulta/1');

      expect(res.statusCode).toBe(200);
      expect(res.body.id_agenda).toBe(1);
      expect(pool.query).toHaveBeenCalledTimes(1);
      expect(pool.query.mock.calls[0][1]).toEqual(['1']);
    });

    test('debe retornar 404 si la consulta no existe', async () => {
      pool.query.mockResolvedValueOnce([[]]);

      const res = await request(app).get('/agendar_consulta/999');

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Consulta no encontrada');
    });

    test('debe retornar 500 si ocurre un error de base de datos', async () => {
      pool.query.mockRejectedValueOnce(
        new Error('Fallo de consulta')
      );

      const res = await request(app).get('/agendar_consulta/1');

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe('Fallo de consulta');
    });

  });

  // =====================================================
  // POST /
  // =====================================================

  describe('POST /', () => {

    test('debe rechazar si faltan campos obligatorios', async () => {
      const res = await request(app)
        .post('/agendar_consulta')
        .send({ motivo: '' });

      expect(res.statusCode).toBe(400);

      expect(res.body.error).toBe(
        'Cliente, fecha y hora, motivo y estado son obligatorios'
      );

      expect(connection.beginTransaction).not.toHaveBeenCalled();
      expect(connection.query).not.toHaveBeenCalled();
      expect(connection.release).toHaveBeenCalledTimes(1);
    });

    test('debe rechazar un motivo de más de 40 caracteres', async () => {
      const res = await request(app)
        .post('/agendar_consulta')
        .send({
          ...bodyValido,
          motivo: 'A'.repeat(41),
        });

      expect(res.statusCode).toBe(400);

      expect(res.body.error).toBe(
        'El motivo no puede superar los 40 caracteres'
      );

      expect(connection.beginTransaction).not.toHaveBeenCalled();
      expect(connection.query).not.toHaveBeenCalled();
      expect(connection.release).toHaveBeenCalledTimes(1);
    });

    test('debe aceptar un motivo de exactamente 40 caracteres', async () => {
      connection.query
        .mockResolvedValueOnce([[clienteMock]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[{ id_historia: 8 }]])
        .mockResolvedValueOnce([{ insertId: 2 }]);

      const res = await request(app)
        .post('/agendar_consulta')
        .send({
          ...bodyValido,
          motivo: 'A'.repeat(40),
        });

      expect(res.statusCode).toBe(201);
      expect(connection.commit).toHaveBeenCalledTimes(1);
      expect(connection.release).toHaveBeenCalledTimes(1);
    });

    test('debe retornar 404 si el cliente no está registrado', async () => {
      connection.query.mockResolvedValueOnce([[]]);

      const res = await request(app)
        .post('/agendar_consulta')
        .send(bodyValido);

      expect(res.statusCode).toBe(404);

      expect(res.body.error).toBe(
        'El cliente no está registrado. Primero debe registrar al cliente.'
      );

      expect(connection.rollback).toHaveBeenCalledTimes(1);
      expect(connection.commit).not.toHaveBeenCalled();
      expect(connection.release).toHaveBeenCalledTimes(1);
    });

    test('debe rechazar una cita duplicada para el mismo cliente y fecha', async () => {
      connection.query
        .mockResolvedValueOnce([[clienteMock]])
        .mockResolvedValueOnce([[{ id_agenda: 5 }]]);

      const res = await request(app)
        .post('/agendar_consulta')
        .send(bodyValido);

      expect(res.statusCode).toBe(400);

      expect(res.body.error).toBe(
        'El paciente ya tiene una consulta agendada para esa fecha y hora'
      );

      expect(connection.query).toHaveBeenCalledTimes(2);
      expect(connection.rollback).toHaveBeenCalledTimes(1);
      expect(connection.commit).not.toHaveBeenCalled();
      expect(connection.release).toHaveBeenCalledTimes(1);
    });

    test('debe crear la cita y reutilizar la historia clínica existente', async () => {
      connection.query
        .mockResolvedValueOnce([[clienteMock]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[{ id_historia: 8 }]])
        .mockResolvedValueOnce([{ insertId: 2 }]);

      const res = await request(app)
        .post('/agendar_consulta')
        .send(bodyValido);

      expect(res.statusCode).toBe(201);
      expect(res.body.mensaje).toBe('Consulta agendada exitosamente');
      expect(res.body.id_agenda).toBe(2);
      expect(res.body.id_historia).toBe(8);

      expect(res.body.cliente).toEqual({
        id_cliente: 1,
        numero_documento: '123456',
        primer_nombre: 'Ana',
        primer_apellido: 'Gil',
      });

      expect(connection.query).toHaveBeenCalledTimes(4);
      expect(connection.commit).toHaveBeenCalledTimes(1);
      expect(connection.rollback).not.toHaveBeenCalled();
      expect(connection.release).toHaveBeenCalledTimes(1);

      const sqlHistoria = connection.query.mock.calls[2][0];

      expect(sqlHistoria).toContain('FROM Historia_clinica');
      expect(sqlHistoria).toContain('WHERE id_cliente = ?');
    });

    test('debe crear una historia clínica si el cliente no tiene una', async () => {
      connection.query
        .mockResolvedValueOnce([[clienteMock]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([{ insertId: 15 }])
        .mockResolvedValueOnce([{ insertId: 3 }]);

      const res = await request(app)
        .post('/agendar_consulta')
        .send(bodyValido);

      expect(res.statusCode).toBe(201);
      expect(res.body.id_historia).toBe(15);
      expect(res.body.id_agenda).toBe(3);
      expect(connection.query).toHaveBeenCalledTimes(5);
      expect(connection.commit).toHaveBeenCalledTimes(1);

      const sqlInsertHistoria = connection.query.mock.calls[3][0];

      expect(sqlInsertHistoria).toContain(
        'INSERT INTO Historia_clinica'
      );

      expect(sqlInsertHistoria).toContain('CURDATE()');
    });

    test('debe retornar 500 y hacer rollback si falla una consulta SQL', async () => {
      connection.query.mockRejectedValueOnce(
        new Error('Error SQL')
      );

      const res = await request(app)
        .post('/agendar_consulta')
        .send(bodyValido);

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe('Error SQL');
      expect(connection.rollback).toHaveBeenCalledTimes(1);
      expect(connection.commit).not.toHaveBeenCalled();
      expect(connection.release).toHaveBeenCalledTimes(1);
    });

    test('debe retornar 500 si falla el inicio de la transacción', async () => {
      connection.beginTransaction.mockRejectedValueOnce(
        new Error('Error al iniciar transacción')
      );

      const res = await request(app)
        .post('/agendar_consulta')
        .send(bodyValido);

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe(
        'Error al iniciar transacción'
      );

      expect(connection.rollback).toHaveBeenCalledTimes(1);
      expect(connection.release).toHaveBeenCalledTimes(1);
    });

    test('debe retornar 500 y hacer rollback si falla el commit', async () => {
      connection.query
        .mockResolvedValueOnce([[clienteMock]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[{ id_historia: 8 }]])
        .mockResolvedValueOnce([{ insertId: 2 }]);

      connection.commit.mockRejectedValueOnce(
        new Error('Error al confirmar transacción')
      );

      const res = await request(app)
        .post('/agendar_consulta')
        .send(bodyValido);

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe(
        'Error al confirmar transacción'
      );

      expect(connection.rollback).toHaveBeenCalledTimes(1);
      expect(connection.release).toHaveBeenCalledTimes(1);
    });

  });

  // =====================================================
  // PUT /:id
  // =====================================================

  describe('PUT /:id', () => {

    test('debe rechazar si faltan campos obligatorios', async () => {
      const res = await request(app)
        .put('/agendar_consulta/1')
        .send({ motivo: 'Solo motivo' });

      expect(res.statusCode).toBe(400);

      expect(res.body.error).toBe(
        'Fecha y hora, motivo y estado son obligatorios'
      );

      expect(connection.beginTransaction).not.toHaveBeenCalled();
      expect(connection.query).not.toHaveBeenCalled();
      expect(connection.release).toHaveBeenCalledTimes(1);
    });

    test('debe rechazar un motivo de más de 40 caracteres', async () => {
      const res = await request(app)
        .put('/agendar_consulta/1')
        .send({
          ...bodyValido,
          motivo: 'B'.repeat(41),
        });

      expect(res.statusCode).toBe(400);

      expect(res.body.error).toBe(
        'El motivo no puede superar los 40 caracteres'
      );

      expect(connection.beginTransaction).not.toHaveBeenCalled();
      expect(connection.query).not.toHaveBeenCalled();
    });

    test('debe retornar 404 si no existe la cita que se va a actualizar', async () => {
      connection.query.mockResolvedValueOnce([
        { affectedRows: 0 },
      ]);

      const res = await request(app)
        .put('/agendar_consulta/999')
        .send(bodyValido);

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Consulta no encontrada');
      expect(connection.rollback).toHaveBeenCalledTimes(1);
      expect(connection.commit).not.toHaveBeenCalled();
      expect(connection.release).toHaveBeenCalledTimes(1);
    });

    test('debe actualizar una cita exitosamente', async () => {
      connection.query.mockResolvedValueOnce([
        { affectedRows: 1 },
      ]);

      const res = await request(app)
        .put('/agendar_consulta/1')
        .send(bodyValido);

      expect(res.statusCode).toBe(200);

      expect(res.body.mensaje).toBe(
        'Consulta actualizada exitosamente'
      );

      expect(connection.beginTransaction).toHaveBeenCalledTimes(1);
      expect(connection.commit).toHaveBeenCalledTimes(1);
      expect(connection.rollback).not.toHaveBeenCalled();
      expect(connection.release).toHaveBeenCalledTimes(1);
    });

    test('debe retornar 500 si falla la actualización', async () => {
      connection.query.mockRejectedValueOnce(
        new Error('Error al actualizar')
      );

      const res = await request(app)
        .put('/agendar_consulta/1')
        .send(bodyValido);

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe('Error al actualizar');
      expect(connection.rollback).toHaveBeenCalledTimes(1);
      expect(connection.release).toHaveBeenCalledTimes(1);
    });

    test('debe retornar 500 si falla el inicio de la transacción', async () => {
      connection.beginTransaction.mockRejectedValueOnce(
        new Error('No se pudo iniciar')
      );

      const res = await request(app)
        .put('/agendar_consulta/1')
        .send(bodyValido);

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe('No se pudo iniciar');
      expect(connection.rollback).toHaveBeenCalledTimes(1);
      expect(connection.release).toHaveBeenCalledTimes(1);
    });

    test('debe retornar 500 si falla el commit de la actualización', async () => {
      connection.query.mockResolvedValueOnce([
        { affectedRows: 1 },
      ]);

      connection.commit.mockRejectedValueOnce(
        new Error('No se pudo confirmar')
      );

      const res = await request(app)
        .put('/agendar_consulta/1')
        .send(bodyValido);

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe('No se pudo confirmar');
      expect(connection.rollback).toHaveBeenCalledTimes(1);
      expect(connection.release).toHaveBeenCalledTimes(1);
    });

  });

  // =====================================================
  // DELETE /:id
  // =====================================================

  describe('DELETE /:id', () => {

    test('debe eliminar una cita existente', async () => {
      pool.query.mockResolvedValueOnce([
        { affectedRows: 1 },
      ]);

      const res = await request(app)
        .delete('/agendar_consulta/1');

      expect(res.statusCode).toBe(200);

      expect(res.body.mensaje).toBe(
        'Consulta eliminada exitosamente'
      );

      expect(pool.query).toHaveBeenCalledTimes(1);
      expect(pool.query.mock.calls[0][1]).toEqual(['1']);
    });

    test('debe retornar 404 si la cita no existe', async () => {
      pool.query.mockResolvedValueOnce([
        { affectedRows: 0 },
      ]);

      const res = await request(app)
        .delete('/agendar_consulta/999');

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Consulta no encontrada');
    });

    test('debe retornar 500 si falla el borrado', async () => {
      pool.query.mockRejectedValueOnce(
        new Error('Error al eliminar')
      );

      const res = await request(app)
        .delete('/agendar_consulta/1');

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe('Error al eliminar');
    });

  });

});