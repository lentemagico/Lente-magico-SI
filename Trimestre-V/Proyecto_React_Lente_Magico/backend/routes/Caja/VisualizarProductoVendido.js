import { Router } from 'express';
import pool from '../../db.js';

const router = Router();


// Obtener productos vendidos
router.get('/', async (req, res) => {

  try {

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        dv.id_detalle,
        dv.id_venta,
        dv.id_producto,
        dv.cantidad,
        dv.precio_unitario,
        p.codigo_producto,
        p.nombre AS nombre_producto,
        v.fecha_venta
      FROM Detalle_venta dv
      INNER JOIN Producto p
        ON dv.id_producto = p.id_producto
      INNER JOIN Venta v
        ON dv.id_venta = v.id_venta
    `;

    let countQuery = `
      SELECT COUNT(*) AS total
      FROM Detalle_venta dv
      INNER JOIN Producto p
        ON dv.id_producto = p.id_producto
    `;

    const params = [];

    if (search) {

      const condition = `
        WHERE p.codigo_producto LIKE ?
        OR p.nombre LIKE ?
      `;

      query += condition;
      countQuery += condition;

      const s = `%${search}%`;

      params.push(s, s);
    }

    query += `
      ORDER BY v.fecha_venta DESC
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
      productosVendidos: rows,
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


// Obtener detalle
router.get('/:id', async (req, res) => {

  try {

    const [rows] = await pool.query(`
      SELECT
        dv.*,
        p.codigo_producto,
        p.nombre
      FROM Detalle_venta dv
      INNER JOIN Producto p
        ON dv.id_producto = p.id_producto
      WHERE dv.id_detalle = ?
    `, [
      req.params.id
    ]);

    if (rows.length === 0) {

      return res.status(404).json({
        error: 'Producto vendido no encontrado'
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