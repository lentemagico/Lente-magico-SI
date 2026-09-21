import express from 'express';
import pool from '../../db.js';

const router = express.Router();

// GET /api/productos — trae todos los productos con el nombre de su categoría
router.get('/', async (req, res) => {
    try {
        const [productos] = await pool.query(`
            SELECT
                p.id_producto AS id,
                p.codigo_producto,
                p.nombre,
                p.descripcion,
                p.precio_venta,
                p.estado,
                p.fecha_creacion,
                p.stock_actual,
                p.stock_minimo,
                c.id_categoria,
                c.nombre_categoria AS categoria
            FROM Producto p
            LEFT JOIN Cat_producto c
                ON p.id_categoria = c.id_categoria
            ORDER BY p.id_producto DESC
        `);

        res.json(productos);

    } catch (error) {
        console.error('Error al consultar productos:', error);
        res.status(500).json({
            mensaje: 'Error al consultar los productos',
            error: error.message
        });
    }
});

// GET /api/productos/:id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query(`
            SELECT
                p.id_producto AS id,
                p.codigo_producto,
                p.nombre,
                p.descripcion,
                p.precio_venta,
                p.estado,
                p.fecha_creacion,
                p.stock_actual,
                p.stock_minimo,
                c.id_categoria,
                c.nombre_categoria AS categoria
            FROM Producto p
            LEFT JOIN Cat_producto c
                ON p.id_categoria = c.id_categoria
            WHERE p.id_producto = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ mensaje: 'Producto no encontrado' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Error al consultar el producto:', error);
        res.status(500).json({ mensaje: 'Error al obtener el producto', error: error.message });
    }
});

// POST /api/productos — crea un producto nuevo
router.post('/', async (req, res) => {
    try {
        const {
            id_categoria, codigo_producto, nombre, descripcion,
            precio_venta, estado, stock_actual, stock_minimo
        } = req.body;

        if (!codigo_producto || !nombre || precio_venta === undefined || precio_venta === null) {
            return res.status(400).json({
                mensaje: 'Los campos codigo_producto, nombre y precio_venta son obligatorios'
            });
        }

        const valores = [
            id_categoria ?? null,
            codigo_producto,
            nombre,
            descripcion ?? null,
            precio_venta,
            estado ?? 'Activo',
            stock_actual ?? 0,
            stock_minimo ?? 0,
        ];

        const [result] = await pool.query(
            `INSERT INTO Producto 
             (id_categoria, codigo_producto, nombre, descripcion, precio_venta, estado, stock_actual, stock_minimo) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            valores
        );

        const [nuevo] = await pool.query('SELECT * FROM Producto WHERE id_producto = ?', [result.insertId]);
        res.status(201).json(nuevo[0]);
    } catch (error) {
        console.error('Error al crear producto:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ mensaje: 'Ya existe un producto con ese código' });
        }
        if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === 'ER_NO_REFERENCED_ROW') {
            return res.status(400).json({ mensaje: 'La categoría indicada no existe' });
        }

        res.status(500).json({ mensaje: 'Error al crear producto', error: error.message });
    }
});

// PUT /api/productos/:id — actualiza un producto
router.put('/:id', async (req, res) => {
    const { id } = req.params;

    const {
        nombre,
        id_categoria,
        precio_venta,
        stock_actual,
        stock_minimo
    } = req.body;

    try {
        const [resultado] = await pool.query(
            `
            UPDATE Producto
            SET
                id_categoria = ?,
                nombre = ?,
                precio_venta = ?,
                stock_actual = ?,
                stock_minimo = ?
            WHERE id_producto = ?
            `,
            [
                id_categoria ?? null,
                nombre,
                precio_venta,
                stock_actual,
                stock_minimo,
                id
            ]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ mensaje: 'Producto no encontrado' });
        }

        // Se consulta nuevamente el producto para obtener
        // el nombre de la categoría actualizada
        const [productoActualizado] = await pool.query(`
            SELECT
                p.id_producto AS id,
                p.codigo_producto,
                p.nombre,
                p.descripcion,
                p.precio_venta,
                p.estado,
                p.fecha_creacion,
                p.stock_actual,
                p.stock_minimo,
                c.id_categoria,
                c.nombre_categoria AS categoria
            FROM Producto p
            LEFT JOIN Cat_producto c
                ON p.id_categoria = c.id_categoria
            WHERE p.id_producto = ?
        `, [id]);

        res.json(productoActualizado[0]);

    } catch (error) {
        console.error('Error al actualizar producto:', error);

        if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === 'ER_NO_REFERENCED_ROW') {
            return res.status(400).json({ mensaje: 'La categoría indicada no existe' });
        }

        res.status(500).json({ mensaje: 'Error al actualizar el producto', error: error.message });
    }
});

// DELETE /api/productos/:id
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const [resultado] = await pool.query(
            'DELETE FROM Producto WHERE id_producto = ?',
            [id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ mensaje: 'Producto no encontrado' });
        }

        res.json({ mensaje: 'Producto eliminado correctamente' });

    } catch (error) {
        console.error('Error al eliminar producto:', error);

        if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED') {
            return res.status(409).json({
                mensaje: 'No se puede eliminar el producto porque tiene movimientos asociados (compras, ventas, etc.)'
            });
        }

        res.status(500).json({ mensaje: 'Error al eliminar producto', error: error.message });
    }
});

export default router;