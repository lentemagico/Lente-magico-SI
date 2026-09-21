import express from 'express';
import pool from '../../db.js';

const router = express.Router();

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

router.put('/:id', async (req, res) => {
    const { id } = req.params;

    const {
        nombre,
        categoria,
        precio_venta,
        stock_actual,
        stock_minimo
    } = req.body;

    try {

        const [categorias] = await pool.query(
            `
            SELECT id_categoria
            FROM Cat_producto
            WHERE nombre_categoria = ?
            `,
            [categoria]
        );

        if (categorias.length === 0) {
            return res.status(400).json({
                mensaje: 'La categoría no existe'
            });
        }

        const id_categoria = categorias[0].id_categoria;

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
                id_categoria,
                nombre,
                precio_venta,
                stock_actual,
                stock_minimo,
                id
            ]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                mensaje: 'Producto no encontrado'
            });
        }

        res.json({
            mensaje: 'Producto actualizado correctamente'
        });

    } catch (error) {
        console.error('Error al actualizar producto:', error);

        res.status(500).json({
            mensaje: 'Error al actualizar el producto',
            error: error.message
        });
    }
});


router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {

        const [resultado] = await pool.query(
            `
            DELETE FROM Producto
            WHERE id_producto = ?
            `,
            [id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                mensaje: 'Producto no encontrado'
            });
        }

        res.json({
            mensaje: 'Producto eliminado correctamente'
        });

    } catch (error) {
        console.error('Error al eliminar producto:', error);

        if (
            error.code === 'ER_ROW_IS_REFERENCED_2' ||
            error.code === 'ER_ROW_IS_REFERENCED'
        ) {
            return res.status(400).json({
                mensaje:
                    'No se puede eliminar el producto porque está relacionado con compras o ventas.'
            });
        }

        res.status(500).json({
            mensaje: 'Error al eliminar el producto',
            error: error.message
        });
    }
});

export default router;