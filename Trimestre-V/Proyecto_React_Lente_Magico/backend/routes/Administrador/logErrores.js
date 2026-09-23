import { Router } from "express";//Es para crear las rutas
import pool from "../../db.js";//El pool  conexiones a la base de datos

const router = Router();

// Trae todos los registros del log de errores, del más reciente al más antiguo
// responde a peticiones GET desde la raiz '/' F asicronna recibe la peticion req y la res-puesta
router.get("/", async (req, res) => {
  try {
        // Ejecuta la consulta a la base de datos pool.query, espera una respuesta await y la guarda en la variable rows
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

// Trae el log de errores filtrado por un usuario específico
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
      [req.params.id_usuario] //viene de la peticion
    );

    res.json(rows);
  } catch (error) {
    console.error("Error al obtener log por usuario:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});
// Registra un nuevo error en el log
router.post("/", async (req, res) => {
  try {
    const { id_usuario = null, nivel, nombre_usuario = "Sistema", mensaje } =
      req.body;
// El nivel y el mensaje son obligatorios para poder registrar el error
    if (!nivel || !mensaje) {
      return res.status(400).json({
        error: "Nivel y mensaje son requeridos",
      });
    }
// Insertamos el nuevo registro; NOW() guarda automáticamente la fecha y hora actual
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
 // resultado.insertId trae el id que la base de datos le asignó al nuevo registro
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