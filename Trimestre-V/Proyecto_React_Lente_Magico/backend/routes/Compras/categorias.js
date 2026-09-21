import express from 'express';
import pool from '../../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM Cat_producto');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener categorías' });
    }
});

router.post('/', async (req, res) => {
    try {
        const { nombre_categoria, descripcion, estado } = req.body;
        const [result] = await pool.query(
            'INSERT INTO Cat_producto (nombre_categoria, descripcion, estado) VALUES (?, ?, ?)',
            [nombre_categoria, descripcion, estado]
        );
        const [nueva] = await pool.query('SELECT * FROM Cat_producto WHERE id_categoria = ?', [result.insertId]);
        res.status(201).json(nueva[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear categoría' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre_categoria, descripcion, estado } = req.body;
        const [existente] = await pool.query('SELECT * FROM Cat_producto WHERE id_categoria = ?', [id]);
        if (existente.length === 0) {
            return res.status(404).json({ error: 'Categoría no encontrada' });
        }
        await pool.query(
            'UPDATE Cat_producto SET nombre_categoria = ?, descripcion = ?, estado = ? WHERE id_categoria = ?',
            [nombre_categoria, descripcion, estado, id]
        );
        const [actualizada] = await pool.query('SELECT * FROM Cat_producto WHERE id_categoria = ?', [id]);
        res.json(actualizada[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar categoría' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [existente] = await pool.query('SELECT * FROM Cat_producto WHERE id_categoria = ?', [id]);
        if (existente.length === 0) {
            return res.status(404).json({ error: 'Categoría no encontrada' });
        }
        await pool.query('DELETE FROM Cat_producto WHERE id_categoria = ?', [id]);
        res.json(existente[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar categoría' });
    }
});

export default router;