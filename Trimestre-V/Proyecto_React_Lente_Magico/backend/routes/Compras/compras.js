// backend/routes/compras.js
import express from 'express';
import pool from '../../db.js';

const router = express.Router();

// GET /api/compras — trae compras con su detalle anidado
router.get('/', async (req, res) => {
    try {
        const [compras] = await pool.query(
            `SELECT c.*, p.razon_social AS idProveedor 
             FROM Compra c 
             LEFT JOIN Proveedor p ON c.id_proveedor = p.id_proveedor`
        );

        for (const compra of compras) {
            const [detalle] = await pool.query(
                `SELECT dc.*, pr.nombre AS nombreProducto 
                 FROM Detalle_compra dc 
                 LEFT JOIN Producto pr ON dc.id_producto = pr.id_producto 
                 WHERE dc.id_compra = ?`,
                [compra.id_compra]
            );
            compra.detalle = detalle.map(d => ({
                nombreProducto: d.nombreProducto,
                cantidad: d.cantidad,
                costoUnitario: d.costo_unitario
            }));
            compra.id = compra.id_compra;
            compra.fechaCompra = compra.fecha_compra;
            compra.numComprobante = compra.num_comprobante;
        }

        res.json(compras);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener compras' });
    }
});

// GET /api/compras/:id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query('SELECT * FROM Compra WHERE id_compra = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Compra no encontrada' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener la compra' });
    }
});

