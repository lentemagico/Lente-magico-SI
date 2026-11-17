
import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// -----------------------------------------------------
// MOCK DE LA BASE DE DATOS
// -----------------------------------------------------

jest.mock('../../../db.js', () => ({
  __esModule: true,
  default: {
    getConnection: jest.fn(),
  },
}));

import pool from '../../../db.js';
import router from '../../Caja/ConfirmarVenta.js';

// -----------------------------------------------------
// CONFIGURACIÓN DE EXPRESS
// -----------------------------------------------------

const app = express();
app.use(express.json());
app.use('/confirmar-venta', router);

// -----------------------------------------------------
// DATOS DE PRUEBA
// -----------------------------------------------------

const bodyValido = {
  id_cliente: 1,
  id_usuario: 2,
  estado: 'Confirmada',
  productos: [
    {
      id_producto: 10,
      cantidad: 2,
    },
  ],
};

const productoValido = {
  id_producto: 10,
  nombre: 'Montura óptica',
  precio_venta: 50000,
  stock_actual: 10,
  stock_minimo: 2,
  codigo_producto: 'PROD-010',
  estado: 'Activo',
};

let connection;

// -----------------------------------------------------
// CONFIGURACIÓN DE CONSULTAS SQL SIMULADAS
// -----------------------------------------------------

function configurarConsultas({
  usuarioExiste = true,
  productos = [productoValido],
} = {}) {
  connection.query.mockImplementation(async (sql, params = []) => {
    const consulta = sql.replace(/\s+/g, ' ').trim();

    // Verificar usuario
    if (consulta.includes('SELECT id FROM Usuario')) {
      return usuarioExiste
        ? [[{ id: 2 }], []]
        : [[], []];
    }

    // Buscar producto
    if (consulta.includes('FROM Producto')) {
      const producto = productos.find(
        (p) => Number(p.id_producto) === Number(params[0])
      );

      return producto
        ? [[producto], []]
        : [[], []];
    }

    // Insertar venta
    if (consulta.includes('INSERT INTO Venta')) {
      return [{ insertId: 100, affectedRows: 1 }, []];
    }

    // Insertar detalle
    if (consulta.includes('INSERT INTO Detalle_venta')) {
      return [{ insertId: 200, affectedRows: 1 }, []];
    }

    // Actualizar inventario
    if (consulta.includes('UPDATE Producto')) {
      return [{ affectedRows: 1 }, []];
    }

    throw new Error(`Consulta SQL no contemplada: ${consulta}`);
  });
}

// -----------------------------------------------------
// PREPARACIÓN DE CADA PRUEBA
// -----------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();

  connection = {
    query: jest.fn(),
    beginTransaction: jest.fn().mockResolvedValue(undefined),
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
    release: jest.fn(),
  };

  pool.getConnection.mockResolvedValue(connection);

  configurarConsultas();
});

// =====================================================
// 1. VALIDACIÓN DE DATOS
// =====================================================

