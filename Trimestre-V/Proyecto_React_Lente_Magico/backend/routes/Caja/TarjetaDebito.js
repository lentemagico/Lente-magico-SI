import { Router } from 'express'; //Es para crear las rutas
import pool from '../../db.js'; //El pool de conexiones a la base de datos

const router = Router();


// Registrar pago tarjeta débito
// Registra un pago hecho con tarjeta debito
router.post('/', async (req, res) => {

  try {

    const {
      id_venta,
      monto
    } = req.body;

    // monto == null cubre tanto null como undefined en una sola comparacion
    if (!id_venta || monto == null) {

      return res.status(400).json({
        error: 'Venta y monto son obligatorios'
      });

    }

    // El metodo_pago se deja fijo como 'Tarjeta Débito', ya que es lo unico que maneja esta ruta
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

    // insertId trae el id que la base de datos le asigno a este nuevo pago
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
// Trae todos los pagos que se hayan hecho especificamente con tarjeta debito
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