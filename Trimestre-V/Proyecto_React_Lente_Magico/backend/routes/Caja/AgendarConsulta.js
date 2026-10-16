import { Router } from 'express'; //Es para crear las rutas
import pool from '../../db.js'; //El pool de conexiones a la base de datos

const router = Router();


// ================================================================
// OBTENER AGENDA
// GET /api/agendar-consulta
// ================================================================
// Trae la agenda de consultas con paginacion y busqueda opcional
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
        a.id_agenda,
        a.id_cliente,
        a.fecha_hora,
        a.motivo,
        a.estado,

        dp.id AS id_datos_personales,
        dp.id_tipo_documento,
        dp.numero_documento,
        dp.primer_nombre,
        dp.segundo_nombre,
        dp.primer_apellido,
        dp.segundo_apellido,
        dp.fecha_nacimiento,

        CONCAT(
          dp.primer_nombre,
          ' ',
          COALESCE(dp.segundo_nombre, ''),
          ' ',
          dp.primer_apellido,
          ' ',
          COALESCE(dp.segundo_apellido, '')
        ) AS cliente

      FROM Agenda_consulta a

      INNER JOIN Cliente c
        ON a.id_cliente = c.id_cliente

      INNER JOIN Datos_personales dp
        ON c.id_datos_personales = dp.id
    `;

    // Se arma una segunda consulta identica pero solo para contar el total de resultados,
    // necesaria para calcular cuantas paginas hay en total
    let countQuery = `
      SELECT COUNT(*) AS total
      FROM Agenda_consulta a

      INNER JOIN Cliente c
        ON a.id_cliente = c.id_cliente

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
        OR a.motivo LIKE ?
        OR a.estado LIKE ?
      `;

      query += condition;
      countQuery += condition;

      // % antes y despues permite buscar coincidencias parciales, no solo exactas
      const s = `%${search}%`;

      // Se repite el mismo valor 5 veces porque el WHERE tiene 5 condiciones con LIKE
      params.push(s, s, s, s, s);
    }

    // Se ordena por fecha y se limita la cantidad de resultados segun la pagina
    query += `
      ORDER BY a.fecha_hora ASC
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

    // Se devuelven los resultados junto con informacion util para la paginacion en el frontend
    res.json({
      consultas: rows,
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
    console.error('Error al obtener agenda:', error);

    res.status(500).json({
      error: error.message
    });
  }
});


