// backend/routes/__tests__/Administrador/usuarios.test.js
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import router from '../../Administrador/usuarios.js';

// Simulamos el módulo de la base de datos.
// Se define explícitamente (query y getConnection) porque el mock automático
// no garantiza que getConnection exista como jest.fn() con el pool de MySQL.
jest.mock('../../../db.js', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
    getConnection: jest.fn(),
  },
}));
import pool from '../../../db.js';

// Simulamos bcrypt para no encriptar de verdad y poder verificar su uso
jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: { hash: jest.fn() },
}));

// Creamos una app de Express mínima solo para las pruebas
const app = express();
app.use(express.json());
app.use('/usuarios', router);

// Conexión simulada para las rutas con transacción (POST, PUT y DELETE)
const connection = {
  beginTransaction: jest.fn(),
  query: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
  release: jest.fn(),
};

// Datos válidos reutilizables
const usuarioValido = {
  id_tipo_documento: 1,
  numero_documento: '123456',
  primer_nombre: 'Ana',
  primer_apellido: 'Gómez',
  correo: 'ana@correo.com',
  id_autorizacion: 2,
  contrasenia: 'clave123',
};

beforeEach(() => {
  // Limpiamos los mocks para que los "Once" sobrantes no contaminen otros tests
  jest.resetAllMocks();
  pool.getConnection.mockResolvedValue(connection);
  bcrypt.hash.mockResolvedValue('hash_seguro');
  // Silenciamos los console.error que provocan los errores simulados
  jest.spyOn(console, 'error').mockImplementation(() => { });
});

