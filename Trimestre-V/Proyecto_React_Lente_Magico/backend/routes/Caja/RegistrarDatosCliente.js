import { Router } from 'express'; //Es para crear las rutas
import pool from '../../db.js'; //El pool de conexiones a la base de datos

const router = Router();

// -------------------------------------------------------------------
// REGISTRAR DATOS DE CLIENTE (POST /clientes)
// -------------------------------------------------------------------
// Registra un cliente nuevo, reutilizando sus datos personales si ya estaban guardados
router.post('/', async (req, res) => {
  // Se obtiene una conexion individual del pool, necesaria para poder usar transacciones
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

    // Se inicia la transaccion: si algo falla mas adelante, se puede revertir todo
    await connection.beginTransaction();

    // Verificar si la persona ya existe en Datos_personales únicamente por su número de documento
    const [existente] = await connection.query(
      'SELECT id FROM Datos_personales WHERE numero_documento = ?',
      [numero_documento]
    );

    let idDatosCliente;

    if (existente.length > 0) {
      // La persona ya tiene datos personales guardados (por ejemplo, ya es un Usuario del sistema)
      idDatosCliente = existente[0].id;

      // Verificar si ya se encuentra registrada como Cliente
      const [clienteExistente] = await connection.query(
        'SELECT id_cliente FROM Cliente WHERE id_datos_personales = ?',
        [idDatosCliente]
      );

      // Si ya es cliente, no se puede volver a registrar
      if (clienteExistente.length > 0) {
        await connection.rollback();
        return res.status(400).json({
          error: 'El cliente ya se encuentra registrado en el sistema'
        });
      }
    } else {
      // Si la persona no existia, se insertan sus datos personales por primera vez
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

      // insertId trae el id que la base de datos le asigno a estos nuevos datos personales
      idDatosCliente = dpResult.insertId;
    }

    // Registrar en la tabla Cliente vinculando el id_datos_personales generado automáticamente
    // (ya sea el que existia o el que se acaba de crear)
    const [clienteResult] = await connection.query(
      `INSERT INTO Cliente (
        fecha_registro,
        id_datos_personales
      ) VALUES (NOW(), ?)`,
      [idDatosCliente]
    );

    // Si todo salio bien, se confirman los cambios de forma permanente
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
    // Si algo fallo, se deshace todo lo insertado (datos personales y/o cliente)
    await connection.rollback();
    console.error('Error al registrar cliente:', error);
    res.status(500).json({ error: error.message });
  } finally {
    // Sin importar si hubo exito o error, siempre se libera la conexion de vuelta al pool
    connection.release();
  }
});

export default router;