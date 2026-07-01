CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_Registrar_venta`(
    IN V_id_cliente INT,
    IN V_id_cajero  INT,
    IN V_estado     VARCHAR(20),
    IN V_id_producto INT,
    IN V_cantidad    INT,
    IN V_precio_unitario DECIMAL(10,2)
)
BEGIN
    DECLARE V_id_venta     INT;
    DECLARE V_id_detalle_venta   INT;
    DECLARE V_total_venta  DECIMAL(10,2);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
    END;

    START TRANSACTION;

    -- 1. Insertar la venta usando los parámetros
    INSERT INTO Venta (id_cliente, id_cajero, fecha_venta, estado)
    VALUES (V_id_cliente, V_id_cajero, NOW(), V_estado);
    SET V_id_venta = LAST_INSERT_ID();

    -- 2. Insertar el detalle usando el id de la venta recién creada
    INSERT INTO Detalle_venta (id_venta, id_producto, cantidad, precio_unitario)
    VALUES (V_id_venta, V_id_producto, V_cantidad, V_precio_unitario);
    SET V_id_detalle_venta = LAST_INSERT_ID();
    
        -- 3. Calcular el total de la venta
    SELECT SUM(cantidad * precio_unitario) INTO V_total_venta
    FROM Detalle_venta
    WHERE id_venta = V_id_venta;



    -- 4. Verificar que el detalle se insertó correctamente
    IF V_id_detalle_venta IS NOT NULL THEN
        COMMIT;
        SELECT 
            V_id_venta       AS id_venta,
            V_id_detalle_venta     AS id_detalle,
            V_total_venta    AS total_venta,
            'Venta registrada exitosamente' AS mensaje;
    ELSE
        ROLLBACK;
        SELECT 'Error: no se pudo registrar el detalle de la venta' AS mensaje;
    END IF;

END