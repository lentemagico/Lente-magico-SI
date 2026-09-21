import { Router } from 'express';
import pool from '../../db.js';

const router = Router();


// =====================================================
// CONFIRMAR PAGO BANCARIO
// =====================================================

router.post('/', async (req, res) => {

  const connection = await pool.getConnection();

  try {

    const {
      id_venta,
      monto,
      metodo_pago,
      generar_factura = false
    } = req.body;


    // =================================================
    // VALIDAR VENTA
    // =================================================

    if (!id_venta) {

      return res.status(400).json({
        error: 'El ID de la venta es obligatorio'
      });

    }


    // =================================================
    // VALIDAR MONTO
    // =================================================

    if (
      monto == null ||
      Number(monto) <= 0
    ) {

      return res.status(400).json({
        error: 'El monto debe ser mayor que 0'
      });

    }


    // =================================================
    // VALIDAR BANCO
    // =================================================

    if (
      !metodo_pago ||
      !String(metodo_pago).trim()
    ) {

      return res.status(400).json({
        error: 'Debes indicar el banco utilizado'
      });

    }


    const nombreBanco =
      String(metodo_pago).trim();


    // =================================================
    // INICIAR TRANSACCIÓN
    // =================================================

    await connection.beginTransaction();


    // =================================================
    // REGISTRAR PAGO
    // =================================================

    const [resultadoPago] =
      await connection.query(`
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
      `, [

        id_venta,

        nombreBanco,

        Number(monto),

        Number(monto)

      ]);


    // ID DEL PAGO
    const id_pago =
      resultadoPago.insertId;


    // =================================================
    // FACTURA
    // =================================================

    let num_factura = null;


    if (generar_factura === true) {

      // Crear número de factura
      num_factura =
        `FAC-${String(id_pago).padStart(6, '0')}`;


      // Registrar factura
      await connection.query(`
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
      `, [

        id_pago,

        num_factura

      ]);

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
        'Pago bancario confirmado correctamente',

      id_pago:

        id_pago,

      id_venta:

        id_venta,

      metodo_pago:

        nombreBanco,

      monto:

        Number(monto),

      factura_generada:

        generar_factura === true,

      num_factura:

        num_factura

    });


  } catch (error) {

    // =================================================
    // CANCELAR TRANSACCIÓN
    // =================================================

    await connection.rollback();


    console.error(
      'Error confirmando pago bancario:',
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
// CONSULTAR PAGO POR ID
// =====================================================

router.get('/:id', async (req, res) => {

  try {

    const [rows] =
      await pool.query(`
        SELECT
          p.*,
          f.id_factura,
          f.num_factura,
          f.fecha_emision
        FROM Pago p
        LEFT JOIN factura f
          ON f.id_pago = p.id_pagos
        WHERE p.id_pagos = ?
      `, [
        req.params.id
      ]);


    if (rows.length === 0) {

      return res.status(404).json({
        error: 'Pago no encontrado'
      });

    }


    res.json(rows[0]);


  } catch (error) {

    console.error(
      'Error consultando pago:',
      error
    );

    res.status(500).json({
      error: error.message
    });

  }

});


export default router;