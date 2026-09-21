import { Router } from 'express';
import pool from '../../db.js';

const router = Router();


// Registrar pago tarjeta débito
router.post('/', async (req, res) => {

  try {

    const {
      id_venta,
      monto
    } = req.body;

    if (!id_venta || monto == null) {

      return res.status(400).json({
        error: 'Venta y monto son obligatorios'
      });

    }

    const [result] = await pool.query(`
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
        'Tarjeta Débito',
        CURRENT_TIMESTAMP,
        ?,
        ?,
        0
      )
    `, [
      id_venta,
      monto,
      monto
    ]);

    res.status(201).json({
      mensaje: 'Pago con tarjeta débito registrado',
      id_pagos: result.insertId
    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

});


// Obtener pagos
router.get('/', async (req, res) => {

  try {

    const [rows] = await pool.query(`
      SELECT *
      FROM Pago
      WHERE metodo_pago = 'Tarjeta Débito'
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