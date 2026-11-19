// backend/routes/__tests__/productos.test.js
import request from 'supertest';
import express from 'express';
import router from '../../Bodega/productos.js';

// Simulamos el módulo de la base de datos.
// OJO: la ruta debe apuntar al MISMO db.js que importa el router ('../../db.js' desde su carpeta).
// Se usa una fábrica explícita para exponer query y getConnection (este último lo usa el POST).
jest.mock('../../../db.js', () => ({
    __esModule: true,
    default: {
        query: jest.fn(),
        getConnection: jest.fn()
    }
}));
import pool from '../../../db.js';

// App de Express mínima solo para las pruebas
const app = express();
app.use(express.json());
app.use('/productos', router);

describe('Pruebas de Caja Blanca - Productos', () => {

    beforeEach(() => {
        // Limpia llamadas Y colas de mockResolvedValueOnce entre pruebas
        pool.query.mockReset();
        pool.getConnection.mockReset();
        // Silencia console.error de los catch para no ensuciar la salida
        jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        console.error.mockRestore();
    });

    // --- GET / ---
    describe('GET /', () => {
        test('debe retornar todos los productos con el nombre de su categoría', async () => {
            const filas = [
                { id: 2, codigo_producto: 'PRD-2', nombre: 'Lente', categoria: 'Lentes', stock_actual: 5 },
                { id: 1, codigo_producto: 'PRD-1', nombre: 'Montura', categoria: 'Monturas', stock_actual: 10 }
            ];
            pool.query.mockResolvedValueOnce([filas]);

            const res = await request(app).get('/productos');

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveLength(2);
            expect(res.body[0].categoria).toBe('Lentes');
            expect(pool.query).toHaveBeenCalledTimes(1);
            // Verifica el JOIN con la categoría y el orden descendente por id
            const sql = pool.query.mock.calls[0][0];
            expect(sql).toContain('LEFT JOIN Cat_producto');
            expect(sql).toContain('ORDER BY p.id_producto DESC');
            // Sin filtros: ni WHERE ni LIMIT, y sin parámetros
            expect(sql).not.toContain('WHERE');
            expect(sql).not.toContain('LIMIT');
            expect(pool.query.mock.calls[0][1]).toEqual([]);
        });

        test('debe retornar lista vacía si no hay productos', async () => {
            pool.query.mockResolvedValueOnce([[]]);

            const res = await request(app).get('/productos');

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual([]);
        });

        test('debe filtrar por nombre o código cuando viene ?search=', async () => {
            pool.query.mockResolvedValueOnce([[{ id: 1, nombre: 'Lente' }]]);

            const res = await request(app).get('/productos?search=lente');

            expect(res.statusCode).toBe(200);
            const sql = pool.query.mock.calls[0][0];
            expect(sql).toContain('WHERE (p.nombre LIKE ? OR p.codigo_producto LIKE ?)');
            // Parametrizado: el texto va en los parámetros, no concatenado en el SQL
            expect(pool.query.mock.calls[0][1]).toEqual(['%lente%', '%lente%']);
            expect(sql).not.toContain('lente');
        });

        test('debe recortar los espacios del texto de búsqueda', async () => {
            pool.query.mockResolvedValueOnce([[]]);

            await request(app).get('/productos?search=%20%20lente%20');

            expect(pool.query.mock.calls[0][1]).toEqual(['%lente%', '%lente%']);
        });

        test('debe ignorar ?search= si solo contiene espacios', async () => {
            pool.query.mockResolvedValueOnce([[]]);

            await request(app).get('/productos?search=%20%20%20');

            const sql = pool.query.mock.calls[0][0];
            expect(sql).not.toContain('WHERE');
            expect(pool.query.mock.calls[0][1]).toEqual([]);
        });

        test('debe aplicar LIMIT cuando ?limit= es un número válido', async () => {
            pool.query.mockResolvedValueOnce([[]]);

            await request(app).get('/productos?limit=5');

            expect(pool.query.mock.calls[0][0]).toContain('LIMIT 5');
        });

        test('debe limitar el máximo a 100 aunque ?limit= sea mayor', async () => {
            pool.query.mockResolvedValueOnce([[]]);

            await request(app).get('/productos?limit=500');

            const sql = pool.query.mock.calls[0][0];
            expect(sql).toContain('LIMIT 100');
            expect(sql).not.toContain('LIMIT 500');
        });

        test.each([['abc'], ['0'], ['-3']])(
            'debe ignorar ?limit=%s por no ser un entero positivo',
            async (valor) => {
                pool.query.mockResolvedValueOnce([[]]);

                await request(app).get(`/productos?limit=${valor}`);

                expect(pool.query.mock.calls[0][0]).not.toContain('LIMIT');
            }
        );

        test('debe combinar ?search= y ?limit= en la misma consulta', async () => {
            pool.query.mockResolvedValueOnce([[]]);

            await request(app).get('/productos?search=marco&limit=10');

            const sql = pool.query.mock.calls[0][0];
            expect(sql).toContain('WHERE (p.nombre LIKE ? OR p.codigo_producto LIKE ?)');
            expect(sql).toContain('LIMIT 10');
            expect(pool.query.mock.calls[0][1]).toEqual(['%marco%', '%marco%']);
        });

        test('debe capturar error de BD y retornar 500', async () => {
            pool.query.mockRejectedValueOnce(new Error('Fallo de conexión'));

            const res = await request(app).get('/productos');

            expect(res.statusCode).toBe(500);
            expect(res.body.mensaje).toBe('Error al consultar los productos');
            expect(res.body.error).toBe('Fallo de conexión');
        });
    });

    // --- GET /:id ---
    describe('GET /:id', () => {
        test('debe retornar 404 si el producto no existe', async () => {
            pool.query.mockResolvedValueOnce([[]]);

            const res = await request(app).get('/productos/999');

            expect(res.statusCode).toBe(404);
            expect(res.body.mensaje).toBe('Producto no encontrado');
            expect(pool.query.mock.calls[0][1]).toEqual(['999']);
        });

        test('debe retornar el producto con su categoría', async () => {
            const fila = { id: 1, codigo_producto: '1000001', nombre: 'Montura', id_categoria: 4, categoria: 'Monturas' };
            pool.query.mockResolvedValueOnce([[fila]]);

            const res = await request(app).get('/productos/1');

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(fila);
            const sql = pool.query.mock.calls[0][0];
            expect(sql).toContain('LEFT JOIN Cat_producto');
            expect(sql).toContain('WHERE p.id_producto = ?');
            expect(pool.query.mock.calls[0][1]).toEqual(['1']);
        });

        test('debe capturar error de BD y retornar 500', async () => {
            pool.query.mockRejectedValueOnce(new Error('Fallo'));

            const res = await request(app).get('/productos/1');

            expect(res.statusCode).toBe(500);
            expect(res.body.mensaje).toBe('Error al obtener el producto');
            expect(res.body.error).toBe('Fallo');
        });
    });

    // --- POST / ---
    describe('POST /', () => {
        let conexion;

        beforeEach(() => {
            // Conexión simulada para la transacción (el POST usa pool.getConnection)
            conexion = {
                beginTransaction: jest.fn().mockResolvedValue(undefined),
                query: jest.fn(),
                commit: jest.fn().mockResolvedValue(undefined),
                rollback: jest.fn().mockResolvedValue(undefined),
                release: jest.fn()
            };
            pool.getConnection.mockResolvedValue(conexion);
        });

        test('debe retornar 400 si falta el nombre', async () => {
            const res = await request(app).post('/productos').send({ precio_venta: 100 });

            expect(res.statusCode).toBe(400);
            expect(res.body.mensaje).toBe('Los campos nombre y precio_venta son obligatorios');
            // Falla la validación: ni siquiera se abre conexión
            expect(pool.getConnection).not.toHaveBeenCalled();
        });

        test('debe retornar 400 si el nombre solo tiene espacios', async () => {
            const res = await request(app).post('/productos').send({ nombre: '   ', precio_venta: 100 });

            expect(res.statusCode).toBe(400);
            expect(pool.getConnection).not.toHaveBeenCalled();
        });

        test('debe retornar 400 si falta precio_venta', async () => {
            const res = await request(app).post('/productos').send({ nombre: 'Montura' });

            expect(res.statusCode).toBe(400);
            expect(res.body.mensaje).toBe('Los campos nombre y precio_venta son obligatorios');
            expect(pool.getConnection).not.toHaveBeenCalled();
        });

        test('debe retornar 400 si precio_venta es null', async () => {
            const res = await request(app).post('/productos').send({ nombre: 'Montura', precio_venta: null });

            expect(res.statusCode).toBe(400);
            expect(pool.getConnection).not.toHaveBeenCalled();
        });

        test('debe aceptar precio_venta = 0 (no es undefined ni null)', async () => {
            conexion.query
                .mockResolvedValueOnce([[{ siguiente: 1000001 }]])
                .mockResolvedValueOnce([{ insertId: 1 }]);
            pool.query.mockResolvedValueOnce([[{ id_producto: 1, precio_venta: 0 }]]);

            const res = await request(app).post('/productos').send({ nombre: 'Regalo', precio_venta: 0 });

            expect(res.statusCode).toBe(201);
        });

        test('debe crear el producto con código automático y retornar 201', async () => {
            const creado = { id_producto: 7, codigo_producto: '1000001', nombre: 'Montura' };
            conexion.query
                .mockResolvedValueOnce([[{ siguiente: 1000001 }]]) // SELECT siguiente código
                .mockResolvedValueOnce([{ insertId: 7 }]);         // INSERT
            pool.query.mockResolvedValueOnce([[creado]]);          // SELECT del producto creado

            const res = await request(app).post('/productos').send({
                id_categoria: 4,
                nombre: '  Montura  ',
                precio_venta: 100
            });

            expect(res.statusCode).toBe(201);
            expect(res.body).toEqual(creado);

            // Consulta del siguiente código: solo códigos numéricos y bloqueo de fila
            const sqlCodigo = conexion.query.mock.calls[0][0];
            expect(sqlCodigo).toContain("REGEXP '^[0-9]+$'");
            expect(sqlCodigo).toContain('FOR UPDATE');

            // INSERT: nombre recortado, código como texto y valores por defecto en los opcionales
            const sqlInsert = conexion.query.mock.calls[1][0];
            expect(sqlInsert).toContain('INSERT INTO Producto');
            expect(conexion.query.mock.calls[1][1]).toEqual([4, '1000001', 'Montura', '', 100, 'Activo', 0, 0]);

            // El producto recién creado se consulta con el insertId real
            expect(pool.query).toHaveBeenCalledTimes(1);
            expect(pool.query.mock.calls[0][1]).toEqual([7]);

            // Flujo transaccional correcto
            expect(conexion.beginTransaction).toHaveBeenCalledTimes(1);
            expect(conexion.commit).toHaveBeenCalledTimes(1);
            expect(conexion.rollback).not.toHaveBeenCalled();
            expect(conexion.release).toHaveBeenCalledTimes(1);
            expect(conexion.beginTransaction.mock.invocationCallOrder[0])
                .toBeLessThan(conexion.query.mock.invocationCallOrder[0]);
            expect(conexion.commit.mock.invocationCallOrder[0])
                .toBeGreaterThan(conexion.query.mock.invocationCallOrder[1]);
        });

        test('debe usar el siguiente código calculado por la BD (7 dígitos)', async () => {
            conexion.query
                .mockResolvedValueOnce([[{ siguiente: 1000015 }]])
                .mockResolvedValueOnce([{ insertId: 15 }]);
            pool.query.mockResolvedValueOnce([[{ id_producto: 15 }]]);

            await request(app).post('/productos').send({ nombre: 'Lente', precio_venta: 50 });

            expect(conexion.query.mock.calls[1][1][1]).toBe('1000015');
        });

        test('debe respetar los campos opcionales cuando sí llegan', async () => {
            conexion.query
                .mockResolvedValueOnce([[{ siguiente: 1000001 }]])
                .mockResolvedValueOnce([{ insertId: 2 }]);
            pool.query.mockResolvedValueOnce([[{ id_producto: 2 }]]);

            await request(app).post('/productos').send({
                id_categoria: 2,
                nombre: 'Lente',
                descripcion: 'Lente blanco',
                precio_venta: 80,
                estado: 'Inactivo',
                stock_actual: 5,
                stock_minimo: 2
            });

            expect(conexion.query.mock.calls[1][1])
                .toEqual([2, '1000001', 'Lente', 'Lente blanco', 80, 'Inactivo', 5, 2]);
        });

        test('debe enviar id_categoria null si no llega', async () => {
            conexion.query
                .mockResolvedValueOnce([[{ siguiente: 1000001 }]])
                .mockResolvedValueOnce([{ insertId: 3 }]);
            pool.query.mockResolvedValueOnce([[{ id_producto: 3 }]]);

            await request(app).post('/productos').send({ nombre: 'Sin categoría', precio_venta: 10 });

            expect(conexion.query.mock.calls[1][1][0]).toBeNull();
        });

        test('debe retornar 409 si el código está duplicado (ER_DUP_ENTRY)', async () => {
            conexion.query
                .mockResolvedValueOnce([[{ siguiente: 1000001 }]])
                .mockRejectedValueOnce(Object.assign(new Error('Duplicado'), { code: 'ER_DUP_ENTRY' }));

            const res = await request(app).post('/productos').send({ nombre: 'Montura', precio_venta: 100 });

            expect(res.statusCode).toBe(409);
            expect(res.body.mensaje).toBe('Ya existe un producto con ese código');
            expect(conexion.rollback).toHaveBeenCalledTimes(1);
            expect(conexion.commit).not.toHaveBeenCalled();
            expect(conexion.release).toHaveBeenCalledTimes(1);
        });

        test.each([['ER_NO_REFERENCED_ROW_2'], ['ER_NO_REFERENCED_ROW']])(
            'debe retornar 400 si la categoría no existe (%s)',
            async (codigo) => {
                conexion.query
                    .mockResolvedValueOnce([[{ siguiente: 1000001 }]])
                    .mockRejectedValueOnce(Object.assign(new Error('FK'), { code: codigo }));

                const res = await request(app).post('/productos').send({
                    id_categoria: 999,
                    nombre: 'Montura',
                    precio_venta: 100
                });

                expect(res.statusCode).toBe(400);
                expect(res.body.mensaje).toBe('La categoría indicada no existe');
                expect(conexion.rollback).toHaveBeenCalledTimes(1);
                expect(conexion.release).toHaveBeenCalledTimes(1);
            }
        );

        test('debe retornar 500 ante otro error de BD y liberar la conexión', async () => {
            conexion.query.mockRejectedValueOnce(new Error('Fallo'));

            const res = await request(app).post('/productos').send({ nombre: 'Montura', precio_venta: 100 });

            expect(res.statusCode).toBe(500);
            expect(res.body.mensaje).toBe('Error al crear producto');
            expect(res.body.error).toBe('Fallo');
            expect(conexion.rollback).toHaveBeenCalledTimes(1);
            expect(conexion.release).toHaveBeenCalledTimes(1);
        });

        test('debe responder 500 aunque falle el rollback (se ignora ese error)', async () => {
            conexion.query.mockRejectedValueOnce(new Error('Fallo'));
            conexion.rollback.mockRejectedValueOnce(new Error('Rollback falló'));

            const res = await request(app).post('/productos').send({ nombre: 'Montura', precio_venta: 100 });

            expect(res.statusCode).toBe(500);
            expect(res.body.mensaje).toBe('Error al crear producto');
            expect(conexion.release).toHaveBeenCalledTimes(1);
        });
    });

    // --- PUT /:id ---
    describe('PUT /:id', () => {
        const body = {
            nombre: 'Montura editada',
            id_categoria: 4,
            precio_venta: 120,
            stock_actual: 15,
            stock_minimo: 3
        };

        test('debe retornar 404 si el producto no existe', async () => {
            pool.query.mockResolvedValueOnce([{ affectedRows: 0 }]); // UPDATE sin filas afectadas

            const res = await request(app).put('/productos/999').send(body);

            expect(res.statusCode).toBe(404);
            expect(res.body.mensaje).toBe('Producto no encontrado');
            expect(pool.query).toHaveBeenCalledTimes(1); // No debe llegar al SELECT final
        });

        test('debe actualizar el producto y retornarlo con su categoría', async () => {
            const actualizado = { id: 1, nombre: 'Montura editada', id_categoria: 4, categoria: 'Monturas' };
            pool.query
                .mockResolvedValueOnce([{ affectedRows: 1 }])  // UPDATE OK
                .mockResolvedValueOnce([[actualizado]]);       // SELECT del producto actualizado

            const res = await request(app).put('/productos/1').send(body);

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(actualizado);
            expect(pool.query).toHaveBeenCalledTimes(2);
            // Parámetros del UPDATE (el id va al final por el WHERE)
            expect(pool.query.mock.calls[0][0]).toContain('UPDATE Producto');
            expect(pool.query.mock.calls[0][1]).toEqual([4, 'Montura editada', 120, 15, 3, '1']);
            // El SELECT posterior trae el nombre de la categoría
            expect(pool.query.mock.calls[1][0]).toContain('LEFT JOIN Cat_producto');
            expect(pool.query.mock.calls[1][1]).toEqual(['1']);
        });

        test('debe enviar id_categoria null si no llega en el body', async () => {
            pool.query
                .mockResolvedValueOnce([{ affectedRows: 1 }])
                .mockResolvedValueOnce([[{ id: 1 }]]);

            const { id_categoria, ...sinCategoria } = body;
            await request(app).put('/productos/1').send(sinCategoria);

            expect(pool.query.mock.calls[0][1][0]).toBeNull();
        });

        test.each([['ER_NO_REFERENCED_ROW_2'], ['ER_NO_REFERENCED_ROW']])(
            'debe retornar 400 si la categoría no existe (%s)',
            async (codigo) => {
                pool.query.mockRejectedValueOnce(Object.assign(new Error('FK'), { code: codigo }));

                const res = await request(app).put('/productos/1').send(body);

                expect(res.statusCode).toBe(400);
                expect(res.body.mensaje).toBe('La categoría indicada no existe');
            }
        );

        test('debe capturar otro error de BD y retornar 500', async () => {
            pool.query.mockRejectedValueOnce(new Error('Fallo'));

            const res = await request(app).put('/productos/1').send(body);

            expect(res.statusCode).toBe(500);
            expect(res.body.mensaje).toBe('Error al actualizar el producto');
            expect(res.body.error).toBe('Fallo');
        });
    });

    // --- DELETE /:id ---
    describe('DELETE /:id', () => {
        test('debe retornar 404 si el producto no existe', async () => {
            pool.query.mockResolvedValueOnce([{ affectedRows: 0 }]);

            const res = await request(app).delete('/productos/999');

            expect(res.statusCode).toBe(404);
            expect(res.body.mensaje).toBe('Producto no encontrado');
        });

        test('debe eliminar el producto exitosamente', async () => {
            pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

            const res = await request(app).delete('/productos/1');

            expect(res.statusCode).toBe(200);
            expect(res.body.mensaje).toBe('Producto eliminado correctamente');
            expect(pool.query.mock.calls[0][0]).toContain('DELETE FROM Producto');
            expect(pool.query.mock.calls[0][1]).toEqual(['1']);
        });

        test('debe retornar 409 si el producto está relacionado (ER_ROW_IS_REFERENCED_2)', async () => {
            pool.query.mockRejectedValueOnce(
                Object.assign(new Error('FK constraint'), { code: 'ER_ROW_IS_REFERENCED_2' })
            );

            const res = await request(app).delete('/productos/1');

            expect(res.statusCode).toBe(409);
            expect(res.body.mensaje).toBe(
                'No se puede eliminar el producto porque tiene movimientos asociados (compras, ventas, etc.)'
            );
        });

        test('debe retornar 409 si el producto está relacionado (ER_ROW_IS_REFERENCED)', async () => {
            pool.query.mockRejectedValueOnce(
                Object.assign(new Error('FK constraint'), { code: 'ER_ROW_IS_REFERENCED' })
            );

            const res = await request(app).delete('/productos/1');

            expect(res.statusCode).toBe(409);
            expect(res.body.mensaje).toContain('tiene movimientos asociados');
        });

        test('debe capturar otro error de BD y retornar 500', async () => {
            pool.query.mockRejectedValueOnce(new Error('Fallo'));

            const res = await request(app).delete('/productos/1');

            expect(res.statusCode).toBe(500);
            expect(res.body.mensaje).toBe('Error al eliminar producto');
            expect(res.body.error).toBe('Fallo');
        });
    });
});