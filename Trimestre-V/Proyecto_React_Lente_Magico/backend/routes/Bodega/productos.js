import express from 'express';
import pool from '../../db.js';

const router = express.Router();

// GET /api/productos — trae todos los productos con el nombre de su categoría
// Acepta ?search= (filtra por nombre o código) y ?limit= (usados por Confirmar Venta)
router.get('/', async (req, res) => {
    try {
        const { search, limit } = req.query;

        const condiciones = [];
        const params = [];

        // Si viene "search", se filtra por nombre o código (parametrizado: evita SQL injection)
        if (search && search.trim() !== '') {
            condiciones.push('(p.nombre LIKE ? OR p.codigo_producto LIKE ?)');
            params.push(`%${search.trim()}%`, `%${search.trim()}%`);
        }

        // Solo se aplica el límite si es un número válido (máximo 100)
        const limite = Number.parseInt(limit, 10);
        const limitSql = Number.isInteger(limite) && limite > 0 ? `LIMIT ${Math.min(limite, 100)}` : '';

        const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

        const [productos] = await pool.query(`
            SELECT
                p.id_producto AS id,
                p.id_producto,
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
            ${where}
            ORDER BY p.id_producto DESC
            ${limitSql}
        `, params);

        // Se mantiene el arreglo plano para no romper las otras pantallas que ya lo consumen
        res.json(productos);

    } catch (error) {
        console.error('Error al consultar productos:', error);
        res.status(500).json({
            mensaje: 'Error al consultar los productos',
            error: error.message
        });
    }
});

// GET /api/productos/:id — trae un producto específico junto con su categoría
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
// El código del producto se genera automáticamente (ya no se recibe en el body)
router.post('/', async (req, res) => {
    const {
        id_categoria, nombre, descripcion,
        precio_venta, estado, stock_actual, stock_minimo
    } = req.body;

    if (!nombre || !String(nombre).trim() || precio_venta === undefined || precio_venta === null) {
        return res.status(400).json({
            mensaje: 'Los campos nombre y precio_venta son obligatorios'
        });
    }

    // Conexión propia: leer el siguiente código y hacer el INSERT dentro de la misma
    // transacción evita códigos repetidos si dos personas crean un producto a la vez
    const conexion = await pool.getConnection();

    try {
        await conexion.beginTransaction();

        // Código automático numérico de 7 dígitos: 1000001, 1000002, ...
        // Solo cuentan los códigos puramente numéricos; los antiguos como
        // "marc0001", "cod-0012" o "cy284603450" se ignoran
        const [filas] = await conexion.query(
            `SELECT COALESCE(MAX(CAST(codigo_producto AS UNSIGNED)), 1000000) + 1 AS siguiente
             FROM Producto
             WHERE codigo_producto REGEXP '^[0-9]+$'
             FOR UPDATE`
        );

        const codigo_producto = String(filas[0].siguiente);

        // Armamos el arreglo de valores; si un campo opcional no llegó, se usa un valor por defecto
        // (?? solo reemplaza cuando el valor es null o undefined, a diferencia de ||)
        const valores = [
            id_categoria ?? null,
            codigo_producto,
            String(nombre).trim(),
            descripcion ?? '', // vacía si no llega, para no insertar NULL
            precio_venta,
            estado ?? 'Activo',
            stock_actual ?? 0,
            stock_minimo ?? 0,
        ];

        const [result] = await conexion.query(
            `INSERT INTO Producto 
             (id_categoria, codigo_producto, nombre, descripcion, precio_venta, estado, stock_actual, stock_minimo) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            valores
        );

        await conexion.commit();

        // Volvemos a consultar el producto recién creado para devolverlo completo (con su id real)
        const [nuevo] = await pool.query('SELECT * FROM Producto WHERE id_producto = ?', [result.insertId]);
        res.status(201).json(nuevo[0]);
    } catch (error) {
        try { await conexion.rollback(); } catch (_) { /* ignorar */ }
        console.error('Error al crear producto:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ mensaje: 'Ya existe un producto con ese código' });
        }
        // error cuando la categoría indicada no existe en la tabla relacionada (llave foránea)
        if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === 'ER_NO_REFERENCED_ROW') {
            return res.status(400).json({ mensaje: 'La categoría indicada no existe' });
        }

        res.status(500).json({ mensaje: 'Error al crear producto', error: error.message });
    } finally {
        conexion.release();
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
        // Si no se actualizó ninguna fila, el id no existe
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
        // Código de error cuando el producto tiene registros relacionados (ventas, compras, etc.)
        // y por eso no se puede eliminar sin romper esa relación
        if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED') {
            return res.status(409).json({
                mensaje: 'No se puede eliminar el producto porque tiene movimientos asociados (compras, ventas, etc.)'
            });
        }

        res.status(500).json({ mensaje: 'Error al eliminar producto', error: error.message });
    }
});

export default router;