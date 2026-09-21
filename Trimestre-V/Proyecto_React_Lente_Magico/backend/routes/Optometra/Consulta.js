// import express from "express";
// import pool from "../db.js";

// const router = express.Router();

// router.post("/consulta", async (req, res) => {
//   try {
//     const {
//       id_cliente,
//       id_usuario,
//       id_historia,
//       motivo,
//       resultado_examen,
//       diagnostico,
//       recomendaciones,
//     } = req.body;

//     if (
//       !id_cliente ||
//       !id_usuario ||
//       !id_historia ||
//       !motivo
//     ) {
//       return res.status(400).json({
//         error: "Faltan datos obligatorios para registrar la consulta.",
//       });
//     }

//     const sql = `
//       INSERT INTO Consulta (
//         id_cliente,
//         id_usuario,
//         id_historia,
//         motivo,
//         resultado_examen,
//         diagnostico,
//         recomendaciones
//       )
//       VALUES (?, ?, ?, ?, ?, ?, ?)
//     `;

//     const [resultado] = await pool.query(sql, [
//       id_cliente,
//       id_usuario,
//       id_historia,
//       motivo,
//       resultado_examen || "Sin resultado registrado",
//       diagnostico || "Sin diagnóstico registrado",
//       recomendaciones || "Sin recomendaciones",
//     ]);

//     res.status(201).json({
//       mensaje: "Consulta registrada correctamente.",
//       id_consulta: resultado.insertId,
//     });
//   } catch (error) {
//     console.error("Error al registrar consulta:", error);

//     res.status(500).json({
//       error: "Error al registrar la consulta.",
//     });
//   }
// });

// export default router;

import express from "express";
import pool from "../../db.js";

const router = express.Router();

router.post("/consulta", async (req, res) => {
  const conexion = await pool.getConnection();

  try {
    const {
      id_cliente,
      id_usuario,
      motivo,
      resultado_examen,
      diagnostico,
      recomendaciones,
    } = req.body;

    if (!id_cliente || !id_usuario || !motivo) {
      return res.status(400).json({
        error: "Faltan datos obligatorios para registrar la consulta.",
      });
    }

    await conexion.beginTransaction();

    // 1. Buscamos si el cliente YA tiene una historia clínica
    const [historiasExistentes] = await conexion.query(
      `SELECT id_historia FROM historia_clinica WHERE id_cliente = ?`,
      [id_cliente]
    );

    let idHistoriaFinal;

    if (historiasExistentes.length > 0) {
      // Ya existe: la reutilizamos
      idHistoriaFinal = historiasExistentes[0].id_historia;
    } else {
      // No existe: la creamos
      const [resultadoHistoria] = await conexion.query(
        `INSERT INTO historia_clinica (id_cliente, fecha_apertura, evolucion, num_consulta)
         VALUES (?, CURDATE(), ?, ?)`,
        [id_cliente, "Sin evolución registrada", 1]
      );

      idHistoriaFinal = resultadoHistoria.insertId;
    }

    // 2. Insertamos la consulta usando el id_historia correcto
    const sql = `
      INSERT INTO consulta (
        id_cliente,
        id_usuario,
        id_historia,
        fecha_hora,
        motivo,
        resultado_examen,
        diagnostico,
        recomendaciones
      )
      VALUES (?, ?, ?, NOW(), ?, ?, ?, ?)
    `;

    const [resultado] = await conexion.query(sql, [
      id_cliente,
      id_usuario,
      idHistoriaFinal,
      motivo,
      resultado_examen || "Sin resultado registrado",
      diagnostico || "Sin diagnóstico registrado",
      recomendaciones || "Sin recomendaciones",
    ]);

    await conexion.commit();

    res.status(201).json({
      mensaje: "Consulta registrada correctamente.",
      id_consulta: resultado.insertId,
      id_historia: idHistoriaFinal,
    });
  } catch (error) {
    await conexion.rollback();
    console.error("Error al registrar consulta:", error);

    res.status(500).json({
      error: "Error al registrar la consulta.",
    });
  } finally {
    conexion.release();
  }
});

export default router;