import { Router } from 'express'; //Es para crear las rutas
import pool from '../../db.js'; //El pool de conexiones a la base de datos

const router = Router();


// Obtener formas de pago utilizadas
// Trae un resumen de cuantos pagos y cuanto dinero se ha recibido, agrupado por metodo de pago
router.get('/', async (req, res) => {

  try {

    // GROUP BY agrupa los pagos por metodo_pago (efectivo, banco, tarjeta, etc.)
    // COUNT cuenta cuantos pagos hay de cada metodo, SUM suma el monto total de cada uno
    const [rows] = await pool.query(`
      SELECT
        metodo_pago,
        COUNT(*) AS cantidad,
        SUM(monto) AS total
      FROM Pago
      GROUP BY metodo_pago
      ORDER BY metodo_pago ASC
    `);

    res.json({
      formasPago: rows
    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

});


// Obtener pagos
// Trae todos los pagos registrados, sin importar el metodo, del mas reciente al mas antiguo
router.get('/pagos', async (req, res) => {

  try {

    const [rows] = await pool.query(`
      SELECT *
      FROM Pago
      ORDER BY fecha_pago DESC
    `);

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