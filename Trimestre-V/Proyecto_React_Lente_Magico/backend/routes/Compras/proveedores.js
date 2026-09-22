import express from 'express'; //Es para crear las rutas
import pool from '../../db.js'; //El pool de conexiones a la base de datos

const router = express.Router();

// Trae todos los proveedores
// responde a peticiones GET desde la raiz '/' F asicronna recibe la peticion req y la res-puesta
router.get('/', async (req, res) => {
    try {
        // Ejecuta la consulta a la base de datos pool.query, espera una respuesta await y la guarda en la variable rows
        const [rows] = await pool.query('SELECT * FROM Proveedor');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener proveedores' });
    }
});

// Crea un nuevo proveedor
router.post('/', async (req, res) => {
    try {
        const { id_tipo_documento, nit, razon_social, contacto, telefono, correo, estado, tipo } = req.body;

        const [result] = await pool.query(
            'INSERT INTO Proveedor (id_tipo_documento, nit, razon_social, contacto, telefono, correo, estado, tipo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id_tipo_documento, nit, razon_social, contacto, telefono, correo, estado, tipo]
        );

        // Se vuelve a consultar el proveedor recien creado para devolverlo completo (con su id real)
        const [nuevo] = await pool.query('SELECT * FROM Proveedor WHERE id_proveedor = ?', [result.insertId]);
        res.status(201).json(nuevo[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear proveedor' });
    }
});

// Actualiza un proveedor existente
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params; // id que viene de la peticion
        const { id_tipo_documento, nit, razon_social, contacto, telefono, correo, estado, tipo } = req.body;

        // Se valida primero que el proveedor exista antes de actualizarlo
        const [existente] = await pool.query('SELECT * FROM Proveedor WHERE id_proveedor = ?', [id]);
        if (existente.length === 0) {
            return res.status(404).json({ error: 'Proveedor no encontrado' });
        }

        await pool.query(
            'UPDATE Proveedor SET id_tipo_documento = ?, nit = ?, razon_social = ?, contacto = ?, telefono = ?, correo = ?, estado = ?, tipo = ? WHERE id_proveedor = ?',
            [id_tipo_documento, nit, razon_social, contacto, telefono, correo, estado, tipo, id]
        );

        // Se consulta de nuevo para devolver el proveedor ya con los cambios aplicados
        const [actualizado] = await pool.query('SELECT * FROM Proveedor WHERE id_proveedor = ?', [id]);
        res.json(actualizado[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar proveedor' });
    }
});

// Elimina un proveedor por id
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Se valida primero que el proveedor exista antes de eliminarlo
        const [existente] = await pool.query('SELECT * FROM Proveedor WHERE id_proveedor = ?', [id]);
        if (existente.length === 0) {
            return res.status(404).json({ error: 'Proveedor no encontrado' });
        }

        await pool.query('DELETE FROM Proveedor WHERE id_proveedor = ?', [id]);

        // Se devuelven los datos del proveedor que se acaba de eliminar
        res.json(existente[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar proveedor' });
    }
});

export default router;