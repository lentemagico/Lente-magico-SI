import { Router } from 'express';
import pool from '../../db.js';

const router = Router();

/**
 * GET - LISTAR PRODUCTOS VENDIDOS
 */
router.get('/', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 10, 1);
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        dv.id_detalle AS id,
        dv.id_venta AS idVenta,
        dv.id_producto AS idProducto,
        dv.cantidad AS cantidadProducto,
        dv.precio_unitario AS precioUnitario,
        p.codigo_producto AS codigoProducto,
        p.nombre AS nombreProducto,
        v.fecha_venta AS fechaVenta
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

    let totalQuery = `
      SELECT COALESCE(SUM(dv.cantidad), 0) AS totalVendidos
      FROM Detalle_venta dv
      INNER JOIN Producto p
        ON dv.id_producto = p.id_producto
    `;

    const params = [];

    if (search.trim() !== '') {
      const condition = `
        WHERE
          p.codigo_producto LIKE ?
          OR p.nombre LIKE ?
      `;

      query += condition;
      countQuery += condition;
      totalQuery += condition;

      const searchValue = `%${search}%`;

      params.push(searchValue, searchValue);
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

    const [total] = await pool.query(
      totalQuery,
      params
    );

    const totalItems = Number(count[0]?.total || 0);
    const totalVendidos = Number(total[0]?.totalVendidos || 0);

    const totalPages = Math.ceil(totalItems / limit);

    res.json({
      productos: rows,
      totalVendidos,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error(
      'Error al obtener productos vendidos:',
      error
    );

    res.status(500).json({
      error: 'Error al obtener los productos vendidos'
    });
  }
});


/**
 * GET - RESUMEN POR PRODUCTO
 */
router.get('/resumen', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        p.id_producto AS idProducto,
        p.codigo_producto AS codigoProducto,
        p.nombre AS nombreProducto,
        COALESCE(SUM(dv.cantidad), 0) AS cantidadVendida
      FROM Producto p
      LEFT JOIN Detalle_venta dv
        ON p.id_producto = dv.id_producto
      GROUP BY
        p.id_producto,
        p.codigo_producto,
        p.nombre
      ORDER BY cantidadVendida DESC
    `);

    res.json({
      productos: rows
    });

  } catch (error) {
    console.error(
      'Error al obtener resumen:',
      error
    );

    res.status(500).json({
      error:
        'Error al obtener el resumen de productos vendidos'
    });
  }
});


/**
 * POST - CREAR DETALLE DE VENTA
 */
router.post('/', async (req, res) => {
  try {
    const {
      idVenta,
      idProducto,
      cantidadProducto,
      precioUnitario
    } = req.body;

    if (
      !idVenta ||
      !idProducto ||
      !cantidadProducto ||
      Number(cantidadProducto) <= 0
    ) {
      return res.status(400).json({
        error:
          'idVenta, idProducto y una cantidad mayor a 0 son requeridos'
      });
    }

    // Verificar que exista la venta
    const [venta] = await pool.query(
      `
        SELECT id_venta
        FROM Venta
        WHERE id_venta = ?
      `,
      [idVenta]
    );

    if (venta.length === 0) {
      return res.status(404).json({
        error: 'La venta indicada no existe'
      });
    }

    // Verificar que exista el producto
    const [producto] = await pool.query(
      `
        SELECT
          id_producto,
          codigo_producto,
          nombre
        FROM Producto
        WHERE id_producto = ?
      `,
      [idProducto]
    );

    if (producto.length === 0) {
      return res.status(404).json({
        error: 'El producto indicado no existe'
      });
    }

    const [result] = await pool.query(
      `
        INSERT INTO Detalle_venta
        (
          id_venta,
          id_producto,
          cantidad,
          precio_unitario
        )
        VALUES (?, ?, ?, ?)
      `,
      [
        idVenta,
        idProducto,
        Number(cantidadProducto),
        Number(precioUnitario) || 0
      ]
    );

    const [rows] = await pool.query(
      `
        SELECT
          dv.id_detalle AS id,
          dv.id_venta AS idVenta,
          dv.id_producto AS idProducto,
          dv.cantidad AS cantidadProducto,
          dv.precio_unitario AS precioUnitario,
          p.codigo_producto AS codigoProducto,
          p.nombre AS nombreProducto,
          v.fecha_venta AS fechaVenta
        FROM Detalle_venta dv
        INNER JOIN Producto p
          ON dv.id_producto = p.id_producto
        INNER JOIN Venta v
          ON dv.id_venta = v.id_venta
        WHERE dv.id_detalle = ?
      `,
      [result.insertId]
    );

    res.status(201).json({
      mensaje:
        'Producto vendido registrado exitosamente',
      producto: rows[0]
    });

  } catch (error) {
    console.error(
      'Error al crear detalle de venta:',
      error
    );

    res.status(500).json({
      error: error.message
    });
  }
});


/**
 * PUT - ACTUALIZAR DETALLE DE VENTA
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const {
      idVenta,
      idProducto,
      cantidadProducto,
      precioUnitario
    } = req.body;

    if (
      !idVenta ||
      !idProducto ||
      !cantidadProducto ||
      Number(cantidadProducto) <= 0
    ) {
      return res.status(400).json({
        error:
          'idVenta, idProducto y una cantidad mayor a 0 son requeridos'
      });
    }

    const [result] = await pool.query(
      `
        UPDATE Detalle_venta
        SET
          id_venta = ?,
          id_producto = ?,
          cantidad = ?,
          precio_unitario = ?
        WHERE id_detalle = ?
      `,
      [
        idVenta,
        idProducto,
        Number(cantidadProducto),
        Number(precioUnitario) || 0,
        id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'No se encontró el producto vendido'
      });
    }

    const [rows] = await pool.query(
      `
        SELECT
          dv.id_detalle AS id,
          dv.id_venta AS idVenta,
          dv.id_producto AS idProducto,
          dv.cantidad AS cantidadProducto,
          dv.precio_unitario AS precioUnitario,
          p.codigo_producto AS codigoProducto,
          p.nombre AS nombreProducto,
          v.fecha_venta AS fechaVenta
        FROM Detalle_venta dv
        INNER JOIN Producto p
          ON dv.id_producto = p.id_producto
        INNER JOIN Venta v
          ON dv.id_venta = v.id_venta
        WHERE dv.id_detalle = ?
      `,
      [id]
    );

    res.json({
      mensaje:
        'Producto vendido actualizado exitosamente',
      producto: rows[0]
    });

  } catch (error) {
    console.error(
      'Error al actualizar detalle de venta:',
      error
    );

    res.status(500).json({
      error: error.message
    });
  }
});


/**
 * DELETE - ELIMINAR DETALLE DE VENTA
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      `
        DELETE FROM Detalle_venta
        WHERE id_detalle = ?
      `,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'No se encontró el producto vendido'
      });
    }

    res.json({
      mensaje:
        'Producto vendido eliminado exitosamente'
    });

  } catch (error) {
    console.error(
      'Error al eliminar detalle de venta:',
      error
    );

    res.status(500).json({
      error: error.message
    });
  }
});

export default router;