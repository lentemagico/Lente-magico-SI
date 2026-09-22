import { Router } from 'express'; //Es para crear las rutas
import pool from '../../db.js'; //El pool de conexiones a la base de datos

const router = Router();


// Obtener productos (con paginación y búsqueda)
router.get('/', async (req, res) => {

  try {

    // Se leen los parametros que vienen en la URL (query string), con valores por defecto si no vienen
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const search = req.query.search || '';
    // offset indica desde que registro empezar a traer datos, segun la pagina actual
    const offset = (page - 1) * limit;

    // % antes y despues permite buscar coincidencias parciales, no solo exactas
    const parametro = `%${search}%`;

    // Se trae la pagina de productos que coincidan con la busqueda (por codigo, nombre o categoria)
    const [rows] = await pool.query(
      `SELECT p.*, cp.nombre_categoria
       FROM Producto p
       INNER JOIN Cat_producto cp ON p.id_categoria = cp.id_categoria
       WHERE p.codigo_producto LIKE ? OR p.nombre LIKE ? OR cp.nombre_categoria LIKE ?
       ORDER BY p.nombre ASC
       LIMIT ? OFFSET ?`,
      [parametro, parametro, parametro, limit, offset]
    );

    // Se cuenta el total de resultados que coinciden con la busqueda, para calcular el total de paginas
    const [count] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM Producto p
       INNER JOIN Cat_producto cp ON p.id_categoria = cp.id_categoria
       WHERE p.codigo_producto LIKE ? OR p.nombre LIKE ? OR cp.nombre_categoria LIKE ?`,
      [parametro, parametro, parametro]
    );

    const total = count[0].total;
    const totalPages = Math.ceil(total / limit);

    // Se devuelven los productos junto con la informacion de paginacion para el frontend
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

    // precio_venta == null cubre tanto null como undefined en una sola comparacion
    if (!id_categoria || !codigo_producto || !nombre || precio_venta == null) {
      return res.status(400).json({
        error: 'Categoría, código, nombre y precio son obligatorios'
      });
    }

    // COALESCE(?, CURRENT_TIMESTAMP) usa la fecha que llegue, o la fecha/hora actual si no se envio ninguna
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