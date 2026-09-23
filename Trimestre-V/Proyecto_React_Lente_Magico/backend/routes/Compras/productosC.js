import express from 'express'; //Es para crear las rutas
import pool from '../../db.js'; //El pool de conexiones a la base de datos

const router = express.Router();

// Trae todos los productos con el nombre de su categoria
// responde a peticiones GET desde la raiz '/' F asicronna recibe la peticion req y la res-puesta
router.get('/', async (req, res) => {
    try {
        // Ejecuta la consulta a la base de datos pool.query, espera una respuesta await y la guarda en la variable productos
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

// Actualiza un producto existente
router.put('/:id', async (req, res) => {
    const { id } = req.params; // id que viene de la peticion

    const {
        nombre,
        categoria,
        precio_venta,
        stock_actual,
        stock_minimo
    } = req.body;

    try {

        // Aqui la categoria llega como nombre (texto) desde el frontend, no como id
        // por eso primero se busca su id_categoria correspondiente
        const [categorias] = await pool.query(
            `
            SELECT id_categoria
            FROM Cat_producto
            WHERE nombre_categoria = ?
            `,
            [categoria]
        );

        // Si no existe esa categoria, no se puede continuar con la actualizacion
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

        // affectedRows en 0 significa que ese id no existe en la tabla
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

// Elimina un producto por id
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

        // Codigo de error cuando el producto tiene registros relacionados (compras, ventas, etc.)
        // y por eso no se puede eliminar sin romper esa relacion
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