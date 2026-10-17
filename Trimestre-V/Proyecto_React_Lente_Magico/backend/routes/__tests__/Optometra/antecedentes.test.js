// backend/routes/__tests__/antecedentes.test.js
import request from 'supertest';
import express from 'express';
import router from '../../Optometra/antecedentes.js';

// Simulamos el módulo de la base de datos
// OJO: la ruta debe apuntar al MISMO db.js que importa el router ('../../db.js' desde su carpeta)
jest.mock('../../../db.js');
import pool from '../../../db.js';

// App de Express mínima solo para las pruebas
const app = express();
app.use(express.json());
app.use('/historia', router);

describe('Pruebas de Caja Blanca - Antecedentes', () => {

    beforeEach(() => {
        // Limpia llamadas Y colas de mockResolvedValueOnce entre pruebas
        pool.query.mockReset();
        // Silencia console.error de los catch para no ensuciar la salida
        jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        console.error.mockRestore();
    });

    // --- POST /antecedentes ---
    describe('POST /antecedentes', () => {
        const body = { id_historia: 1, antecedentes: 'Diabetes tipo 2' };

        // Validaciones (no deben tocar la BD)
        test('debe rechazar si falta id_historia', async () => {
            const res = await request(app).post('/historia/antecedentes').send({ antecedentes: 'Diabetes' });

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('La historia clínica y los antecedentes son obligatorios.');
            expect(pool.query).not.toHaveBeenCalled();
        });

        test('debe rechazar si falta antecedentes', async () => {
            const res = await request(app).post('/historia/antecedentes').send({ id_historia: 1 });

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('La historia clínica y los antecedentes son obligatorios.');
            expect(pool.query).not.toHaveBeenCalled();
        });

        test('debe rechazar si antecedentes es null (operador ?.)', async () => {
            const res = await request(app).post('/historia/antecedentes').send({ id_historia: 1, antecedentes: null });

            expect(res.statusCode).toBe(400);
            expect(pool.query).not.toHaveBeenCalled();
        });

        test('debe rechazar si antecedentes solo contiene espacios', async () => {
            const res = await request(app).post('/historia/antecedentes').send({ id_historia: 1, antecedentes: '    ' });

            expect(res.statusCode).toBe(400);
            expect(pool.query).not.toHaveBeenCalled();
        });

        // Historia clínica
        test('debe retornar 404 si la historia clínica no existe', async () => {
            pool.query.mockResolvedValueOnce([[]]); // SELECT historia vacío

            const res = await request(app).post('/historia/antecedentes').send(body);

            expect(res.statusCode).toBe(404);
            expect(res.body.error).toBe('La historia clínica no existe.');
            expect(pool.query).toHaveBeenCalledTimes(1); // No debe llegar al INSERT
            expect(pool.query.mock.calls[0][1]).toEqual([1]);
        });

        // Flujo exitoso
        test('debe registrar el antecedente y retornar su id', async () => {
            pool.query
                .mockResolvedValueOnce([[{ id_historia: 1 }]])   // SELECT historia (existe)
                .mockResolvedValueOnce([{ insertId: 8 }]);       // INSERT Antecedentes

            const res = await request(app).post('/historia/antecedentes').send(body);

            expect(res.statusCode).toBe(201);
            expect(res.body.mensaje).toBe('Antecedente registrado correctamente.');
            expect(res.body.id_antecedentes).toBe(8);
            expect(pool.query).toHaveBeenCalledTimes(2);
            expect(pool.query.mock.calls[1][0]).toContain('INSERT INTO Antecedentes');
            expect(pool.query.mock.calls[1][1]).toEqual([1, 'Diabetes tipo 2']);
        });

        test('debe guardar los antecedentes sin espacios al inicio ni al final (trim)', async () => {
            pool.query
                .mockResolvedValueOnce([[{ id_historia: 1 }]])
                .mockResolvedValueOnce([{ insertId: 9 }]);

            const res = await request(app).post('/historia/antecedentes').send({
                id_historia: 1,
                antecedentes: '   Hipertensión   '
            });

            expect(res.statusCode).toBe(201);
            expect(pool.query.mock.calls[1][1]).toEqual([1, 'Hipertensión']);
        });

        // Errores
        test('debe capturar error de BD y retornar 500 con el mensaje del error', async () => {
            pool.query.mockRejectedValueOnce(new Error('Fallo de conexión'));

            const res = await request(app).post('/historia/antecedentes').send(body);

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Fallo de conexión');
        });

        test('debe retornar 500 si falla el INSERT', async () => {
            pool.query
                .mockResolvedValueOnce([[{ id_historia: 1 }]])
                .mockRejectedValueOnce(new Error('Fallo al insertar'));

            const res = await request(app).post('/historia/antecedentes').send(body);

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Fallo al insertar');
        });
    });
});