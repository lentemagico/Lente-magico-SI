import { Router } from "express";
import pool from "../../db.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        id,
        id_usuario,
        nivel,
        nombre_usuario,
        mensaje,
        fecha
      FROM log_errores
      ORDER BY fecha DESC, id DESC
    `);

    res.json(rows);
  } catch (error) {
    console.error("Error al obtener log de errores:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});

router.get("/usuario/:id_usuario", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
        SELECT
          id,
          id_usuario,
          nivel,
          nombre_usuario,
          mensaje,
          fecha
        FROM log_errores
        WHERE id_usuario = ?
        ORDER BY fecha DESC, id DESC
      `,
      [req.params.id_usuario]
    );

    res.json(rows);
  } catch (error) {
    console.error("Error al obtener log por usuario:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const { id_usuario = null, nivel, nombre_usuario = "Sistema", mensaje } =
      req.body;

    if (!nivel || !mensaje) {
      return res.status(400).json({
        error: "Nivel y mensaje son requeridos",
      });
    }

    const [resultado] = await pool.query(
      `
        INSERT INTO log_errores (
          id_usuario,
          nivel,
          nombre_usuario,
          mensaje,
          fecha
        )
        VALUES (?, ?, ?, ?, NOW())
      `,
      [id_usuario, nivel, nombre_usuario, mensaje]
    );

    res.status(201).json({
      mensaje: "Error registrado exitosamente",
      id: resultado.insertId,
    });
  } catch (error) {
    console.error("Error al registrar error:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});

export default router;