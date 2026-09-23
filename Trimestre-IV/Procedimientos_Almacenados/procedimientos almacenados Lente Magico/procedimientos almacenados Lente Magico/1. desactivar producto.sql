CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_desactivar_producto`(
	
    IN p_id_producto INT,
    IN p_estado varchar (20)
)
BEGIN

	DECLARE v_existe INT DEFAULT 0; 


	SELECT COUNT(*) INTO  v_existe 
	FROM producto
	WHERE id_producto = p_id_producto
	AND estado = 'Activo';


IF v_existe > 0 THEN 
	UPDATE producto 
	SET estado = 'Inactivo' 
	WHERE id_producto = p_id_producto;


	SELECT 'Producto desactivado correctamente' AS mensaje;

	ELSE 
	SELECT 'Producto no encontrado o ya inactivo' AS mensaje; 
    
    END IF;  
END