import { Router } from 'express';
import pool from '../../db.js';

const router = Router();


router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nombre FROM Autorizacion ORDER BY id ASC'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener autorizaciones:', error);
    res.status(500).json({ error: error.message });
  }
});


router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nombre FROM Autorizacion WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Autorización no encontrada' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.post('/', async (req, res) => {
  try {
    const { nombre } = req.body;

    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({ error: 'El nombre de la autorización es requerido' });
    }

    await pool.query(
      `INSERT INTO Autorizacion (nombre) VALUES (?)`,
      [nombre]
    );

    res.status(201).json({ mensaje: 'Autorización creada exitosamente' });
  } catch (error) {
    console.error('Error al crear autorización:', error);
    res.status(500).json({ error: error.message });
  }
});


router.put('/:id', async (req, res) => {
  try {
    const { nombre } = req.body;

    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    const [result] = await pool.query(
      `UPDATE Autorizacion SET nombre = ? WHERE id = ?`,
      [nombre, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Autorización no encontrada' });
    }

    res.json({ mensaje: 'Autorización actualizada exitosamente' });
  } catch (error) {
    console.error('Error al actualizar autorización:', error);
    res.status(500).json({ error: error.message });
  }
});


router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM Autorizacion WHERE id = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Autorización no encontrada' });
    }

    res.json({ mensaje: 'Autorización eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar autorización:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;