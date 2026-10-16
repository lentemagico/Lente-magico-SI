import "dotenv/config"; // Carga el .env aquí mismo, así MAIL_USER y MAIL_PASS siempre están disponibles
import express from "express";
import crypto from "crypto";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import pool from "../db.js";

const router = express.Router();

// Configuración del correo (usa variables de entorno, no escribas la clave en el código)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS, // contraseña de aplicación de Gmail
  },
});

// Mensaje de diagnóstico al arrancar (puedes borrarlo cuando todo funcione)
console.log(
  "MAIL_USER:",
  process.env.MAIL_USER,
  "| MAIL_PASS cargada:",
  !!process.env.MAIL_PASS,
);

// ---------- Solicitar código ----------
router.post("/recuperar", async (req, res) => {
  try {
    const { correo } = req.body;

    if (!correo) {
      return res
        .status(400)
        .json({ error: "El correo electrónico es obligatorio." });
    }

    // Misma respuesta siempre, exista o no el correo
    const respuesta = {
      mensaje:
        "Si el correo está registrado, te enviamos un código de recuperación.",
    };

    const [usuarios] = await pool.query(
      `SELECT u.id, dp.correo
       FROM Usuario u
       INNER JOIN Datos_personales dp ON u.id_datos_personales = dp.id
       WHERE dp.correo = ?`,
      [correo],
    );

    if (usuarios.length === 0) {
      return res.json(respuesta);
    }

    const usuario = usuarios[0];

    // Código de 6 dígitos, más cómodo de escribir desde el correo
    const codigo = crypto.randomInt(100000, 1000000).toString();
    const codigoHash = crypto.createHash("sha256").update(codigo).digest("hex");

    // Se guarda el HASH del código, no el código en claro
    await pool.query(
      `UPDATE Usuario
       SET llave_reinicio = ?, hora_reinicio = NOW()
       WHERE id = ?`,
      [codigoHash, usuario.id],
    );

    await transporter.sendMail({
      from: `"Lente Mágico" <${process.env.MAIL_USER}>`,
      to: usuario.correo,
      subject: "Código de recuperación de contraseña",
      text: `Tu código de recuperación es: ${codigo}\nVence en 15 minutos. Si no lo solicitaste, ignora este mensaje.`,
    });

    return res.json(respuesta); // NO se devuelve el código
  } catch (error) {
    // El detalle real del error aparece en la terminal del servidor
    console.error("Error al recuperar contraseña:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

// ---------- Cambiar contraseña ----------
router.post("/cambiar-contrasena", async (req, res) => {
  try {
    const { correo, codigo, nuevaContrasena } = req.body;

    if (!correo || !codigo || !nuevaContrasena) {
      return res
        .status(400)
        .json({ error: "Todos los campos son obligatorios." });
    }

    if (nuevaContrasena.length < 8) {
      return res
        .status(400)
        .json({ error: "La contraseña debe tener mínimo 8 caracteres." });
    }

    const [usuarios] = await pool.query(
      `SELECT u.id, u.llave_reinicio, u.hora_reinicio
       FROM Usuario u
       INNER JOIN Datos_personales dp ON u.id_datos_personales = dp.id
       WHERE dp.correo = ?`,
      [correo],
    );

    const errorGenerico = { error: "Código inválido o expirado." };
    const usuario = usuarios[0];

    if (!usuario || !usuario.llave_reinicio || !usuario.hora_reinicio) {
      return res.status(400).json(errorGenerico);
    }

    // Expiración: 15 minutos
    const minutos =
      (Date.now() - new Date(usuario.hora_reinicio).getTime()) / 1000 / 60;
    if (minutos > 15) {
      return res.status(400).json(errorGenerico);
    }

    // Comparación segura del hash del código
    const hashIngresado = crypto
      .createHash("sha256")
      .update(String(codigo).trim())
      .digest("hex");
    const a = Buffer.from(hashIngresado);
    const b = Buffer.from(usuario.llave_reinicio);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(400).json(errorGenerico);
    }

    // Contraseña con hash y código invalidado
    const contraseniaHash = await bcrypt.hash(nuevaContrasena, 10);
    await pool.query(
      `UPDATE Usuario
       SET contrasenia = ?, llave_reinicio = NULL, hora_reinicio = NULL
       WHERE id = ?`,
      [contraseniaHash, usuario.id],
    );

    res.json({ mensaje: "Contraseña actualizada correctamente." });
  } catch (error) {
    console.error("Error al cambiar contraseña:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

export default router;