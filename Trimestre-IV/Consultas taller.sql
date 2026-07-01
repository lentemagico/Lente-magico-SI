-- Nivel 1 Reconocimiento 

-- Actividad 1 

SHOW TABLES;


-- Actividad 2 

DESCRIBE producto;

DESCRIBE cat_producto;

-- ************************************************************
-- ************************************************************

-- Nivel 2 Comprension 

-- Actividad 3 
SELECT u.id, u.login, u.correo, u.activar_usuario
FROM usuario u
INNER JOIN autorizacion_usuario ua ON u.id = ua.id_sistema_usuario
ORDER BY u.id ASC;

-- Actividad 4 
SELECT u.id, u.login, u.correo, u.activar_usuario, ua.id_autorizacion
FROM usuario u
LEFT JOIN autorizacion_usuario ua ON u.id = ua.id_sistema_usuario
ORDER BY u.id ASC;

-- Actividad 5
SELECT u.id, u.login, u.correo, u.activar_usuario, ua.id_autorizacion
FROM usuario u
RIGHT JOIN autorizacion_usuario ua ON u.id = ua.id_sistema_usuario
ORDER BY u.id ASC;

-- ######################################################################
-- ######################################################################alter

-- Nivel 3 Análisis y aplicación 

-- Actividad 7 
SELECT p.nombre, p.codigo_producto, p.precio_venta, p.estado
FROM Producto p
WHERE p.id_producto IN (
SELECT i.id_producto
FROM Inventario i
WHERE i.stock_actual > i.stock_minimo
);

-- Actividad 8 
SELECT  c.nombre_categoria, p.nombre, p.precio_venta, (
SELECT AVG(precio_venta)
FROM Producto
WHERE id_categoria = p.id_categoria ) AS promedio_categoria
FROM Producto p
JOIN Cat_producto c ON p.id_categoria = c.id_categoria
WHERE p.precio_venta <= (  SELECT AVG(precio_venta)
FROM Producto
WHERE id_categoria = p.id_categoria );



-- Actividad 9 
SELECT v.id_venta, p.nombre AS producto, dv.cantidad,dv.precio_unitario,v.fecha_venta
FROM Venta v
JOIN Detalle_venta dv ON v.id_venta = dv.id_venta
JOIN Producto p ON dv.id_producto = p.id_producto;


-- Actividad 10 
SELECT nombre, stock_actual
FROM Producto p
JOIN Inventario i ON p.id_producto = i.id_producto
WHERE stock_actual >= (
    SELECT stock_minimo
    FROM Inventario
    WHERE id_producto = p.id_producto
);


