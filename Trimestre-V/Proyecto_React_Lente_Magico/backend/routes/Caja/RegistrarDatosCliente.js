import { Router } from 'express';
import pool from '../../db.js';

const router = Router();

// -------------------------------------------------------------------
// REGISTRAR DATOS DE CLIENTE (POST /clientes)
// -------------------------------------------------------------------
router.post('/', async (req, res) => {
  const connection = await pool.getConnection();

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

    // Validaciones básicas de campos requeridos por el formulario
    if (!id_tipo_documento || !numero_documento || !primer_nombre || !primer_apellido) {
      return res.status(400).json({
        error: 'El tipo de documento, número de documento, primer nombre y primer apellido son requeridos'
      });
    }

    await connection.beginTransaction();

    // Verificar si la persona ya existe en Datos_personales únicamente por su número de documento
    const [existente] = await connection.query(
      'SELECT id FROM Datos_personales WHERE numero_documento = ?',
      [numero_documento]
    );

    let idDatosCliente;

    if (existente.length > 0) {
      idDatosCliente = existente[0].id;

      // Verificar si ya se encuentra registrada como Cliente
      const [clienteExistente] = await connection.query(
        'SELECT id_cliente FROM Cliente WHERE id_datos_personales = ?',
        [idDatosCliente]
      );

      if (clienteExistente.length > 0) {
        await connection.rollback();
        return res.status(400).json({
          error: 'El cliente ya se encuentra registrado en el sistema'
        });
      }
    } else {
      // Insertar en Datos_personales sin campos de ID manuales
      const [dpResult] = await connection.query(
        `INSERT INTO Datos_personales (
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
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id_tipo_documento,
          numero_documento,
          primer_nombre,
          segundo_nombre || null,
          primer_apellido,
          segundo_apellido || null,
          fecha_nacimiento,
          genero || null,
          correo || null,
          telefono || null
        ]
      );

      idDatosCliente = dpResult.insertId;
    }

    // Registrar en la tabla Cliente vinculando el id_datos_personales generado automáticamente
    const [clienteResult] = await connection.query(
      `INSERT INTO Cliente (
        fecha_registro,
        id_datos_personales
      ) VALUES (NOW(), ?)`,
      [idDatosCliente]
    );

    await connection.commit();

    res.status(201).json({
      mensaje: 'Cliente registrado exitosamente',
      cliente: {
        numero_documento,
        primer_nombre,
        primer_apellido,
        telefono
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error al registrar cliente:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

export default router;