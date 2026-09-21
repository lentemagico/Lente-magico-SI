import { Router } from "express";
import bcrypt from "bcryptjs";
import pool from "../db.js";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { correo, contrasena } = req.body;
    if (!correo || !contrasena) {
      return res.status(400).json({
        mensaje: "Correo y contraseña son campos requeridos",
      });
    }

    const [rows] = await pool.query(
      `
      SELECT 
        u.id,
        u.contrasenia,
        u.activar_usuario,
        dp.correo,
        dp.primer_nombre,
        dp.segundo_nombre,
        dp.primer_apellido,
        dp.segundo_apellido,
        a.nombre AS rol
      FROM Usuario u
      INNER JOIN Datos_personales dp 
        ON u.id_datos_personales = dp.id
      LEFT JOIN Autorizacion_usuario au
        ON au.id_sistema_usuario = u.id
      LEFT JOIN Autorizacion a
        ON a.id = au.id_autorizacion
      WHERE dp.correo = ?
      `,
      [correo]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        mensaje: "Correo electrónico o contraseña incorrectos.",
      });
    }

    const usuario = rows[0];

    const contraseniaValida = await bcrypt.compare(contrasena, usuario.contrasenia);

    if (!contraseniaValida) {
      return res.status(401).json({
        mensaje: "Correo electrónico o contraseña incorrectos.",
      });
    }

    if (usuario.activar_usuario === 0) {
      return res.status(403).json({
        mensaje: "Usuario inactivo",
      });
    }

    const nombre = [
      usuario.primer_nombre,
      usuario.segundo_nombre,
      usuario.primer_apellido,
      usuario.segundo_apellido,
    ]
      .filter(Boolean)
      .join(" ");

    res.status(200).json({
      mensaje: "Login exitoso",
      usuario: {
        id: usuario.id,
        nombre: nombre,
        login: usuario.correo,
        correo: usuario.correo,
        rol: usuario.rol || "Sin rol asignado",
        id_autorizacion: usuario.id_autorizacion,
      },
      token: null,
    });

  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({
      mensaje: "Error en el servidor",
      error: error.message,
    });
  }
});

export default router;