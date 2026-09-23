import { Router } from "express"; //Es para crear las rutas
import pool from "../../db.js"; //El pool de conexiones a la base de datos

const router = Router();

// Trae todas las consultas ordenadas de la mas reciente a la mas antigua
router.get("/consultas", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        c.id_consulta,
        c.id_cliente,
        c.id_usuario,
        c.id_historia,
        c.fecha_hora,
        c.motivo,
        c.resultado_examen,
        c.diagnostico,
        c.recomendaciones
      FROM Consulta c
      ORDER BY c.fecha_hora DESC
    `);

    res.json(rows);

  } catch (error) {
    console.error("Error al obtener consultas:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});

// Registra la formula optica de una consulta
router.post("/formulas", async (req, res) => {
  const {
    id_consulta,
    id_cliente,
    esfera_ojo_derecho_e_izquierdo,
    cilindro_ojo_derecho_e_izquierdo,
    eje_ojo_derecho_e_izquierdo,
    adicion,
    tipo_lente,
    uso,
    observaciones,
  } = req.body;

  // Se validan los campos obligatorios para poder registrar la formula
  if (
    !id_consulta ||
    !id_cliente ||
    !tipo_lente ||
    !uso
  ) {
    return res.status(400).json({
      error:
        "La consulta, el cliente, el tipo de lente y el uso son obligatorios.",
    });
  }

  try {

    // Se verifica que la consulta indicada exista antes de registrar la formula
    const [consulta] = await pool.query(
      `
      SELECT
        id_consulta,
        id_cliente
      FROM Consulta
      WHERE id_consulta = ?
      `,
      [id_consulta]
    );

    if (consulta.length === 0) {
      return res.status(404).json({
        error: "La consulta seleccionada no existe.",
      });
    }

    // Se verifica que el cliente indicado exista
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
        error: "El cliente seleccionado no existe.",
      });
    }

    // Se valida que esa consulta no tenga ya una formula registrada (solo una por consulta)
    const [formulaExistente] = await pool.query(
      `
      SELECT id_formula
      FROM Formula_optica
      WHERE id_consulta = ?
      `,
      [id_consulta]
    );

    if (formulaExistente.length > 0) {
      return res.status(409).json({
        error:
          "Esta consulta ya tiene una fórmula óptica registrada.",
      });
    }

    // Se inserta la nueva formula optica
    // Number(...) asegura que los ids se guarden como numero y no como texto
    const [resultado] = await pool.query(
      `
      INSERT INTO Formula_optica (
        id_consulta,
        id_cliente,
        esfera_ojo_derecho_e_izquierdo,
        cilindro_ojo_derecho_e_izquierdo,
        eje_ojo_derecho_e_izquierdo,
        adicion,
        tipo_lente,
        uso,
        observaciones,
        fecha_generacion
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE())
      `,
      [
        Number(id_consulta),
        Number(id_cliente),
        esfera_ojo_derecho_e_izquierdo,
        cilindro_ojo_derecho_e_izquierdo,
        eje_ojo_derecho_e_izquierdo,
        adicion || "Sin adición",
        tipo_lente,
        uso,
        observaciones || "Sin observaciones",
      ]
    );

    res.status(201).json({
      mensaje: "Fórmula óptica registrada correctamente.",
      id_formula: resultado.insertId,
    });

  } catch (error) {
    console.error("Error al registrar fórmula:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});

export default router;