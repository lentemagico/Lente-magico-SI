import { Router } from 'express';
import pool from '../../db.js';

const router = Router();


// ================================================================
// OBTENER AGENDA
// GET /api/agendar-consulta
// ================================================================
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const search = req.query.search || '';
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

    let countQuery = `
      SELECT COUNT(*) AS total
      FROM Agenda_consulta a

      INNER JOIN Cliente c
        ON a.id_cliente = c.id_cliente

      INNER JOIN Datos_personales dp
        ON c.id_datos_personales = dp.id
    `;

    const params = [];

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

      const s = `%${search}%`;

      params.push(s, s, s, s, s);
    }

    query += `
      ORDER BY a.fecha_hora ASC
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
router.post('/', async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const {
      id_tipo_documento,
      numero_documento,
      fecha_hora,
      motivo,
      estado
    } = req.body;

    // Validaciones
    if (
      !id_tipo_documento ||
      !numero_documento ||
      !motivo ||
      !fecha_hora ||
      !estado
    ) {
      return res.status(400).json({
        error:
          'Tipo de documento, número de documento, fecha y hora, motivo y estado son obligatorios'
      });
    }

    await connection.beginTransaction();

    // ============================================================
    // Buscar al cliente por documento
    // ============================================================
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

      WHERE dp.numero_documento = ?
        AND dp.id_tipo_documento = ?
      LIMIT 1
    `, [
      numero_documento,
      id_tipo_documento
    ]);

    if (clientes.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        error:
          'El paciente no está registrado como cliente. Primero debe registrar al cliente.'
      });
    }

    const cliente = clientes[0];

    // ============================================================
    // Verificar si ya existe una consulta en la misma fecha
    // ============================================================
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

    await connection.commit();

    res.status(201).json({
      mensaje: 'Consulta agendada exitosamente',
      id_agenda: result.insertId,
      cliente: {
        id_cliente: cliente.id_cliente,
        numero_documento: cliente.numero_documento,
        primer_nombre: cliente.primer_nombre,
        primer_apellido: cliente.primer_apellido
      }
    });

  } catch (error) {
    await connection.rollback();

    console.error('Error al agendar consulta:', error);

    res.status(500).json({
      error: error.message
    });

  } finally {
    connection.release();
  }
});


// ================================================================
// ACTUALIZAR CITA
// PUT /api/agendar-consulta/:id
// ================================================================
router.put('/:id', async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const {
      id_tipo_documento,
      numero_documento,
      fecha_hora,
      motivo,
      estado
    } = req.body;

    if (
      !id_tipo_documento ||
      !numero_documento ||
      !fecha_hora ||
      !motivo ||
      !estado
    ) {
      return res.status(400).json({
        error:
          'Tipo de documento, número de documento, fecha y hora, motivo y estado son obligatorios'
      });
    }

    await connection.beginTransaction();

    // Buscar cliente
    const [clientes] = await connection.query(`
      SELECT c.id_cliente
      FROM Cliente c

      INNER JOIN Datos_personales dp
        ON c.id_datos_personales = dp.id

      WHERE dp.numero_documento = ?
        AND dp.id_tipo_documento = ?
      LIMIT 1
    `, [
      numero_documento,
      id_tipo_documento
    ]);

    if (clientes.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        error: 'El paciente no está registrado como cliente'
      });
    }

    const idCliente = clientes[0].id_cliente;

    // Actualizar
    const [result] = await connection.query(`
      UPDATE Agenda_consulta
      SET
        id_cliente = ?,
        fecha_hora = ?,
        motivo = ?,
        estado = ?
      WHERE id_agenda = ?
    `, [
      idCliente,
      fecha_hora,
      motivo,
      estado,
      req.params.id
    ]);

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


// ================================================================
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
