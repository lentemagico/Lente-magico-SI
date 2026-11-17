
// backend/routes/__tests__/Caja/ConsultarCliente.test.js

import request from 'supertest';
import express from 'express';
import router from '../../Caja/ConsultarCliente.js';

jest.mock('../../../db.js', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
    getConnection: jest.fn()
  }
}));

import pool from '../../../db.js';

const app = express();
app.use(express.json());
app.use('/consultar_cliente', router);

describe('Pruebas de ConsultarCliente', () => {
  let conn;

  const cliente = {
    id_cliente: 1,
    numero_documento: '123456',
    id_tipo_documento: 1,
    sigla: 'CC',
    nombre_documento: 'Cédula de ciudadanía',
    primer_nombre: 'Carlos',
    segundo_nombre: 'Andrés',
    primer_apellido: 'Pérez',
    segundo_apellido: 'López',
    fecha_nacimiento: '1995-05-10',
    genero: 'Masculino',
    correo: 'carlos@gmail.com',
    telefono: '3001234567',
    fecha_registro: '2025-01-01'
  };

  const datosEdicion = {
    id_tipo_documento: 1,
    numero_documento: '123456',
    primer_nombre: 'Carlos',
    segundo_nombre: 'Andrés',
    primer_apellido: 'Pérez',
    segundo_apellido: 'López',
    fecha_nacimiento: '1995-05-10',
    genero: 'Masculino',
    correo: 'carlos@gmail.com',
    telefono: '3001234567'
  };

  const configurarConexion = () => {
    conn = {
      query: jest.fn(),
      beginTransaction: jest.fn().mockResolvedValue(),
      commit: jest.fn().mockResolvedValue(),
      rollback: jest.fn().mockResolvedValue(),
      release: jest.fn()
    };

    pool.getConnection.mockResolvedValue(conn);
  };

  const respuestaQuery = (filas) => [filas, []];

  beforeEach(() => {
    jest.clearAllMocks();
    configurarConexion();
  });

  // =====================================================
  // GET /
  // =====================================================

  describe('GET /', () => {
    test('lista clientes con valores predeterminados', async () => {
      pool.query
        .mockResolvedValueOnce(respuestaQuery([cliente]))
        .mockResolvedValueOnce(respuestaQuery([{ total: 1 }]));

      const response = await request(app)
        .get('/consultar_cliente');

      expect(response.status).toBe(200);
      expect(response.body.clientes).toHaveLength(1);
      expect(response.body.pagination).toEqual({
        currentPage: 1,
        totalPages: 1,
        totalItems: 1,
        limit: 5,
        hasNextPage: false,
        hasPrevPage: false
      });

      expect(pool.query).toHaveBeenCalledTimes(2);
    });

    test('busca clientes y calcula la paginación', async () => {
      pool.query
        .mockResolvedValueOnce(respuestaQuery([cliente]))
        .mockResolvedValueOnce(respuestaQuery([{ total: 15 }]));

      const response = await request(app)
        .get('/consultar_cliente?page=2&limit=5&search=Carlos');

      expect(response.status).toBe(200);
      expect(response.body.clientes).toHaveLength(1);
      expect(response.body.pagination).toEqual({
        currentPage: 2,
        totalPages: 3,
        totalItems: 15,
        limit: 5,
        hasNextPage: true,
        hasPrevPage: true
      });

      expect(pool.query.mock.calls[0][1]).toEqual([
        '%Carlos%',
        '%Carlos%',
        '%Carlos%',
        '%Carlos%',
        5,
        5
      ]);

      expect(pool.query.mock.calls[1][1]).toEqual([
        '%Carlos%',
        '%Carlos%',
        '%Carlos%',
        '%Carlos%'
      ]);
    });

    test('usa los valores predeterminados cuando page y limit son cero', async () => {
      pool.query
        .mockResolvedValueOnce(respuestaQuery([]))
        .mockResolvedValueOnce(respuestaQuery([{ total: 0 }]));

      const response = await request(app)
        .get('/consultar_cliente?page=0&limit=0');

      expect(response.status).toBe(200);
      expect(response.body.pagination.currentPage).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });

    test('usa los valores predeterminados cuando page y limit no son números', async () => {
      pool.query
        .mockResolvedValueOnce(respuestaQuery([]))
        .mockResolvedValueOnce(respuestaQuery([{ total: 0 }]));

      const response = await request(app)
        .get('/consultar_cliente?page=abc&limit=abc');

      expect(response.status).toBe(200);
      expect(response.body.pagination.currentPage).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });

    test('devuelve hasNextPage falso cuando está en la última página', async () => {
      pool.query
        .mockResolvedValueOnce(respuestaQuery([]))
        .mockResolvedValueOnce(respuestaQuery([{ total: 10 }]));

      const response = await request(app)
        .get('/consultar_cliente?page=2&limit=5');

      expect(response.status).toBe(200);
      expect(response.body.pagination.hasNextPage).toBe(false);
      expect(response.body.pagination.hasPrevPage).toBe(true);
    });

    test('devuelve hasPrevPage falso en la primera página', async () => {
      pool.query
        .mockResolvedValueOnce(respuestaQuery([]))
        .mockResolvedValueOnce(respuestaQuery([{ total: 10 }]));

      const response = await request(app)
        .get('/consultar_cliente?page=1&limit=5');

      expect(response.status).toBe(200);
      expect(response.body.pagination.hasPrevPage).toBe(false);
      expect(response.body.pagination.hasNextPage).toBe(true);
    });

    test('maneja error al consultar los clientes', async () => {
      pool.query.mockRejectedValueOnce(new Error('Error al consultar clientes'));

      const response = await request(app)
        .get('/consultar_cliente');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Error al consultar clientes');
    });

    test('maneja error al consultar el total de clientes', async () => {
      pool.query
        .mockResolvedValueOnce(respuestaQuery([cliente]))
        .mockRejectedValueOnce(new Error('Error al contar clientes'));

      const response = await request(app)
        .get('/consultar_cliente');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Error al contar clientes');
    });
  });

  // =====================================================
  // GET /documento/:documento
  // =====================================================

  describe('GET /documento/:documento', () => {
    test('busca un cliente por documento', async () => {
      pool.query.mockResolvedValueOnce(
        respuestaQuery([cliente])
      );

      const response = await request(app)
        .get('/consultar_cliente/documento/123456');

      expect(response.status).toBe(200);
      expect(response.body.numero_documento).toBe('123456');
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE dp.numero_documento = ?'),
        ['123456']
      );
    });

    test('devuelve 404 cuando el cliente no existe', async () => {
      pool.query.mockResolvedValueOnce(
        respuestaQuery([])
      );

      const response = await request(app)
        .get('/consultar_cliente/documento/999999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Cliente no encontrado');
    });

    test('maneja errores al buscar por documento', async () => {
      pool.query.mockRejectedValueOnce(
        new Error('Error al buscar documento')
      );

      const response = await request(app)
        .get('/consultar_cliente/documento/123456');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Error al buscar documento');
    });
  });

  // =====================================================
  // PUT /:id
  // =====================================================

  describe('PUT /:id', () => {
    test('rechaza cuando falta el tipo de documento', async () => {
      const response = await request(app)
        .put('/consultar_cliente/1')
        .send({
          ...datosEdicion,
          id_tipo_documento: null
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Faltan campos obligatorios');
    });

    test('rechaza cuando falta el número de documento', async () => {
      const response = await request(app)
        .put('/consultar_cliente/1')
        .send({
          ...datosEdicion,
          numero_documento: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Faltan campos obligatorios');
    });

    test('rechaza cuando falta el primer nombre', async () => {
      const response = await request(app)
        .put('/consultar_cliente/1')
        .send({
          ...datosEdicion,
          primer_nombre: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Faltan campos obligatorios');
    });

    test('rechaza cuando falta el primer apellido', async () => {
      const response = await request(app)
        .put('/consultar_cliente/1')
        .send({
          ...datosEdicion,
          primer_apellido: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Faltan campos obligatorios');
    });

    test('rechaza cuando falta la fecha de nacimiento', async () => {
      const response = await request(app)
        .put('/consultar_cliente/1')
        .send({
          ...datosEdicion,
          fecha_nacimiento: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Faltan campos obligatorios');
    });

    test('actualiza correctamente un cliente', async () => {
      pool.query
        .mockResolvedValueOnce(
          respuestaQuery([{ id_datos_personales: 10 }])
        )
        .mockResolvedValueOnce(respuestaQuery([]))
        .mockResolvedValueOnce(respuestaQuery([]))
        .mockResolvedValueOnce(respuestaQuery({ affectedRows: 1 }));

      const response = await request(app)
        .put('/consultar_cliente/1')
        .send(datosEdicion);

      expect(response.status).toBe(200);
      expect(response.body.mensaje).toBe(
        'Cliente actualizado exitosamente'
      );

      expect(pool.query).toHaveBeenCalledTimes(4);

      expect(pool.query.mock.calls[3][1]).toEqual([
        1,
        '123456',
        'Carlos',
        'Andrés',
        'Pérez',
        'López',
        '1995-05-10',
        'Masculino',
        'carlos@gmail.com',
        '3001234567',
        10
      ]);
    });

    test('devuelve 404 cuando el cliente no existe', async () => {
      pool.query.mockResolvedValueOnce(respuestaQuery([]));

      const response = await request(app)
        .put('/consultar_cliente/1')
        .send(datosEdicion);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Cliente no encontrado');
    });

    test('rechaza un documento que pertenece a otra persona', async () => {
      pool.query
        .mockResolvedValueOnce(
          respuestaQuery([{ id_datos_personales: 10 }])
        )
        .mockResolvedValueOnce(
          respuestaQuery([{ id: 20 }])
        );

      const response = await request(app)
        .put('/consultar_cliente/1')
        .send(datosEdicion);

      expect(response.status).toBe(409);
      expect(response.body.error).toBe(
        'Ya existe una persona con ese numero de documento'
      );
    });

    test('rechaza un correo que pertenece a otra persona', async () => {
      pool.query
        .mockResolvedValueOnce(
          respuestaQuery([{ id_datos_personales: 10 }])
        )
        .mockResolvedValueOnce(respuestaQuery([]))
        .mockResolvedValueOnce(
          respuestaQuery([{ id: 20 }])
        );

      const response = await request(app)
        .put('/consultar_cliente/1')
        .send(datosEdicion);

      expect(response.status).toBe(409);
      expect(response.body.error).toBe(
        'Ya existe una persona con ese correo'
      );
    });

    test('actualiza correctamente cuando los campos opcionales están vacíos', async () => {
      pool.query
        .mockResolvedValueOnce(
          respuestaQuery([{ id_datos_personales: 10 }])
        )
        .mockResolvedValueOnce(respuestaQuery([]))
        .mockResolvedValueOnce(
          respuestaQuery({ affectedRows: 1 })
        );

      const response = await request(app)
        .put('/consultar_cliente/1')
        .send({
          ...datosEdicion,
          segundo_nombre: '',
          segundo_apellido: '',
          genero: '',
          correo: '',
          telefono: ''
        });

      expect(response.status).toBe(200);
      expect(response.body.mensaje).toBe(
        'Cliente actualizado exitosamente'
      );

      expect(pool.query).toHaveBeenCalledTimes(3);

      expect(pool.query.mock.calls[2][1]).toEqual([
        1,
        '123456',
        'Carlos',
        null,
        'Pérez',
        null,
        '1995-05-10',
        null,
        null,
        null,
        10
      ]);
    });

    test('maneja error al consultar el cliente para editar', async () => {
      pool.query.mockRejectedValueOnce(
        new Error('Error al consultar cliente')
      );

      const response = await request(app)
        .put('/consultar_cliente/1')
        .send(datosEdicion);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Error al consultar cliente');
    });

    test('maneja error al comprobar documento duplicado', async () => {
      pool.query
        .mockResolvedValueOnce(
          respuestaQuery([{ id_datos_personales: 10 }])
        )
        .mockRejectedValueOnce(
          new Error('Error al validar documento')
        );

      const response = await request(app)
        .put('/consultar_cliente/1')
        .send(datosEdicion);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Error al validar documento');
    });

    test('maneja error al comprobar correo duplicado', async () => {
      pool.query
        .mockResolvedValueOnce(
          respuestaQuery([{ id_datos_personales: 10 }])
        )
        .mockResolvedValueOnce(respuestaQuery([]))
        .mockRejectedValueOnce(
          new Error('Error al validar correo')
        );

      const response = await request(app)
        .put('/consultar_cliente/1')
        .send(datosEdicion);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Error al validar correo');
    });

    test('maneja error al actualizar los datos personales', async () => {
      pool.query
        .mockResolvedValueOnce(
          respuestaQuery([{ id_datos_personales: 10 }])
        )
        .mockResolvedValueOnce(respuestaQuery([]))
        .mockResolvedValueOnce(respuestaQuery([]))
        .mockRejectedValueOnce(
          new Error('Error al actualizar cliente')
        );

      const response = await request(app)
        .put('/consultar_cliente/1')
        .send(datosEdicion);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Error al actualizar cliente');
    });
  });

  // =====================================================
  // DELETE /:id
  // =====================================================

  describe('DELETE /:id', () => {
    const prepararClienteSinRelaciones = (usuario = 0) => {
      conn.query
        .mockResolvedValueOnce(
          respuestaQuery([{ id_datos_personales: 10 }])
        )
        .mockResolvedValueOnce(
          respuestaQuery([{ n: 0 }])
        )
        .mockResolvedValueOnce(
          respuestaQuery([{ n: 0 }])
        )
        .mockResolvedValueOnce(
          respuestaQuery([{ n: 0 }])
        )
        .mockResolvedValueOnce(
          respuestaQuery([{ n: usuario }])
        )
        .mockResolvedValueOnce(
          respuestaQuery({ affectedRows: 1 })
        );

      if (usuario === 0) {
        conn.query.mockResolvedValueOnce(
          respuestaQuery({ affectedRows: 1 })
        );
      }
    };

    test('devuelve 404 cuando el cliente no existe', async () => {
      conn.query.mockResolvedValueOnce(respuestaQuery([]));

      const response = await request(app)
        .delete('/consultar_cliente/1');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Cliente no encontrado');
      expect(conn.release).toHaveBeenCalled();
      expect(conn.rollback).not.toHaveBeenCalled();
    });

    test('no elimina un cliente que tiene ventas', async () => {
      conn.query
        .mockResolvedValueOnce(
          respuestaQuery([{ id_datos_personales: 10 }])
        )
        .mockResolvedValueOnce(
          respuestaQuery([{ n: 1 }])
        );

      const response = await request(app)
        .delete('/consultar_cliente/1');

      expect(response.status).toBe(409);
      expect(response.body.error).toContain(
        'No se puede eliminar'
      );
      expect(conn.release).toHaveBeenCalled();
    });

    test('no elimina un cliente que tiene consultas agendadas', async () => {
      conn.query
        .mockResolvedValueOnce(
          respuestaQuery([{ id_datos_personales: 10 }])
        )
        .mockResolvedValueOnce(
          respuestaQuery([{ n: 0 }])
        )
        .mockResolvedValueOnce(
          respuestaQuery([{ n: 1 }])
        );

      const response = await request(app)
        .delete('/consultar_cliente/1');

      expect(response.status).toBe(409);
      expect(response.body.error).toContain(
        'No se puede eliminar'
      );
      expect(conn.release).toHaveBeenCalled();
    });

    test('no elimina un cliente que tiene historia clínica', async () => {
      conn.query
        .mockResolvedValueOnce(
          respuestaQuery([{ id_datos_personales: 10 }])
        )
        .mockResolvedValueOnce(
          respuestaQuery([{ n: 0 }])
        )
        .mockResolvedValueOnce(
          respuestaQuery([{ n: 0 }])
        )
        .mockResolvedValueOnce(
          respuestaQuery([{ n: 1 }])
        );

      const response = await request(app)
        .delete('/consultar_cliente/1');

      expect(response.status).toBe(409);
      expect(response.body.error).toContain(
        'No se puede eliminar'
      );
      expect(conn.release).toHaveBeenCalled();
    });

    test('elimina cliente y datos personales cuando no existe un usuario asociado', async () => {
      prepararClienteSinRelaciones(0);

      const response = await request(app)
        .delete('/consultar_cliente/1');

      expect(response.status).toBe(200);
      expect(response.body.mensaje).toBe(
        'Cliente eliminado exitosamente'
      );

      expect(conn.beginTransaction).toHaveBeenCalled();
      expect(conn.commit).toHaveBeenCalled();
      expect(conn.rollback).not.toHaveBeenCalled();
      expect(conn.release).toHaveBeenCalled();
      expect(conn.query).toHaveBeenCalledTimes(7);
    });

    test('elimina el cliente pero conserva datos personales cuando tiene usuario asociado', async () => {
      prepararClienteSinRelaciones(1);

      const response = await request(app)
        .delete('/consultar_cliente/1');

      expect(response.status).toBe(200);
      expect(response.body.mensaje).toBe(
        'Cliente eliminado exitosamente'
      );

      expect(conn.beginTransaction).toHaveBeenCalled();
      expect(conn.commit).toHaveBeenCalled();
      expect(conn.rollback).not.toHaveBeenCalled();
      expect(conn.release).toHaveBeenCalled();

      // No debe ejecutar DELETE sobre Datos_personales.
      expect(conn.query).toHaveBeenCalledTimes(6);
    });

    test('maneja error al consultar el cliente para eliminar', async () => {
      conn.query.mockRejectedValueOnce(
        new Error('Error al consultar cliente')
      );

      const response = await request(app)
        .delete('/consultar_cliente/1');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Error al consultar cliente');
      expect(conn.rollback).toHaveBeenCalled();
      expect(conn.release).toHaveBeenCalled();
    });

    test('maneja error al consultar las ventas', async () => {
      conn.query
        .mockResolvedValueOnce(
          respuestaQuery([{ id_datos_personales: 10 }])
        )
        .mockRejectedValueOnce(
          new Error('Error al consultar ventas')
        );

      const response = await request(app)
        .delete('/consultar_cliente/1');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Error al consultar ventas');
      expect(conn.rollback).toHaveBeenCalled();
      expect(conn.release).toHaveBeenCalled();
    });

    test('maneja error al consultar las agendas', async () => {
      conn.query
        .mockResolvedValueOnce(
          respuestaQuery([{ id_datos_personales: 10 }])
        )
        .mockResolvedValueOnce(
          respuestaQuery([{ n: 0 }])
        )
        .mockRejectedValueOnce(
          new Error('Error al consultar agendas')
        );

      const response = await request(app)
        .delete('/consultar_cliente/1');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Error al consultar agendas');
      expect(conn.rollback).toHaveBeenCalled();
      expect(conn.release).toHaveBeenCalled();
    });

    test('maneja error al consultar historias clínicas', async () => {
      conn.query
        .mockResolvedValueOnce(
          respuestaQuery([{ id_datos_personales: 10 }])
        )
        .mockResolvedValueOnce(
          respuestaQuery([{ n: 0 }])
        )
        .mockResolvedValueOnce(
          respuestaQuery([{ n: 0 }])
        )
        .mockRejectedValueOnce(
          new Error('Error al consultar historias')
        );

      const response = await request(app)
        .delete('/consultar_cliente/1');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Error al consultar historias');
      expect(conn.rollback).toHaveBeenCalled();
      expect(conn.release).toHaveBeenCalled();
    });

    test('maneja error al consultar usuarios asociados', async () => {
      conn.query
        .mockResolvedValueOnce(
          respuestaQuery([{ id_datos_personales: 10 }])
        )
        .mockResolvedValueOnce(
          respuestaQuery([{ n: 0 }])
        )
        .mockResolvedValueOnce(
          respuestaQuery([{ n: 0 }])
        )
        .mockResolvedValueOnce(
          respuestaQuery([{ n: 0 }])
        )
        .mockRejectedValueOnce(
          new Error('Error al consultar usuarios')
        );

      const response = await request(app)
        .delete('/consultar_cliente/1');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Error al consultar usuarios');
      expect(conn.rollback).toHaveBeenCalled();
      expect(conn.release).toHaveBeenCalled();
    });

    test('maneja error al iniciar la transacción', async () => {
      conn.query
        .mockResolvedValueOnce(
          respuestaQuery([{ id_datos_personales: 10 }])
        )
        .mockResolvedValueOnce(
          respuestaQuery([{ n: 0 }])
        )
        .mockResolvedValueOnce(
          respuestaQuery([{ n: 0 }])
        )
        .mockResolvedValueOnce(
          respuestaQuery([{ n: 0 }])
        )
        .mockResolvedValueOnce(
          respuestaQuery([{ n: 0 }])
        );

      conn.beginTransaction.mockRejectedValueOnce(
        new Error('Error al iniciar transacción')
      );

      const response = await request(app)
        .delete('/consultar_cliente/1');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe(
        'Error al iniciar transacción'
      );
      expect(conn.rollback).toHaveBeenCalled();
      expect(conn.release).toHaveBeenCalled();
    });

    test('maneja error al eliminar el cliente', async () => {
      conn.query
        .mockResolvedValueOnce(
          respuestaQuery([{ id_datos_personales: 10 }])
        )
        .mockResolvedValueOnce(
          respuestaQuery([{ n: 0 }])
        )
        .mockResolvedValueOnce(
          respuestaQuery([{ n: 0 }])
        )
        .mockResolvedValueOnce(
          respuestaQuery([{ n: 0 }])
        )
        .mockResolvedValueOnce(
          respuestaQuery([{ n: 0 }])
        )
        .mockRejectedValueOnce(
          new Error('Error al eliminar cliente')
        );

      const response = await request(app)
        .delete('/consultar_cliente/1');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Error al eliminar cliente');
      expect(conn.rollback).toHaveBeenCalled();
      expect(conn.release).toHaveBeenCalled();
    });

    test('maneja error al eliminar los datos personales', async () => {
      conn.query
        .mockResolvedValueOnce(
          respuestaQuery([{ id_datos_personales: 10 }])
        )
        .mockResolvedValueOnce(
          respuestaQuery([{ n: 0 }])
        )
        .mockResolvedValueOnce(
          respuestaQuery([{ n: 0 }])
        )
        .mockResolvedValueOnce(
          respuestaQuery([{ n: 0 }])
        )
        .mockResolvedValueOnce(
          respuestaQuery([{ n: 0 }])
        )
        .mockResolvedValueOnce(
          respuestaQuery({ affectedRows: 1 })
        )
        .mockRejectedValueOnce(
          new Error('Error al eliminar datos personales')
        );

      const response = await request(app)
        .delete('/consultar_cliente/1');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe(
        'Error al eliminar datos personales'
      );
      expect(conn.rollback).toHaveBeenCalled();
      expect(conn.release).toHaveBeenCalled();
    });

    test('maneja error al confirmar la transacción', async () => {
      prepararClienteSinRelaciones(1);

      conn.commit.mockRejectedValueOnce(
        new Error('Error al confirmar transacción')
      );

      const response = await request(app)
        .delete('/consultar_cliente/1');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe(
        'Error al confirmar transacción'
      );
      expect(conn.rollback).toHaveBeenCalled();
      expect(conn.release).toHaveBeenCalled();
    });
  });
});
