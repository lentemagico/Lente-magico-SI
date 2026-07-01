-- -----------------------------------------------------
-- Inserciones
-- -----------------------------------------------------

-- -----------------------------------------------------
-- Tabla Autorización
-- -----------------------------------------------------

INSERT INTO Autorizacion (nombre)
VALUES ('Pedro Suarez');

INSERT INTO Autorizacion (nombre)
VALUES ('Lorena Romero');

INSERT INTO Autorizacion (nombre)
VALUES ('Ximena Avila');

INSERT INTO Autorizacion (nombre)
VALUES ('Yesid Sanchez');

INSERT INTO Autorizacion (nombre)
VALUES ('Nicol Guerrero');

-- ------------------------------------------
-- Tabla Usuario 
-- ------------------------------------------
INSERT INTO Usuario (login, correo, contraseña, activar_usuario, clave_idioma, clave_activacion, llave_reinicio, hora_reinicio) 
VALUES ('uss_yesd', 'ydam@gmail.com', 'ChfdjñSega1@', 'Activo', 'es', 'ACT-1111', '786532', '2026-02-25 12:30:00');

INSERT INTO Usuario (login, correo, contraseña, activar_usuario, clave_idioma, clave_activacion, llave_reinicio, hora_reinicio) 
VALUES ('mkdf_jhj', 'jhj@hotmail.com', 'cjbvdsh54@', 'Activo', 'es', 'ACT-2222', 'hjdsf5646', '2026-01-25 10:30:00');

INSERT INTO Usuario (login, correo, contraseña, activar_usuario, clave_idioma, clave_activacion, llave_reinicio, hora_reinicio) 
VALUES ('usfo_dges', 'dges@gmail.com', 'Cññññjdgra3@', 'Activo', 'es', 'ACT-3333', 'jhvfejf878', '2026-05-25 16:30:00');

INSERT INTO Usuario (login, correo, contraseña, activar_usuario, clave_idioma, clave_activacion, llave_reinicio, hora_reinicio) 
VALUES ('uksdo_djds', 'djds@gmail.com', 'Cñjakdnv3@', 'Activo', 'es', 'ACT-4444', 'jhsfijjf87', '2026-03-27 09:30:00');

INSERT INTO Usuario (login, correo, contraseña, activar_usuario, clave_idioma, clave_activacion, llave_reinicio, hora_reinicio) 
VALUES ('kdasfo_diys', 'diys@gmail.com', 'Cññññjjgadjyg', 'Activo', 'es', 'ACT-5555', 'jhvfdsfbv845', '2026-05-07 08:40:00');

-- ----------------------------------------------
-- Tabla Tipo De Documento
-- ----------------------------------------------

INSERT INTO Tipo_documento (sigla, nombre_documento, estado)
VALUES ('CC', 'Cedula de Ciudadania', 'Activo');

INSERT INTO Tipo_documento (sigla, nombre_documento, estado)
VALUES ('CE', 'Cedula de Extranjeria', 'Activo');

INSERT INTO Tipo_documento (sigla, nombre_documento, estado)
VALUES ('CC', 'Cedula de Ciudadania', 'Activo');

INSERT INTO Tipo_documento (sigla, nombre_documento, estado)
VALUES ('PAS', 'Pasaporte', 'Activo');

INSERT INTO Tipo_documento (sigla, nombre_documento, estado)
VALUES ('CC', 'Cedula de Ciudadania', 'Activo');

-- ---------------------------------------------------
-- Tabla Datos Personales
-- ---------------------------------------------------

INSERT INTO Datos_personales(id_tipo_documento, id_sistema_usuario, numero_documento, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido)
VALUES('1', '1', '1027814365', 'Blanca', 'Ximena', 'Avila', 'Tarazona');

INSERT INTO Datos_personales(id_tipo_documento, id_sistema_usuario, numero_documento, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido)
VALUES('2', '2', '1020754896', 'Yesid', 'Esteba', 'Sanchez', 'Sanchez');

INSERT INTO Datos_personales(id_tipo_documento, id_sistema_usuario, numero_documento, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido)
VALUES('3', '3', '110265348', 'Nicol', 'Dayana', 'Guerrero', 'Urrea');

INSERT INTO Datos_personales(id_tipo_documento, id_sistema_usuario, numero_documento, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido)
VALUES('4', '4', '1130248569', 'Juan', 'David', 'Toquica', 'Ramirez');

INSERT INTO Datos_personales(id_tipo_documento, id_sistema_usuario, numero_documento, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido)
VALUES('5', '5', '1025647892', 'Lorena', 'Estefania', 'Romero', 'Sanchez');

-- --------------------------------------
-- Tabla Cliente 
-- --------------------------------------

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
