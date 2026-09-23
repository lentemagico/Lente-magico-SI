CREATE DATABASE lente_magico_si 
CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci;

USE lente_magico_si ;

-- ---------------------------------------------
-- Modulo Cliente
-- ---------------------------------------------

CREATE TABLE Autorizacion (
	id_autorizacion INT AUTO_INCREMENT PRIMARY KEY,
    nombre varchar(50) NOT NULL
    
	
)ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

CREATE TABLE Autorizacion_ususario(
	id INT(11) NOT NULL AUTO_INCREMENT  PRIMARY KEY,
    id_autorizacion INT(11) NOT NULL,
    id_sistema_usuario INT(11) NOT NULL,

	FOREIGN KEY (id_autorizacion) REFERENCES Autorizacion (id_autorizacion),
	FOREIGN KEY (id_sistema_usuario) REFERENCES Usuario (id)
    
);


CREATE TABLE Usuario (
	id INT AUTO_INCREMENT PRIMARY KEY,
    login varchar(50) NOT NULL UNIQUE, 
    correo varchar(50) NOT NULL UNIQUE,
    contraseña varchar(50) NOT NULL,
    activar_usuario BOOL NULL,
    clave_idioma varchar(6),
    clave_activacion varchar(20) NULL,
    llave_reinicio varchar(20) NULL,
    hora_reinicio DATETIME DEFAULT CURRENT_TIMESTAMP NULL
    
);

CREATE TABLE Tipo_documento (
	id INT AUTO_INCREMENT PRIMARY KEY,
    sigla varchar(10) NOT NULL UNIQUE,
    nombre_documento varchar(20) NOT NULL UNIQUE,
    estado varchar(10)
);


CREATE TABLE  Datos_personales (
	id INT AUTO_INCREMENT PRIMARY KEY,
    id_tipo_documento INT NOT NULL UNIQUE,
    id_sistema_usuario INT NOT NULL UNIQUE,
    numero_documento varchar(20)NOT NULL UNIQUE,
    primer_nombre varchar(50),
    segundo_nombre varchar(50) NULL,
	primer_apellido varchar(50),
	segundo_apellido varchar(50) NULL,
    
	FOREIGN KEY (id_tipo_documento) REFERENCES Tipo_documento (id_tipo_documento),
	FOREIGN KEY (id_sistema_usuario) REFERENCES Usuario (id)
);


-- -------------------------------------------------------
-- Modulo Venta/Caja
-- -------------------------------------------------------

CREATE TABLE Cliente (
	id_cliente INT AUTO_INCREMENT PRIMARY KEY,
    telefono varchar(20),
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    id_datos_clientes INT (11) UNIQUE,
    
    FOREIGN KEY (id_datos_cliente) REFERENCES Datos_personales (id_datos_cliente)
);


CREATE TABLE Cajero (
	id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    id_datos_personales INT(11),
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (id_datos_personales) REFERENCES Datos_personales (id_datos_personales)
);


CREATE TABLE Venta (
	id_venta INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT(11),
    id_cajero INT(11),
    fecha_venta DATETIME DEFAULT CURRENT_TIMESTAMP,
    estado varchar(20),
    
    FOREIGN KEY (id_cliente) REFERENCES Cliente (id_cliente),
    FOREIGN KEY (id_cajero) REFERENCES Cajero (id_cajero)
);


CREATE TABLE Detalle_venta (
	id_detalle INT AUTO_INCREMENT PRIMARY KEY,
    id_venta INT(11),
    id_producto INT(10),
    cantidad INT(10),
    precio_unitario INT(10),
    
    FOREIGN KEY (id_venta) REFERENCES Venta (id_venta),
    FOREIGN KEY (id_producto) REFERENCES Producto (id_producto)
		
);


CREATE TABLE Optometra (
	id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    id_datos_personales INT(11),
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (id_datos_personales) REFERENCES Datos_personales (id_datos_personales)
);


