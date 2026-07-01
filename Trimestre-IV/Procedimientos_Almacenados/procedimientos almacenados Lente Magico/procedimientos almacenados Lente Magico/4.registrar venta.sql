CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_Registrar_venta`(
IN V_id_venta INT,
IN V_id_cliente INT,
IN V_id_cajero INT,
IN V_estado varchar(20)

)
BEGIN
declare V_venta int;
declare V_detalle_venta int;
DECLARE EXIT HANDLER FOR SQLEXCEPTION


BEGIN 

ROLLBACK;

END;


START TRANSACTION;

INSERT INTO Venta (id_cliente, id_cajero, fecha_venta, estado)
VALUES(6,6, '2026-06-27 1:30:00', 'Activo');
SET V_id_venta = LAST_INSERT_ID();

INSERT INTO Detalle_venta(id_venta, id_producto, cantidad, precio_unitario)
VALUES(6, 6, 4, 500000);
SET V_id_venta = LAST_INSERT_ID();

SELECT venta INTO V_venta
        FROM detalle_venta
        WHERE id_venta = V_id_venta;
        
        
        IF V_venta IS NOT NULL THEN
        UPDATE detalle_venta 
        SET venta = venta + V_detalle_venta,
			estado = 'Activo'
		WHERE id_venta = V_id_venta;
        
else 
     INSERT INTO Venta (id_cliente, id_cajero, fecha_venta, estado)
	VALUES(6,6, '2026-08-21 08:30:00', 'Activo');   
        
END IF;

COMMIT;
        
	SELECT V_venta AS Venta,
		   V_detalle_venta AS Detalles;
           
END