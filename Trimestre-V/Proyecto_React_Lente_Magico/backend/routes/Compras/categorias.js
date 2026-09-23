import express from 'express'; //Es para crear las rutas
import pool from '../../db.js'; //El pool de conexiones a la base de datos

const router = express.Router();

// Trae todas las categorías de productos
// responde a peticiones GET desde la raiz '/' F asicronna recibe la peticion req y la res-puesta
router.get('/', async (req, res) => {
    try {
        // Ejecuta la consulta a la base de datos pool.query, espera una respuesta await y la guarda en la variable rows
        const [rows] = await pool.query('SELECT * FROM Cat_producto');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener categorías' });
    }
});

// Crea una nueva categoria
router.post('/', async (req, res) => {
    try {
        const { nombre_categoria, descripcion, estado } = req.body;

        const [result] = await pool.query(
            'INSERT INTO Cat_producto (nombre_categoria, descripcion, estado) VALUES (?, ?, ?)',
            [nombre_categoria, descripcion, estado]
        );

        // Se vuelve a consultar la categoria recien creada para devolverla completa (con su id real)
        const [nueva] = await pool.query('SELECT * FROM Cat_producto WHERE id_categoria = ?', [result.insertId]);
        res.status(201).json(nueva[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear categoría' });
    }
});

// Actualiza una categoria existente
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params; // id que viene de la peticion
        const { nombre_categoria, descripcion, estado } = req.body;

        // Se valida primero que la categoria exista antes de actualizarla
        const [existente] = await pool.query('SELECT * FROM Cat_producto WHERE id_categoria = ?', [id]);
        if (existente.length === 0) {
            return res.status(404).json({ error: 'Categoría no encontrada' });
        }

        await pool.query(
            'UPDATE Cat_producto SET nombre_categoria = ?, descripcion = ?, estado = ? WHERE id_categoria = ?',
            [nombre_categoria, descripcion, estado, id]
        );

        // Se consulta de nuevo para devolver la categoria ya con los cambios aplicados
        const [actualizada] = await pool.query('SELECT * FROM Cat_producto WHERE id_categoria = ?', [id]);
        res.json(actualizada[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar categoría' });
    }
});

// Elimina una categoria por id
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Se valida primero que la categoria exista antes de eliminarla
        const [existente] = await pool.query('SELECT * FROM Cat_producto WHERE id_categoria = ?', [id]);
        if (existente.length === 0) {
            return res.status(404).json({ error: 'Categoría no encontrada' });
        }

        await pool.query('DELETE FROM Cat_producto WHERE id_categoria = ?', [id]);

        // Se devuelven los datos de la categoria que se acaba de eliminar
        res.json(existente[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar categoría' });
    }
});

export default router;