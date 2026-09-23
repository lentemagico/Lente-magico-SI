import { Router } from 'express'; //Es para crear las rutas
import pool from '../../db.js'; //El pool de conexiones a la base de datos

const router = Router();


// ======================================================
// OBTENER VENTAS
// ======================================================

// Trae las ventas con paginacion y busqueda opcional
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

    // Consulta aparte solo para contar el total de resultados (necesaria para la paginacion)
    let countQuery = `
      SELECT COUNT(*) AS total
      FROM Venta v
      INNER JOIN Cliente c
        ON v.id_cliente = c.id_cliente
      INNER JOIN Datos_personales dp
        ON c.id_datos_personales = dp.id
    `;

    const params = [];

    // Si el usuario esta buscando algo, se agrega un filtro WHERE a ambas consultas
    if (search) {

      const condition = `
        WHERE dp.numero_documento LIKE ?
        OR dp.primer_nombre LIKE ?
        OR dp.primer_apellido LIKE ?
        OR v.estado LIKE ?
      `;

      query += condition;
      countQuery += condition;

      // % antes y despues permite buscar coincidencias parciales, no solo exactas
      const s = `%${search}%`;

      params.push(s, s, s, s);
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

    // Se devuelven las ventas junto con la informacion de paginacion para el frontend
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

// Trae el detalle completo de una venta: su informacion, los productos vendidos y sus pagos
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

    // Se trae por separado el detalle de productos que se vendieron en esta venta
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

    // Se trae tambien por separado los pagos asociados a esta venta
    const [pagos] = await pool.query(`
      SELECT *
      FROM Pago
      WHERE id_venta = ?
    `, [
      req.params.id
    ]);

    // Se arma una sola respuesta uniendo la venta, su detalle y sus pagos
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
// Elimina una venta junto con todo lo que depende de ella (su detalle y sus pagos)
router.delete('/:id', async (req, res) => {

  // Se obtiene una conexion individual del pool, necesaria para poder usar transacciones
  const connection = await pool.getConnection();

  try {

    // Se inicia la transaccion: si algo falla mas adelante, se puede revertir todo
    await connection.beginTransaction();

    // Se elimina primero el detalle de productos (depende de la venta)
    await connection.query(`
      DELETE FROM Detalle_venta
      WHERE id_venta = ?
    `, [req.params.id]);

    // Se eliminan tambien los pagos asociados (dependen de la venta)
    await connection.query(`
      DELETE FROM Pago
      WHERE id_venta = ?
    `, [req.params.id]);

    // Finalmente se elimina la venta en si
    const [result] = await connection.query(`
      DELETE FROM Venta
      WHERE id_venta = ?
    `, [req.params.id]);

    // Si no se elimino ninguna fila, esa venta no existia
    if (result.affectedRows === 0) {

      await connection.rollback();

      return res.status(404).json({
        error: 'Venta no encontrada'
      });

    }

    // Si todo salio bien, se confirman los cambios de forma permanente
    await connection.commit();

    res.json({
      mensaje: 'Venta eliminada exitosamente'
    });

  } catch (error) {

    // Si algo fallo, se deshace todo lo eliminado
    await connection.rollback();

    res.status(500).json({
      error: error.message
    });

  } finally {

    // Sin importar si hubo exito o error, siempre se libera la conexion de vuelta al pool
    connection.release();

  }

});

export default router;