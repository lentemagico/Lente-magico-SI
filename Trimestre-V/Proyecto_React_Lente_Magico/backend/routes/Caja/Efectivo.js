import { Router } from "express"; //Es para crear las rutas
import pool from '../../db.js'; //El pool de conexiones a la base de datos

const router = Router();

// ==========================================
// REGISTRAR PAGO EN EFECTIVO
// ==========================================

// Registra un pago en efectivo, calculando el cambio y generando factura si se pide
router.post("/", async (req, res) => {
  // Se obtiene una conexion individual del pool, necesaria para poder usar transacciones
  const connection = await pool.getConnection();

  try {
    const {
      id_venta,
      monto,
      monto_recibido,
      generar_factura
    } = req.body;

    // Validar datos
    // monto == null cubre tanto null como undefined en una sola comparacion
    if (
      !id_venta ||
      monto == null ||
      monto_recibido == null
    ) {
      return res.status(400).json({
        error: "Faltan datos del pago"
      });
    }

    // El cambio es lo que sobra: lo que el cliente entrego menos lo que debia pagar
    const cambio =
      Number(monto_recibido) - Number(monto);

    // Si el cambio es negativo, significa que el cliente no entrego suficiente dinero
    if (cambio < 0) {
      return res.status(400).json({
        error: "El dinero recibido es insuficiente"
      });
    }

    // Iniciar transacción
    // Se inicia la transaccion: si algo falla mas adelante, se puede revertir todo
    await connection.beginTransaction();

    // ==========================================
    // 1. REGISTRAR EL PAGO
    // ==========================================

    // El metodo_pago se deja fijo como 'Efectivo', ya que es lo unico que maneja esta ruta
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
    // insertId trae el id que la base de datos le asigno a este nuevo pago
    const id_pago = result.insertId;

    let num_factura = null;

    // ==========================================
    // 2. CREAR FACTURA
    // ==========================================

    // Solo se genera factura si el usuario lo pidio explicitamente
    if (generar_factura === true) {

      // Número automático de factura
      // padStart(6, '0') rellena con ceros a la izquierda hasta completar 6 digitos (ej: FAC-000045)
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

    // Si todo salio bien (pago y, si aplicaba, factura), se confirman los cambios de forma permanente
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
    // Si algo fallo, se deshace tanto el pago como la factura (si alcanzo a crearse)
    await connection.rollback();

    console.error(
      "Error registrando pago en efectivo:",
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


// ==========================================
// OBTENER PAGOS EN EFECTIVO
// ==========================================

// Trae todos los pagos que se hayan hecho especificamente en efectivo
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