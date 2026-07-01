CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_registrar_compra`( 
IN p_id_proveedor INT,  
IN p_num_comprobante VARCHAR(20), 
IN p_id_producto INT,
IN p_cantidad INT,
IN p_costo_unitario INT,
IN p_estado VARCHAR(20)
)
BEGIN 

	DECLARE v_id_compra INT; 
	DECLARE v_stock_actual INT DEFAULT 0; 
    DECLARE v_total_compra INT DEFAULT 0;
    DECLARE v_id_detalle_compra INT DEFAULT 0;	
	DECLARE EXIT HANDLER FOR SQLEXCEPTION  

BEGIN 
	ROLLBACK; 
	RESIGNAL;  
END;


	START TRANSACTION; 
		
        INSERT INTO compra (id_proveedor, num_comprobante, estado)
        VALUES (p_id_proveedor, p_num_comprobante,p_estado);
        SET v_id_compra = LAST_INSERT_ID(); 
        
        INSERT INTO detalle_compra (id_compra, cantidad, costo_unitario, id_producto)
        VALUES (v_id_compra,p_cantidad, p_costo_unitario, p_id_producto);
        SET v_id_detalle_compra = LAST_INSERT_ID(); 
        
	 
        SELECT stock_actual INTO v_stock_actual 
        FROM inventario 
        WHERE id_producto = p_id_producto;
        
        
IF v_stock_actual IS NOT NULL THEN
        UPDATE inventario 
        SET stock_actual = stock_actual + p_cantidad,
			ultima_actualizacion = NOW()
		WHERE id_producto = p_id_producto; 
	
    ELSE 
		INSERT INTO inventario (id_producto, stock_actual, stock_minimo, ultima_actualizacion)
        VALUES (2, 3, 10, NOW()); 
        
END IF;
        
        COMMIT; 
        
        SELECT v_id_compra AS id_compra_creada,
				v_stock_actual AS unidades_ingresadas; 
			
END