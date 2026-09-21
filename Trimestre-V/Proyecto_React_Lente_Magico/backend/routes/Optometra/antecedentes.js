import { Router } from "express";
import pool from "../../db.js";

const router = Router();

router.post("/antecedentes", async (req, res) => {
  const { id_historia, antecedentes } = req.body;

  if (!id_historia || !antecedentes?.trim()) {
    return res.status(400).json({
      error: "La historia clínica y los antecedentes son obligatorios.",
    });
  }

  try {
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

    const [resultado] = await pool.query(
      `INSERT INTO Antecedentes
       (id_historia, antecedentes)
       VALUES (?, ?)`,
      [id_historia, antecedentes.trim()]
    );

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