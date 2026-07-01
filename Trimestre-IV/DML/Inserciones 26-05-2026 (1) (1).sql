-- --------------------------------------------
-- Inserciones
-- --------------------------------------------

-- Tabla de Autorizacion 

INSERT INTO Autorizacion (nombre)
VALUES ('Administrador');

INSERT INTO Autorizacion (nombre)
VALUES ('Caja');

INSERT INTO Autorizacion (nombre)
VALUES ('Bodega');

INSERT INTO Autorizacion (nombre)
VALUES ('Compras');

INSERT INTO Autorizacion (nombre)
VALUES ('Optometra');

-- Tabla Usuario

INSERT INTO Usuario (login, correo, contraseña, activar_usuario, clave_idioma, clave_activacion, llave_reinicio, hora_reinicio) 
VALUES ('ucs_yesd', 'ydac@gmail.com', 'ChfdjñSgdfa1@', TRUE, 'es', 'ACT-1111', '787532', '2026-02-25 12:30:00');

INSERT INTO Usuario (login, correo, contraseña, activar_usuario, clave_idioma, clave_activacion, llave_reinicio, hora_reinicio) 
VALUES ('mkdf_jhj', 'jhj@hotmail.com', 'cjbvdsh54@', TRUE, 'es', 'ACT-2222', 'hjdsf5646', '2026-01-25 10:30:00');

INSERT INTO Usuario (login, correo, contraseña, activar_usuario, clave_idioma, clave_activacion, llave_reinicio, hora_reinicio) 
VALUES ('usfo_dges', 'dges@gmail.com', 'Cññññjdgra3@', TRUE, 'es', 'ACT-3333', 'jhvfejf878', '2026-05-25 16:30:00');

INSERT INTO Usuario (login, correo, contraseña, activar_usuario, clave_idioma, clave_activacion, llave_reinicio, hora_reinicio) 
VALUES ('uksdo_djds', 'djds@gmail.com', 'Cñjakdnv3@', TRUE, 'es', 'ACT-4444', 'jhsfijjf87', '2026-03-27 09:30:00');

INSERT INTO Usuario (login, correo, contraseña, activar_usuario, clave_idioma, clave_activacion, llave_reinicio, hora_reinicio) 
VALUES ('kdasfo_diys', 'diys@gmail.com', 'Cññññjjgadjyg', TRUE, 'es', 'ACT-5555', 'jhvfdsfbv845', '2026-05-07 08:40:00');

-- Autorizacion de usuario

INSERT INTO Autorizacion_usuario(id_autorizacion,  id_sistema_usuario)
VALUES('1', '1');

INSERT INTO Autorizacion_usuario(id_autorizacion,  id_sistema_usuario)
VALUES('2', '2');

INSERT INTO Autorizacion_usuario(id_autorizacion,  id_sistema_usuario)
VALUES('3', '3');

INSERT INTO Autorizacion_usuario(id_autorizacion,  id_sistema_usuario)
VALUES('4', '4');

INSERT INTO Autorizacion_usuario(id_autorizacion,  id_sistema_usuario)
VALUES('5', '5');

-- Tipo de Documento

INSERT INTO Tipo_documento (sigla, nombre_documento, estado)
VALUES ('CC', 'Cedula de Ciudadania', 'Activo');

INSERT INTO Tipo_documento (sigla, nombre_documento, estado)
VALUES ('CE', 'Cedula de Extranjeria', 'Activo');

INSERT INTO Tipo_documento (sigla, nombre_documento, estado)
VALUES ('TI', 'Tarjeta de Identidad', 'Activo');

INSERT INTO Tipo_documento (sigla, nombre_documento, estado)
VALUES ('PAS', 'Pasaporte', 'Activo');

INSERT INTO Tipo_documento (sigla, nombre_documento, estado)
VALUES ('NUIP', 'Registro Civil', 'Activo');

-- Tabla Datos Personales

INSERT INTO Datos_personales(id_tipo_documento, id_sistema_usuario, numero_documento, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido)
VALUES(1, 1, '1027814365', 'Blanca', 'Ximena', 'Avila', 'Tarazona');

INSERT INTO Datos_personales(id_tipo_documento, id_sistema_usuario, numero_documento, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido)
VALUES(2, 2, '1020754896', 'Yesid', 'Esteba', 'Sanchez', 'Sanchez');

INSERT INTO Datos_personales(id_tipo_documento, id_sistema_usuario, numero_documento, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido)
VALUES(3, 3, '110265388', 'Nicol', 'Dayana', 'Guerrero', 'Urrea');

