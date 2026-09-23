import { Router } from 'express'; //Es para crear las rutas
import pool from '../../db.js'; //El pool  conexiones a la base de datos

const router = Router();

// Trae todas las autorizaciones ordenadas por id
// responde a peticiones GET desde la raiz '/' F asicronna recibe la peticion req y la res-puesta
router.get('/', async (req, res) => {
  try {
    // Ejecuta la consulta a la base de datos pool.query, espera una respuesta await y la guarda en la variable rows
    const [rows] = await pool.query(
      'SELECT id, nombre FROM Autorizacion ORDER BY id ASC'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener autorizaciones:', error);
    res.status(500).json({ error: error.message });
  }
});

// Busca una autorizacion especifica por su id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nombre FROM Autorizacion WHERE id = ?',
      [req.params.id] // id que viene de la peticion
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Autorización no encontrada' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crea una nueva autorizacion
router.post('/', async (req, res) => {
  try {
    const { nombre } = req.body;
// Se valida que no venga vacio el nombre
// || es el operador "o": si al menos una de las condiciones es verdadera, se cumple el if
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

// Actualiza el nombre de una autorizacion existente
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

//Elimina una autorizacion por id
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