// ================================================================
// OBTENER UNA CONSULTA
// GET /api/agendar-consulta/:id
// ================================================================
// Trae una consulta agendada especifica, junto con los datos del cliente
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        a.id_agenda,
        a.id_cliente,
        a.fecha_hora,
        a.motivo,
        a.estado,

        dp.id_tipo_documento,
        dp.numero_documento,
        dp.primer_nombre,
        dp.segundo_nombre,
        dp.primer_apellido,
        dp.segundo_apellido,
        dp.fecha_nacimiento

      FROM Agenda_consulta a

      INNER JOIN Cliente c
        ON a.id_cliente = c.id_cliente

      INNER JOIN Datos_personales dp
        ON c.id_datos_personales = dp.id

      WHERE a.id_agenda = ?
    `, [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({
        error: 'Consulta no encontrada'
      });
    }

    res.json(rows[0]);

  } catch (error) {
    console.error('Error al obtener consulta:', error);

    res.status(500).json({
      error: error.message
    });
  }
});


// ================================================================
// CREAR CITA
// POST /api/agendar-consulta
// ================================================================
// Agenda una nueva consulta, validando que el cliente exista y que no tenga ya una cita en esa fecha
// CAMBIO: ahora el frontend envia el id_cliente (el cliente ya esta registrado), en lugar de
// volver a pedir el tipo y numero de documento. Ademas, si el cliente aun no tiene historia
// clinica, se crea en este momento.
router.post('/', async (req, res) => {
  // Se obtiene una conexion individual del pool, necesaria para poder usar transacciones
  const connection = await pool.getConnection();

  try {
    const {
      id_cliente,
      fecha_hora,
      motivo,
      estado
    } = req.body;

    // Validaciones
    if (
      !id_cliente ||
      !motivo ||
      !fecha_hora ||
      !estado
    ) {
      return res.status(400).json({
        error:
          'Cliente, fecha y hora, motivo y estado son obligatorios'
      });
    }

    // NUEVO: agenda_consulta.motivo es varchar(40)
    if (String(motivo).length > 40) {
      return res.status(400).json({
        error: 'El motivo no puede superar los 40 caracteres'
      });
    }

    // Se inicia la transaccion: si algo falla mas adelante, se puede revertir todo
    await connection.beginTransaction();

    // ============================================================
    // Verificar que el cliente exista
    // ============================================================
    // CAMBIO: se busca el cliente por su id (ya no por tipo y numero de documento)
    const [clientes] = await connection.query(`
      SELECT
        c.id_cliente,
        dp.id AS id_datos_personales,
        dp.id_tipo_documento,
        dp.numero_documento,
        dp.primer_nombre,
        dp.primer_apellido
      FROM Cliente c

      INNER JOIN Datos_personales dp
        ON c.id_datos_personales = dp.id

      WHERE c.id_cliente = ?
      LIMIT 1
    `, [
      id_cliente
    ]);

    // Si el cliente no esta registrado, no se puede agendar la cita
    if (clientes.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        error:
          'El cliente no está registrado. Primero debe registrar al cliente.'
      });
    }

    const cliente = clientes[0];

    // ============================================================
    // Verificar si ya existe una consulta en la misma fecha
    // ============================================================
    // Se evita que un mismo cliente tenga dos citas agendadas en la misma fecha y hora
    const [consultaExistente] = await connection.query(`
      SELECT id_agenda
      FROM Agenda_consulta
      WHERE id_cliente = ?
        AND fecha_hora = ?
      LIMIT 1
    `, [
      cliente.id_cliente,
      fecha_hora
    ]);

    if (consultaExistente.length > 0) {
      await connection.rollback();

      return res.status(400).json({
        error:
          'El paciente ya tiene una consulta agendada para esa fecha y hora'
      });
    }

    // ============================================================
    // Crear la historia clinica (si el cliente aun no tiene una)
    // ============================================================
    // NUEVO: la historia clinica se genera al agendar la consulta. Si el cliente ya
    // tiene una, se reutiliza; si no, se crea con la fecha de apertura de hoy.
    // IMPORTANTE: ajusta el nombre de la tabla si en tu base de datos se llama distinto.
    const [historias] = await connection.query(`
      SELECT id_historia
      FROM Historia_clinica
      WHERE id_cliente = ?
      LIMIT 1
    `, [
      cliente.id_cliente
    ]);

    let idHistoria;

    if (historias.length > 0) {
      idHistoria = historias[0].id_historia;
    } else {
      const [historiaNueva] = await connection.query(`
        INSERT INTO Historia_clinica (
          id_cliente,
          fecha_apertura
        )
        VALUES (?, CURDATE())
      `, [
        cliente.id_cliente
      ]);

      idHistoria = historiaNueva.insertId;
    }

    // ============================================================
    // Crear la consulta
    // ============================================================
    const [result] = await connection.query(`
      INSERT INTO Agenda_consulta (
        id_cliente,
        fecha_hora,
        motivo,
        estado
      )
      VALUES (?, ?, ?, ?)
    `, [
      cliente.id_cliente,
      fecha_hora,
      motivo,
      estado
    ]);

    // Si todo salio bien, se confirman los cambios de forma permanente
    await connection.commit();

    res.status(201).json({
      mensaje: 'Consulta agendada exitosamente',
      id_agenda: result.insertId,
      id_historia: idHistoria,
      cliente: {
        id_cliente: cliente.id_cliente,
        numero_documento: cliente.numero_documento,
        primer_nombre: cliente.primer_nombre,
        primer_apellido: cliente.primer_apellido
      }
    });

  } catch (error) {
    // Si algo fallo, se deshace cualquier cambio que se haya hecho en la transaccion
    await connection.rollback();

    console.error('Error al agendar consulta:', error);

    res.status(500).json({
      error: error.message
    });

  } finally {
    // Sin importar si hubo exito o error, siempre se libera la conexion de vuelta al pool
    connection.release();
  }
});


// ================================================================
// ACTUALIZAR CITA
// PUT /api/agendar-consulta/:id
// ================================================================
// Actualiza una cita existente (fecha y hora, motivo y estado)
// CAMBIO: el cliente de una cita ya no se cambia al editarla, por eso ya no se
// busca por documento: solo se actualizan los datos propios de la cita.
router.put('/:id', async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const {
      fecha_hora,
      motivo,
      estado
    } = req.body;

    if (
      !fecha_hora ||
      !motivo ||
      !estado
    ) {
      return res.status(400).json({
        error:
          'Fecha y hora, motivo y estado son obligatorios'
      });
    }

    // NUEVO: agenda_consulta.motivo es varchar(40)
    if (String(motivo).length > 40) {
      return res.status(400).json({
        error: 'El motivo no puede superar los 40 caracteres'
      });
    }

    await connection.beginTransaction();

    // Actualizar
    const [result] = await connection.query(`
      UPDATE Agenda_consulta
      SET
        fecha_hora = ?,
        motivo = ?,
        estado = ?
      WHERE id_agenda = ?
    `, [
      fecha_hora,
      motivo,
      estado,
      req.params.id
    ]);

    // Si no se actualizo ninguna fila, esa cita no existe
    if (result.affectedRows === 0) {
      await connection.rollback();

      return res.status(404).json({
        error: 'Consulta no encontrada'
      });
    }

    await connection.commit();

    res.json({
      mensaje: 'Consulta actualizada exitosamente'
    });

  } catch (error) {
    await connection.rollback();

    console.error('Error al actualizar consulta:', error);

    res.status(500).json({
      error: error.message
    });

  } finally {
    connection.release();
  }
});


// ============================================
// ELIMINAR CITA
// DELETE /api/agendar-consulta/:id
// ================================================================
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query(`
      DELETE FROM Agenda_consulta
      WHERE id_agenda = ?
    `, [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Consulta no encontrada'
      });
    }

    res.json({
      mensaje: 'Consulta eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error al eliminar consulta:', error);

    res.status(500).json({
      error: error.message
    });
  }
});


export default router;