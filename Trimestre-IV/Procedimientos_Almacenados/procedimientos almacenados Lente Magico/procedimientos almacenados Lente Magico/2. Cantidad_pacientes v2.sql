CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_cantidad_pacientes`(
IN p_id_paciente INT,
IN p_antecendentes varchar(20)
)
BEGIN
declare C_cantidad int;
 
 SELECT COUNT(*) INTO  C_cantidad
 from Paciente
 where id_cliente = p_id_paciente;

 
 IF C_cantidad > 0 THEN 
SELECT id_cliente, antecendentes
FROM paciente
WHERE id_cliente = p_id_paciente;

ELSE 
	SELECT 'antecedentes o pacientes no encontrados' AS mensaje; 

	END IF;
END