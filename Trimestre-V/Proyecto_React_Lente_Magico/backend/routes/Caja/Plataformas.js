import { Router } from "express";
import pool from '../../db.js';

const router = Router();


// =====================================================
// OBTENER PLATAFORMAS DISPONIBLES
// =====================================================

router.get("/", async (req, res) => {
  try {

    const plataformas = [
      {
        nombre: "Nequi",
        descripcion: "Pago mediante Nequi",
        icono: "📱"
      },
      {
        nombre: "Daviplata",
        descripcion: "Pago mediante Daviplata",
        icono: "💳"
      },
      {
        nombre: "PSE",
        descripcion: "Pago mediante PSE",
        icono: "🏦"
      },
      {
        nombre: "Otros",
        descripcion: "Otra plataforma o método de pago",
        icono: "💰"
      }
    ];

    res.json({
      plataformas
    });

  } catch (error) {

    console.error(
      "Error obteniendo plataformas:",
      error
    );

    res.status(500).json({
      error: error.message
    });

  }
});


// =====================================================
// REGISTRAR PAGO POR PLATAFORMA
// =====================================================

router.post("/", async (req, res) => {

  const connection = await pool.getConnection();

  try {

    const {
      id_venta,
      monto,
      plataforma,
      numero,
      generar_factura
    } = req.body;


    // =================================================
    // VALIDACIONES GENERALES
    // =================================================

    if (
      !id_venta ||
      monto == null ||
      !plataforma ||
      !numero
    ) {

      return res.status(400).json({
        error: "Faltan datos del pago"
      });

    }


    // =================================================
    // VALIDAR MONTO
    // =================================================

    if (Number(monto) <= 0) {

      return res.status(400).json({
        error: "El valor del pago debe ser mayor que 0"
      });

    }


    // =================================================
    // LIMPIAR NOMBRE DE PLATAFORMA
    // =================================================

    const nombrePlataforma =
      String(plataforma).trim();


    if (!nombrePlataforma) {

      return res.status(400).json({
        error: "Debe indicar una plataforma de pago"
      });

    }


    // =================================================
    // INICIAR TRANSACCIÓN
    // =================================================

    await connection.beginTransaction();


    // =================================================
    // REGISTRAR PAGO
    // =================================================

    const [resultadoPago] =
      await connection.query(
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
          ?,
          CURRENT_TIMESTAMP,
          ?,
          ?,
          0
        )
        `,
        [
          id_venta,
          nombrePlataforma,
          Number(monto),
          Number(monto)
        ]
      );


    const id_pago =
      resultadoPago.insertId;


    // =================================================
    // REGISTRAR FACTURA
    // =================================================

    let num_factura = null;


    /*
      Aceptamos true y también "true",
      por si el frontend lo envía como texto.
    */

    const debeGenerarFactura =
      generar_factura === true ||
      generar_factura === "true";


    if (debeGenerarFactura) {

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
    // CONFIRMAR TRANSACCIÓN
    // =================================================

    await connection.commit();


    // =================================================
    // RESPUESTA
    // =================================================

    res.status(201).json({

      mensaje:
        "Pago registrado correctamente",

      id_pago,

      id_venta,

      plataforma:
        nombrePlataforma,

      numero,

      monto:
        Number(monto),

      factura_generada:
        debeGenerarFactura,

      num_factura

    });


  } catch (error) {

    // =================================================
    // DESHACER TRANSACCIÓN
    // =================================================

    await connection.rollback();


    console.error(
      "Error registrando pago por plataforma:",
      error
    );


    res.status(500).json({
      error: error.message
    });


  } finally {

    connection.release();

  }

});


export default router;