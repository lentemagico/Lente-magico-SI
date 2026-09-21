import { Router } from "express";
import pool from "../db.js";

const router = Router();

// GET /api/administrador/tipos-documento
router.get("/", async (req, res) => {
  try {
    const [tiposDocumento] = await pool.query(`
      SELECT
        id,
        sigla,
        nombre_documento
      FROM Tipo_documento
      ORDER BY nombre_documento ASC
    `);

    res.json(tiposDocumento);
  } catch (error) {
    console.error("Error al obtener tipos de documento:", error);

    res.status(500).json({
      mensaje: "No fue posible obtener los tipos de documento",
      detalle: error.message,
    });
  }
});

export default router;