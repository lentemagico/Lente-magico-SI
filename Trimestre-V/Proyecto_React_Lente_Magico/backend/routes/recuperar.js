import express from "express"; //Es para crear las rutas
import crypto from "crypto"; //Para generar el codigo de recuperacion aleatorio
import pool from "../db.js"; //El pool de conexiones a la base de datos

const router = express.Router();

// Genera un codigo de recuperacion para restablecer la contraseña
router.post("/recuperar", async (req, res) => {
  try {
    const { correo } = req.body;

    if (!correo) {
      return res.status(400).json({
        error: "El correo electrónico es obligatorio.",
      });
    }

    // Se busca al usuario por su correo
    const [usuarios] = await pool.query(
      `
      SELECT 
        u.id,
        dp.correo
      FROM Usuario u
      INNER JOIN Datos_personales dp
        ON u.id_datos_personales = dp.id
      WHERE dp.correo = ?
      `,
      [correo]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({
        error: "No existe un usuario registrado con ese correo.",
      });
    }

    const usuario = usuarios[0];

    // Genera un codigo aleatorio en formato hexadecimal, que sirve como "llave" de recuperacion
    const codigo = crypto.randomBytes(10).toString("hex");

    // Se guarda el codigo y la hora en que se genero, para poder validar despues que no haya expirado
    await pool.query(
      `
      UPDATE Usuario
      SET 
        llave_reinicio = ?,
        hora_reinicio = NOW()
      WHERE id = ?
      `,
      [codigo, usuario.id]
    );

    console.log("Código de recuperación:", codigo);

    return res.json({
      mensaje: "Código de recuperación generado correctamente.",
      codigo: codigo,
    });

  } catch (error) {
    console.error("Error al recuperar contraseña:", error);

    res.status(500).json({
      error: "Error interno del servidor.",
    });
  }
});

// Cambia la contraseña del usuario, validando el codigo de recuperacion enviado
router.post("/cambiar-contrasena", async (req, res) => {
  try {
    const {
      correo,
      codigo,
      nuevaContrasena,
    } = req.body;

    // Se validan que vengan todos los campos necesarios
    if (!correo || !codigo || !nuevaContrasena) {
      return res.status(400).json({
        error: "Todos los campos son obligatorios.",
      });
    }

    // Se valida un largo minimo para la nueva contraseña
    if (nuevaContrasena.length < 4) {
      return res.status(400).json({
        error: "La contraseña debe tener mínimo 4 caracteres.",
      });
    }

    // Buscar usuario
    const [usuarios] = await pool.query(
      `
      SELECT 
        u.id,
        u.llave_reinicio,
        u.hora_reinicio
      FROM Usuario u
      INNER JOIN Datos_personales dp
        ON u.id_datos_personales = dp.id
      WHERE dp.correo = ?
      `,
      [correo]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({
        error: "Usuario no encontrado.",
      });
    }

    const usuario = usuarios[0];

    // Verificar código: debe coincidir exactamente con el que se genero antes
    if (usuario.llave_reinicio !== codigo) {
      return res.status(400).json({
        error: "El código de recuperación no es válido.",
      });
    }

    // Verificar que no hayan pasado más de 15 minutos
    // Se calcula la diferencia entre la hora actual y la hora en que se genero el codigo, en minutos
    const horaCreacion = new Date(usuario.hora_reinicio);
    const ahora = new Date();

    const diferencia =
      (ahora.getTime() - horaCreacion.getTime()) / 1000 / 60;

    if (diferencia > 15) {
      return res.status(400).json({
        error: "El código de recuperación ha expirado.",
      });
    }

    // Actualizar contraseña
    // Se limpia el codigo de recuperacion (llave_reinicio y hora_reinicio en null) para que no se pueda reutilizar
    await pool.query(
      `
      UPDATE Usuario
      SET 
        contrasenia = ?,
        llave_reinicio = NULL,
        hora_reinicio = NULL
      WHERE id = ?
      `,
      [nuevaContrasena, usuario.id]
    );

    res.json({
      mensaje: "Contraseña actualizada correctamente.",
    });

  } catch (error) {
    console.error("Error al cambiar contraseña:", error);

    res.status(500).json({
      error: "Error interno del servidor.",
    });
  }
});

export default router;