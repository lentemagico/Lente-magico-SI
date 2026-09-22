import express from "express"; //Es para crear las rutas
import pool from "../../db.js"; //El pool de conexiones a la base de datos

const router = express.Router();

// Registra una consulta medica, creando la historia clinica si el cliente no tiene una
router.post("/consulta", async (req, res) => {
  // Se obtiene una conexion individual del pool, necesaria para poder usar transacciones
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

    // Se validan los datos minimos obligatorios para registrar la consulta
    if (!id_cliente || !id_usuario || !motivo) {
      return res.status(400).json({
        error: "Faltan datos obligatorios para registrar la consulta.",
      });
    }

    // Se inicia la transaccion: si algo falla mas adelante, se puede revertir todo
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

      // insertId trae el id que la base de datos le asigno a la nueva historia
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

    // Si algunos campos opcionales no llegan, se guarda un texto por defecto en vez de dejarlos vacios
    const [resultado] = await conexion.query(sql, [
      id_cliente,
      id_usuario,
      idHistoriaFinal,
      motivo,
      resultado_examen || "Sin resultado registrado",
      diagnostico || "Sin diagnóstico registrado",
      recomendaciones || "Sin recomendaciones",
    ]);

    // Si todo salio bien, se confirman los cambios de forma permanente
    await conexion.commit();

    res.status(201).json({
      mensaje: "Consulta registrada correctamente.",
      id_consulta: resultado.insertId,
      id_historia: idHistoriaFinal,
    });
  } catch (error) {
    // Si algo fallo en cualquier punto, se deshace todo lo insertado (la historia clinica y/o la consulta)
    await conexion.rollback();
    console.error("Error al registrar consulta:", error);

    res.status(500).json({
      error: "Error al registrar la consulta.",
    });
  } finally {
    // Sin importar si hubo exito o error, siempre se libera la conexion de vuelta al pool
    conexion.release();
  }
});

export default router;