describe('POST /confirmar-venta - Validación de datos', () => {

  test('debe retornar 400 si falta el cliente', async () => {
    const res = await request(app)
      .post('/confirmar-venta')
      .send({ ...bodyValido, id_cliente: null });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('El cliente es obligatorio');
  });

  test('debe retornar 401 si falta el usuario', async () => {
    const res = await request(app)
      .post('/confirmar-venta')
      .send({ ...bodyValido, id_usuario: null });

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toContain('usuario que inició sesión');
  });

  test('debe retornar 400 si productos no es un arreglo', async () => {
    const res = await request(app)
      .post('/confirmar-venta')
      .send({ ...bodyValido, productos: 'producto' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('Debe agregar productos');
  });

  test('debe retornar 400 si productos está vacío', async () => {
    const res = await request(app)
      .post('/confirmar-venta')
      .send({ ...bodyValido, productos: [] });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('Debe agregar productos');
  });

  test('debe aceptar un arreglo de productos no vacío', async () => {
    const res = await request(app)
      .post('/confirmar-venta')
      .send(bodyValido);

    expect(res.statusCode).toBe(201);
    expect(res.body.mensaje).toBe('Venta confirmada exitosamente');
  });

  test('debe retornar 400 si un elemento es null', async () => {
    const res = await request(app)
      .post('/confirmar-venta')
      .send({
        ...bodyValido,
        productos: [null],
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('objeto válido');
  });

  test('debe retornar 400 si un elemento es otro arreglo', async () => {
    const res = await request(app)
      .post('/confirmar-venta')
      .send({
        ...bodyValido,
        productos: [[]],
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('objeto válido');
  });

  test('debe retornar 400 si falta id_producto', async () => {
    const res = await request(app)
      .post('/confirmar-venta')
      .send({
        ...bodyValido,
        productos: [{ cantidad: 2 }],
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('Falta id_producto');
  });

  test.each([0, -1, 1.5, 'abc', null])(
    'debe retornar 400 cuando la cantidad es inválida: %s',
    async (cantidad) => {
      const res = await request(app)
        .post('/confirmar-venta')
        .send({
          ...bodyValido,
          productos: [{ id_producto: 10, cantidad }],
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Cantidad inválida');
    }
  );

  test('debe retornar 400 si id_producto no es válido', async () => {
    const res = await request(app)
      .post('/confirmar-venta')
      .send({
        ...bodyValido,
        productos: [{ id_producto: -10, cantidad: 2 }],
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('id_producto inválido');
  });

  test('debe usar un arreglo vacío cuando no se envían productos', async () => {
    const res = await request(app)
      .post('/confirmar-venta')
      .send({
        id_cliente: 1,
        id_usuario: 2,
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('Debe agregar productos');
  });
});

// =====================================================
// 2. PROCESAMIENTO DE VENTAS
// =====================================================

describe('POST /confirmar-venta - Procesamiento de venta', () => {

  test('debe confirmar la venta correctamente', async () => {
    const res = await request(app)
      .post('/confirmar-venta')
      .send(bodyValido);

    expect(res.statusCode).toBe(201);
    expect(res.body.mensaje).toBe('Venta confirmada exitosamente');
    expect(res.body.id_venta).toBe(100);
    expect(res.body.id_usuario).toBe(2);
    expect(res.body.id_cliente).toBe(1);
    expect(res.body.total).toBe(100000);
    expect(res.body.alertas_stock).toEqual([]);

    expect(connection.beginTransaction).toHaveBeenCalledTimes(1);
    expect(connection.commit).toHaveBeenCalledTimes(1);
    expect(connection.rollback).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  test('debe retornar 401 si el usuario no existe', async () => {
    configurarConsultas({ usuarioExiste: false });

    const res = await request(app)
      .post('/confirmar-venta')
      .send(bodyValido);

    expect(res.statusCode).toBe(401);
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  test('debe retornar 404 si el producto no existe', async () => {
    configurarConsultas({ productos: [] });

    const res = await request(app)
      .post('/confirmar-venta')
      .send(bodyValido);

    expect(res.statusCode).toBe(404);
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  test('debe retornar 409 si el producto está inactivo', async () => {
    configurarConsultas({
      productos: [
        { ...productoValido, estado: 'Inactivo' },
      ],
    });

    const res = await request(app)
      .post('/confirmar-venta')
      .send(bodyValido);

    expect(res.statusCode).toBe(409);
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  test('debe retornar 409 si el stock es nulo', async () => {
    configurarConsultas({
      productos: [
        { ...productoValido, stock_actual: null },
      ],
    });

    const res = await request(app)
      .post('/confirmar-venta')
      .send(bodyValido);

    expect(res.statusCode).toBe(409);
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  test('debe retornar 409 si el stock es insuficiente', async () => {
    configurarConsultas({
      productos: [
        { ...productoValido, stock_actual: 1 },
      ],
    });

    const res = await request(app)
      .post('/confirmar-venta')
      .send(bodyValido);

    expect(res.statusCode).toBe(409);
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  test('debe retornar 409 si el precio es negativo', async () => {
    configurarConsultas({
      productos: [
        { ...productoValido, precio_venta: -1 },
      ],
    });

    const res = await request(app)
      .post('/confirmar-venta')
      .send(bodyValido);

    expect(res.statusCode).toBe(409);
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  test('debe retornar 409 si el precio no es numérico', async () => {
    configurarConsultas({
      productos: [
        { ...productoValido, precio_venta: 'precio inválido' },
      ],
    });

    const res = await request(app)
      .post('/confirmar-venta')
      .send(bodyValido);

    expect(res.statusCode).toBe(409);
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  test('debe registrar un servicio sin descontar inventario', async () => {
    configurarConsultas({
      productos: [
        {
          ...productoValido,
          codigo_producto: 'SERV-001',
          stock_actual: null,
        },
      ],
    });

    const res = await request(app)
      .post('/confirmar-venta')
      .send(bodyValido);

    expect(res.statusCode).toBe(201);

    const actualizaciones = connection.query.mock.calls.filter(
      ([sql]) => sql.includes('UPDATE Producto')
    );

    expect(actualizaciones).toHaveLength(0);
    expect(connection.commit).toHaveBeenCalledTimes(1);
  });

  test('debe tratar un producto sin código como producto físico', async () => {
    configurarConsultas({
      productos: [
        {
          ...productoValido,
          codigo_producto: undefined,
        },
      ],
    });

    const res = await request(app)
      .post('/confirmar-venta')
      .send(bodyValido);

    expect(res.statusCode).toBe(201);

    const actualizaciones = connection.query.mock.calls.filter(
      ([sql]) => sql.includes('UPDATE Producto')
    );

    expect(actualizaciones).toHaveLength(1);
  });

  test('debe generar alerta si el stock queda en el mínimo', async () => {
    configurarConsultas({
      productos: [
        {
          ...productoValido,
          stock_actual: 4,
          stock_minimo: 2,
        },
      ],
    });

    const res = await request(app)
      .post('/confirmar-venta')
      .send(bodyValido);

    expect(res.statusCode).toBe(201);
    expect(res.body.alertas_stock).toHaveLength(1);
  });

  test('debe usar cero como stock mínimo cuando es null', async () => {
    configurarConsultas({
      productos: [
        {
          ...productoValido,
          stock_actual: 2,
          stock_minimo: null,
        },
      ],
    });

    const res = await request(app)
      .post('/confirmar-venta')
      .send(bodyValido);

    expect(res.statusCode).toBe(201);
    expect(res.body.alertas_stock[0].stock_minimo).toBe(0);
  });

  test('debe ordenar productos por id antes de procesarlos', async () => {
    const producto11 = {
      ...productoValido,
      id_producto: 11,
      nombre: 'Lentes ópticos',
      precio_venta: 30000,
      stock_actual: 8,
      stock_minimo: 1,
      codigo_producto: 'PROD-011',
    };

    configurarConsultas({
      productos: [productoValido, producto11],
    });

    const res = await request(app)
      .post('/confirmar-venta')
      .send({
        ...bodyValido,
        productos: [
          { id_producto: 11, cantidad: 1 },
          { id_producto: 10, cantidad: 2 },
        ],
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.total).toBe(130000);

    const detalles = connection.query.mock.calls.filter(
      ([sql]) => sql.includes('INSERT INTO Detalle_venta')
    );

    expect(detalles).toHaveLength(2);
    expect(detalles[0][1][1]).toBe(10);
    expect(detalles[1][1][1]).toBe(11);
  });

  test('debe usar el estado predeterminado cuando no se envía estado', async () => {
    const res = await request(app)
      .post('/confirmar-venta')
      .send({
        id_cliente: 1,
        id_usuario: 2,
        productos: [
          { id_producto: 10, cantidad: 2 },
        ],
      });

    expect(res.statusCode).toBe(201);

    const consultaVenta = connection.query.mock.calls.find(
      ([sql]) => sql.includes('INSERT INTO Venta')
    );

    expect(consultaVenta).toBeDefined();
    expect(consultaVenta[1]).toContain('Confirmada');
  });
});

// =====================================================
// 3. TRANSACCIONES Y ERRORES
// =====================================================

describe('POST /confirmar-venta - Transacciones y errores', () => {

  test('debe retornar 500 si falla la conexión', async () => {
    pool.getConnection.mockRejectedValueOnce(
      new Error('Error de conexión')
    );

    const errorOriginal = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    try {
      const res = await request(app)
        .post('/confirmar-venta')
        .send(bodyValido);

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe(
        'Error interno al confirmar la venta'
      );
    } finally {
      errorOriginal.mockRestore();
    }
  });

  test('debe retornar 500 si falla beginTransaction', async () => {
    connection.beginTransaction.mockRejectedValueOnce(
      new Error('Error al iniciar transacción')
    );

    const errorOriginal = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    try {
      const res = await request(app)
        .post('/confirmar-venta')
        .send(bodyValido);

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe(
        'Error interno al confirmar la venta'
      );
      expect(connection.rollback).not.toHaveBeenCalled();
      expect(connection.release).toHaveBeenCalledTimes(1);
    } finally {
      errorOriginal.mockRestore();
    }
  });

  test('debe hacer rollback si falla una consulta SQL', async () => {
    connection.query.mockRejectedValueOnce(
      new Error('Error simulado en SQL')
    );

    const errorOriginal = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    try {
      const res = await request(app)
        .post('/confirmar-venta')
        .send(bodyValido);

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe(
        'Error interno al confirmar la venta'
      );
      expect(connection.rollback).toHaveBeenCalledTimes(1);
      expect(connection.commit).not.toHaveBeenCalled();
      expect(connection.release).toHaveBeenCalledTimes(1);
    } finally {
      errorOriginal.mockRestore();
    }
  });

  test('debe hacer rollback si falla commit', async () => {
    connection.commit.mockRejectedValueOnce(
      new Error('Error simulado en commit')
    );

    const errorOriginal = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    try {
      const res = await request(app)
        .post('/confirmar-venta')
        .send(bodyValido);

      expect(res.statusCode).toBe(500);
      expect(connection.rollback).toHaveBeenCalledTimes(1);
      expect(connection.release).toHaveBeenCalledTimes(1);
    } finally {
      errorOriginal.mockRestore();
    }
  });

  test('debe responder aunque falle rollback', async () => {
    configurarConsultas({ productos: [] });

    connection.rollback.mockRejectedValueOnce(
      new Error('Error simulado durante rollback')
    );

    const errorOriginal = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    try {
      const res = await request(app)
        .post('/confirmar-venta')
        .send(bodyValido);

      expect(res.statusCode).toBe(404);
      expect(connection.rollback).toHaveBeenCalledTimes(1);
      expect(connection.release).toHaveBeenCalledTimes(1);

      expect(errorOriginal).toHaveBeenCalledWith(
        'Error al revertir la transacción:',
        expect.any(Error)
      );
    } finally {
      errorOriginal.mockRestore();
    }
  });

  test('debe liberar la conexión después de una venta exitosa', async () => {
    const res = await request(app)
      .post('/confirmar-venta')
      .send(bodyValido);

    expect(res.statusCode).toBe(201);
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  test('debe liberar la conexión después de un error de producto', async () => {
    configurarConsultas({ productos: [] });

    const res = await request(app)
      .post('/confirmar-venta')
      .send(bodyValido);

    expect(res.statusCode).toBe(404);
    expect(connection.release).toHaveBeenCalledTimes(1);
  });
});

// =====================================================
// 4. MÉTODOS HTTP NO IMPLEMENTADOS
// =====================================================

describe('Métodos HTTP no implementados', () => {

  test('GET /confirmar-venta debe retornar 404', async () => {
    const res = await request(app)
      .get('/confirmar-venta');

    expect(res.statusCode).toBe(404);
  });

  test('PUT /confirmar-venta debe retornar 404', async () => {
    const res = await request(app)
      .put('/confirmar-venta')
      .send(bodyValido);

    expect(res.statusCode).toBe(404);
  });

  test('PATCH /confirmar-venta debe retornar 404', async () => {
    const res = await request(app)
      .patch('/confirmar-venta')
      .send(bodyValido);

    expect(res.statusCode).toBe(404);
  });

  test('DELETE /confirmar-venta debe retornar 404', async () => {
    const res = await request(app)
      .delete('/confirmar-venta');

    expect(res.statusCode).toBe(404);
  });
});
