import { Router } from 'express'; //Es para crear las rutas
import pool from '../../db.js'; //El pool de conexiones a la base de datos

const router = Router();


// =====================================================
// CONFIRMAR PAGO BANCARIO
// =====================================================

// Registra un pago hecho por banco y, opcionalmente, genera su factura
router.post('/', async (req, res) => {

  // Se obtiene una conexion individual del pool, necesaria para poder usar transacciones
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

    // monto == null cubre tanto null como undefined en una sola comparacion
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

    // Se valida que metodo_pago venga y que no sea solo espacios en blanco
    if (
      !metodo_pago ||
      !String(metodo_pago).trim()
    ) {

      return res.status(400).json({
        error: 'Debes indicar el banco utilizado'
      });

    }


    // Se limpia el texto del banco, quitando espacios extra al inicio/final
    const nombreBanco =
      String(metodo_pago).trim();


    // =================================================
    // INICIAR TRANSACCIÓN
    // =================================================

    // Se inicia la transaccion: si algo falla mas adelante, se puede revertir todo
    await connection.beginTransaction();


    // =================================================
    // REGISTRAR PAGO
    // =================================================

    // Se inserta el pago; monto_recibido se guarda igual al monto y el cambio queda en 0
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
    // insertId trae el id que la base de datos le asigno a este nuevo pago
    const id_pago =
      resultadoPago.insertId;


    // =================================================
    // FACTURA
    // =================================================

    let num_factura = null;


    // Solo se genera factura si el usuario lo pidio explicitamente
    if (generar_factura === true) {

      // Crear número de factura
      // padStart(6, '0') rellena con ceros a la izquierda hasta completar 6 digitos (ej: FAC-000045)
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

    // Si todo salio bien (pago y, si aplicaba, factura), se confirman los cambios de forma permanente
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

    // Si algo fallo, se deshace tanto el pago como la factura (si alcanzo a crearse)
    await connection.rollback();


    console.error(
      'Error confirmando pago bancario:',
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
// CONSULTAR PAGO POR ID
// =====================================================

// Trae un pago especifico junto con los datos de su factura, si tiene una
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