import { Router } from "express"; //Es para crear las rutas
import pool from "../../db.js"; //El pool de conexiones a la base de datos

const router = Router();

// Registra un antecedente medico asociado a una historia clinica
router.post("/antecedentes", async (req, res) => {
  const { id_historia, antecedentes } = req.body;

  // Se valida que venga la historia clinica y que los antecedentes no esten vacios
  // ?. es el operador "encadenamiento opcional": evita el error si antecedentes viene undefined o null
  if (!id_historia || !antecedentes?.trim()) {
    return res.status(400).json({
      error: "La historia clínica y los antecedentes son obligatorios.",
    });
  }

  try {
    // Se verifica primero que la historia clinica exista antes de registrar el antecedente
    const [historia] = await pool.query(
      `SELECT id_historia
       FROM Historia_clinica
       WHERE id_historia = ?`,
      [id_historia]
    );

    if (historia.length === 0) {
      return res.status(404).json({
        error: "La historia clínica no existe.",
      });
    }

    // Se inserta el nuevo antecedente
    const [resultado] = await pool.query(
      `INSERT INTO Antecedentes
       (id_historia, antecedentes)
       VALUES (?, ?)`,
      [id_historia, antecedentes.trim()]
    );

    // insertId trae el id que la base de datos le asigno a este nuevo registro
    res.status(201).json({
      mensaje: "Antecedente registrado correctamente.",
      id_antecedentes: resultado.insertId,
    });

  } catch (error) {
    console.error("Error al registrar antecedente:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});

export default router;