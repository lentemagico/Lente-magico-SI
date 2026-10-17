// backend/routes/__tests__/categorias.test.js
import request from 'supertest';
import express from 'express';
import router from '../../Compras/categorias.js';

// Simulamos el módulo de la base de datos
// OJO: la ruta debe apuntar al MISMO db.js que importa el router ('../../db.js' desde su carpeta)
jest.mock('../../../db.js');
import pool from '../../../db.js';

// App de Express mínima solo para las pruebas
const app = express();
app.use(express.json());
app.use('/categorias', router);

describe('Pruebas de Caja Blanca - Categorías de producto', () => {

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
        test('debe retornar todas las categorías', async () => {
            const filas = [
                { id_categoria: 1, nombre_categoria: 'Monturas', descripcion: 'Armazones', estado: 1 },
                { id_categoria: 2, nombre_categoria: 'Lentes', descripcion: 'Cristales', estado: 1 }
            ];
            pool.query.mockResolvedValueOnce([filas]);

            const res = await request(app).get('/categorias');

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveLength(2);
            expect(res.body[0].nombre_categoria).toBe('Monturas');
            expect(pool.query).toHaveBeenCalledTimes(1);
            expect(pool.query.mock.calls[0][0]).toContain('SELECT * FROM Cat_producto');
        });

        test('debe retornar lista vacía si no hay categorías', async () => {
            pool.query.mockResolvedValueOnce([[]]);

            const res = await request(app).get('/categorias');

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual([]);
        });

        test('debe capturar error de BD y retornar 500', async () => {
            pool.query.mockRejectedValueOnce(new Error('Fallo de conexión'));

            const res = await request(app).get('/categorias');

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Error al obtener categorías');
        });
    });

    // --- POST / ---
    describe('POST /', () => {
        const body = { nombre_categoria: 'Nueva', descripcion: 'Desc', estado: 1 };

        test('debe crear la categoría y retornarla con su id real', async () => {
            pool.query
                .mockResolvedValueOnce([{ insertId: 5 }])                    // INSERT
                .mockResolvedValueOnce([[{ id_categoria: 5, ...body }]]);    // SELECT de la recién creada

            const res = await request(app).post('/categorias').send(body);

            expect(res.statusCode).toBe(201);
            expect(res.body.id_categoria).toBe(5);
            expect(res.body.nombre_categoria).toBe('Nueva');
            expect(pool.query).toHaveBeenCalledTimes(2);
            // Verifica que el INSERT recibió los parámetros correctos
            expect(pool.query.mock.calls[0][1]).toEqual(['Nueva', 'Desc', 1]);
            // Verifica que el SELECT usó el insertId
            expect(pool.query.mock.calls[1][1]).toEqual([5]);
        });

        test('debe capturar error de BD y retornar 500', async () => {
            pool.query.mockRejectedValueOnce(new Error('Fallo'));

            const res = await request(app).post('/categorias').send(body);

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Error al crear categoría');
        });
    });

    // --- PUT /:id ---
    describe('PUT /:id', () => {
        const body = { nombre_categoria: 'Editada', descripcion: 'Nueva desc', estado: 0 };

        test('debe retornar 404 si la categoría no existe', async () => {
            pool.query.mockResolvedValueOnce([[]]); // SELECT vacío

            const res = await request(app).put('/categorias/999').send(body);

            expect(res.statusCode).toBe(404);
            expect(res.body.error).toBe('Categoría no encontrada');
            expect(pool.query).toHaveBeenCalledTimes(1); // No debe llegar al UPDATE
        });

        test('debe actualizar y retornar la categoría con los cambios', async () => {
            pool.query
                .mockResolvedValueOnce([[{ id_categoria: 1, nombre_categoria: 'Vieja' }]]) // existe
                .mockResolvedValueOnce([{ affectedRows: 1 }])                              // UPDATE
                .mockResolvedValueOnce([[{ id_categoria: 1, ...body }]]);                  // SELECT final

            const res = await request(app).put('/categorias/1').send(body);

            expect(res.statusCode).toBe(200);
            expect(res.body.nombre_categoria).toBe('Editada');
            expect(pool.query).toHaveBeenCalledTimes(3);
            // Verifica los parámetros del UPDATE (el id va al final por el WHERE)
            expect(pool.query.mock.calls[1][1]).toEqual(['Editada', 'Nueva desc', 0, '1']);
        });

        test('debe capturar error de BD y retornar 500', async () => {
            pool.query.mockRejectedValueOnce(new Error('Fallo'));

            const res = await request(app).put('/categorias/1').send(body);

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Error al actualizar categoría');
        });
    });

    // --- DELETE /:id ---
    describe('DELETE /:id', () => {
        test('debe retornar 404 si la categoría no existe', async () => {
            pool.query.mockResolvedValueOnce([[]]);

            const res = await request(app).delete('/categorias/999');

            expect(res.statusCode).toBe(404);
            expect(res.body.error).toBe('Categoría no encontrada');
            expect(pool.query).toHaveBeenCalledTimes(1); // No debe llegar al DELETE
        });

        test('debe eliminar y retornar los datos de la categoría eliminada', async () => {
            const existente = { id_categoria: 1, nombre_categoria: 'Monturas', descripcion: 'X', estado: 1 };
            pool.query
                .mockResolvedValueOnce([[existente]])        // SELECT existe
                .mockResolvedValueOnce([{ affectedRows: 1 }]); // DELETE

            const res = await request(app).delete('/categorias/1');

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(existente);
            expect(pool.query).toHaveBeenCalledTimes(2);
            expect(pool.query.mock.calls[1][0]).toContain('DELETE FROM Cat_producto');
        });

        test('debe capturar error de BD y retornar 500', async () => {
            pool.query.mockRejectedValueOnce(new Error('Fallo'));

            const res = await request(app).delete('/categorias/1');

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Error al eliminar categoría');
        });
    });
});