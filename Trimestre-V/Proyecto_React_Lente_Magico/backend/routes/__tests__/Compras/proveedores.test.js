// backend/routes/__tests__/proveedores.test.js
import request from 'supertest';
import express from 'express';
import router from '../../Compras/proveedores.js';

// Simulamos el módulo de la base de datos
// OJO: la ruta debe apuntar al MISMO db.js que importa el router ('../../db.js' desde su carpeta)
jest.mock('../../../db.js');
import pool from '../../../db.js';

// App de Express mínima solo para las pruebas
const app = express();
app.use(express.json());
app.use('/proveedores', router);

describe('Pruebas de Caja Blanca - Proveedores', () => {

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
        test('debe retornar todos los proveedores', async () => {
            const filas = [
                { id_proveedor: 1, razon_social: 'Proveedor A', nit: '900111' },
                { id_proveedor: 2, razon_social: 'Proveedor B', nit: '900222' }
            ];
            pool.query.mockResolvedValueOnce([filas]);

            const res = await request(app).get('/proveedores');

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveLength(2);
            expect(res.body[0].razon_social).toBe('Proveedor A');
            expect(pool.query).toHaveBeenCalledTimes(1);
            expect(pool.query.mock.calls[0][0]).toContain('SELECT * FROM Proveedor');
        });

        test('debe retornar lista vacía si no hay proveedores', async () => {
            pool.query.mockResolvedValueOnce([[]]);

            const res = await request(app).get('/proveedores');

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual([]);
        });

        test('debe capturar error de BD y retornar 500', async () => {
            pool.query.mockRejectedValueOnce(new Error('Fallo de conexión'));

            const res = await request(app).get('/proveedores');

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Error al obtener proveedores');
        });
    });

    // --- POST / ---
    describe('POST /', () => {
        const body = {
            id_tipo_documento: 1,
            nit: '900111',
            razon_social: 'Nuevo Proveedor',
            contacto: 'Juan',
            telefono: '3001234567',
            correo: 'prov@correo.com',
            estado: 1,
            tipo: 'Jurídica'
        };

        test('debe crear el proveedor y retornarlo con su id real', async () => {
            pool.query
                .mockResolvedValueOnce([{ insertId: 5 }])                    // INSERT
                .mockResolvedValueOnce([[{ id_proveedor: 5, ...body }]]);    // SELECT del recién creado

            const res = await request(app).post('/proveedores').send(body);

            expect(res.statusCode).toBe(201);
            expect(res.body.id_proveedor).toBe(5);
            expect(res.body.razon_social).toBe('Nuevo Proveedor');
            expect(pool.query).toHaveBeenCalledTimes(2);
            // Verifica que el INSERT recibió los parámetros correctos y en orden
            expect(pool.query.mock.calls[0][1]).toEqual([
                1, '900111', 'Nuevo Proveedor', 'Juan', '3001234567', 'prov@correo.com', 1, 'Jurídica'
            ]);
            // Verifica que el SELECT usó el insertId
            expect(pool.query.mock.calls[1][1]).toEqual([5]);
        });

        test('debe capturar error de BD y retornar 500', async () => {
            pool.query.mockRejectedValueOnce(new Error('Fallo'));

            const res = await request(app).post('/proveedores').send(body);

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Error al crear proveedor');
        });
    });

    // --- PUT /:id ---
    describe('PUT /:id', () => {
        const body = {
            id_tipo_documento: 2,
            nit: '900999',
            razon_social: 'Proveedor Editado',
            contacto: 'Ana',
            telefono: '3109876543',
            correo: 'editado@correo.com',
            estado: 0,
            tipo: 'Natural'
        };

        test('debe retornar 404 si el proveedor no existe', async () => {
            pool.query.mockResolvedValueOnce([[]]); // SELECT vacío

            const res = await request(app).put('/proveedores/999').send(body);

            expect(res.statusCode).toBe(404);
            expect(res.body.error).toBe('Proveedor no encontrado');
            expect(pool.query).toHaveBeenCalledTimes(1); // No debe llegar al UPDATE
        });

        test('debe actualizar y retornar el proveedor con los cambios', async () => {
            pool.query
                .mockResolvedValueOnce([[{ id_proveedor: 1, razon_social: 'Vieja' }]]) // existe
                .mockResolvedValueOnce([{ affectedRows: 1 }])                          // UPDATE
                .mockResolvedValueOnce([[{ id_proveedor: 1, ...body }]]);              // SELECT final

            const res = await request(app).put('/proveedores/1').send(body);

            expect(res.statusCode).toBe(200);
            expect(res.body.razon_social).toBe('Proveedor Editado');
            expect(pool.query).toHaveBeenCalledTimes(3);
            // Verifica los parámetros del UPDATE (el id va al final por el WHERE)
            expect(pool.query.mock.calls[1][1]).toEqual([
                2, '900999', 'Proveedor Editado', 'Ana', '3109876543', 'editado@correo.com', 0, 'Natural', '1'
            ]);
        });

        test('debe capturar error de BD y retornar 500', async () => {
            pool.query.mockRejectedValueOnce(new Error('Fallo'));

            const res = await request(app).put('/proveedores/1').send(body);

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Error al actualizar proveedor');
        });
    });

    // --- DELETE /:id ---
    describe('DELETE /:id', () => {
        test('debe retornar 404 si el proveedor no existe', async () => {
            pool.query.mockResolvedValueOnce([[]]);

            const res = await request(app).delete('/proveedores/999');

            expect(res.statusCode).toBe(404);
            expect(res.body.error).toBe('Proveedor no encontrado');
            expect(pool.query).toHaveBeenCalledTimes(1); // No debe llegar al DELETE
        });

        test('debe eliminar y retornar los datos del proveedor eliminado', async () => {
            const existente = { id_proveedor: 1, razon_social: 'Proveedor A', nit: '900111' };
            pool.query
                .mockResolvedValueOnce([[existente]])          // SELECT existe
                .mockResolvedValueOnce([{ affectedRows: 1 }]); // DELETE

            const res = await request(app).delete('/proveedores/1');

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(existente);
            expect(pool.query).toHaveBeenCalledTimes(2);
            expect(pool.query.mock.calls[1][0]).toContain('DELETE FROM Proveedor');
        });

        test('debe capturar error de BD y retornar 500', async () => {
            pool.query.mockRejectedValueOnce(new Error('Fallo'));

            const res = await request(app).delete('/proveedores/1');

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Error al eliminar proveedor');
        });
    });
});