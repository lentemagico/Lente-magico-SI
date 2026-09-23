import { Router } from 'express'; //Es para crear las rutas
import pool from '../../db.js'; //El pool de conexiones a la base de datos

const router = Router();


// Buscar clientes
// Trae los clientes con paginacion y busqueda opcional
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

    // Consulta aparte solo para contar el total de resultados (necesaria para la paginacion)
    let countQuery = `
      SELECT COUNT(*) AS total
      FROM Cliente c
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
        OR dp.correo LIKE ?
      `;

      query += condition;
      countQuery += condition;

      // % antes y despues permite buscar coincidencias parciales, no solo exactas
      const s = `%${search}%`;

      // Se repite el mismo valor 4 veces porque el WHERE tiene 4 condiciones con LIKE
      params.push(s, s, s, s);
    }

    // Se ordena por apellido y se limita la cantidad de resultados segun la pagina
    query += `
      ORDER BY dp.primer_apellido ASC
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

    // Se devuelven los clientes junto con la informacion de paginacion para el frontend
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
// Trae un cliente especifico segun su numero de documento
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