INSERT INTO Datos_personales(id_tipo_documento, id_sistema_usuario, numero_documento, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido)
VALUES(4, 4, '1130248569', 'Juan', 'David', 'Toquica', 'Ramirez');

INSERT INTO Datos_personales(id_tipo_documento, id_sistema_usuario, numero_documento, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido)
VALUES(5, 5, '1025647892', 'Lorena', 'Estefania', 'Romero', 'Sanchez');

-- Tabla Categoria de producto

INSERT INTO Cat_producto(nombre_categoria, descripcion, estado)
VALUES('Lente', 'Lente segun orden medica', 'Activo');

INSERT INTO Cat_producto(nombre_categoria, descripcion, estado)
VALUES('Monturas', 'Montura al gusto del cliente', 'Activo');

INSERT INTO Cat_producto(nombre_categoria, descripcion, estado)
VALUES('Lente de Contacto', 'Lente segun formula', 'Activo');

INSERT INTO Cat_producto(nombre_categoria, descripcion, estado)
VALUES('Gafas de Sol', 'Gafas al gusto del cliente', 'Activo');

INSERT INTO Cat_producto(nombre_categoria, descripcion, estado)
VALUES('Gotas', 'Gotas segun orden medica', 'Activo');

-- Tabla de Producto

INSERT INTO Producto (id_categoria, codigo_producto, nombre, descripcion, precio_venta, estado, fecha_creacion)
VALUES (1, '879564', 'Lente Fotocromatico', 'Este es un lente fotocromatico', 400000, 'Activo', '2026-05-03');

INSERT INTO Producto (id_categoria, codigo_producto, nombre, descripcion, precio_venta, estado, fecha_creacion)
VALUES (2, '989024', 'Montura Negra', 'Esta es una montura circular de color negro', 100000, 'Activo', '2026-03-03');

INSERT INTO Producto (id_categoria, codigo_producto, nombre, descripcion, precio_venta, estado, fecha_creacion)
VALUES (3, '1009024', 'Lentes de Contacto', 'Lentes de contacto formulados', 500000, 'Activo', '2026-02-25');

INSERT INTO Producto (id_categoria, codigo_producto, nombre, descripcion, precio_venta, estado, fecha_creacion)
VALUES (4, '2009024', 'Gafas de Sol color Cafe', 'Gafas de sol cuadradas de color cafe', 200000, 'Activo', '2026-01-03');

INSERT INTO Producto (id_categoria, codigo_producto, nombre, descripcion, precio_venta, estado, fecha_creacion)
VALUES (5, '3009024', 'Gotas', 'Gotas para la resequedad del ojo', 150000, 'Activo', '2026-02-23');

-- Tabla Inventario

INSERT INTO Inventario(id_producto, stock_actual,  stock_minimo, ultima_actualizacion)
VALUES(1, 50, 10, '2026-01-03');

INSERT INTO Inventario(id_producto, stock_actual,  stock_minimo, ultima_actualizacion)
VALUES(2, 80, 10, '2026-02-23');

INSERT INTO Inventario(id_producto, stock_actual,  stock_minimo, ultima_actualizacion)
VALUES(3, 50, 10, '2026-05-23');

INSERT INTO Inventario(id_producto, stock_actual,  stock_minimo, ultima_actualizacion)
VALUES(4, 70, 10, '2026-01-13');

INSERT INTO Inventario(id_producto, stock_actual,  stock_minimo, ultima_actualizacion)
VALUES(5, 100, 10, '2026-02-05');

-- Tabla Proveedor

INSERT INTO Proveedor(id_tipo_documento, nit, razon_social, contacto, telefono, correo, estado, tipo)
VALUES(1, '125447853524','SAS', '3125648790', '12548637', 'JHGF@gmail.com', 'Activo', 'Montura');

INSERT INTO Proveedor(id_tipo_documento, nit, razon_social, contacto, telefono, correo, estado, tipo)
VALUES(2, '15645487121224','SA', '3135656797', '32548637', 'hhsf@gmail.com', 'Activo', 'Lentes');

INSERT INTO Proveedor(id_tipo_documento, nit, razon_social, contacto, telefono, correo, estado, tipo)
VALUES(3, '54350120544','SAS', '3155641223', '985548637', 'uhgfd@gmail.com', 'Activo', 'Lentes de Contacto');

