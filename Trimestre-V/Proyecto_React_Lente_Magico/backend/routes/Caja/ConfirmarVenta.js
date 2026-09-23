import { Router } from 'express';
import pool from '../../db.js';

const router = Router();


// ======================================================
// CONFIRMAR VENTA
// ======================================================

router.post('/', async (req, res) => {

  const connection = await pool.getConnection();

  try {

    const {
      id_cliente,
      id_usuario,
      estado = 'Confirmada',
      productos = []
    } = req.body;


    // ==================================================
    // VALIDAR CLIENTE
    // ==================================================

    if (!id_cliente) {

      return res.status(400).json({
        error:
          'El cliente es obligatorio'
      });

    }


    // ==================================================
    // VALIDAR USUARIO DEL LOGIN
    // ==================================================

    if (!id_usuario) {

      return res.status(401).json({
        error:
          'No se encontró el usuario que inició sesión. Vuelve a iniciar sesión.'
      });

    }


    // ==================================================
    // VALIDAR PRODUCTOS
    // ==================================================

    if (
      !Array.isArray(productos) ||
      productos.length === 0
    ) {

      return res.status(400).json({
        error:
          'Debe agregar productos o servicios a la venta'
      });

    }


    // ==================================================
    // INICIAR TRANSACCIÓN
    // ==================================================

    await connection.beginTransaction();


    // ==================================================
    // VERIFICAR QUE EL USUARIO EXISTA
    // ==================================================

    const [usuario] = await connection.query(
      `
        SELECT
          id
        FROM Usuario
        WHERE id = ?
        LIMIT 1
      `,
      [id_usuario]
    );


    if (usuario.length === 0) {

      throw new Error(
        'El usuario que inició sesión no existe'
      );

    }


    // ==================================================
    // CREAR VENTA
    // ==================================================

    const [venta] = await connection.query(
      `
        INSERT INTO Venta
        (
          id_cliente,
          id_usuario,
          fecha_venta,
          estado
        )
        VALUES
        (
          ?,
          ?,
          CURRENT_TIMESTAMP,
          ?
        )
      `,
      [
        id_cliente,
        id_usuario,
        estado
      ]
    );


    const idVenta =
      venta.insertId;


    // ==================================================
    // INSERTAR DETALLE DE VENTA
    // ==================================================

    for (const producto of productos) {

      const {
        id_producto,
        cantidad,
        precio_unitario
      } = producto;


      // ================================================
      // VALIDAR PRODUCTO
      // ================================================

      if (
        !id_producto ||
        !cantidad ||
        cantidad <= 0 ||
        precio_unitario == null ||
        Number(precio_unitario) < 0
      ) {

        throw new Error(
          'Producto o servicio incompleto'
        );

      }


      // ================================================
      // BUSCAR PRODUCTO
      // ================================================

      const [productoBD] =
        await connection.query(
          `
            SELECT
              id_producto,
              nombre,
              precio_venta,
              stock_actual,
              codigo_producto
            FROM Producto
            WHERE id_producto = ?
            LIMIT 1
          `,
          [id_producto]
        );


      if (productoBD.length === 0) {

        throw new Error(
          `El producto o servicio ${id_producto} no existe`
        );

      }


      const productoEncontrado =
        productoBD[0];


      // ================================================
      // DETERMINAR SI ES SERVICIO
      // ================================================

      const esServicio =
        productoEncontrado.codigo_producto &&
        productoEncontrado.codigo_producto
          .startsWith('SERV-');


      // ================================================
      // VALIDAR STOCK SOLO PARA PRODUCTOS FÍSICOS
      // ================================================

      if (!esServicio) {

        if (
          productoEncontrado.stock_actual == null
        ) {

          throw new Error(
            `El producto ${productoEncontrado.nombre} no tiene stock configurado`
          );

        }


        if (
          Number(productoEncontrado.stock_actual) <
          Number(cantidad)
        ) {

          throw new Error(
            `Stock insuficiente para ${productoEncontrado.nombre}. Stock disponible: ${productoEncontrado.stock_actual}`
          );

        }

      }


      // ================================================
      // GUARDAR DETALLE DE VENTA
      // ================================================

      await connection.query(
        `
          INSERT INTO Detalle_venta
          (
            id_venta,
            id_producto,
            cantidad,
            precio_unitario
          )
          VALUES (?, ?, ?, ?)
        `,
        [
          idVenta,
          id_producto,
          cantidad,
          precio_unitario
        ]
      );


      // ================================================
      // DESCONTAR STOCK
      // SOLO PRODUCTOS FÍSICOS
      // ================================================

      if (!esServicio) {

        await connection.query(
          `
            UPDATE Producto
            SET
              stock_actual =
                stock_actual - ?
            WHERE id_producto = ?
          `,
          [
            cantidad,
            id_producto
          ]
        );

      }

    }


    // ==================================================
    // CONFIRMAR TRANSACCIÓN
    // ==================================================

    await connection.commit();


    // ==================================================
    // RESPUESTA
    // ==================================================

    return res.status(201).json({

      mensaje:
        'Venta confirmada exitosamente',

      id_venta:
        idVenta,

      id_usuario:
        Number(id_usuario),

      id_cliente:
        Number(id_cliente)

    });


  } catch (error) {

    await connection.rollback();

    console.error(
      'Error al confirmar venta:',
      error
    );

    return res.status(500).json({

      error:
        error.message

    });

  } finally {

    connection.release();

  }

});


export default router;