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

// NUEVO: trae la formula optica de una consulta. La formula se genera automaticamente
// al registrar la consulta, asi que la pantalla de formula la busca por aqui para
// completarla. Si la consulta aun no tiene formula, responde 404.
router.get("/formulas/consulta/:id_consulta", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT *
      FROM Formula_optica
      WHERE id_consulta = ?
      LIMIT 1
      `,
      [req.params.id_consulta]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: "La consulta no tiene una fórmula óptica registrada.",
      });
    }

    res.json(rows[0]);

  } catch (error) {
    console.error("Error al obtener la fórmula:", error);

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
  // CAMBIO: id_cliente ya no es obligatorio en la peticion, porque se puede
  // obtener de la consulta (mas abajo)
  if (
    !id_consulta ||
    !tipo_lente ||
    !uso
  ) {
    return res.status(400).json({
      error:
        "La consulta, el tipo de lente y el uso son obligatorios.",
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

    // NUEVO: si no llega id_cliente se usa el de la consulta
    const idClienteFinal = id_cliente || consulta[0].id_cliente;

    // Se verifica que el cliente indicado exista
    const [cliente] = await pool.query(
      `
      SELECT id_cliente
      FROM Cliente
      WHERE id_cliente = ?
      `,
      [idClienteFinal]
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
        Number(idClienteFinal),
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

// NUEVO: actualiza la formula optica de una consulta. Se usa para completar la
// formula que se genera automaticamente al registrar la consulta.
router.put("/formulas/:id", async (req, res) => {
  const {
    esfera_ojo_derecho_e_izquierdo,
    cilindro_ojo_derecho_e_izquierdo,
    eje_ojo_derecho_e_izquierdo,
    adicion,
    tipo_lente,
    uso,
    observaciones,
  } = req.body;

  // El tipo de lente y el uso son obligatorios para completar la formula
  if (!tipo_lente || !uso) {
    return res.status(400).json({
      error: "El tipo de lente y el uso son obligatorios.",
    });
  }

  try {

    const [resultado] = await pool.query(
      `
      UPDATE Formula_optica
      SET
        esfera_ojo_derecho_e_izquierdo = ?,
        cilindro_ojo_derecho_e_izquierdo = ?,
        eje_ojo_derecho_e_izquierdo = ?,
        adicion = ?,
        tipo_lente = ?,
        uso = ?,
        observaciones = ?
      WHERE id_formula = ?
      `,
      [
        esfera_ojo_derecho_e_izquierdo,
        cilindro_ojo_derecho_e_izquierdo,
        eje_ojo_derecho_e_izquierdo,
        adicion || "Sin adición",
        tipo_lente,
        uso,
        observaciones || "Sin observaciones",
        req.params.id,
      ]
    );

    // Si no se actualizo ninguna fila, esa formula no existe
    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        error: "Fórmula óptica no encontrada.",
      });
    }

    res.json({
      mensaje: "Fórmula óptica actualizada correctamente.",
    });

  } catch (error) {
    console.error("Error al actualizar fórmula:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});

export default router;