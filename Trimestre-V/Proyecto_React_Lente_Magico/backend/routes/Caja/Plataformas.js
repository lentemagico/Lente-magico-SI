import { Router } from "express"; //Es para crear las rutas
import pool from '../../db.js'; //El pool de conexiones a la base de datos

const router = Router();


// =====================================================
// OBTENER PLATAFORMAS DISPONIBLES
// =====================================================

// Devuelve una lista fija (no viene de la base de datos) con las plataformas de pago disponibles
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

// Registra un pago hecho por una plataforma digital (Nequi, Daviplata, PSE, etc.)
router.post("/", async (req, res) => {

  // Se obtiene una conexion individual del pool, necesaria para poder usar transacciones
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

    // monto == null cubre tanto null como undefined en una sola comparacion
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

    // Se quitan espacios extra al inicio/final del nombre de la plataforma
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

    // Se inicia la transaccion: si algo falla mas adelante, se puede revertir todo
    await connection.beginTransaction();


    // =================================================
    // REGISTRAR PAGO
    // =================================================

    // El metodo_pago se guarda como el nombre de la plataforma (Nequi, PSE, etc.)
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


    // insertId trae el id que la base de datos le asigno a este nuevo pago
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

    // Se compara contra el booleano true y tambien contra el texto "true"
    // por si el dato llega como string en vez de booleano
    const debeGenerarFactura =
      generar_factura === true ||
      generar_factura === "true";


    if (debeGenerarFactura) {

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

    // Si algo fallo, se deshace tanto el pago como la factura (si alcanzo a crearse)
    await connection.rollback();


    console.error(
      "Error registrando pago por plataforma:",
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


export default router;