// POST /api/compras — crea la compra, su detalle, y sincroniza el inventario
router.post('/', async (req, res) => {
    const { idProveedor, fechaCompra, numComprobante, estado, detalle } = req.body;

    if (!idProveedor || !fechaCompra || !numComprobante || !Array.isArray(detalle) || detalle.length === 0) {
        return res.status(400).json({ error: 'Faltan campos obligatorios o el detalle está vacío' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // idProveedor llega como razón social (texto) desde el frontend, no como id numérico.
        const [proveedorRows] = await connection.query(
            'SELECT id_proveedor FROM Proveedor WHERE razon_social = ?',
            [idProveedor]
        );
        if (proveedorRows.length === 0) {
            await connection.rollback();
            return res.status(400).json({ error: `No se encontró el proveedor "${idProveedor}"` });
        }
        const id_proveedor = proveedorRows[0].id_proveedor;

        // Inserta la cabecera de la compra
        const [compraResult] = await connection.query(
            'INSERT INTO Compra (id_proveedor, fecha_compra, num_comprobante, estado) VALUES (?, ?, ?, ?)',
            [id_proveedor, fechaCompra, numComprobante, estado || 'Pendiente']
        );
        const id_compra = compraResult.insertId;

        // Categoría por defecto para productos nuevos que aparezcan en el detalle.
        // Si no hay ninguna categoría creada, se deja en null y el producto
        // se crea sin categoría (requiere que Producto.id_categoria permita NULL).
        const [categoriaRows] = await connection.query(
            'SELECT id_categoria FROM cat_producto ORDER BY id_categoria LIMIT 1'
        );
        const id_categoria_default = categoriaRows[0]?.id_categoria ?? null;

        const actualizarStock = estado !== 'Anulada';

        for (const linea of detalle) {
            const nombreProducto = (linea.nombreProducto || '').trim();
            const cantidad = Number(linea.cantidad) || 0;
            const costoUnitario = Number(linea.costoUnitario) || 0;

            // Busca el producto por nombre (case-insensitive)
            const [productoRows] = await connection.query(
                'SELECT * FROM Producto WHERE LOWER(TRIM(nombre)) = ?',
                [nombreProducto.toLowerCase()]
            );

            let id_producto;
            if (productoRows.length > 0) {
                id_producto = productoRows[0].id_producto;
                if (actualizarStock) {
                    const nuevoStock = Number(productoRows[0].stock_actual || 0) + cantidad;
                    await connection.query(
                        'UPDATE Producto SET stock_actual = ? WHERE id_producto = ?',
                        [nuevoStock, id_producto]
                    );
                }
            } else {
                // FIX: ya no se bloquea la compra si no hay categorías creadas.
                // El producto se crea con id_categoria = NULL en ese caso.
                const codigo_producto = `PRD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                const [nuevoProducto] = await connection.query(
                    `INSERT INTO Producto 
                        (id_categoria, codigo_producto, nombre, descripcion, precio_venta, estado, stock_actual, stock_minimo) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        id_categoria_default,
                        codigo_producto,
                        nombreProducto,
                        '',
                        costoUnitario,
                        'Activo',
                        actualizarStock ? cantidad : 0,
                        0
                    ]
                );
                id_producto = nuevoProducto.insertId;
            }

            await connection.query(
                'INSERT INTO Detalle_compra (id_compra, id_producto, cantidad, costo_unitario) VALUES (?, ?, ?, ?)',
                [id_compra, id_producto, cantidad, costoUnitario]
            );
        }

        await connection.commit();

        res.status(201).json({
            id: id_compra,
            idProveedor,
            fechaCompra,
            numComprobante,
            estado: estado || 'Pendiente',
            detalle
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error al crear la compra:', error);

        // FIX: distinguimos el error de FK (id_categoria NULL no permitido en la tabla)
        // para dar un mensaje claro en vez de un 500 genérico.
        if (error.code === 'ER_BAD_NULL_ERROR') {
            return res.status(400).json({
                error: 'No se pudo crear el producto sin categoría: la columna id_categoria de Producto no permite NULL. Ejecuta: ALTER TABLE Producto MODIFY id_categoria INT NULL;'
            });
        }

        res.status(500).json({ error: 'Error al crear la compra en la base de datos' });
    } finally {
        connection.release();
    }
});


// PUT /api/compras/:id — actualiza la compra y su detalle
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { idProveedor, fechaCompra, numComprobante, estado, detalle } = req.body;

    if (!idProveedor || !fechaCompra || !numComprobante || !Array.isArray(detalle) || detalle.length === 0) {
        return res.status(400).json({
            error: 'Faltan campos obligatorios o el detalle está vacío'
        });
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Verificar que la compra exista
        const [compraExistente] = await connection.query(
            'SELECT * FROM Compra WHERE id_compra = ?',
            [id]
        );

        if (compraExistente.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                error: 'Compra no encontrada'
            });
        }

        // Buscar el proveedor por razón social
        const [proveedorRows] = await connection.query(
            'SELECT id_proveedor FROM Proveedor WHERE razon_social = ?',
            [idProveedor]
        );

        if (proveedorRows.length === 0) {
            await connection.rollback();
            return res.status(400).json({
                error: `No se encontró el proveedor "${idProveedor}"`
            });
        }

        const id_proveedor = proveedorRows[0].id_proveedor;

        // Actualizar información de la compra
        await connection.query(
            `UPDATE Compra
             SET
                id_proveedor = ?,
                fecha_compra = ?,
                num_comprobante = ?,
                estado = ?
             WHERE id_compra = ?`,
            [
                id_proveedor,
                fechaCompra,
                numComprobante,
                estado || 'Pendiente',
                id
            ]
        );

        // Obtener el detalle anterior
        const [detalleAnterior] = await connection.query(
            'SELECT * FROM Detalle_compra WHERE id_compra = ?',
            [id]
        );

        // Eliminar el detalle anterior
        await connection.query(
            'DELETE FROM Detalle_compra WHERE id_compra = ?',
            [id]
        );

        // Restaurar el stock anterior
        if (compraExistente[0].estado !== 'Anulada') {
            for (const lineaAnterior of detalleAnterior) {
                const [producto] = await connection.query(
                    'SELECT stock_actual FROM Producto WHERE id_producto = ?',
                    [lineaAnterior.id_producto]
                );

                if (producto.length > 0) {
                    const stockActual = Number(producto[0].stock_actual || 0);
                    const nuevoStock = stockActual - Number(lineaAnterior.cantidad || 0);

                    await connection.query(
                        'UPDATE Producto SET stock_actual = ? WHERE id_producto = ?',
                        [Math.max(0, nuevoStock), lineaAnterior.id_producto]
                    );
                }
            }
        }

        // Agregar el nuevo detalle y actualizar inventario
        const actualizarStock = estado !== 'Anulada';

        for (const linea of detalle) {
            const nombreProducto = (linea.nombreProducto || '').trim();
            const cantidad = Number(linea.cantidad) || 0;
            const costoUnitario = Number(linea.costoUnitario) || 0;

            if (!nombreProducto) {
                continue;
            }

            // Buscar producto
            const [productoRows] = await connection.query(
                'SELECT * FROM Producto WHERE LOWER(TRIM(nombre)) = ?',
                [nombreProducto.toLowerCase()]
            );

            let id_producto;

            if (productoRows.length > 0) {
                id_producto = productoRows[0].id_producto;

                // Actualizar stock
                if (actualizarStock) {
                    const nuevoStock =
                        Number(productoRows[0].stock_actual || 0) + cantidad;

                    await connection.query(
                        'UPDATE Producto SET stock_actual = ? WHERE id_producto = ?',
                        [nuevoStock, id_producto]
                    );
                }
            } else {
                // Crear producto si no existe
                const [categoriaRows] = await connection.query(
                    'SELECT id_categoria FROM cat_producto ORDER BY id_categoria LIMIT 1'
                );

                const id_categoria_default =
                    categoriaRows[0]?.id_categoria ?? null;

                const codigo_producto =
                    `PRD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

                const [nuevoProducto] = await connection.query(
                    `INSERT INTO Producto
                        (id_categoria, codigo_producto, nombre, descripcion,
                         precio_venta, estado, stock_actual, stock_minimo)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        id_categoria_default,
                        codigo_producto,
                        nombreProducto,
                        '',
                        costoUnitario,
                        'Activo',
                        actualizarStock ? cantidad : 0,
                        0
                    ]
                );

                id_producto = nuevoProducto.insertId;
            }

            // Insertar nuevo detalle
            await connection.query(
                `INSERT INTO Detalle_compra
                    (id_compra, id_producto, cantidad, costo_unitario)
                 VALUES (?, ?, ?, ?)`,
                [
                    id,
                    id_producto,
                    cantidad,
                    costoUnitario
                ]
            );
        }

        await connection.commit();

        res.json({
            mensaje: 'Compra actualizada correctamente',
            id: Number(id),
            idProveedor,
            fechaCompra,
            numComprobante,
            estado: estado || 'Pendiente',
            detalle
        });

    } catch (error) {
        await connection.rollback();

        console.error('Error al actualizar la compra:', error);

        res.status(500).json({
            error: 'Error al actualizar la compra en la base de datos',
            detalle: error.message
        });
    } finally {
        connection.release();
    }
});


// DELETE /api/compras/:id
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [existente] = await pool.query('SELECT * FROM Compra WHERE id_compra = ?', [id]);
        if (existente.length === 0) {
            return res.status(404).json({ error: 'Compra no encontrada' });
        }
        await pool.query('DELETE FROM Detalle_compra WHERE id_compra = ?', [id]);
        await pool.query('DELETE FROM Compra WHERE id_compra = ?', [id]);
        res.json(existente[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar la compra' });
    }
});

export default router;