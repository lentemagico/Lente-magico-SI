-- -------------------------------------------
--    Modulo venta/caja -- 
-- ----------------------------------------------
 -- Requerimiento funcional 1-6 
 -- -----------------------------------------------
 
 -- Clientes registrados (RF01)
 SELECT  c.id_cliente,d.primer_nombre, d.primer_apellido, d.numero_documento, c.telefono
 FROM cliente c 
 JOIN datos_personales d ON c.id_cliente = d.id;
 
 -- Datos personales de los clientes registrados(RF01)
 SELECT d.numero_documento, d.primer_nombre, d.primer_apellido, d.segundo_apellido, c.telefono
 FROM datos_personales d
 JOIN cliente c ON d.id = c.id_cliente;
 
 --  Listar tipos de documentos validos (RF01)
 SELECT sigla,nombre_documento
 FROM tipo_documento;
 
 -- Total de Ventas realizadas  (RF02)
 SELECT COUNT(*) AS total_ventas
 FROM venta;
 
 -- Total de consultas agendadas (RF03)
 SELECT COUNT(*) AS total_consultas 
 FROM consulta;
 
 -- Total pagos Realizados (RF04) 
 SELECT COUNT(*) AS total_pagos
 FROM pago;
 
 
 -- Total cantidad de facturas emitidas (RF05)
 SELECT COUNT(*) AS total_facturas__emitidas
 FROM factura;
 
 
 -- Detalles de las ventas efectuadas (RF06) 
 SELECT id_venta,id_producto, cantidad, precio_unitario
 FROM detalle_venta;
 
 
 -- -------------------------------------------------------
 --    Modulo bodega/compra --
-- ---------------------------------------------------------
-- Requerimiento Funcional 7-10 
-- ----------------------------------------------------------

--  Listado de inventario y productos existentes (RF07)
SELECT p.nombre, p.precio_venta, i.stock_minimo
FROM  producto p 
JOIN inventario i ON p.id_producto = i.id_producto;

--  Reporte de los productos ingresados (RF08)
SELECT  p.codigo_producto, p.nombre, r.fecha_generacion, r.parametro_filtro
FROM producto p
JOIN reporte_producto r ON p.id_producto = r.id_producto;

-- Compras a proveedores realizadas (RF08)
SELECT id_compra, num_comprobante, fecha_compra
FROM compra;

-- Consulta de los detalles de compra realizados (RF08)
SELECT d.id_detalle_compra, p.codigo_producto, p.nombre,d.cantidad, d.costo_unitario
FROM producto p
JOIN detalle_compra d ON p.id_producto = d.id_producto
ORDER BY p.nombre ASC;

-- Consulta de los proveedores registrados (RF09) 
SELECT * FROM proveedor
ORDER BY tipo ASC;

--  Consulta de todas las categorias existentes (RF10)
SELECT * 
FROM cat_producto;

-- Consulta de todos los productos registrados (RF010)
SELECT *
FROM producto;


-- --------------------------------------------------------------------
--      Modulo cliente   ---
-- -----------------------------------------------------------------------
-- Requerimiento funcional 11-12 
-- ---------------------------------------------------------------------

-- Uusuarios registrados dentro del programa (RF11)
SELECT *
FROM usuario;

-- cajero y optometras disponibles en el sistema (RF11) 
SELECT d.primer_nombre, d.segundo_nombre, d.primer_apellido, d.segundo_apellido, 'Optometra' AS cargo, o.fecha_registro
FROM datos_personales d
INNER JOIN optometra o ON d.id = o.id_datos_personales

UNION ALL

SELECT d.primer_nombre, d.segundo_nombre,d.primer_apellido, d.segundo_apellido,'Cajero' AS cargo, c.fecha_registro
FROM datos_personales d
INNER JOIN cajero c ON d.id = c.id_datos_personales
ORDER BY cargo  ASC;

-- Listado de autorizaciones y usuarios (RF12)
SELECT u.id, u.login, u.correo, u.activar_usuario, a.nombre 
FROM usuario u
INNER JOIN autorizacion_usuario ua ON u.id = ua.id_sistema_usuario
INNER JOIN autorizacion a ON ua.id_autorizacion = a.id
ORDER BY u.id ASC;
-- --------------------------------------------------------------------------
--  Modulo Optometra --
-- --------------------------------------------------------------------------
-- Requerimiento funcional 13-16 
-- ----------------------------------------------------------------------------

--  Pacientes registrados (RF13)
SELECT *
FROM paciente
ORDER BY genero ASC;

-- Listado historias clinicas creadas (RF14)
SELECT *
FROM historia_clinica;

-- Recopilacion de consultas (RF15)
SELECT COUNT(*) AS total_consultas
FROM consulta;

-- Listado de formulas (RF16)
SELECT *
FROM formula_optica; 



-- --------------------------------------------------------------
--        Log errores
-- --------------------------------------------------------------
-- Requerimiento funcional 17
-- -----------------------------------------------------------------

-- Consulta de los errores (RF17) 
SELECT *
FROM log_errores;