INSERT INTO Proveedor(id_tipo_documento, nit, razon_social, contacto, telefono, correo, estado, tipo)
VALUES(4, '54120545524','SAC', '3160564879', '62548637', 'lhfy@gmail.com', 'Activo', 'Gafas de Sol');

INSERT INTO Proveedor(id_tipo_documento, nit, razon_social, contacto, telefono, correo, estado, tipo)
VALUES(5, '6892447853524','SACS', '3125648792', '18548637', 'kfndg@gmail.com', 'Activo', 'Gotas');

-- Tabla Compra

INSERT INTO Compra(id_proveedor, fecha_compra, num_comprobante, estado)
VALUES(1, '2026-02-25', '4569', 'Activo');

INSERT INTO Compra(id_proveedor, fecha_compra, num_comprobante, estado)
VALUES(2, '2026-01-25', '4959', 'Activo');

INSERT INTO Compra(id_proveedor, fecha_compra, num_comprobante, estado)
VALUES(3, '2026-02-26', '55678', 'Activo');

INSERT INTO Compra(id_proveedor, fecha_compra, num_comprobante, estado)
VALUES(4, '2026-04-29', '4231', 'Activo');

INSERT INTO Compra(id_proveedor, fecha_compra, num_comprobante, estado)
VALUES(5, '2026-01-05', '8756', 'Activo');

-- Tabla Detalle Compra

INSERT INTO Detalle_compra(id_compra, cantidad, costo_unitario, id_producto)
VALUES (1, 40, 350000, 1);

INSERT INTO Detalle_compra(id_compra, cantidad, costo_unitario, id_producto)
VALUES (2, 60, 300000, 2);

INSERT INTO Detalle_compra(id_compra, cantidad, costo_unitario, id_producto)
VALUES (3, 80, 350000, 3);

INSERT INTO Detalle_compra(id_compra, cantidad, costo_unitario, id_producto)
VALUES (4, 80, 350000, 4);

INSERT INTO Detalle_compra(id_compra, cantidad, costo_unitario, id_producto)
VALUES (5, 100, 400000, 5);

-- Tabla de Reporte de Productos 

INSERT INTO Reporte_producto (id_usuario, id_producto, fecha_generacion, parametro_filtro, formato_archivo)
VALUES(1, 1, '2026-01-08', 'Lentes','PDF');

INSERT INTO Reporte_producto (id_usuario, id_producto, fecha_generacion, parametro_filtro, formato_archivo)
VALUES(2, 2, '2026-05-18', 'Monturas','DOCX');

INSERT INTO Reporte_producto (id_usuario, id_producto, fecha_generacion, parametro_filtro, formato_archivo)
VALUES(3, 3, '2026-04-28', 'Lentes De Contacto','PDF');

INSERT INTO Reporte_producto (id_usuario, id_producto, fecha_generacion, parametro_filtro, formato_archivo)
VALUES(4, 4, '2026-03-19', 'Gotas','DOCX');

INSERT INTO Reporte_producto (id_usuario, id_producto, fecha_generacion, parametro_filtro, formato_archivo)
VALUES(5, 5, '2026-01-08', 'Gafas de Sol','PDF');

-- Tabla Cliente

INSERT INTO Cliente (telefono, fecha_registro, id_datos_cliente)
VALUES ('3154784596', '2026-05-05 08:40:00', '1');

INSERT INTO Cliente (telefono, fecha_registro, id_datos_cliente)
VALUES ('3155476321', '2026-02-15 09:45:00', '2');

INSERT INTO Cliente (telefono, fecha_registro, id_datos_cliente)
VALUES ('3234784596', '2026-05-05 08:40:00', '3');

INSERT INTO Cliente (telefono, fecha_registro, id_datos_cliente)
VALUES ('3155485110', '2026-03-05 10:40:00', '4');

INSERT INTO Cliente (telefono, fecha_registro, id_datos_cliente)
VALUES ('3154784596', '2026-05-05 08:40:00', '5');

-- Tabla Cajero

INSERT INTO Cajero(id_datos_personales, fecha_registro)
VALUES(1,'2026-03-09 09:40:00');

INSERT INTO Cajero(id_datos_personales, fecha_registro)
VALUES(2,'2026-04-19 19:40:00');

INSERT INTO Cajero(id_datos_personales, fecha_registro)
VALUES(3,'2026-03-15 20:00:00');

INSERT INTO Cajero(id_datos_personales, fecha_registro)
VALUES(4,'2026-01-29 05:50:00');

