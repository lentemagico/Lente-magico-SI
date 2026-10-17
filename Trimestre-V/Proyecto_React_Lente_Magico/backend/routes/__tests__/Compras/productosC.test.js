// backend/routes/__tests__/productos.test.js
import request from 'supertest';
import express from 'express';
import router from '../../Compras/productosC.js';

// Simulamos el módulo de la base de datos
// OJO: la ruta debe apuntar al MISMO db.js que importa el router ('../../db.js' desde su carpeta)
jest.mock('../../../db.js');
import pool from '../../../db.js';

// App de Express mínima solo para las pruebas
const app = express();
app.use(express.json());
app.use('/productos', router);

describe('Pruebas de Caja Blanca - Productos', () => {

    beforeEach(() => {
        // Limpia llamadas Y colas de mockResolvedValueOnce entre pruebas
        pool.query.mockReset();
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
        });

        test('debe retornar lista vacía si no hay productos', async () => {
            pool.query.mockResolvedValueOnce([[]]);

            const res = await request(app).get('/productos');

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual([]);
        });

        test('debe capturar error de BD y retornar 500', async () => {
            pool.query.mockRejectedValueOnce(new Error('Fallo de conexión'));

            const res = await request(app).get('/productos');

            expect(res.statusCode).toBe(500);
            expect(res.body.mensaje).toBe('Error al consultar los productos');
            expect(res.body.error).toBe('Fallo de conexión');
        });
    });

    // --- PUT /:id ---
    describe('PUT /:id', () => {
        const body = {
            nombre: 'Montura editada',
            categoria: 'Monturas',
            precio_venta: 120,
            stock_actual: 15,
            stock_minimo: 3
        };

        test('debe retornar 400 si la categoría no existe', async () => {
            pool.query.mockResolvedValueOnce([[]]); // SELECT categoría vacío

            const res = await request(app).put('/productos/1').send(body);

            expect(res.statusCode).toBe(400);
            expect(res.body.mensaje).toBe('La categoría no existe');
            expect(pool.query).toHaveBeenCalledTimes(1); // No debe llegar al UPDATE
            // La categoría se busca por nombre (texto), no por id
            expect(pool.query.mock.calls[0][1]).toEqual(['Monturas']);
        });

        test('debe retornar 404 si el producto no existe', async () => {
            pool.query
                .mockResolvedValueOnce([[{ id_categoria: 4 }]])    // SELECT categoría
                .mockResolvedValueOnce([{ affectedRows: 0 }]);     // UPDATE sin filas afectadas

            const res = await request(app).put('/productos/999').send(body);

            expect(res.statusCode).toBe(404);
            expect(res.body.mensaje).toBe('Producto no encontrado');
        });

        test('debe actualizar el producto exitosamente', async () => {
            pool.query
                .mockResolvedValueOnce([[{ id_categoria: 4 }]])    // SELECT categoría
                .mockResolvedValueOnce([{ affectedRows: 1 }]);     // UPDATE OK

            const res = await request(app).put('/productos/1').send(body);

            expect(res.statusCode).toBe(200);
            expect(res.body.mensaje).toBe('Producto actualizado correctamente');
            expect(pool.query).toHaveBeenCalledTimes(2);
            // Verifica los parámetros del UPDATE (id_categoria resuelto y el id al final por el WHERE)
            expect(pool.query.mock.calls[1][1]).toEqual([4, 'Montura editada', 120, 15, 3, '1']);
        });

        test('debe capturar error de BD y retornar 500', async () => {
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

        test('debe retornar 400 si el producto está relacionado (ER_ROW_IS_REFERENCED_2)', async () => {
            pool.query.mockRejectedValueOnce(
                Object.assign(new Error('FK constraint'), { code: 'ER_ROW_IS_REFERENCED_2' })
            );

            const res = await request(app).delete('/productos/1');

            expect(res.statusCode).toBe(400);
            expect(res.body.mensaje).toBe(
                'No se puede eliminar el producto porque está relacionado con compras o ventas.'
            );
        });

        test('debe retornar 400 si el producto está relacionado (ER_ROW_IS_REFERENCED)', async () => {
            pool.query.mockRejectedValueOnce(
                Object.assign(new Error('FK constraint'), { code: 'ER_ROW_IS_REFERENCED' })
            );

            const res = await request(app).delete('/productos/1');

            expect(res.statusCode).toBe(400);
            expect(res.body.mensaje).toContain('está relacionado con compras o ventas');
        });

        test('debe capturar otro error de BD y retornar 500', async () => {
            pool.query.mockRejectedValueOnce(new Error('Fallo'));

            const res = await request(app).delete('/productos/1');

            expect(res.statusCode).toBe(500);
            expect(res.body.mensaje).toBe('Error al eliminar el producto');
            expect(res.body.error).toBe('Fallo');
        });
    });
});