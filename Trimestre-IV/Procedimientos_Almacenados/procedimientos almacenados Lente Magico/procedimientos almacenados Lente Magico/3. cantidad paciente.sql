CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_cantidad_pacientes`(
IN p_id_paciente INT,
IN p_antecendentes varchar(20)
)
BEGIN
declare C_cantidad int;
 
 SELECT COUNT(*) INTO  C_cantidad
 from Paciente
 where id_paciente = p_id_paciente
 and antecendentes = 'Mancha ocular';
 
 IF C_cantidad > 0 THEN 
UPDATE paciente 
SET antecendentes = 'Mancha ocular' 
WHERE id_paciente = p_id_paciente;
 
 SELECT 'hay pacientes con Mancha ocular' AS mensaje;

ELSE 
	SELECT 'antecedentes o pacientes no encontrados' AS mensaje; 

	END IF;
END