import { Router } from 'express'; //Es para crear las rutas
import pool from '../../db.js'; //El pool de conexiones a la base de datos

const router = Router();


// ======================================================
// GET - OBTENER TODOS LOS PRECIOS
// ======================================================

// Trae el precio y stock de todos los productos
router.get('/', async (req, res) => {

  try {

    const [rows] = await pool.query(`
      SELECT
        id_producto,
        codigo_producto,
        nombre,
        precio_venta,
        stock_actual,
        estado
      FROM Producto
      ORDER BY nombre ASC
    `);

    res.json({
      productos: rows
    });

  } catch (error) {

    console.error(
      'Error al obtener precios:',
      error
    );

    res.status(500).json({
      error:
        'Error al obtener los precios de los productos',
      detalle: error.message
    });

  }

});


// ======================================================
// GET - OBTENER PRECIO POR ID
// ======================================================

// Trae el precio de un producto especifico por su id
router.get('/:id', async (req, res) => {

  try {

    const [rows] = await pool.query(`
      SELECT
        id_producto,
        codigo_producto,
        nombre,
        precio_venta
      FROM Producto
      WHERE id_producto = ?
    `, [
      req.params.id
    ]);


    if (rows.length === 0) {

      return res.status(404).json({
        error:
          'Producto no encontrado'
      });

    }


    res.json(rows[0]);

  } catch (error) {

    console.error(
      'Error al obtener precio:',
      error
    );

    res.status(500).json({
      error:
        'Error al obtener el precio',
      detalle: error.message
    });

  }

});


// ======================================================
// POST - GUARDAR PRECIO POR CÓDIGO
// ======================================================

// Actualiza el precio de un producto, pero buscandolo por su codigo (no por id)
router.post('/', async (req, res) => {

  try {

    const {
      nombre,
      codigo,
      precio
    } = req.body;


    // ==================================================
    // VALIDAR NOMBRE
    // ==================================================

    if (
      !nombre ||
      nombre.trim() === ''
    ) {

      return res.status(400).json({
        error:
          'El nombre del producto es obligatorio'
      });

    }


    // ==================================================
    // VALIDAR CÓDIGO
    // ==================================================

    if (
      !codigo ||
      codigo.trim() === ''
    ) {

      return res.status(400).json({
        error:
          'El código del producto es obligatorio'
      });

    }


    // ==================================================
    // VALIDAR PRECIO
    // ==================================================

    const precioNumerico =
      Number(precio);


    // Number.isFinite descarta valores como NaN o Infinity, ademas de exigir que sea mayor a 0
    if (
      !Number.isFinite(precioNumerico) ||
      precioNumerico <= 0
    ) {

      return res.status(400).json({
        error:
          'El precio debe ser mayor a 0'
      });

    }


    // ==================================================
    // BUSCAR PRODUCTO POR CÓDIGO
    // ==================================================

    const [productos] = await pool.query(`
      SELECT
        id_producto,
        codigo_producto,
        nombre,
        precio_venta
      FROM Producto
      WHERE codigo_producto = ?
      LIMIT 1
    `, [
      codigo.trim()
    ]);


    // ==================================================
    // PRODUCTO NO EXISTE
    // ==================================================

    if (productos.length === 0) {

      return res.status(404).json({
        error:
          `No se encontró un producto con el código ${codigo}`
      });

    }


    const producto =
      productos[0];


    // ==================================================
    // ACTUALIZAR PRECIO
    // ==================================================

    const [result] = await pool.query(`
      UPDATE Producto
      SET
        precio_venta = ?
      WHERE id_producto = ?
    `, [
      precioNumerico,
      producto.id_producto
    ]);


    if (result.affectedRows === 0) {

      return res.status(400).json({
        error:
          'No fue posible actualizar el precio'
      });

    }


    // ==================================================
    // RESPUESTA
    // ==================================================

    res.status(200).json({

      mensaje:
        'Precio actualizado exitosamente',

      id:
        producto.id_producto,

      producto: {

        id_producto:
          producto.id_producto,

        codigo_producto:
          producto.codigo_producto,

        nombre:
          producto.nombre,

        precio_venta:
          precioNumerico

      }

    });

  } catch (error) {

    console.error(
      'Error al guardar precio:',
      error
    );

    res.status(500).json({
      error:
        'Error al guardar el precio',
      detalle:
        error.message
    });

  }

});


// ======================================================
// PUT - ACTUALIZAR PRECIO POR ID
// ======================================================

// Actualiza el precio de un producto, buscandolo directamente por su id
router.put('/:id', async (req, res) => {

  try {

    const {
      precio_venta
    } = req.body;


    // ==================================================
    // VALIDAR PRECIO
    // ==================================================

    const precioNumerico =
      Number(precio_venta);


    if (
      !Number.isFinite(precioNumerico) ||
      precioNumerico <= 0
    ) {

      return res.status(400).json({
        error:
          'El precio debe ser mayor a 0'
      });

    }


    // ==================================================
    // ACTUALIZAR
    // ==================================================

    const [result] = await pool.query(`
      UPDATE Producto
      SET
        precio_venta = ?
      WHERE id_producto = ?
    `, [
      precioNumerico,
      req.params.id
    ]);


    if (result.affectedRows === 0) {

      return res.status(404).json({
        error:
          'Producto no encontrado'
      });

    }


    // ==================================================
    // OBTENER PRODUCTO ACTUALIZADO
    // ==================================================

    // Se vuelve a consultar el producto para devolverlo con el precio ya actualizado
    const [rows] = await pool.query(`
      SELECT
        id_producto,
        codigo_producto,
        nombre,
        precio_venta
      FROM Producto
      WHERE id_producto = ?
    `, [
      req.params.id
    ]);


    res.json({

      mensaje:
        'Precio actualizado exitosamente',

      producto:
        rows[0]

    });

  } catch (error) {

    console.error(
      'Error al actualizar precio:',
      error
    );

    res.status(500).json({
      error:
        'Error al actualizar el precio',
      detalle:
        error.message
    });

  }

});


export default router;