import { Router } from 'express';
import pool from '../../db.js';

const router = Router();


// Buscar clientes
router.get('/', async (req, res) => {

  try {

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        c.id_cliente,
        dp.numero_documento,
        td.sigla,
        td.nombre_documento,
        dp.primer_nombre,
        dp.segundo_nombre,
        dp.primer_apellido,
        dp.segundo_apellido,
        dp.fecha_nacimiento,
        dp.genero,
        dp.correo,
        dp.telefono,
        c.fecha_registro
      FROM Cliente c
      INNER JOIN Datos_personales dp
        ON c.id_datos_personales = dp.id
      INNER JOIN Tipo_documento td
        ON dp.id_tipo_documento = td.id
    `;

    let countQuery = `
      SELECT COUNT(*) AS total
      FROM Cliente c
      INNER JOIN Datos_personales dp
        ON c.id_datos_personales = dp.id
    `;

    const params = [];

    if (search) {

      const condition = `
        WHERE dp.numero_documento LIKE ?
        OR dp.primer_nombre LIKE ?
        OR dp.primer_apellido LIKE ?
        OR dp.correo LIKE ?
      `;

      query += condition;
      countQuery += condition;

      const s = `%${search}%`;

      params.push(s, s, s, s);
    }

    query += `
      ORDER BY dp.primer_apellido ASC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.query(
      query,
      [...params, limit, offset]
    );

    const [count] = await pool.query(
      countQuery,
      params
    );

    const total = count[0].total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      clientes: rows,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

});


// Buscar por documento
router.get('/documento/:documento', async (req, res) => {

  try {

    const [rows] = await pool.query(`
      SELECT
        c.id_cliente,
        dp.*,
        td.sigla,
        td.nombre_documento
      FROM Cliente c
      INNER JOIN Datos_personales dp
        ON c.id_datos_personales = dp.id
      INNER JOIN Tipo_documento td
        ON dp.id_tipo_documento = td.id
      WHERE dp.numero_documento = ?
    `, [req.params.documento]);

    if (rows.length === 0) {

      return res.status(404).json({
        error: 'Cliente no encontrado'
      });

    }

    res.json(rows[0]);

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

});

export default router;