INSERT INTO Cajero(id_datos_personales, fecha_registro)
VALUES(5,'2026-04-29 09:40:00');

-- Tabla Optometra

INSERT INTO Optometra(id_datos_personales, fecha_registro)
VALUES(1,'2026-03-16 08:40:00');

INSERT INTO Optometra(id_datos_personales, fecha_registro)
VALUES(2,'2026-01-14 04:30:00');

INSERT INTO Optometra(id_datos_personales, fecha_registro)
VALUES(3,'2026-05-24 10:30:00');

INSERT INTO Optometra(id_datos_personales, fecha_registro)
VALUES(4,'2026-02-28 11:45:00');

INSERT INTO Optometra(id_datos_personales, fecha_registro)
VALUES(5,'2026-01-14 04:30:00');

-- Tabla Venta

INSERT INTO Venta (id_cliente, id_cajero, fecha_venta, estado)
VALUES(1,1, '2026-02-25 12:45:00', 'Activo');

INSERT INTO Venta (id_cliente, id_cajero, fecha_venta, estado)
VALUES(2,2, '2026-02-25 10:35:00', 'Activo');

INSERT INTO Venta (id_cliente, id_cajero, fecha_venta, estado)
VALUES(3,3, '2026-03-26 12:58:00', 'Activo');

INSERT INTO Venta (id_cliente, id_cajero, fecha_venta, estado)
VALUES(4,4, '2026-05-25 09:25:00', 'Activo');

INSERT INTO Venta (id_cliente, id_cajero, fecha_venta, estado)
VALUES(5,5, '2026-04-30 06:45:00', 'Activo');

-- Tabla Detalle de Venta

INSERT INTO Detalle_venta(id_venta, id_producto, cantidad, precio_unitario)
VALUES(1, 1, 1, 400000);

INSERT INTO Detalle_venta(id_venta, id_producto, cantidad, precio_unitario)
VALUES(2, 2, 3, 350000);

INSERT INTO Detalle_venta(id_venta, id_producto, cantidad, precio_unitario)
VALUES(3, 3, 1, 500000);

INSERT INTO Detalle_venta(id_venta, id_producto, cantidad, precio_unitario)
VALUES(4, 4, 1, 100000);

INSERT INTO Detalle_venta(id_venta, id_producto, cantidad, precio_unitario)
VALUES(5, 5, 3, 400000);

-- Tabla Agendar Consulta

INSERT INTO Agenda_consulta(id_cliente, id_venta, fecha_hora, motivo, estado)
VALUES(1,1, '2026-04-30 06:45:00', 'Revision Anual', 'Activo');

INSERT INTO Agenda_consulta(id_cliente, id_venta, fecha_hora, motivo, estado)
VALUES(2,2, '2026-05-25 09:25:00', 'Revision Mensual', 'Activo');

INSERT INTO Agenda_consulta(id_cliente, id_venta, fecha_hora, motivo, estado)
VALUES(3,3, '2026-03-26 12:58:00', 'Revision Semestral', 'Activo');

INSERT INTO Agenda_consulta(id_cliente, id_venta, fecha_hora, motivo, estado)
VALUES(4,4, '2026-02-25 10:35:00', 'Revision Trimestral', 'Activo');

INSERT INTO Agenda_consulta(id_cliente, id_venta, fecha_hora, motivo, estado)
VALUES(1,1, '2026-05-24 10:30:00', 'Revision Anual', 'Activo');

-- Tabla Factura

INSERT INTO Factura(id_venta, num_factura, fecha_emision)
VALUES(1, 546632, '2026-05-25 09:25:00');

INSERT INTO Factura(id_venta, num_factura, fecha_emision)
VALUES(2, 68954, '2026-02-25 10:35:00');

INSERT INTO Factura(id_venta, num_factura, fecha_emision)
VALUES(3, 12365, '2026-04-30 06:45:00');

INSERT INTO Factura(id_venta, num_factura, fecha_emision)
VALUES(4, 875469, '2026-05-24 10:30:00');

INSERT INTO Factura(id_venta, num_factura, fecha_emision)
VALUES(5, 213654, '2026-03-26 12:58:00');

-- Tabla Pago

INSERT INTO Pago(id_factura, metodo_pago, fecha_pago, monto, monto_recibido, cambio)
VALUES(1, 'Efectivo', '2026-01-14 04:30:00', 450000, 500000, 50000);

