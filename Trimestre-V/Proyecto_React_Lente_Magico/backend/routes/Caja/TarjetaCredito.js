import { Router } from "express"; //Es para crear las rutas
import pool from '../../db.js'; //El pool de conexiones a la base de datos

const router = Router();


// =====================================================
// REGISTRAR PAGO TARJETA CRÉDITO
// =====================================================

// Registra un pago hecho con tarjeta de credito, incluyendo el numero de cuotas
router.post("/", async (req, res) => {

  // Se obtiene una conexion individual del pool, necesaria para poder usar transacciones
  const connection = await pool.getConnection();

  try {

    const {
      id_venta,
      monto,
      cuotas,
      generar_factura
    } = req.body;


    // =================================================
    // VALIDAR DATOS
    // =================================================

    // monto == null cubre tanto null como undefined en una sola comparacion
    if (
      !id_venta ||
      monto == null ||
      !cuotas
    ) {

      return res.status(400).json({
        error: "Venta, monto y cuotas son obligatorios"
      });

    }


    if (Number(monto) <= 0) {

      return res.status(400).json({
        error: "El monto debe ser mayor que 0"
      });

    }


    if (Number(cuotas) <= 0) {

      return res.status(400).json({
        error: "El número de cuotas no es válido"
      });

    }


    // =================================================
    // INICIAR TRANSACCIÓN
    // =================================================

    // Se inicia la transaccion: si algo falla mas adelante, se puede revertir todo
    await connection.beginTransaction();


    // =================================================
    // 1. REGISTRAR PAGO
    // =================================================

    // El metodo_pago se deja fijo como 'Tarjeta Crédito', ya que es lo unico que maneja esta ruta
    const [result] = await connection.query(
      `
      INSERT INTO Pago (
        id_venta,
        metodo_pago,
        fecha_pago,
        monto,
        monto_recibido,
        cambio
      )
      VALUES (
        ?,
        'Tarjeta Crédito',
        CURRENT_TIMESTAMP,
        ?,
        ?,
        0
      )
      `,
      [
        id_venta,
        Number(monto),
        Number(monto)
      ]
    );


    // ID DEL PAGO CREADO
    // insertId trae el id que la base de datos le asigno a este nuevo pago
    const id_pago = result.insertId;


    // =================================================
    // 2. GENERAR FACTURA
    // =================================================

    let num_factura = null;


    // Solo se genera factura si el usuario lo pidio explicitamente
    if (generar_factura === true) {

      /*
       * Ejemplo:
       *
       * id_pago = 25
       *
       * num_factura = FAC-000025
       */

      // padStart(6, '0') rellena con ceros a la izquierda hasta completar 6 digitos
      num_factura =
        `FAC-${String(id_pago).padStart(6, "0")}`;


      await connection.query(
        `
        INSERT INTO factura (
          id_pago,
          num_factura,
          fecha_emision
        )
        VALUES (
          ?,
          ?,
          CURRENT_TIMESTAMP
        )
        `,
        [
          id_pago,
          num_factura
        ]
      );

    }


    // =================================================
    // 3. CONFIRMAR TRANSACCIÓN
    // =================================================

    // Si todo salio bien (pago y, si aplicaba, factura), se confirman los cambios de forma permanente
    await connection.commit();


    // =================================================
    // 4. RESPONDER AL FRONTEND
    // =================================================

    res.status(201).json({

      mensaje:
        "Pago con tarjeta de crédito registrado",

      id_pagos:
        id_pago,

      id_venta:
        id_venta,

      monto:
        Number(monto),

      cuotas:
        Number(cuotas),

      factura_generada:
        generar_factura === true,

      num_factura:
        num_factura

    });


  } catch (error) {

    // =================================================
    // SI HAY ERROR, DESHACER LOS CAMBIOS
    // =================================================

    // Si algo fallo, se deshace tanto el pago como la factura (si alcanzo a crearse)
    await connection.rollback();


    console.error(
      "Error registrando pago con tarjeta crédito:",
      error
    );


    res.status(500).json({
      error: error.message
    });


  } finally {

    // Sin importar si hubo exito o error, siempre se libera la conexion de vuelta al pool
    connection.release();

  }

});


// =====================================================
// OBTENER PAGOS CON TARJETA CRÉDITO
// =====================================================

// Trae todos los pagos que se hayan hecho especificamente con tarjeta de credito
router.get("/", async (req, res) => {

  try {

    const [rows] = await pool.query(`
      SELECT *
      FROM Pago
      WHERE metodo_pago = 'Tarjeta Crédito'
      ORDER BY fecha_pago DESC
    `);


    res.json({
      pagos: rows
    });


  } catch (error) {

    console.error(
      "Error obteniendo pagos:",
      error
    );


    res.status(500).json({
      error: error.message
    });

  }

});


export default router;