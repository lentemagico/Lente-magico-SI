import { Router } from "express"; //Es para crear las rutas
import pool from "../db.js"; //El pool de conexiones a la base de datos

const router = Router();

// GET /api/administrador/tipos-documento
// Trae todos los tipos de documento ordenados alfabeticamente
router.get("/", async (req, res) => {
  try {
    // Ejecuta la consulta a la base de datos pool.query, espera una respuesta await y la guarda en la variable tiposDocumento
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