INSERT INTO Pago(id_factura, metodo_pago, fecha_pago, monto, monto_recibido, cambio)
VALUES(2, 'Tarjeta Credito', '2026-03-15 20:00:00', 500000, 500000, 0);

INSERT INTO Pago(id_factura, metodo_pago, fecha_pago, monto, monto_recibido, cambio)
VALUES(3, 'Tarjeta Debito', '2026-02-25 10:35:00', 100000, 100000, 0);

INSERT INTO Pago(id_factura, metodo_pago, fecha_pago, monto, monto_recibido, cambio)
VALUES(4, 'NEQUI', '2026-04-29 09:40:00', 400000, 400000, 0);

INSERT INTO Pago(id_factura, metodo_pago, fecha_pago, monto, monto_recibido, cambio)
VALUES(5, 'Efectivo', '2026-01-14 04:30:00', 900000, 1000000, 100000);

-- Tabla Paciente

INSERT INTO Paciente(id_cliente, fecha_nacimiento, genero, antecendentes, observaciones)
VALUES(1, '2000-02-16', 'Femenino', 'Mancha ocular','N/A');

INSERT INTO Paciente(id_cliente, fecha_nacimiento, genero, antecendentes, observaciones)
VALUES(2, '2008-02-07', 'Femenino', 'Miopia multiple','N/A');

INSERT INTO Paciente(id_cliente, fecha_nacimiento, genero, antecendentes, observaciones)
VALUES(3, '1985-03-20', 'Masculino', 'Astigmatismo','N/A');

INSERT INTO Paciente(id_cliente, fecha_nacimiento, genero, antecendentes, observaciones)
VALUES(4, '2001-05-26', 'Masculino', 'Presbicia','N/A');

INSERT INTO Paciente(id_cliente, fecha_nacimiento, genero, antecendentes, observaciones)
VALUES(5, '2012-04-20', 'Femenino', 'Hipermetropia','N/A');

-- Tabla Historia Clinica

INSERT INTO Historia_clinica(id_paciente, fecha_apertura, evolucion, num_consulta)
VALUES(1, '2026-02-25', 'Si muestra evolucion',1258);

INSERT INTO Historia_clinica(id_paciente, fecha_apertura, evolucion, num_consulta)
VALUES(2, '2026-04-29', 'Debe seguir en proceso medico',1368);

INSERT INTO Historia_clinica(id_paciente, fecha_apertura, evolucion, num_consulta)
VALUES(3, '2026-05-25', 'Si muestra evolucion',1458);

INSERT INTO Historia_clinica(id_paciente, fecha_apertura, evolucion, num_consulta)
VALUES(4, '2026-02-02', 'Muestra evolucion, pero falta mas',1478);

INSERT INTO Historia_clinica(id_paciente, fecha_apertura, evolucion, num_consulta)
VALUES(5, '2026-01-12', 'Si muestra evolucion',2148);

-- Tabla Consulta

INSERT INTO Consulta (id_paciente, id_optometra, id_historia_Clinica, fecha_hora, motivo, resultado_examen, diagnostico, recomendaciones) 
VALUES (1, 1, 1,'2026-01-14 04:30:00' , 'Control anual', 'Miopía estable, OD: -2.00, OI: -1.75', 'Miopía leve en ambos ojos.', 'Usar gafas permanentemente para descanso visual y control en un año.');

INSERT INTO Consulta (id_paciente, id_optometra, id_historia_Clinica, fecha_hora, motivo, resultado_examen, diagnostico, recomendaciones) 
VALUES (2, 2, 2, '2026-05-20 09:30:00', 'Visión borrosa', 'Astigmatismo progresivo, OD: -1.50 C-1.00', 'Astigmatismo miópico compuesto.', 'Renovar lentes con filtro azul para pantallas y pausas activas cada 2 horas.');

INSERT INTO Consulta (id_paciente, id_optometra, id_historia_Clinica, fecha_hora, motivo, resultado_examen, diagnostico, recomendaciones) 
VALUES (3, 3, 3, '2026-04-30 06:45:00', 'Ardor en los ojos', 'Resequedad lagrimal evidente, córnea sana', 'Síndrome de ojo seco por exposición prolongada a pantallas.', 'Aplicar gotas lubricantes (lágrimas artificiales) cada 4 horas y parpadear frecuentemente.');

INSERT INTO Consulta (id_paciente, id_optometra, id_historia_Clinica, fecha_hora, motivo, resultado_examen, diagnostico, recomendaciones) 
VALUES (4, 4, 4, '2026-05-25 14:15:00', 'Dificultad al Leer', 'Presbicia inicial, adición de +1.50 en ambos ojos', 'Presbicia asociada a la edad.', 'Lentes de lectura exclusivos para visión próxima y buena iluminación al leer.');

