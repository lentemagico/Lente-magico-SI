import mysql from 'mysql2/promise';
//se crea una funcion para aceptar conexiones simultaneas
const pool = mysql.createPool({
  host: process.env.DB_HOST, //Direccion del servidor Ejemplo: localhost o ip del servidor o servidor en la nube)
  user: process.env.DB_USER, //Usuario de la base de datos
  password: process.env.DB_PASSWORD, //passwor de la base de datos
  database: process.env.DB_NAME, //Nombre de la base de datos
  waitForConnections: true,// tiempo de espera para dar a un usuario, cuando una conexion se libere
  connectionLimit: 10, //Cantidad de usuarios que voy a dejar conectar, en este caso 10 usuarios
  queueLimit:0, //Se define cuantas peteiciones se pueden quedar esperando en fila
});

export default pool;