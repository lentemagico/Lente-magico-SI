import express from 'express';
import pool from '../../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM Proveedor');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener proveedores' });
    }
});

router.post('/', async (req, res) => {
    try {
        const { id_tipo_documento, nit, razon_social, contacto, telefono, correo, estado, tipo } = req.body;
        const [result] = await pool.query(
            'INSERT INTO Proveedor (id_tipo_documento, nit, razon_social, contacto, telefono, correo, estado, tipo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id_tipo_documento, nit, razon_social, contacto, telefono, correo, estado, tipo]
        );
        const [nuevo] = await pool.query('SELECT * FROM Proveedor WHERE id_proveedor = ?', [result.insertId]);
        res.status(201).json(nuevo[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear proveedor' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { id_tipo_documento, nit, razon_social, contacto, telefono, correo, estado, tipo } = req.body;
        const [existente] = await pool.query('SELECT * FROM Proveedor WHERE id_proveedor = ?', [id]);
        if (existente.length === 0) {
            return res.status(404).json({ error: 'Proveedor no encontrado' });
        }
        await pool.query(
            'UPDATE Proveedor SET id_tipo_documento = ?, nit = ?, razon_social = ?, contacto = ?, telefono = ?, correo = ?, estado = ?, tipo = ? WHERE id_proveedor = ?',
            [id_tipo_documento, nit, razon_social, contacto, telefono, correo, estado, tipo, id]
        );
        const [actualizado] = await pool.query('SELECT * FROM Proveedor WHERE id_proveedor = ?', [id]);
        res.json(actualizado[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar proveedor' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [existente] = await pool.query('SELECT * FROM Proveedor WHERE id_proveedor = ?', [id]);
        if (existente.length === 0) {
            return res.status(404).json({ error: 'Proveedor no encontrado' });
        }
        await pool.query('DELETE FROM Proveedor WHERE id_proveedor = ?', [id]);
        res.json(existente[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar proveedor' });
    }
});

export default router;