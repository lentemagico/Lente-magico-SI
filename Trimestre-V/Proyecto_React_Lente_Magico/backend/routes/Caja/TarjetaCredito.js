import { Router } from "express";
import pool from '../../db.js';

const router = Router();


// =====================================================
// REGISTRAR PAGO TARJETA CRÉDITO
// =====================================================

router.post("/", async (req, res) => {

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

    await connection.beginTransaction();


    // =================================================
    // 1. REGISTRAR PAGO
    // =================================================

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
    const id_pago = result.insertId;


    // =================================================
    // 2. GENERAR FACTURA
    // =================================================

    let num_factura = null;


    if (generar_factura === true) {

      /*
       * Ejemplo:
       *
       * id_pago = 25
       *
       * num_factura = FAC-000025
       */

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

    await connection.rollback();


    console.error(
      "Error registrando pago con tarjeta crédito:",
      error
    );


    res.status(500).json({
      error: error.message
    });


  } finally {

    connection.release();

  }

});


// =====================================================
// OBTENER PAGOS CON TARJETA CRÉDITO
// =====================================================

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