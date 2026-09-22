import { Router } from 'express'; //Es para crear las rutas
import pool from '../../db.js'; //El pool de conexiones a la base de datos

const router = Router();


// Obtener productos vendidos
// Trae el detalle de ventas, con paginacion y busqueda opcional por codigo o nombre de producto
router.get('/', async (req, res) => {

  try {

    // Se leen los parametros que vienen en la URL (query string), con valores por defecto si no vienen
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const search = req.query.search || '';
    // offset indica desde que registro empezar a traer datos, segun la pagina actual
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

    // Consulta aparte solo para contar el total de resultados (necesaria para la paginacion)
    let countQuery = `
      SELECT COUNT(*) AS total
      FROM Detalle_venta dv
      INNER JOIN Producto p
        ON dv.id_producto = p.id_producto
    `;

    const params = [];

    // Si el usuario esta buscando algo, se agrega un filtro WHERE a ambas consultas
    if (search) {

      const condition = `
        WHERE p.codigo_producto LIKE ?
        OR p.nombre LIKE ?
      `;

      query += condition;
      countQuery += condition;

      // % antes y despues permite buscar coincidencias parciales, no solo exactas
      const s = `%${search}%`;

      params.push(s, s);
    }

    // Se ordena por fecha de venta y se limita la cantidad de resultados segun la pagina
    query += `
      ORDER BY v.fecha_venta DESC
      LIMIT ? OFFSET ?
    `;

    // ...params agrega los valores de busqueda (si los hay) y despues limit y offset, en ese orden
    const [rows] = await pool.query(
      query,
      [...params, limit, offset]
    );

    // Se ejecuta la consulta de conteo con los mismos filtros de busqueda (sin limit/offset)
    const [count] = await pool.query(
      countQuery,
      params
    );

    const total = count[0].total;
    const totalPages = Math.ceil(total / limit);

    // Se devuelven los productos vendidos junto con la informacion de paginacion para el frontend
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
// Trae el detalle de una venta especifica de un producto, por su id
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