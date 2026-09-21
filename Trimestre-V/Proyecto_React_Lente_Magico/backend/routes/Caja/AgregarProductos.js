import { Router } from 'express';
import pool from '../../db.js';

const router = Router();


// Obtener productos (con paginación y búsqueda)
router.get('/', async (req, res) => {

  try {

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    const parametro = `%${search}%`;

    const [rows] = await pool.query(
      `SELECT p.*, cp.nombre_categoria
       FROM Producto p
       INNER JOIN Cat_producto cp ON p.id_categoria = cp.id_categoria
       WHERE p.codigo_producto LIKE ? OR p.nombre LIKE ? OR cp.nombre_categoria LIKE ?
       ORDER BY p.nombre ASC
       LIMIT ? OFFSET ?`,
      [parametro, parametro, parametro, limit, offset]
    );

    const [count] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM Producto p
       INNER JOIN Cat_producto cp ON p.id_categoria = cp.id_categoria
       WHERE p.codigo_producto LIKE ? OR p.nombre LIKE ? OR cp.nombre_categoria LIKE ?`,
      [parametro, parametro, parametro]
    );

    const total = count[0].total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      productos: rows,
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
    res.status(500).json({ error: error.message });
  }

});


// Obtener producto por código
router.get('/:codigo', async (req, res) => {

  try {

    const [rows] = await pool.query(
      `SELECT p.*, cp.nombre_categoria
       FROM Producto p
       INNER JOIN Cat_producto cp ON p.id_categoria = cp.id_categoria
       WHERE p.codigo_producto = ?`,
      [req.params.codigo]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json(rows[0]);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }

});


// Crear producto
router.post('/', async (req, res) => {

  try {

    const {
      id_categoria,
      codigo_producto,
      nombre,
      descripcion,
      precio_venta,
      estado,
      fecha_creacion,
      stock_actual,
      stock_minimo
    } = req.body;

    if (!id_categoria || !codigo_producto || !nombre || precio_venta == null) {
      return res.status(400).json({
        error: 'Categoría, código, nombre y precio son obligatorios'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO Producto (
        id_categoria, codigo_producto, nombre, descripcion, precio_venta, estado, fecha_creacion, stock_actual, stock_minimo
      ) VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?, ?)`,
      [
        id_categoria,
        codigo_producto,
        nombre,
        descripcion || '',
        precio_venta,
        estado || 'Activo',
        fecha_creacion || null,
        stock_actual || 0,
        stock_minimo || 0
      ]
    );

    res.status(201).json({
      mensaje: 'Producto creado exitosamente',
      id_producto: result.insertId
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }

});


// Actualizar producto por código
router.put('/:codigo', async (req, res) => {

  try {

    const {
      id_categoria,
      nombre,
      descripcion,
      precio_venta,
      estado,
      fecha_creacion,
      stock_actual,
      stock_minimo
    } = req.body;

    const [result] = await pool.query(
      `UPDATE Producto
       SET id_categoria = ?, nombre = ?, descripcion = ?, precio_venta = ?, estado = ?, fecha_creacion = ?, stock_actual = ?, stock_minimo = ?
       WHERE codigo_producto = ?`,
      [
        id_categoria,
        nombre,
        descripcion,
        precio_venta,
        estado,
        fecha_creacion,
        stock_actual,
        stock_minimo,
        req.params.codigo
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({ mensaje: 'Producto actualizado exitosamente' });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }

});


// Eliminar producto por código
router.delete('/:codigo', async (req, res) => {

  try {

    const [result] = await pool.query(
      `DELETE FROM Producto WHERE codigo_producto = ?`,
      [req.params.codigo]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({ mensaje: 'Producto eliminado exitosamente' });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }

});

export default router;