CREATE TABLE Agenda_consulta (
	id_agenda INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT(11),
    id_venta INT(10),
    fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
    motivo varchar(40),
    estado varchar(20),
    
    FOREIGN KEY (id_cliente) REFERENCES Cliente (id_cliente)
);

CREATE TABLE Pago (
	id_pagos INT AUTO_INCREMENT PRIMARY KEY,
    id_factura INT(11) UNIQUE,
    metodo_pago varchar(40),
    fecha_pago  DATETIME DEFAULT CURRENT_TIMESTAMP,
    monto INT(11),
    monto_recibido INT(10),
    cambio INT(10),
    
    FOREIGN KEY (id_factura) REFERENCES Factura (id_factura) 
);


CREATE TABLE Factura (
	id_factura INT AUTO_INCREMENT PRIMARY KEY,
    id_ventas INT(11) UNIQUE,
    num_factura INT(10),
    fecha_emision DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN  KEY (id_venta) REFERENCES Venta (id_venta)
);


-- ----------------------------------------------------
-- Modulo Bodega/Compras
-- ----------------------------------------------------

CREATE TABLE Cat_producto (
	id_categoria INT AUTO_INCREMENT PRIMARY KEY,
    nombre_categoria varchar(40),
    descripcion varchar(50),
    estado varchar(20)
);

CREATE TABLE Producto (
	id_producto INT AUTO_INCREMENT PRIMARY KEY,
    id_categoria INT(10),
    codigo_producto varchar(50) UNIQUE,
    nombre varchar(40),
    descripcion varchar(50),
    precio_venta INT(10),
    estado varchar(20),
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN  KEY (id_categoria) REFERENCES Cat_producto (id_categoria)
    
);


CREATE TABLE Inventario (
	id_inventario  INT AUTO_INCREMENT PRIMARY KEY,
    id_producto INT(10) UNIQUE,
    stock_actual INT(10),
    stock_minimo INT(10),
    ultima_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN  KEY (id_producto) REFERENCES Producto (id_producto)

);

CREATE TABLE Detalle_compra (
	id_detalle_compra  INT AUTO_INCREMENT PRIMARY KEY,
    id_compra INT(10) NOT  NULL,
    cantidad INT(10),
    costo_unitario INT(10),
    id_producto INT(10),
    
    
     FOREIGN  KEY (id_compra) REFERENCES Compra (id_compra),
      FOREIGN  KEY (id_producto) REFERENCES Producto (id_producto)
);


CREATE TABLE Compra (
	id_compra INT AUTO_INCREMENT PRIMARY KEY,
    id_proveedor INT(11),
    fecha_compra DATETIME DEFAULT CURRENT_TIMESTAMP,
    num_comprobante varchar(20),
    estado varchar(20),
    
    FOREIGN  KEY (id_proveedor) REFERENCES Proveedor (id_proveedor)
    
);


CREATE TABLE Proveedor (
	id_proveedor INT AUTO_INCREMENT PRIMARY KEY,
    id_tipo_documento INT(11),
    nit varchar(50) UNIQUE,
    razon_social varchar(50),
    contacto varchar(50),
    telefono varchar(20),
    correo varchar(40),
    estado varchar(20),
    tipo varchar(40),
        
        
        FOREIGN  KEY (id_tipo_documento) REFERENCES Tipo_documento (id_tipo_documento)
);

CREATE TABLE Reporte_producto (
	id_reporte INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT(11),
    id_producto INT(11),
    fecha_generacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    parametro_filtro varchar(40),
    formato_archivo varchar(30),
    
       FOREIGN  KEY ( id_usuario) REFERENCES Usuario ( id_usuario),
          FOREIGN  KEY ( id_producto) REFERENCES Producto ( id_producto)
    
);


-- ---------------------------------------------------------
-- Modulo Optometra
-- ----------------------------------------------------------