describe('Pruebas de Caja Blanca - Usuarios', () => {

  // --- GET / ---
  test('GET / debe retornar la lista de usuarios', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 1, rol: 'Optómetra' }]]);

    const res = await request(app).get('/usuarios');

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  // --- POST / ---
  test('POST / debe rechazar si faltan campos requeridos', async () => {
    const res = await request(app)
      .post('/usuarios')
      .send({ primer_nombre: 'Incompleto' });

    expect(res.statusCode).toBe(400);
    expect(pool.getConnection).not.toHaveBeenCalled(); // No debe abrir conexión
    expect(connection.query).not.toHaveBeenCalled();   // No debe tocar la BD
  });

  test('POST / debe crear usuario exitosamente', async () => {
    connection.query
      .mockResolvedValueOnce([{ insertId: 10 }])     // Insert Datos_personales
      .mockResolvedValueOnce([{ insertId: 20 }])     // Insert Usuario
      .mockResolvedValueOnce([{ affectedRows: 1 }]); // Insert Autorizacion_usuario

    const res = await request(app).post('/usuarios').send(usuarioValido);

    expect(res.statusCode).toBe(201);
    expect(res.body.id).toBe(20);
    expect(res.body.id_datos_personales).toBe(10);
    expect(connection.query).toHaveBeenCalledTimes(3);
    expect(connection.commit).toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalled();
  });

  test('POST / debe guardar la contraseña encriptada y no en texto plano', async () => {
    connection.query
      .mockResolvedValueOnce([{ insertId: 10 }])
      .mockResolvedValueOnce([{ insertId: 20 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    await request(app).post('/usuarios').send(usuarioValido);

    // 2da consulta = insert en Usuario
    const parametrosUsuario = connection.query.mock.calls[1][1];
    expect(bcrypt.hash).toHaveBeenCalledWith('clave123', 10);
    expect(parametrosUsuario).toContain('hash_seguro');
    expect(parametrosUsuario).not.toContain('clave123');
  });

  test('POST / debe retornar 409 si el documento, teléfono o correo ya existe', async () => {
    const errorDuplicado = new Error('Duplicado');
    errorDuplicado.code = 'ER_DUP_ENTRY';
    connection.query.mockRejectedValueOnce(errorDuplicado);

    const res = await request(app).post('/usuarios').send(usuarioValido);

    expect(res.statusCode).toBe(409);
    expect(connection.rollback).toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalled();
  });

  test('POST / debe guardar los campos opcionales cuando se envían', async () => {
    connection.query
      .mockResolvedValueOnce([{ insertId: 10 }])
      .mockResolvedValueOnce([{ insertId: 20 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const res = await request(app).post('/usuarios').send({
      ...usuarioValido,
      segundo_nombre: 'María',
      segundo_apellido: 'Pérez',
      fecha_nacimiento: '1990-05-10',
      genero: 'F',
      telefono: '3001234567',
      activar_usuario: 0,
      clave_idioma: 'en',
      clave_activacion: 'abc123',
    });

    expect(res.statusCode).toBe(201);

    // 1ra consulta = Datos_personales con los opcionales completos
    const parametrosDatos = connection.query.mock.calls[0][1];
    expect(parametrosDatos).toContain('María');
    expect(parametrosDatos).toContain('3001234567');

    // 2da consulta = Usuario con activar_usuario en 0
    const parametrosUsuario = connection.query.mock.calls[1][1];
    expect(parametrosUsuario).toContain(0);
    expect(parametrosUsuario).toContain('en');
  });

  // --- PUT /:id ---
  test('PUT debe retornar 404 si el usuario no existe', async () => {
    connection.query.mockResolvedValueOnce([[]]); // SELECT vacío

    const res = await request(app).put('/usuarios/999').send(usuarioValido);

    expect(res.statusCode).toBe(404);
    expect(connection.rollback).toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalled();
  });

  test('PUT debe actualizar exitosamente sin cambiar la contraseña', async () => {
    const { contrasenia, ...sinClave } = usuarioValido;
    connection.query
      .mockResolvedValueOnce([[{ id_datos_personales: 5 }]]) // SELECT usuario
      .mockResolvedValueOnce([{}])                           // UPDATE Datos_personales
      .mockResolvedValueOnce([{}])                           // UPDATE Usuario
      .mockResolvedValueOnce([[{ id: 1 }]])                  // SELECT rol (existe)
      .mockResolvedValueOnce([{}]);                          // UPDATE rol

    const res = await request(app).put('/usuarios/1').send(sinClave);

    expect(res.statusCode).toBe(200);
    expect(bcrypt.hash).not.toHaveBeenCalled();
    expect(connection.query.mock.calls[2][0]).not.toContain('contrasenia=?');
    expect(connection.commit).toHaveBeenCalled();
  });

  test('PUT debe encriptar la nueva contraseña si se envía', async () => {
    connection.query
      .mockResolvedValueOnce([[{ id_datos_personales: 5 }]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([[{ id: 1 }]])
      .mockResolvedValueOnce([{}]);

    const res = await request(app).put('/usuarios/1').send(usuarioValido);

    expect(res.statusCode).toBe(200);
    expect(bcrypt.hash).toHaveBeenCalledWith('clave123', 10);
    expect(connection.query.mock.calls[2][0]).toContain('contrasenia=?');
  });

  test('PUT debe insertar el rol si el usuario no tenía uno asignado', async () => {
    connection.query
      .mockResolvedValueOnce([[{ id_datos_personales: 5 }]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([[]])  // SELECT rol vacío
      .mockResolvedValueOnce([{}]); // INSERT rol

    const res = await request(app).put('/usuarios/1').send(usuarioValido);

    expect(res.statusCode).toBe(200);
    expect(connection.query.mock.calls[4][0]).toContain('INSERT INTO Autorizacion_usuario');
  });

  test('PUT debe retornar 409 si hay datos duplicados', async () => {
    const errorDuplicado = new Error('Duplicado');
    errorDuplicado.code = 'ER_DUP_ENTRY';
    connection.query
      .mockResolvedValueOnce([[{ id_datos_personales: 5 }]])
      .mockRejectedValueOnce(errorDuplicado);

    const res = await request(app).put('/usuarios/1').send(usuarioValido);

    expect(res.statusCode).toBe(409);
    expect(connection.rollback).toHaveBeenCalled();
  });

  test('PUT debe usar los valores enviados en lugar de los valores por defecto', async () => {
    connection.query
      .mockResolvedValueOnce([[{ id_datos_personales: 5 }]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([[{ id: 1 }]])
      .mockResolvedValueOnce([{}]);

    const res = await request(app).put('/usuarios/1').send({
      ...usuarioValido,
      segundo_nombre: 'María',
      segundo_apellido: 'Pérez',
      fecha_nacimiento: '1990-05-10',
      genero: 'F',
      telefono: '3001234567',
      activar_usuario: 0,
      clave_idioma: 'en',
      clave_activacion: 'abc123',
    });

    expect(res.statusCode).toBe(200);

    // 3ra consulta = UPDATE Usuario con los valores enviados
    const parametrosUsuario = connection.query.mock.calls[2][1];
    expect(parametrosUsuario).toEqual([0, 'en', 'abc123', 'hash_seguro', '1']);
  });


  // --- DELETE /:id ---
  test('DELETE debe eliminar autorización, usuario y datos personales', async () => {
    connection.query
      .mockResolvedValueOnce([[{ id_datos_personales: 5 }]]) // SELECT usuario
      .mockResolvedValueOnce([{}])                           // DELETE autorización
      .mockResolvedValueOnce([{}])                           // DELETE usuario
      .mockResolvedValueOnce([{}]);                          // DELETE datos personales

    const res = await request(app).delete('/usuarios/1');

    expect(res.statusCode).toBe(200);
    expect(res.body.mensaje).toBe('Usuario eliminado correctamente');
    expect(connection.query).toHaveBeenCalledTimes(4);
    expect(connection.query.mock.calls[1][0]).toContain('DELETE FROM Autorizacion_usuario');
    expect(connection.query.mock.calls[2][0]).toContain('DELETE FROM Usuario');
    expect(connection.query.mock.calls[3][0]).toContain('DELETE FROM Datos_personales');
    expect(connection.query.mock.calls[3][1]).toEqual([5]);
    expect(connection.commit).toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalled();
  });

  test('DELETE debe retornar 404 y revertir si el usuario no existe', async () => {
    connection.query.mockResolvedValueOnce([[]]); // SELECT vacío

    const res = await request(app).delete('/usuarios/999');

    expect(res.statusCode).toBe(404);
    expect(res.body.mensaje).toBe('Usuario no encontrado');
    expect(connection.rollback).toHaveBeenCalled();
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.query).toHaveBeenCalledTimes(1);
    expect(connection.release).toHaveBeenCalled();
  });

  test('DELETE debe revertir y retornar 500 si falla una consulta', async () => {
    connection.query.mockRejectedValueOnce(new Error('Fallo'));

    const res = await request(app).delete('/usuarios/1');

    expect(res.statusCode).toBe(500);
    expect(res.body.mensaje).toBe('Error al eliminar el usuario');
    expect(res.body.detalle).toBe('Fallo');
    expect(connection.rollback).toHaveBeenCalled();
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalled();
  });

  test('DELETE debe retornar 500 si no se puede obtener la conexión', async () => {
    pool.getConnection.mockRejectedValueOnce(new Error('Sin conexión'));

    const res = await request(app).delete('/usuarios/1');

    expect(res.statusCode).toBe(500);
    expect(res.body.mensaje).toBe('Error al eliminar el usuario');
    expect(connection.release).not.toHaveBeenCalled();
  });

  describe('Manejo de Errores de Base de Datos (Catch)', () => {

    test('GET / debe capturar error de BD y retornar 500', async () => {
      pool.query.mockRejectedValueOnce(new Error('Fallo de conexión'));

      const res = await request(app).get('/usuarios');

      expect(res.statusCode).toBe(500);
      expect(res.body.detalle).toBe('Fallo de conexión');
    });

    test('POST / debe capturar error de BD, hacer rollback y retornar 500', async () => {
      connection.query.mockRejectedValueOnce(new Error('Fallo'));

      const res = await request(app).post('/usuarios').send(usuarioValido);

      expect(res.statusCode).toBe(500);
      expect(res.body.mensaje).toBe('No fue posible crear el usuario');
      expect(connection.rollback).toHaveBeenCalled();
      expect(connection.commit).not.toHaveBeenCalled();
    });

    test('POST / debe retornar 500 si no se puede obtener la conexión', async () => {
      pool.getConnection.mockRejectedValueOnce(new Error('Sin conexión'));

      const res = await request(app).post('/usuarios').send(usuarioValido);

      expect(res.statusCode).toBe(500);
      expect(connection.release).not.toHaveBeenCalled();
    });

    test('PUT /:id debe capturar error de BD y retornar 500', async () => {
      connection.query.mockRejectedValueOnce(new Error('Fallo'));

      const res = await request(app).put('/usuarios/1').send(usuarioValido);

      expect(res.statusCode).toBe(500);
      expect(res.body.mensaje).toBe('Error al actualizar usuario');
      expect(connection.rollback).toHaveBeenCalled();
      expect(connection.release).toHaveBeenCalled();
    });

    test('PUT /:id debe retornar 500 si no se puede obtener la conexión', async () => {
      pool.getConnection.mockRejectedValueOnce(new Error('Sin conexión'));

      const res = await request(app).put('/usuarios/1').send(usuarioValido);

      expect(res.statusCode).toBe(500);
      expect(connection.release).not.toHaveBeenCalled();
    });
  });
});
