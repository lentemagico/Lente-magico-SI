import { Router } from 'express';
import pool from '../../db.js';

const router = Router();


// ======================================================
// POST - REGISTRAR SERVICIO
// ======================================================

router.post('/', async (req, res) => {

  try {

    const {
      tipo_servicio,
      nombre_servicio,
      costo_servicio
    } = req.body;


    // ==================================================
    // VALIDAR CAMPOS
    // ==================================================

    if (
      !tipo_servicio ||
      !nombre_servicio ||
      costo_servicio === undefined ||
      costo_servicio === null ||
      costo_servicio === ''
    ) {

      return res.status(400).json({
        error:
          'El tipo, nombre y costo del servicio son obligatorios'
      });

    }


    const costo = Number(costo_servicio);


    if (!Number.isFinite(costo) || costo <= 0) {

      return res.status(400).json({
        error:
          'El costo del servicio debe ser mayor a 0'
      });

    }


    // ==================================================
    // BUSCAR CATEGORÍA
    // ==================================================

    const [categorias] = await pool.query(
      `
        SELECT
          id_categoria
        FROM cat_producto
        WHERE nombre_categoria = ?
        LIMIT 1
      `,
      [tipo_servicio]
    );


    if (categorias.length === 0) {

      return res.status(404).json({
        error:
          `No se encontró la categoría "${tipo_servicio}" en cat_producto`
      });

    }


    const idCategoria =
      categorias[0].id_categoria;


    // ==================================================
    // GENERAR CÓDIGO
    // ==================================================

    const codigoServicio =
      `SERV-${Date.now()}`;


    // ==================================================
    // VERIFICAR SI YA EXISTE
    // ==================================================

    const [existente] = await pool.query(
      `
        SELECT
          id_producto,
          codigo_producto,
          nombre
        FROM Producto
        WHERE nombre = ?
        LIMIT 1
      `,
      [nombre_servicio]
    );


    if (existente.length > 0) {

      return res.status(409).json({
        error:
          'Ya existe un producto o servicio con ese nombre',
        producto:
          existente[0]
      });

    }


    // ==================================================
    // INSERTAR SERVICIO EN PRODUCTO
    // ==================================================

    const [result] = await pool.query(
      `
        INSERT INTO Producto
        (
          id_categoria,
          codigo_producto,
          nombre,
          precio_venta
        )
        VALUES (?, ?, ?, ?)
      `,
      [
        idCategoria,
        codigoServicio,
        nombre_servicio,
        costo
      ]
    );


    // ==================================================
    // RESPUESTA
    // ==================================================

    res.status(201).json({

      mensaje:
        'Servicio registrado exitosamente',

      id_producto:
        result.insertId,

      servicio: {

        id_producto:
          result.insertId,

        id_categoria:
          idCategoria,

        codigo_producto:
          codigoServicio,

        tipo_servicio:
          tipo_servicio,

        nombre_servicio:
          nombre_servicio,

        costo_servicio:
          costo

      }

    });

  } catch (error) {

    console.error(
      'ERROR AL REGISTRAR SERVICIO:',
      error
    );

    res.status(500).json({

      error:
        error.message

    });

  }

});


// ======================================================
// GET - LISTAR SERVICIOS
// ======================================================

router.get('/', async (req, res) => {

  try {

    const [rows] = await pool.query(
      `
        SELECT
          p.id_producto,
          p.id_categoria,
          p.codigo_producto,
          p.nombre,
          p.precio_venta
        FROM Producto p
        INNER JOIN cat_producto c
          ON p.id_categoria = c.id_categoria
        WHERE c.nombre_categoria = 'Consulta Médica'
        ORDER BY p.nombre ASC
      `
    );


    res.json({
      servicios: rows
    });

  } catch (error) {

    console.error(
      'ERROR AL OBTENER SERVICIOS:',
      error
    );

    res.status(500).json({
      error:
        error.message
    });

  }

});


export default router;