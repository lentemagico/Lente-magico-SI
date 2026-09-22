import { Router } from "express";
import bcrypt from "bcryptjs";
import pool from "../../db.js";

const router = Router();

// GET /api/administrador/usuarios
// Trae todos los usuarios con sus datos personales y su rol asignado
// responde a peticiones GET desde la raiz '/' F asicronna recibe la peticion req y la res-puesta
router.get("/", async (req, res) => {
  try {
    const [usuarios] = await pool.query(`
      SELECT
        u.id,
        u.id_datos_personales,
        u.activar_usuario,
        u.clave_idioma,
        u.clave_activacion,

        dp.id_tipo_documento,
        td.sigla AS tipo_documento,
        td.nombre_documento,

        dp.numero_documento,
        dp.primer_nombre,
        dp.segundo_nombre,
        dp.primer_apellido,
        dp.segundo_apellido,
        dp.fecha_nacimiento,
        dp.genero,
        dp.correo,
        dp.telefono,

        au.id_autorizacion,
        a.nombre AS rol

      FROM Usuario u
      INNER JOIN Datos_personales dp
        ON dp.id = u.id_datos_personales
      INNER JOIN Tipo_documento td
        ON td.id = dp.id_tipo_documento
      LEFT JOIN Autorizacion_usuario au
        ON au.id_sistema_usuario = u.id
      LEFT JOIN Autorizacion a
        ON a.id = au.id_autorizacion
      ORDER BY u.id DESC
    `);

    res.json(usuarios);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);

    res.status(500).json({
      mensaje: "No fue posible obtener los usuarios",
      detalle: error.message,
    });
  }
});

// POST /api/administrador/usuarios
// Crea un nuevo usuario junto con sus datos personales y su rol asignado
router.post("/", async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const {
      id_tipo_documento,
      numero_documento,
      primer_nombre,
      segundo_nombre = null,
      primer_apellido,
      segundo_apellido = null,
      fecha_nacimiento,
      genero,
      correo,
      telefono,
      id_autorizacion,

      
      contrasenia,

      activar_usuario = 1,
      clave_idioma = "es",
      clave_activacion = null,
    } = req.body;

    if (
      !id_tipo_documento ||
      !numero_documento ||
      !primer_nombre ||
      !primer_apellido ||
      !correo ||
      !id_autorizacion ||
      !contrasenia
    ) {
      return res.status(400).json({
        mensaje:
          "Faltan campos obligatorios: tipo de documento, número de documento, nombres, apellido, correo, contraseña y rol.",
      });
    }

    await connection.beginTransaction();

    // Datos_personales
    const [resultadoDatos] = await connection.query(
      `
        INSERT INTO Datos_personales (
          id_tipo_documento,
          numero_documento,
          primer_nombre,
          segundo_nombre,
          primer_apellido,
          segundo_apellido,
          fecha_nacimiento,
          genero,
          correo,
          telefono
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id_tipo_documento,
        numero_documento,
        primer_nombre,
        segundo_nombre || null,
        primer_apellido,
        segundo_apellido || null,
        fecha_nacimiento || null,
        genero || null,
        correo,
        telefono || null,
      ]
    );
        // insertId nos da el id que la base de datos le asignó a este nuevo registro
    const idDatosPersonales = resultadoDatos.insertId;
          // Encriptamos la contraseña antes de guardarla, nunca se guarda en texto plano   
    const contraseniaHasheada = await bcrypt.hash(contrasenia, 10);


    // Usuario: aquí se guarda contrasenia.
    const [resultadoUsuario] = await connection.query(
      `
        INSERT INTO Usuario (
          id_datos_personales,
          contrasenia,
          activar_usuario,
          clave_idioma,
          clave_activacion
        )
        VALUES (?, ?, ?, ?, ?)
      `,
      [
        idDatosPersonales,
        contraseniaHasheada,
        activar_usuario ? 1 : 0,
        clave_idioma,
        clave_activacion,
      ]
    );

    const idUsuario = resultadoUsuario.insertId;

    // Rol del usuario (autorizacion)
    await connection.query(
      `
        INSERT INTO Autorizacion_usuario (
          id_sistema_usuario,
          id_autorizacion
        )
        VALUES (?, ?)
      `,
      [idUsuario, id_autorizacion]
    );

    await connection.commit();

    res.status(201).json({
      mensaje: "Usuario creado correctamente",
      id: idUsuario,
      id_datos_personales: idDatosPersonales,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error al crear usuario:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        mensaje:
          "Ya existe una persona con ese número de documento, telefono o  correo electrónico.",
      });
    }

    res.status(500).json({
      mensaje: "No fue posible crear el usuario",
      detalle: error.message,
    });
  } finally {
    connection.release();
  }


  
});


export default router;