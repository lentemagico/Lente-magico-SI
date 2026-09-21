import { Router } from 'express';
import pool from '../../db.js';

const router = Router();


// ======================================================
// OBTENER VENTAS
// ======================================================

router.get('/', async (req, res) => {

  try {

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        v.id_venta,
        v.id_cliente,
        v.id_usuario,
        v.fecha_venta,
        v.estado,
        dp.numero_documento AS documento_cliente,
        CONCAT(
          dp.primer_nombre,
          ' ',
          dp.primer_apellido
        ) AS cliente
      FROM Venta v
      INNER JOIN Cliente c
        ON v.id_cliente = c.id_cliente
      INNER JOIN Datos_personales dp
        ON c.id_datos_personales = dp.id
    `;

    let countQuery = `
      SELECT COUNT(*) AS total
      FROM Venta v
      INNER JOIN Cliente c
        ON v.id_cliente = c.id_cliente
      INNER JOIN Datos_personales dp
        ON c.id_datos_personales = dp.id
    `;

    const params = [];

    if (search) {

      const condition = `
        WHERE dp.numero_documento LIKE ?
        OR dp.primer_nombre LIKE ?
        OR dp.primer_apellido LIKE ?
        OR v.estado LIKE ?
      `;

      query += condition;
      countQuery += condition;

      const s = `%${search}%`;

      params.push(s, s, s, s);
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
      ventas: rows,
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


// ======================================================
// OBTENER UNA VENTA
// ======================================================

router.get('/:id', async (req, res) => {

  try {

    const [venta] = await pool.query(`
      SELECT
        v.*,
        dp.numero_documento AS documento_cliente,
        CONCAT(
          dp.primer_nombre,
          ' ',
          dp.primer_apellido
        ) AS cliente
      FROM Venta v
      INNER JOIN Cliente c
        ON v.id_cliente = c.id_cliente
      INNER JOIN Datos_personales dp
        ON c.id_datos_personales = dp.id
      WHERE v.id_venta = ?
    `, [
      req.params.id
    ]);

    if (venta.length === 0) {

      return res.status(404).json({
        error: 'Venta no encontrada'
      });

    }

    const [detalle] = await pool.query(`
      SELECT
        dv.*,
        p.codigo_producto,
        p.nombre
      FROM Detalle_venta dv
      INNER JOIN Producto p
        ON dv.id_producto = p.id_producto
      WHERE dv.id_venta = ?
    `, [
      req.params.id
    ]);

    const [pagos] = await pool.query(`
      SELECT *
      FROM Pago
      WHERE id_venta = ?
    `, [
      req.params.id
    ]);

    res.json({
      venta: venta[0],
      detalle,
      pagos
    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

});


// Eliminar venta
router.delete('/:id', async (req, res) => {

  const connection = await pool.getConnection();

  try {

    await connection.beginTransaction();

    await connection.query(`
      DELETE FROM Detalle_venta
      WHERE id_venta = ?
    `, [req.params.id]);

    await connection.query(`
      DELETE FROM Pago
      WHERE id_venta = ?
    `, [req.params.id]);

    const [result] = await connection.query(`
      DELETE FROM Venta
      WHERE id_venta = ?
    `, [req.params.id]);

    if (result.affectedRows === 0) {

      await connection.rollback();

      return res.status(404).json({
        error: 'Venta no encontrada'
      });

    }

    await connection.commit();

    res.json({
      mensaje: 'Venta eliminada exitosamente'
    });

  } catch (error) {

    await connection.rollback();

    res.status(500).json({
      error: error.message
    });

  } finally {

    connection.release();

  }

});

export default router;