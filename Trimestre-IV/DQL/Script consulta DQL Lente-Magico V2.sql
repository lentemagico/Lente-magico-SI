-- -------------------------------------------
--    Modulo venta/caja -- 
-- ----------------------------------------------
 -- Requerimiento funcional 1-6 
 -- -----------------------------------------------
 
 -- Clientes registrados (RF01)
 SELECT * FROM cliente; 
 
 -- Datos personales de los clientes registrados(RF01)
 SELECT numero_documento, primer_nombre, primer_apellido, segundo_apellido
 FROM datos_personales;
 
 --  Tipos de documentos validos (RF01)
 SELECT nombre_documento, sigla
 FROM tipo_documento;
 
 -- Ventas realizadas  (RF02)
 SELECT COUNT(*) AS total_ventas
 FROM venta;
 
 -- Consultas agendadas (RF03)
 SELECT COUNT(*) AS total_consultas 
 FROM consulta;
 
 -- Pagos Realizados (RF04) 
 SELECT COUNT(*) AS total_pagos
 FROM pago;
 
 
 -- Cantidad de facturas emitidas (RF05)
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

--  Visualizacion del inventario y productos existentes (RF07)
SELECT p.nombre, p.precio_venta, i.stock_minimo
FROM  producto p 
JOIN inventario i ON p.id_producto = i.id_producto;

--  Reporte de los productos ingresados (RF08)

-- Compras a proveedores realizadas (RF08)

-- Consulta de los detalles de compra realizados (RF08)

-- Consulta de los proveedores registrados (RF09) 

--  Consulta de todas las categorias existentes (RF10)

-- Consulta de todos los productos registrados (RF010)


-- --------------------------------------------------------------------
--      Modulo cliente   ---
-- -----------------------------------------------------------------------
-- Requerimiento funcional 11-12 
-- ---------------------------------------------------------------------

-- Uusuarios registrados dentro del programa (RF11)

-- cajero y optometras disponibles en el sistema (RF11) 

-- Listado de autorizaciones y usuarios (RF12)

-- --------------------------------------------------------------------------
--  Modulo Optometra --
-- --------------------------------------------------------------------------
-- Requerimiento funcional 13-16 
-- ----------------------------------------------------------------------------

--  Pacientes registrados (RF13)

-- historias clinicas creadas (RF14)

-- Recopilacion de consultas (RF15)

-- historial de formulas (RF16


-- --------------------------------------------------------------
--        Log errores
-- --------------------------------------------------------------
-- Requerimiento funcional 17
-- -----------------------------------------------------------------

-- Consulta de los errores (RF17) 