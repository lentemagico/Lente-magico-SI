import express from "express"; //Es para crear las rutas
import pool from "../../db.js"; //El pool de conexiones a la base de datos

const router = express.Router();

// Trae todos los pacientes (clientes) con su nombre completo y su historia clinica si tienen una
router.get("/cliente", async (req, res) => {
  try {
        // CONCAT une varios campos en un solo texto; IFNULL reemplaza por '' si el campo viene null
        // (ej: si no tiene segundo nombre, no se muestra "null" en el nombre completo)
        const [pacientes] = await pool.query(`
      SELECT
        c.id_cliente,
        CONCAT(
          dp.primer_nombre, ' ',
          IFNULL(dp.segundo_nombre, ''), ' ',
          dp.primer_apellido, ' ',
          IFNULL(dp.segundo_apellido, '')
        ) AS nombre,
        dp.numero_documento AS numeroDocumento,
        hc.id_historia AS id_historia
      FROM Cliente c
      INNER JOIN Datos_personales dp
        ON c.id_datos_personales = dp.id
      LEFT JOIN Historia_clinica hc
        ON hc.id_cliente = c.id_cliente
      ORDER BY dp.primer_nombre ASC
    `);

    res.json(pacientes);
  } catch (error) {
    console.error("Error al obtener pacientes:", error);

    res.status(500).json({
      error: "No fue posible cargar los pacientes."
    });
  }
});

// Registra la historia clinica de un paciente
router.post("/historia-clinica", async (req, res) => {
  try {
    const {
      id_cliente,
      fecha_apertura,
      evolucion,
      num_consulta
    } = req.body;

    // Se validan los campos obligatorios
    if (!id_cliente || !fecha_apertura) {
      return res.status(400).json({
        error: "El paciente y la fecha de apertura son obligatorios."
      });
    }

    // Se verifica que el cliente exista antes de crearle una historia clinica
    const [cliente] = await pool.query(
      `
      SELECT id_cliente
      FROM Cliente
      WHERE id_cliente = ?
      `,
      [id_cliente]
    );

    if (cliente.length === 0) {
      return res.status(404).json({
        error: "El cliente seleccionado no existe."
      });
    }

    // Se valida que ese cliente no tenga ya una historia clinica (solo puede tener una)
    const [historiaExistente] = await pool.query(
      `
      SELECT id_historia
      FROM Historia_clinica
      WHERE id_cliente = ?
      `,
      [id_cliente]
    );

    if (historiaExistente.length > 0) {
      return res.status(400).json({
        error: "Este cliente ya tiene una historia clínica registrada."
      });
    }

    // Se inserta la nueva historia clinica
    // ?? solo reemplaza cuando el valor es null o undefined, a diferencia de ||
    const [resultado] = await pool.query(
      `
      INSERT INTO Historia_clinica
      (
        id_cliente,
        fecha_apertura,
        evolucion,
        num_consulta
      )
      VALUES (?, ?, ?, ?)
      `,
      [
        id_cliente,
        fecha_apertura,
        evolucion || "Sin evolución inicial",
        num_consulta ?? 0
      ]
    );

    res.status(201).json({
      mensaje: "Historia clínica registrada correctamente.",
      id_historia: resultado.insertId
    });

  } catch (error) {
    console.error("Error al registrar historia clínica:", error);

    res.status(500).json({
      error: "No fue posible registrar la historia clínica."
    });
  }
});

export default router;