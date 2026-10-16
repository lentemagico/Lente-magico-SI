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
        dp.id_tipo_documento,
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
    // NUEVO: se agrego dp.id_tipo_documento al SELECT para que el modal de edicion
    // pueda precargar el tipo de documento del cliente

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


// NUEVO: Editar cliente
// Actualiza los datos personales del cliente (los datos viven en Datos_personales)
router.put('/:id', async (req, res) => {

  try {

    const {
      id_tipo_documento,
      numero_documento,
      primer_nombre,
      segundo_nombre,
      primer_apellido,
      segundo_apellido,
      fecha_nacimiento,
      genero,
      correo,
      telefono
    } = req.body;

    // Campos obligatorios (los mismos que tienen "required" en el modal)
    if (
      !id_tipo_documento ||
      !numero_documento ||
      !primer_nombre ||
      !primer_apellido ||
      !fecha_nacimiento
    ) {

      return res.status(400).json({
        error: 'Faltan campos obligatorios'
      });

    }

    // Se busca el registro de datos personales que pertenece a este cliente
    const [cli] = await pool.query(
      'SELECT id_datos_personales FROM Cliente WHERE id_cliente = ?',
      [req.params.id]
    );

    if (cli.length === 0) {

      return res.status(404).json({
        error: 'Cliente no encontrado'
      });

    }

    const idDatos = cli[0].id_datos_personales;

    // numero_documento es UNIQUE: no puede pertenecer a otra persona
    const [dupDoc] = await pool.query(
      'SELECT id FROM Datos_personales WHERE numero_documento = ? AND id <> ?',
      [numero_documento, idDatos]
    );

    if (dupDoc.length > 0) {

      return res.status(409).json({
        error: 'Ya existe una persona con ese numero de documento'
      });

    }

    // correo tambien es UNIQUE (solo se revisa si se escribio uno)
    if (correo) {

      const [dupCorreo] = await pool.query(
        'SELECT id FROM Datos_personales WHERE correo = ? AND id <> ?',
        [correo, idDatos]
      );

      if (dupCorreo.length > 0) {

        return res.status(409).json({
          error: 'Ya existe una persona con ese correo'
        });

      }

    }

    // Los campos opcionales vacios se guardan como NULL
    // (con UNIQUE, dos correos '' chocarian entre si, pero varios NULL si se permiten)
    await pool.query(`
      UPDATE Datos_personales SET
        id_tipo_documento = ?,
        numero_documento = ?,
        primer_nombre = ?,
        segundo_nombre = ?,
        primer_apellido = ?,
        segundo_apellido = ?,
        fecha_nacimiento = ?,
        genero = ?,
        correo = ?,
        telefono = ?
      WHERE id = ?
    `, [
      id_tipo_documento,
      numero_documento,
      primer_nombre,
      segundo_nombre || null,
      primer_apellido,
      segundo_apellido || null,
      fecha_nacimiento,
      genero || null,
      correo || null,
      telefono || null,
      idDatos
    ]);

    res.json({
      mensaje: 'Cliente actualizado exitosamente'
    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

});


// NUEVO: Eliminar cliente
// Se rechaza si el cliente tiene ventas, consultas agendadas o historia clinica
// (las consultas dependen de una agenda y de una historia, por eso quedan cubiertas)
router.delete('/:id', async (req, res) => {

  // Se usa una conexion propia porque el borrado va dentro de una transaccion
  const conn = await pool.getConnection();

  try {

    const id = req.params.id;

    const [cli] = await conn.query(
      'SELECT id_datos_personales FROM Cliente WHERE id_cliente = ?',
      [id]
    );

    if (cli.length === 0) {

      return res.status(404).json({
        error: 'Cliente no encontrado'
      });

    }

    const idDatos = cli[0].id_datos_personales;

    // Se revisa si el cliente esta siendo usado en otras tablas
    const [[ventas]] = await conn.query(
      'SELECT COUNT(*) AS n FROM Venta WHERE id_cliente = ?',
      [id]
    );

    const [[agendas]] = await conn.query(
      'SELECT COUNT(*) AS n FROM Agenda_consulta WHERE id_cliente = ?',
      [id]
    );

    const [[historias]] = await conn.query(
      'SELECT COUNT(*) AS n FROM Historia_clinica WHERE id_cliente = ?',
      [id]
    );

    if (ventas.n > 0 || agendas.n > 0 || historias.n > 0) {

      return res.status(409).json({
        error: 'No se puede eliminar: el cliente tiene ventas, consultas agendadas o historia clinica asociadas'
      });

    }

    // Datos_personales tambien la puede usar un Usuario del sistema;
    // en ese caso se borra el cliente pero se conservan sus datos personales
    const [[usuario]] = await conn.query(
      'SELECT COUNT(*) AS n FROM Usuario WHERE id_datos_personales = ?',
      [idDatos]
    );

    await conn.beginTransaction();

    await conn.query(
      'DELETE FROM Cliente WHERE id_cliente = ?',
      [id]
    );

    if (usuario.n === 0) {

      await conn.query(
        'DELETE FROM Datos_personales WHERE id = ?',
        [idDatos]
      );

    }

    await conn.commit();

    res.json({
      mensaje: 'Cliente eliminado exitosamente'
    });

  } catch (error) {

    await conn.rollback();

    res.status(500).json({
      error: error.message
    });

  } finally {

    conn.release();

  }

});

export default router;