INSERT INTO Consulta (id_paciente, id_optometra, id_historia_Clinica, fecha_hora, motivo, resultado_examen, diagnostico, recomendaciones) 
VALUES (5, 5, 5, '2026-03-26 12:58:00', 'Urgencia por cuerpo extraño', 'Ligera hiperemia conjuntival, sin partículas retenidas', 'Irritación conjuntival mecánica (removida previamente por el usuario).', 'Limpieza con solución salina estéril por 3 días y evitar frotarse los ojos.');

-- Tabla Formula Optica 

INSERT INTO Formula_optica (id_consulta, id_paciente, esfera_ojo_derecho_e_izquierdo, cilindro_ojo_derecho_e_izquierdo, eje_ojo_derecho_e_izquierdo, adicion, tipo_lente, uso, observaciones, fecha_generacion)
VALUES (1, 1, -2, 0, 0, 'No requiere', 'Monofocal', 'Permanente', 'Control en un año. Lentes con antirreflejo sencillo.', '2026-02-29');

INSERT INTO Formula_optica (id_consulta, id_paciente, esfera_ojo_derecho_e_izquierdo, cilindro_ojo_derecho_e_izquierdo, eje_ojo_derecho_e_izquierdo, adicion, tipo_lente, uso, observaciones, fecha_generacion)
VALUES (2, 2, -1, -1, 90, '-0.16 al ojo derecho', 'Monofocal', 'Uso en pantallas', 'Se sugiere filtro azul para mitigar la fatiga visual.', '2026-05-27');

INSERT INTO Formula_optica (id_consulta, id_paciente, esfera_ojo_derecho_e_izquierdo, cilindro_ojo_derecho_e_izquierdo, eje_ojo_derecho_e_izquierdo, adicion, tipo_lente, uso, observaciones, fecha_generacion)
VALUES (3, 3, 0, 0, 0, 'No requiere', 'Neutro', 'Protección', 'Solo lentes de descanso.', '2026-04-27');

INSERT INTO Formula_optica (id_consulta, id_paciente, esfera_ojo_derecho_e_izquierdo, cilindro_ojo_derecho_e_izquierdo, eje_ojo_derecho_e_izquierdo, adicion, tipo_lente, uso, observaciones, fecha_generacion)
VALUES (4, 4, 1, 0, 0, '+1.50 en ambos ojos', 'Bifocal', 'Lectura y cerca', 'Excelente adaptación en prueba de marco.', '2026-01-17');

INSERT INTO Formula_optica (id_consulta, id_paciente, esfera_ojo_derecho_e_izquierdo, cilindro_ojo_derecho_e_izquierdo, eje_ojo_derecho_e_izquierdo, adicion, tipo_lente, uso, observaciones, fecha_generacion)
VALUES (5, 5, 2, -2, 180, 'No requiere', 'Progresivo', 'Permanente', 'Gafas de sol con fórmula óptica integrada para exteriores.', '2026-03-27');

-- Tabla Log Errores 

INSERT INTO Log_errores (id_usuario, nivel, nombre_usuario, mensaje, fecha)
VALUES (1, 'ERROR', 'ucs_yesd', 'Error 404: Intento de acceso a un recurso inexistente en el módulo de citas.', '2026-04-27');

INSERT INTO Log_errores (id_usuario, nivel, nombre_usuario, mensaje, fecha)
VALUES (2, 'CONEXION', 'mkdf_jhj', 'Fallo de conexión.', '2026-03-28');

INSERT INTO Log_errores (id_usuario, nivel, nombre_usuario, mensaje, fecha)
VALUES (3, 'FUERA DEL TIEMPO', 'usfo_dges', 'Tiempo de espera agotado al cargar el historial de fórmulas ópticas.', '2026-05-17');

INSERT INTO Log_errores (id_usuario, nivel, nombre_usuario, mensaje, fecha)
VALUES (4, 'ERROR', 'uksdo_djds', 'Violación de restricción de clave única: Intento de duplicar la fórmula de la consulta 12.', '2026-04-29');

INSERT INTO Log_errores (id_usuario, nivel, nombre_usuario, mensaje, fecha)
VALUES (5, 'INFO', 'kdasfo_diys', 'Sesión del sistema cerrada por inactividad del usuario.', '2026-05-27');












