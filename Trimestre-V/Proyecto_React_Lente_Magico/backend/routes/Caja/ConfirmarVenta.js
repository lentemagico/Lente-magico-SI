import { Router } from 'express';
import pool from '../../db.js';

const router = Router();

// Error propio para poder responder con el código HTTP correcto (400, 404, 409...)
class ErrorVenta extends Error {
  constructor(mensaje, status = 400) {
    super(mensaje);
    this.status = status;
  }
}

// ======================================================
// CONFIRMAR VENTA
// ======================================================
router.post('/', async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const {
      id_cliente,
      id_usuario,
      estado = 'Confirmada',
      productos = []
    } = req.body;

    // ---------- Validaciones básicas (antes de abrir la transacción) ----------
    if (!id_cliente) {
      return res.status(400).json({ error: 'El cliente es obligatorio' });
    }

    if (!id_usuario) {
      return res.status(401).json({
        error: 'No se encontró el usuario que inició sesión. Vuelve a iniciar sesión.'
      });
    }

    if (!Array.isArray(productos) || productos.length === 0) {
      return res.status(400).json({
        error: 'Debe agregar productos o servicios a la venta'
      });
    }

    // Ordenamos por id para que todas las ventas bloqueen las filas en el MISMO orden
    // y así evitar deadlocks entre dos ventas simultáneas con productos cruzados
    const items = [...productos].sort((a, b) => a.id_producto - b.id_producto);

    await connection.beginTransaction();

    // ---------- Verificar que el usuario exista ----------
    const [usuario] = await connection.query(
      'SELECT id FROM Usuario WHERE id = ? LIMIT 1',
      [id_usuario]
    );
    if (usuario.length === 0) {
      throw new ErrorVenta('El usuario que inició sesión no existe', 401);
    }

    // ---------- Crear la venta ----------
    const [venta] = await connection.query(
      `INSERT INTO Venta (id_cliente, id_usuario, fecha_venta, estado)
       VALUES (?, ?, CURRENT_TIMESTAMP, ?)`,
      [id_cliente, id_usuario, estado]
    );
    const idVenta = venta.insertId;

    let total = 0;
    const alertas_stock = []; // productos que quedaron en o bajo su stock mínimo

    // ---------- Detalle + descuento de inventario ----------
    for (const item of items) {
      const { id_producto } = item;
      const cantidad = Number(item.cantidad);

      // Validaciones separadas: así el mensaje dice exactamente qué campo falla
      if (!id_producto) {
        console.log('Item recibido sin id_producto:', item);
        throw new ErrorVenta(
          `Falta id_producto en un producto. Recibido: ${JSON.stringify(item)}`
        );
      }

      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        throw new ErrorVenta(
          `Cantidad inválida para el producto ${id_producto}: ${item.cantidad}`
        );
      }

      // FOR UPDATE bloquea la fila hasta el commit/rollback:
      // otra venta del mismo producto espera y luego lee el stock ya actualizado
      const [productoBD] = await connection.query(
        `SELECT id_producto, nombre, precio_venta, stock_actual,
                stock_minimo, codigo_producto, estado
         FROM Producto
         WHERE id_producto = ?
         LIMIT 1
         FOR UPDATE`,
        [id_producto]
      );

      if (productoBD.length === 0) {
        throw new ErrorVenta(`El producto o servicio ${id_producto} no existe`, 404);
      }

      const prod = productoBD[0];

      if (prod.estado !== 'Activo') {
        throw new ErrorVenta(`"${prod.nombre}" no está activo para la venta`, 409);
      }

      // Los servicios (SERV-...) no manejan inventario
      const esServicio = Boolean(prod.codigo_producto?.startsWith('SERV-'));

      if (!esServicio) {
        if (prod.stock_actual == null) {
          throw new ErrorVenta(`El producto ${prod.nombre} no tiene stock configurado`, 409);
        }
        if (Number(prod.stock_actual) < cantidad) {
          throw new ErrorVenta(
            `Stock insuficiente para ${prod.nombre}. Stock disponible: ${prod.stock_actual}`,
            409
          );
        }
      }

      // Se usa el precio de la BD, NO el que manda el navegador
      const precioUnitario = Number(prod.precio_venta);
      total += precioUnitario * cantidad;

      await connection.query(
        `INSERT INTO Detalle_venta (id_venta, id_producto, cantidad, precio_unitario)
         VALUES (?, ?, ?, ?)`,
        [idVenta, id_producto, cantidad, precioUnitario]
      );

      // Descuento de stock (solo productos físicos)
      if (!esServicio) {
        await connection.query(
          'UPDATE Producto SET stock_actual = stock_actual - ? WHERE id_producto = ?',
          [cantidad, id_producto]
        );

        const stockNuevo = Number(prod.stock_actual) - cantidad;
        if (stockNuevo <= Number(prod.stock_minimo ?? 0)) {
          alertas_stock.push({
            nombre: prod.nombre,
            stock_actual: stockNuevo,
            stock_minimo: Number(prod.stock_minimo ?? 0)
          });
        }
      }
    }

    // Todo salió bien: venta, detalles y descuento se guardan juntos
    await connection.commit();

    return res.status(201).json({
      mensaje: 'Venta confirmada exitosamente',
      id_venta: idVenta,
      id_usuario: Number(id_usuario),
      id_cliente: Number(id_cliente),
      total,          // calculado con los precios reales de la BD
      alertas_stock   // para avisar al cajero
    });

  } catch (error) {
    await connection.rollback(); // si algo falla, no se descuenta nada

    console.error('Error al confirmar venta:', error);

    // Errores controlados muestran su mensaje; los inesperados no filtran detalles internos
    const status = error.status || 500;
    return res.status(status).json({
      error: error.status ? error.message : 'Error interno al confirmar la venta'
    });

  } finally {
    connection.release();
  }
});

export default router;