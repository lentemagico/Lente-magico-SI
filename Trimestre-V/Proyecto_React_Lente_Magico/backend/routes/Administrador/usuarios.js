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
  let connection;

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

    connection = await pool.getConnection();
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
    if (connection) await connection.rollback();
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
    if (connection) connection.release();
  }
});

// PUT /api/administrador/usuarios/:id
router.put("/:id", async (req, res) => {
  let connection;

  try {
    const { id } = req.params;
    const {
      id_tipo_documento, numero_documento,
      primer_nombre, segundo_nombre, primer_apellido,
      segundo_apellido, fecha_nacimiento, genero,
      correo, telefono, id_autorizacion, contrasenia,
      activar_usuario, clave_idioma, clave_activacion,
    } = req.body;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [usuarios] = await connection.query(
      "SELECT id_datos_personales FROM Usuario WHERE id = ?",
      [id]
    );

    if (!usuarios.length) {
      await connection.rollback();
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    const idDatos = usuarios[0].id_datos_personales;

    await connection.query(
      `UPDATE Datos_personales SET
       id_tipo_documento=?, numero_documento=?, primer_nombre=?,
       segundo_nombre=?, primer_apellido=?, segundo_apellido=?,
       fecha_nacimiento=?, genero=?, correo=?, telefono=?
       WHERE id=?`,
      [
        id_tipo_documento, numero_documento, primer_nombre,
        segundo_nombre || null, primer_apellido,
        segundo_apellido || null, fecha_nacimiento || null,
        genero || null, correo, telefono || null, idDatos,
      ]
    );

    const campos = [
      activar_usuario ?? 1,
      clave_idioma ?? "es",
      clave_activacion ?? null,
    ];

    let sql = `UPDATE Usuario SET activar_usuario=?,
               clave_idioma=?, clave_activacion=?`;

    if (contrasenia) {
      sql += ", contrasenia=?";
      campos.push(await bcrypt.hash(contrasenia, 10));
    }

    sql += " WHERE id=?";
    campos.push(id);

    await connection.query(sql, campos);

    const [roles] = await connection.query(
      "SELECT id_autorizacion FROM Autorizacion_usuario WHERE id_sistema_usuario=?",
      [id]
    );

    if (roles.length) {
      await connection.query(
        `UPDATE Autorizacion_usuario
         SET id_autorizacion=? WHERE id_sistema_usuario=?`,
        [id_autorizacion, id]
      );
    } else {
      await connection.query(
        `INSERT INTO Autorizacion_usuario
         (id_sistema_usuario, id_autorizacion) VALUES (?, ?)`,
        [id, id_autorizacion]
      );
    }

    await connection.commit();

    res.json({ mensaje: "Usuario actualizado correctamente" });
  } catch (error) {
    if (connection) await connection.rollback();

    res.status(error.code === "ER_DUP_ENTRY" ? 409 : 500).json({
      mensaje: "Error al actualizar usuario",
      detalle: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
});


// DELETE /api/administrador/usuarios/:id
// Elimina un usuario y sus relaciones

router.delete("/:id", async (req, res) => {
  let connection;

  try {
    const { id } = req.params;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Buscar los datos personales del usuario
    const [usuarios] = await connection.query(
      "SELECT id_datos_personales FROM Usuario WHERE id = ?",
      [id]
    );

    if (usuarios.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        mensaje: "Usuario no encontrado",
      });
    }

    const idDatos = usuarios[0].id_datos_personales;

    // Eliminar la autorización asignada
    await connection.query(
      "DELETE FROM Autorizacion_usuario WHERE id_sistema_usuario = ?",
      [id]
    );

    // Eliminar el usuario
    await connection.query(
      "DELETE FROM Usuario WHERE id = ?",
      [id]
    );

    // Eliminar los datos personales
    await connection.query(
      "DELETE FROM Datos_personales WHERE id = ?",
      [idDatos]
    );

    await connection.commit();

    res.json({
      mensaje: "Usuario eliminado correctamente",
    });

  } catch (error) {
    if (connection) await connection.rollback();

    console.error("Error al eliminar usuario:", error);

    res.status(500).json({
      mensaje: "Error al eliminar el usuario",
      detalle: error.message,
    });

  } finally {
    if (connection) connection.release();
  }
});

  

export default router;