import { Router } from "express";
import pool from '../../db.js';

const router = Router();

// ==========================================
// REGISTRAR PAGO EN EFECTIVO
// ==========================================

router.post("/", async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const {
      id_venta,
      monto,
      monto_recibido,
      generar_factura
    } = req.body;

    // Validar datos
    if (
      !id_venta ||
      monto == null ||
      monto_recibido == null
    ) {
      return res.status(400).json({
        error: "Faltan datos del pago"
      });
    }

    const cambio =
      Number(monto_recibido) - Number(monto);

    if (cambio < 0) {
      return res.status(400).json({
        error: "El dinero recibido es insuficiente"
      });
    }

    // Iniciar transacción
    await connection.beginTransaction();

    // ==========================================
    // 1. REGISTRAR EL PAGO
    // ==========================================

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
        'Efectivo',
        CURRENT_TIMESTAMP,
        ?,
        ?,
        ?
      )
      `,
      [
        id_venta,
        monto,
        monto_recibido,
        cambio
      ]
    );

    // ID del pago creado
    const id_pago = result.insertId;

    let num_factura = null;

    // ==========================================
    // 2. CREAR FACTURA
    // ==========================================

    if (generar_factura === true) {

      // Número automático de factura
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

    // ==========================================
    // 3. CONFIRMAR TRANSACCIÓN
    // ==========================================

    await connection.commit();

    // ==========================================
    // 4. RESPUESTA
    // ==========================================

    res.status(201).json({
      mensaje: "Pago en efectivo registrado",
      id_pago: id_pago,
      cambio: cambio,
      factura_generada: generar_factura === true,
      num_factura: num_factura
    });

  } catch (error) {

    // Deshacer cambios si algo falla
    await connection.rollback();

    console.error(
      "Error registrando pago en efectivo:",
      error
    );

    res.status(500).json({
      error: error.message
    });

  } finally {

    connection.release();

  }
});


// ==========================================
// OBTENER PAGOS EN EFECTIVO
// ==========================================

router.get("/", async (req, res) => {

  try {

    const [rows] = await pool.query(
      `
      SELECT *
      FROM Pago
      WHERE metodo_pago = 'Efectivo'
      ORDER BY fecha_pago DESC
      `
    );

    res.json({
      pagos: rows
    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

});

export default router;