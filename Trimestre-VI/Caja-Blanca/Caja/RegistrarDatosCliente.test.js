
import request from 'supertest';
import express from 'express';

jest.mock('../../../db.js');

import pool from '../../../db.js';
import router from '../../Caja/RegistrarDatosCliente.js';

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
// APLICACIÓN EXPRESS
// ==========================================

const app = express();

app.use(express.json());
app.use('/clientes', router);

// ==========================================
// DATOS DE PRUEBA
// ==========================================

const bodyValido = {
  id_tipo_documento: 1,
  numero_documento: '123456789',
  primer_nombre: 'Ana',
  segundo_nombre: 'Maria',
  primer_apellido: 'Gil',
  segundo_apellido: 'Lopez',
  fecha_nacimiento: '1995-05-10',
  genero: 'Femenino',
  correo: 'ana@gmail.com',
  telefono: '3001234567'
};

describe('Pruebas de Caja Blanca - Registrar Datos Cliente', () => {

  beforeEach(() => {
    jest.clearAllMocks();

    connection.query.mockReset();
    connection.beginTransaction.mockReset();
    connection.commit.mockReset();
    connection.rollback.mockReset();
    connection.release.mockReset();

    pool.getConnection.mockReset();

    pool.getConnection.mockResolvedValue(connection);

    connection.beginTransaction.mockResolvedValue(undefined);
    connection.commit.mockResolvedValue(undefined);
    connection.rollback.mockResolvedValue(undefined);
    connection.release.mockReturnValue(undefined);
  });

  // ==========================================
  // VALIDACIONES DE CAMPOS OBLIGATORIOS
  // ==========================================

  test.each([
    'id_tipo_documento',
    'numero_documento',
    'primer_nombre',
    'primer_apellido'
  ])(
    'POST / debe rechazar cuando falta %s',
    async (campo) => {

      const datos = {
        ...bodyValido,
        [campo]: undefined
      };

      const res = await request(app)
        .post('/clientes')
        .send(datos);

      expect(res.statusCode).toBe(400);

      expect(res.body.error).toBe(
        'El tipo de documento, número de documento, primer nombre y primer apellido son requeridos'
      );

      expect(connection.beginTransaction).not.toHaveBeenCalled();
      expect(connection.query).not.toHaveBeenCalled();

      expect(connection.release).toHaveBeenCalledTimes(1);
      expect(connection.rollback).not.toHaveBeenCalled();
    }
  );

  // ==========================================
  // PERSONA EXISTENTE QUE TODAVÍA NO ES CLIENTE
  // ==========================================

  test('POST / debe reutilizar datos personales existentes y registrar el cliente', async () => {

    connection.query
      // Persona encontrada
      .mockResolvedValueOnce([
        [{ id: 10 }]
      ])

      // Todavía no está registrada como cliente
      .mockResolvedValueOnce([
        []
      ])

      // Insertar cliente
      .mockResolvedValueOnce([
        { insertId: 20 }
      ]);

    const res = await request(app)
      .post('/clientes')
      .send(bodyValido);

    expect(res.statusCode).toBe(201);

    expect(res.body.mensaje).toBe(
      'Cliente registrado exitosamente'
    );

    expect(res.body.cliente).toEqual({
      numero_documento: '123456789',
      primer_nombre: 'Ana',
      primer_apellido: 'Gil',
      telefono: '3001234567'
    });

    expect(connection.beginTransaction).toHaveBeenCalledTimes(1);

    expect(connection.query).toHaveBeenCalledTimes(3);

    // Debe consultar la persona por documento
    expect(connection.query.mock.calls[0][1]).toEqual([
      '123456789'
    ]);

    // Debe verificar si ya es cliente
    expect(connection.query.mock.calls[1][1]).toEqual([
      10
    ]);

    // Debe insertar el cliente con el ID existente
    expect(connection.query.mock.calls[2][1]).toEqual([
      10
    ]);

    expect(connection.commit).toHaveBeenCalledTimes(1);
    expect(connection.rollback).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  // ==========================================
  // CLIENTE YA REGISTRADO
  // ==========================================

  test('POST / debe rechazar si la persona ya está registrada como cliente', async () => {

    connection.query
      // Persona existente
      .mockResolvedValueOnce([
        [{ id: 10 }]
      ])

      // Cliente existente
      .mockResolvedValueOnce([
        [{ id_cliente: 5 }]
      ]);

    const res = await request(app)
      .post('/clientes')
      .send(bodyValido);

    expect(res.statusCode).toBe(400);

    expect(res.body.error).toBe(
      'El cliente ya se encuentra registrado en el sistema'
    );

    expect(connection.beginTransaction).toHaveBeenCalledTimes(1);
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.commit).not.toHaveBeenCalled();

    expect(connection.query).toHaveBeenCalledTimes(2);
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  // ==========================================
  // REGISTRO DE PERSONA NUEVA
  // ==========================================

  test('POST / debe insertar datos personales y registrar cliente nuevo', async () => {

    connection.query
      // Persona no encontrada
      .mockResolvedValueOnce([
        []
      ])

      // Insertar datos personales
      .mockResolvedValueOnce([
        { insertId: 30 }
      ])

      // Insertar cliente
      .mockResolvedValueOnce([
        { insertId: 40 }
      ]);

    const res = await request(app)
      .post('/clientes')
      .send(bodyValido);

    expect(res.statusCode).toBe(201);

    expect(res.body.mensaje).toBe(
      'Cliente registrado exitosamente'
    );

    expect(connection.query).toHaveBeenCalledTimes(3);

    // Verificar INSERT de datos personales
    const insertDatos = connection.query.mock.calls[1];

    expect(insertDatos[0]).toContain(
      'INSERT INTO Datos_personales'
    );

    expect(insertDatos[1]).toEqual([
      1,
      '123456789',
      'Ana',
      'Maria',
      'Gil',
      'Lopez',
      '1995-05-10',
      'Femenino',
      'ana@gmail.com',
      '3001234567'
    ]);

    // Verificar INSERT de cliente
    const insertCliente = connection.query.mock.calls[2];

    expect(insertCliente[0]).toContain(
      'INSERT INTO Cliente'
    );

    expect(insertCliente[1]).toEqual([30]);

    expect(connection.commit).toHaveBeenCalledTimes(1);
    expect(connection.rollback).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  // ==========================================
  // CAMPOS OPCIONALES CON VALORES NULL
  // ==========================================

  test('POST / debe convertir los campos opcionales vacíos en null', async () => {

    const datosSinOpcionales = {
      id_tipo_documento: 1,
      numero_documento: '987654321',
      primer_nombre: 'Carlos',
      primer_apellido: 'Perez',
      fecha_nacimiento: '1990-01-15'
    };

    connection.query
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ insertId: 50 }])
      .mockResolvedValueOnce([{ insertId: 60 }]);

    const res = await request(app)
      .post('/clientes')
      .send(datosSinOpcionales);

    expect(res.statusCode).toBe(201);

    const insertDatos = connection.query.mock.calls[1];

    expect(insertDatos[0]).toContain(
      'INSERT INTO Datos_personales'
    );

    expect(insertDatos[1]).toEqual([
      1,
      '987654321',
      'Carlos',
      null,
      'Perez',
      null,
      '1990-01-15',
      null,
      null,
      null
    ]);

    expect(connection.commit).toHaveBeenCalledTimes(1);
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  // ==========================================
  // ERRORES DE BASE DE DATOS
  // ==========================================

  test('POST / debe capturar error al consultar datos personales', async () => {

    connection.query.mockRejectedValueOnce(
      new Error('Error al consultar datos personales')
    );

    const res = await request(app)
      .post('/clientes')
      .send(bodyValido);

    expect(res.statusCode).toBe(500);

    expect(res.body.error).toBe(
      'Error al consultar datos personales'
    );

    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.release).toHaveBeenCalledTimes(1);
    expect(connection.commit).not.toHaveBeenCalled();
  });

  test('POST / debe capturar error al verificar cliente existente', async () => {

    connection.query
      .mockResolvedValueOnce([
        [{ id: 10 }]
      ])
      .mockRejectedValueOnce(
        new Error('Error al consultar cliente')
      );

    const res = await request(app)
      .post('/clientes')
      .send(bodyValido);

    expect(res.statusCode).toBe(500);

    expect(res.body.error).toBe(
      'Error al consultar cliente'
    );

    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  test('POST / debe capturar error al insertar datos personales', async () => {

    connection.query
      .mockResolvedValueOnce([[]])
      .mockRejectedValueOnce(
        new Error('Error al insertar datos personales')
      );

    const res = await request(app)
      .post('/clientes')
      .send(bodyValido);

    expect(res.statusCode).toBe(500);

    expect(res.body.error).toBe(
      'Error al insertar datos personales'
    );

    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  test('POST / debe capturar error al insertar cliente', async () => {

    connection.query
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ insertId: 30 }])
      .mockRejectedValueOnce(
        new Error('Error al insertar cliente')
      );

    const res = await request(app)
      .post('/clientes')
      .send(bodyValido);

    expect(res.statusCode).toBe(500);

    expect(res.body.error).toBe(
      'Error al insertar cliente'
    );

    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.release).toHaveBeenCalledTimes(1);
    expect(connection.commit).not.toHaveBeenCalled();
  });

  test('POST / debe hacer rollback si falla el commit', async () => {

    connection.query
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ insertId: 30 }])
      .mockResolvedValueOnce([{ insertId: 40 }]);

    connection.commit.mockRejectedValueOnce(
      new Error('Error al confirmar transacción')
    );

    const res = await request(app)
      .post('/clientes')
      .send(bodyValido);

    expect(res.statusCode).toBe(500);

    expect(res.body.error).toBe(
      'Error al confirmar transacción'
    );

    expect(connection.commit).toHaveBeenCalledTimes(1);
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

});
