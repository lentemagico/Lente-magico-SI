// backend/routes/__tests__/compras.test.js
import request from 'supertest';
import express from 'express';
import router from '../../Compras/compras.js';

// Simulamos el módulo de la base de datos
// OJO: la ruta debe apuntar al MISMO db.js que importa el router ('../../db.js' desde su carpeta)
jest.mock('../../../db.js');
import pool from '../../../db.js';

// App de Express mínima solo para las pruebas
const app = express();
app.use(express.json());
app.use('/compras', router);

// Conexión simulada: POST y PUT usan pool.getConnection() con transacciones
let connection;

// Encola respuestas, una por cada connection.query() que haga el router (en orden)
const encolar = (...respuestas) => {
    respuestas.forEach((r) => connection.query.mockResolvedValueOnce(r));
};

// Devuelve las llamadas a connection.query cuyo SQL contiene el fragmento indicado
const llamadasCon = (fragmento) =>
    connection.query.mock.calls.filter(([sql]) => sql.includes(fragmento));

describe('Pruebas de Caja Blanca - Compras', () => {

    beforeEach(() => {
        // Limpia llamadas Y colas de mockResolvedValueOnce entre pruebas
        pool.query.mockReset();

        // Conexión simulada con transacción para POST y PUT
        connection = {
            query: jest.fn(),
            beginTransaction: jest.fn().mockResolvedValue(),
            commit: jest.fn().mockResolvedValue(),
            rollback: jest.fn().mockResolvedValue(),
            release: jest.fn()
        };
        pool.getConnection = jest.fn().mockResolvedValue(connection);

        // Silencia console.error de los catch para no ensuciar la salida
        jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        console.error.mockRestore();
    });

    // --- GET / ---
    describe('GET /', () => {
        test('debe retornar compras con su detalle anidado y campos mapeados', async () => {
            pool.query
                .mockResolvedValueOnce([[
                    { id_compra: 1, idProveedor: 'Proveedor A', fecha_compra: '2026-01-10', num_comprobante: 'F-001' },
                    { id_compra: 2, idProveedor: 'Proveedor B', fecha_compra: '2026-01-11', num_comprobante: 'F-002' }
                ]])
                .mockResolvedValueOnce([[{ nombreProducto: 'Montura', cantidad: 3, costo_unitario: 50 }]])
                .mockResolvedValueOnce([[]]); // la compra 2 no tiene detalle

            const res = await request(app).get('/compras');

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveLength(2);

            // Mapeo de campos de la BD a los que espera el frontend
            expect(res.body[0].id).toBe(1);
            expect(res.body[0].fechaCompra).toBe('2026-01-10');
            expect(res.body[0].numComprobante).toBe('F-001');
            expect(res.body[0].detalle).toEqual([
                { nombreProducto: 'Montura', cantidad: 3, costoUnitario: 50 }
            ]);
            expect(res.body[1].detalle).toEqual([]);

            // 1 consulta de compras + 1 de detalle por cada compra
            expect(pool.query).toHaveBeenCalledTimes(3);
            expect(pool.query.mock.calls[1][1]).toEqual([1]);
            expect(pool.query.mock.calls[2][1]).toEqual([2]);
        });

        test('debe retornar lista vacía si no hay compras', async () => {
            pool.query.mockResolvedValueOnce([[]]);

            const res = await request(app).get('/compras');

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual([]);
            expect(pool.query).toHaveBeenCalledTimes(1); // No consulta detalles
        });

        test('debe capturar error de BD y retornar 500', async () => {
            pool.query.mockRejectedValueOnce(new Error('Fallo'));

            const res = await request(app).get('/compras');

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Error al obtener compras');
        });
    });

    // --- GET /:id ---
    describe('GET /:id', () => {
        test('debe retornar 404 si la compra no existe', async () => {
            pool.query.mockResolvedValueOnce([[]]);

            const res = await request(app).get('/compras/999');

            expect(res.statusCode).toBe(404);
            expect(res.body.error).toBe('Compra no encontrada');
        });

        test('debe retornar la compra si existe', async () => {
            pool.query.mockResolvedValueOnce([[{ id_compra: 1, num_comprobante: 'F-001' }]]);

            const res = await request(app).get('/compras/1');

            expect(res.statusCode).toBe(200);
            expect(res.body.id_compra).toBe(1);
            expect(pool.query.mock.calls[0][1]).toEqual(['1']);
        });

        test('debe capturar error de BD y retornar 500', async () => {
            pool.query.mockRejectedValueOnce(new Error('Fallo'));

            const res = await request(app).get('/compras/1');

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Error al obtener la compra');
        });
    });

    // --- POST / ---
    describe('POST /', () => {
        const body = {
            idProveedor: 'Proveedor A',
            fechaCompra: '2026-01-10',
            numComprobante: 'F-001',
            estado: 'Completada',
            detalle: [{ nombreProducto: 'Montura', cantidad: 10, costoUnitario: 25 }]
        };

        // Validaciones (no deben tocar la BD)
        test('debe rechazar si falta un campo obligatorio', async () => {
            const { idProveedor, ...incompleto } = body;

            const res = await request(app).post('/compras').send(incompleto);

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Faltan campos obligatorios o el detalle está vacío');
            expect(pool.getConnection).not.toHaveBeenCalled();
        });

        test('debe rechazar si el detalle está vacío', async () => {
            const res = await request(app).post('/compras').send({ ...body, detalle: [] });

            expect(res.statusCode).toBe(400);
            expect(pool.getConnection).not.toHaveBeenCalled();
        });

        test('debe rechazar si el detalle no es un arreglo', async () => {
            const res = await request(app).post('/compras').send({ ...body, detalle: 'no-es-arreglo' });

            expect(res.statusCode).toBe(400);
            expect(pool.getConnection).not.toHaveBeenCalled();
        });

        // Proveedor
        test('debe retornar 400 y hacer rollback si el proveedor no existe', async () => {
            encolar([[]]); // SELECT proveedor vacío

            const res = await request(app).post('/compras').send(body);

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toContain('Proveedor A');
            expect(connection.rollback).toHaveBeenCalledTimes(1);
            expect(connection.commit).not.toHaveBeenCalled();
            expect(connection.release).toHaveBeenCalledTimes(1);
        });

        // Flujos exitosos
        test('debe crear la compra y sumar stock a un producto existente', async () => {
            encolar(
                [[{ id_proveedor: 7 }]],                         // SELECT proveedor
                [{ insertId: 10 }],                              // INSERT Compra
                [[{ id_categoria: 1 }]],                         // SELECT categoría por defecto
                [[{ id_producto: 3, stock_actual: 5 }]],         // SELECT producto (existe)
                [{ affectedRows: 1 }],                           // UPDATE stock
                [{ affectedRows: 1 }]                            // INSERT Detalle_compra
            );

            const res = await request(app).post('/compras').send(body);

            expect(res.statusCode).toBe(201);
            expect(res.body.id).toBe(10);
            expect(res.body.estado).toBe('Completada');

            // Stock: 5 + 10 = 15
            const update = llamadasCon('UPDATE Producto SET stock_actual');
            expect(update).toHaveLength(1);
            expect(update[0][1]).toEqual([15, 3]);

            // Detalle insertado con los valores correctos
            const detalle = llamadasCon('INSERT INTO Detalle_compra');
            expect(detalle[0][1]).toEqual([10, 3, 10, 25]);

            // Transacción completa
            expect(connection.beginTransaction).toHaveBeenCalledTimes(1);
            expect(connection.commit).toHaveBeenCalledTimes(1);
            expect(connection.rollback).not.toHaveBeenCalled();
            expect(connection.release).toHaveBeenCalledTimes(1);
        });

        test('debe crear el producto si no existe, con stock inicial igual a la cantidad', async () => {
            encolar(
                [[{ id_proveedor: 7 }]],
                [{ insertId: 10 }],
                [[{ id_categoria: 2 }]],
                [[]],                                            // SELECT producto (no existe)
                [{ insertId: 20 }],                              // INSERT Producto
                [{ affectedRows: 1 }]                            // INSERT Detalle_compra
            );

            const res = await request(app).post('/compras').send(body);

            expect(res.statusCode).toBe(201);

            const insertProducto = llamadasCon('INSERT INTO Producto');
            expect(insertProducto).toHaveLength(1);
            const params = insertProducto[0][1];
            expect(params[0]).toBe(2);                           // id_categoria por defecto
            expect(params[1]).toMatch(/^PRD-/);                  // codigo_producto generado
            expect(params[2]).toBe('Montura');                   // nombre
            expect(params[4]).toBe(25);                          // precio_venta = costo unitario
            expect(params[6]).toBe(10);                          // stock_actual = cantidad
            expect(llamadasCon('UPDATE Producto SET stock_actual')).toHaveLength(0);

            // El detalle usa el id del producto recién creado
            expect(llamadasCon('INSERT INTO Detalle_compra')[0][1]).toEqual([10, 20, 10, 25]);
        });

        test('debe crear el producto sin categoría (null) si no hay categorías', async () => {
            encolar(
                [[{ id_proveedor: 7 }]],
                [{ insertId: 10 }],
                [[]],                                            // no hay categorías
                [[]],                                            // producto no existe
                [{ insertId: 20 }],
                [{ affectedRows: 1 }]
            );

            const res = await request(app).post('/compras').send(body);

            expect(res.statusCode).toBe(201);
            expect(llamadasCon('INSERT INTO Producto')[0][1][0]).toBeNull();
        });

        test('con estado Anulada no debe modificar el stock', async () => {
            encolar(
                [[{ id_proveedor: 7 }]],
                [{ insertId: 10 }],
                [[{ id_categoria: 1 }]],
                [[{ id_producto: 3, stock_actual: 5 }]],
                [{ affectedRows: 1 }]                            // INSERT Detalle_compra
            );

            const res = await request(app).post('/compras').send({ ...body, estado: 'Anulada' });

            expect(res.statusCode).toBe(201);
            expect(llamadasCon('UPDATE Producto SET stock_actual')).toHaveLength(0);
            expect(llamadasCon('INSERT INTO Detalle_compra')).toHaveLength(1);
        });

        test('con producto nuevo y estado Anulada debe crearlo con stock 0', async () => {
            encolar(
                [[{ id_proveedor: 7 }]],
                [{ insertId: 10 }],
                [[{ id_categoria: 1 }]],
                [[]],
                [{ insertId: 20 }],
                [{ affectedRows: 1 }]
            );

            await request(app).post('/compras').send({ ...body, estado: 'Anulada' });

            expect(llamadasCon('INSERT INTO Producto')[0][1][6]).toBe(0);
        });

        test('sin estado debe guardar la compra como Pendiente', async () => {
            const { estado, ...sinEstado } = body;
            encolar(
                [[{ id_proveedor: 7 }]],
                [{ insertId: 10 }],
                [[{ id_categoria: 1 }]],
                [[{ id_producto: 3, stock_actual: 0 }]],
                [{ affectedRows: 1 }],
                [{ affectedRows: 1 }]
            );

            const res = await request(app).post('/compras').send(sinEstado);

            expect(res.statusCode).toBe(201);
            expect(res.body.estado).toBe('Pendiente');
            expect(llamadasCon('INSERT INTO Compra')[0][1][3]).toBe('Pendiente');
        });

        // Errores
        test('debe retornar 400 si Producto.id_categoria no permite NULL (ER_BAD_NULL_ERROR)', async () => {
            const errorNull = Object.assign(new Error('Column cannot be null'), { code: 'ER_BAD_NULL_ERROR' });
            connection.query
                .mockResolvedValueOnce([[{ id_proveedor: 7 }]])
                .mockResolvedValueOnce([{ insertId: 10 }])
                .mockResolvedValueOnce([[]])                     // sin categorías
                .mockResolvedValueOnce([[]])                     // producto no existe
                .mockRejectedValueOnce(errorNull);               // INSERT Producto falla

            const res = await request(app).post('/compras').send(body);

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toContain('ALTER TABLE Producto MODIFY id_categoria INT NULL');
            expect(connection.rollback).toHaveBeenCalledTimes(1);
            expect(connection.release).toHaveBeenCalledTimes(1);
        });

        test('debe hacer rollback y retornar 500 ante un error de BD', async () => {
            connection.query.mockRejectedValueOnce(new Error('Fallo'));

            const res = await request(app).post('/compras').send(body);

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Error al crear la compra en la base de datos');
            expect(connection.rollback).toHaveBeenCalledTimes(1);
            expect(connection.commit).not.toHaveBeenCalled();
            expect(connection.release).toHaveBeenCalledTimes(1); // libera la conexión siempre
        });
    });

    // --- PUT /:id ---
    describe('PUT /:id', () => {
        const body = {
            idProveedor: 'Proveedor A',
            fechaCompra: '2026-01-10',
            numComprobante: 'F-001',
            estado: 'Completada',
            detalle: [{ nombreProducto: 'Montura', cantidad: 8, costoUnitario: 30 }]
        };

        // Validaciones
        test('debe rechazar si faltan campos obligatorios', async () => {
            const res = await request(app).put('/compras/1').send({ idProveedor: 'X' });

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Faltan campos obligatorios o el detalle está vacío');
            expect(pool.getConnection).not.toHaveBeenCalled();
        });

        test('debe rechazar si el detalle está vacío', async () => {
            const res = await request(app).put('/compras/1').send({ ...body, detalle: [] });

            expect(res.statusCode).toBe(400);
            expect(pool.getConnection).not.toHaveBeenCalled();
        });

        test('debe retornar 404 y hacer rollback si la compra no existe', async () => {
            encolar([[]]); // SELECT compra vacío

            const res = await request(app).put('/compras/999').send(body);

            expect(res.statusCode).toBe(404);
            expect(res.body.error).toBe('Compra no encontrada');
            expect(connection.rollback).toHaveBeenCalledTimes(1);
            expect(connection.release).toHaveBeenCalledTimes(1);
        });

        test('debe retornar 400 y hacer rollback si el proveedor no existe', async () => {
            encolar(
                [[{ id_compra: 1, estado: 'Pendiente' }]],
                [[]]                                             // proveedor no existe
            );

            const res = await request(app).put('/compras/1').send(body);

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toContain('Proveedor A');
            expect(connection.rollback).toHaveBeenCalledTimes(1);
            expect(connection.commit).not.toHaveBeenCalled();
        });

        // Flujos exitosos
        test('debe restaurar el stock anterior y aplicar el nuevo detalle', async () => {
            encolar(
                [[{ id_compra: 1, estado: 'Pendiente' }]],       // SELECT compra
                [[{ id_proveedor: 7 }]],                         // SELECT proveedor
                [{ affectedRows: 1 }],                           // UPDATE Compra
                [[{ id_producto: 3, cantidad: 4 }]],             // SELECT detalle anterior
                [{ affectedRows: 1 }],                           // DELETE detalle
                [[{ stock_actual: 10 }]],                        // SELECT stock (restauración)
                [{ affectedRows: 1 }],                           // UPDATE stock restaurado
                [[{ id_producto: 3, stock_actual: 6 }]],         // SELECT producto (nuevo detalle)
                [{ affectedRows: 1 }],                           // UPDATE stock nuevo
                [{ affectedRows: 1 }]                            // INSERT Detalle_compra
            );

            const res = await request(app).put('/compras/1').send(body);

            expect(res.statusCode).toBe(200);
            expect(res.body.mensaje).toBe('Compra actualizada correctamente');
            expect(res.body.id).toBe(1);

            const updates = llamadasCon('UPDATE Producto SET stock_actual');
            expect(updates).toHaveLength(2);
            expect(updates[0][1]).toEqual([6, 3]);               // restaura: 10 - 4
            expect(updates[1][1]).toEqual([14, 3]);              // aplica:    6 + 8

            expect(llamadasCon('INSERT INTO Detalle_compra')[0][1]).toEqual(['1', 3, 8, 30]); // el id viene de req.params, por eso es string
            expect(connection.commit).toHaveBeenCalledTimes(1);
            expect(connection.rollback).not.toHaveBeenCalled();
            expect(connection.release).toHaveBeenCalledTimes(1);
        });

        test('al restaurar, el stock nunca debe quedar por debajo de 0', async () => {
            encolar(
                [[{ id_compra: 1, estado: 'Pendiente' }]],
                [[{ id_proveedor: 7 }]],
                [{ affectedRows: 1 }],
                [[{ id_producto: 3, cantidad: 5 }]],
                [{ affectedRows: 1 }],
                [[{ stock_actual: 2 }]],                         // 2 - 5 = -3 → debe quedar en 0
                [{ affectedRows: 1 }],
                [[{ id_producto: 3, stock_actual: 0 }]],
                [{ affectedRows: 1 }]                            // INSERT Detalle_compra (Anulada: sin UPDATE)
            );

            const res = await request(app).put('/compras/1').send({ ...body, estado: 'Anulada' });

            expect(res.statusCode).toBe(200);
            expect(llamadasCon('UPDATE Producto SET stock_actual')[0][1]).toEqual([0, 3]);
        });

        test('si la compra anterior estaba Anulada no debe restaurar stock', async () => {
            encolar(
                [[{ id_compra: 1, estado: 'Anulada' }]],
                [[{ id_proveedor: 7 }]],
                [{ affectedRows: 1 }],
                [[{ id_producto: 3, cantidad: 4 }]],
                [{ affectedRows: 1 }],
                // Sin SELECT/UPDATE de restauración
                [[{ id_producto: 3, stock_actual: 10 }]],
                [{ affectedRows: 1 }],                           // UPDATE stock nuevo
                [{ affectedRows: 1 }]                            // INSERT Detalle_compra
            );

            const res = await request(app).put('/compras/1').send(body);

            expect(res.statusCode).toBe(200);
            const updates = llamadasCon('UPDATE Producto SET stock_actual');
            expect(updates).toHaveLength(1);                     // solo el del nuevo detalle
            expect(updates[0][1]).toEqual([18, 3]);              // 10 + 8
        });

        test('con estado nuevo Anulada no debe sumar stock del nuevo detalle', async () => {
            encolar(
                [[{ id_compra: 1, estado: 'Anulada' }]],
                [[{ id_proveedor: 7 }]],
                [{ affectedRows: 1 }],
                [[]],                                            // sin detalle anterior
                [{ affectedRows: 1 }],
                [[{ id_producto: 3, stock_actual: 10 }]],
                [{ affectedRows: 1 }]                            // INSERT Detalle_compra
            );

            const res = await request(app).put('/compras/1').send({ ...body, estado: 'Anulada' });

            expect(res.statusCode).toBe(200);
            expect(llamadasCon('UPDATE Producto SET stock_actual')).toHaveLength(0);
        });

        test('debe crear el producto si no existe en el nuevo detalle', async () => {
            encolar(
                [[{ id_compra: 1, estado: 'Pendiente' }]],
                [[{ id_proveedor: 7 }]],
                [{ affectedRows: 1 }],
                [[]],                                            // sin detalle anterior
                [{ affectedRows: 1 }],
                [[]],                                            // producto no existe
                [[{ id_categoria: 2 }]],                         // categoría por defecto
                [{ insertId: 30 }],                              // INSERT Producto
                [{ affectedRows: 1 }]                            // INSERT Detalle_compra
            );

            const res = await request(app).put('/compras/1').send(body);

            expect(res.statusCode).toBe(200);
            const params = llamadasCon('INSERT INTO Producto')[0][1];
            expect(params[0]).toBe(2);
            expect(params[2]).toBe('Montura');
            expect(params[6]).toBe(8);                           // stock = cantidad
            expect(llamadasCon('INSERT INTO Detalle_compra')[0][1]).toEqual(['1', 30, 8, 30]); // el id viene de req.params, por eso es string
        });

        test('debe omitir las líneas sin nombre de producto', async () => {
            encolar(
                [[{ id_compra: 1, estado: 'Pendiente' }]],
                [[{ id_proveedor: 7 }]],
                [{ affectedRows: 1 }],
                [[]],
                [{ affectedRows: 1 }]
            );

            const res = await request(app).put('/compras/1').send({
                ...body,
                detalle: [{ nombreProducto: '   ', cantidad: 1, costoUnitario: 1 }]
            });

            expect(res.statusCode).toBe(200);
            expect(llamadasCon('INSERT INTO Detalle_compra')).toHaveLength(0);
            expect(connection.commit).toHaveBeenCalledTimes(1);
        });

        // Errores
        test('debe hacer rollback y retornar 500 ante un error de BD', async () => {
            connection.query.mockRejectedValueOnce(new Error('Fallo de conexión'));

            const res = await request(app).put('/compras/1').send(body);

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Error al actualizar la compra en la base de datos');
            expect(res.body.detalle).toBe('Fallo de conexión');
            expect(connection.rollback).toHaveBeenCalledTimes(1);
            expect(connection.commit).not.toHaveBeenCalled();
            expect(connection.release).toHaveBeenCalledTimes(1);
        });
    });

    // --- DELETE /:id ---
    describe('DELETE /:id', () => {
        test('debe retornar 404 si la compra no existe', async () => {
            pool.query.mockResolvedValueOnce([[]]);

            const res = await request(app).delete('/compras/999');

            expect(res.statusCode).toBe(404);
            expect(res.body.error).toBe('Compra no encontrada');
            expect(pool.query).toHaveBeenCalledTimes(1); // No debe llegar a los DELETE
        });

        test('debe eliminar primero el detalle y luego la compra', async () => {
            const existente = { id_compra: 1, num_comprobante: 'F-001' };
            pool.query
                .mockResolvedValueOnce([[existente]])            // SELECT existe
                .mockResolvedValueOnce([{ affectedRows: 2 }])    // DELETE Detalle_compra
                .mockResolvedValueOnce([{ affectedRows: 1 }]);   // DELETE Compra

            const res = await request(app).delete('/compras/1');

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(existente);
            expect(pool.query).toHaveBeenCalledTimes(3);
            // El orden importa por la llave foránea: hijo (detalle) antes que padre (compra)
            expect(pool.query.mock.calls[1][0]).toContain('DELETE FROM Detalle_compra');
            expect(pool.query.mock.calls[2][0]).toContain('DELETE FROM Compra');
        });

        test('debe capturar error de BD y retornar 500', async () => {
            pool.query.mockRejectedValueOnce(new Error('Fallo'));

            const res = await request(app).delete('/compras/1');

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Error al eliminar la compra');
        });
    });
});