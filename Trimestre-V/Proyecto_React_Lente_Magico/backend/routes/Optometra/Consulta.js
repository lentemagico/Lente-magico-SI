import express from "express"; //Es para crear las rutas
import pool from "../../db.js"; //El pool de conexiones a la base de datos

const router = express.Router();

// Registra una consulta medica, creando la historia clinica si el cliente no tiene una
// y asociandola a una cita de la agenda (la existente o una nueva si se atiende sin cita)
router.post("/consulta", async (req, res) => {
  // Se obtiene una conexion individual del pool, necesaria para poder usar transacciones
  const conexion = await pool.getConnection();

  try {
    // NUEVO: ahora tambien llegan id_agenda y evolucion desde el formulario.
    // id_historia y fecha_hora ya no se toman del frontend: se calculan aqui.
    const {
      id_cliente,
      id_usuario,
      id_agenda,
      motivo,
      resultado_examen,
      diagnostico,
      recomendaciones,
      evolucion,
    } = req.body;

    // Se validan los datos minimos obligatorios para registrar la consulta
    if (!id_cliente || !id_usuario || !motivo) {
      return res.status(400).json({
        error: "Faltan datos obligatorios para registrar la consulta.",
      });
    }

    // Se inicia la transaccion: si algo falla mas adelante, se puede revertir todo
    await conexion.beginTransaction();

    // 1. Buscamos si el cliente YA tiene una historia clínica (id_cliente es UNIQUE)
    const [historiasExistentes] = await conexion.query(
      `SELECT id_historia FROM Historia_clinica WHERE id_cliente = ?`,
      [id_cliente]
    );

    let idHistoriaFinal;

    if (historiasExistentes.length > 0) {
      // Ya existe: la reutilizamos
      idHistoriaFinal = historiasExistentes[0].id_historia;
    } else {
      // No existe: la creamos (la tabla solo tiene id_cliente y fecha_apertura)
      const [resultadoHistoria] = await conexion.query(
        `INSERT INTO Historia_clinica (id_cliente, fecha_apertura)
         VALUES (?, CURDATE())`,
        [id_cliente]
      );

      // insertId trae el id que la base de datos le asigno a la nueva historia
      idHistoriaFinal = resultadoHistoria.insertId;
    }

    // 2. Definimos la cita (Consulta.id_agenda es NOT NULL)
    let idAgendaFinal;

    if (id_agenda) {
      // Viene de una cita agendada por caja: se valida que sea de este cliente y siga pendiente
      const [agendas] = await conexion.query(
        `SELECT id_agenda, estado FROM Agenda_consulta
         WHERE id_agenda = ? AND id_cliente = ?`,
        [id_agenda, id_cliente]
      );

      if (agendas.length === 0) {
        await conexion.rollback();
        return res.status(400).json({
          error: "La cita seleccionada no existe o no pertenece a este paciente.",
        });
      }

      if (agendas[0].estado !== "Pendiente") {
        await conexion.rollback();
        return res.status(409).json({
          error: "La cita seleccionada ya fue atendida o no esta pendiente.",
        });
      }

      idAgendaFinal = agendas[0].id_agenda;
    } else {
      // Consulta sin cita previa: se crea una cita para poder cumplir la llave foranea
      const [resultadoAgenda] = await conexion.query(
        `INSERT INTO Agenda_consulta (id_cliente, fecha_hora, motivo, estado)
         VALUES (?, NOW(), ?, 'Atendida')`,
        [id_cliente, motivo]
      );

      idAgendaFinal = resultadoAgenda.insertId;
    }

    // 3. Insertamos la consulta (ya no lleva id_cliente: se llega al cliente por la historia)
    const sql = `
      INSERT INTO Consulta (
        id_usuario,
        id_historia,
        fecha_hora,
        motivo,
        resultado_examen,
        diagnostico,
        recomendaciones,
        evolucion,
        id_agenda
      )
      VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?)
    `;

    // Si algunos campos opcionales no llegan, se guarda un texto por defecto en vez de dejarlos vacios
    const [resultado] = await conexion.query(sql, [
      id_usuario,
      idHistoriaFinal,
      motivo,
      resultado_examen || "Sin resultado registrado",
      diagnostico || "Sin diagnóstico registrado",
      recomendaciones || "Sin recomendaciones",
      evolucion || "Sin evolución registrada",
      idAgendaFinal,
    ]);

    // 4. Si la consulta venia de una cita pendiente, se marca como atendida
    if (id_agenda) {
      await conexion.query(
        `UPDATE Agenda_consulta SET estado = 'Atendida' WHERE id_agenda = ?`,
        [idAgendaFinal]
      );
    }

    // Si todo salio bien, se confirman los cambios de forma permanente
    await conexion.commit();

    res.status(201).json({
      mensaje: "Consulta registrada correctamente.",
      id_consulta: resultado.insertId,
      id_historia: idHistoriaFinal,
      id_agenda: idAgendaFinal,
    });
  } catch (error) {
    // Si algo fallo en cualquier punto, se deshace todo lo insertado (historia, cita y/o consulta)
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