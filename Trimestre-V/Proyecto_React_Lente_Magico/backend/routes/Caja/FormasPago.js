import { Router } from 'express';
import pool from '../../db.js';

const router = Router();


// Obtener formas de pago utilizadas
router.get('/', async (req, res) => {

  try {

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