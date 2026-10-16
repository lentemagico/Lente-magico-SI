import request from 'supertest';
import express from 'express';
import router from '../tiposDocumento.js';

jest.mock('../../db.js', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

import pool from '../../db.js';

const app = express();
app.use('/tipos-documento', router);

describe('GET /tipos-documento', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('devuelve la lista de tipos de documento', async () => {
    const tipos = [
      { id: 1, sigla: 'CC', nombre_documento: 'Cédula de ciudadanía' },
      { id: 2, sigla: 'CE', nombre_documento: 'Cédula de extranjería' },
    ];

    pool.query.mockResolvedValueOnce([tipos]);

    const res = await request(app).get('/tipos-documento');

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(tipos);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test('devuelve 500 si falla la consulta a la base de datos', async () => {
    pool.query.mockRejectedValueOnce(new Error('Fallo de conexión'));

    const res = await request(app).get('/tipos-documento');

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      mensaje: 'No fue posible obtener los tipos de documento',
      detalle: 'Fallo de conexión',
    });
  });
});