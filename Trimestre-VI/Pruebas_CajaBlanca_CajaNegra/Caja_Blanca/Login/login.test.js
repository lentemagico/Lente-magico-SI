import request from "supertest";
import express from "express";
import router from "../login.js";

// Simulamos el módulo de la base de datos
jest.mock("../../db.js");
import pool from "../../db.js";

// Simulamos bcrypt para comparar contraseñas
jest.mock("bcryptjs");
import bcrypt from "bcryptjs";

// Creamos una aplicación de Express para las pruebas
const app = express();

app.use(express.json());
app.use("/login", router);

describe("Pruebas de Caja Blanca - Login", () => {

  // Limpia los mocks antes de cada prueba
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =====================================================
  // POST /
  // =====================================================

  test("POST / debe iniciar sesión correctamente", async () => {
    pool.query.mockResolvedValueOnce([[
      {
        id: 1,
        contrasenia: "hash123",
        activar_usuario: 1,
        correo: "lorena@gmail.com",
        primer_nombre: "Lorena",
        segundo_nombre: "Maria",
        primer_apellido: "Romero",
        segundo_apellido: "Cassiani",
        rol: "Optometra",
      },
    ]]);

    bcrypt.compare.mockResolvedValueOnce(true);

    const res = await request(app)
      .post("/login")
      .send({
        correo: "lorena@gmail.com",
        contrasena: "123456",
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.mensaje).toBe("Login exitoso");
    expect(res.body.usuario.nombre).toBe("Lorena Maria Romero Cassiani");
    expect(res.body.usuario.correo).toBe("lorena@gmail.com");
    expect(res.body.usuario.rol).toBe("Optometra");
    expect(res.body.token).toBeNull();
    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(bcrypt.compare).toHaveBeenCalledWith("123456", "hash123");
  });

  test("POST / debe ejecutar la consulta SELECT correcta", async () => {
    pool.query.mockResolvedValueOnce([[]]);

    await request(app)
      .post("/login")
      .send({
        correo: "lorena@gmail.com",
        contrasena: "123456",
      });

    const queryEjecutada = pool.query.mock.calls[0][0];

    expect(queryEjecutada).toContain("SELECT");
    expect(queryEjecutada).toContain("FROM Usuario u");
    expect(queryEjecutada).toContain("Datos_personales");
    expect(queryEjecutada).toContain("Autorizacion");
    expect(queryEjecutada).toContain("WHERE dp.correo = ?");
    expect(pool.query.mock.calls[0][1]).toEqual(["lorena@gmail.com"]);
  });

  test("POST / debe retornar 400 si no se envía el correo", async () => {
    const res = await request(app)
      .post("/login")
      .send({
        contrasena: "123456",
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.mensaje).toBe(
      "Correo y contraseña son campos requeridos"
    );
    expect(pool.query).not.toHaveBeenCalled();
  });

  test("POST / debe retornar 400 si no se envía la contraseña", async () => {
    const res = await request(app)
      .post("/login")
      .send({
        correo: "lorena@gmail.com",
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.mensaje).toBe(
      "Correo y contraseña son campos requeridos"
    );
    expect(pool.query).not.toHaveBeenCalled();
  });

  test("POST / debe retornar 400 si ambos campos están vacíos", async () => {
    const res = await request(app)
      .post("/login")
      .send({
        correo: "",
        contrasena: "",
      });

    expect(res.statusCode).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test("POST / debe retornar 401 si el correo no existe", async () => {
    pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app)
      .post("/login")
      .send({
        correo: "inexistente@gmail.com",
        contrasena: "123456",
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.mensaje).toBe(
      "Correo electrónico o contraseña incorrectos."
    );
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  test("POST / debe retornar 401 si la contraseña es incorrecta", async () => {
    pool.query.mockResolvedValueOnce([[
      {
        id: 1,
        contrasenia: "hash123",
        activar_usuario: 1,
        correo: "lorena@gmail.com",
        primer_nombre: "Lorena",
        segundo_nombre: null,
        primer_apellido: "Romero",
        segundo_apellido: null,
        rol: "Optometra",
      },
    ]]);

    bcrypt.compare.mockResolvedValueOnce(false);

    const res = await request(app)
      .post("/login")
      .send({
        correo: "lorena@gmail.com",
        contrasena: "incorrecta",
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.mensaje).toBe(
      "Correo electrónico o contraseña incorrectos."
    );
  });

  test("POST / debe retornar 403 si el usuario está inactivo", async () => {
    pool.query.mockResolvedValueOnce([[
      {
        id: 1,
        contrasenia: "hash123",
        activar_usuario: 0,
        correo: "lorena@gmail.com",
        primer_nombre: "Lorena",
        segundo_nombre: null,
        primer_apellido: "Romero",
        segundo_apellido: null,
        rol: "Optometra",
      },
    ]]);

    bcrypt.compare.mockResolvedValueOnce(true);

    const res = await request(app)
      .post("/login")
      .send({
        correo: "lorena@gmail.com",
        contrasena: "123456",
      });

    expect(res.statusCode).toBe(403);
    expect(res.body.mensaje).toBe("Usuario inactivo");
  });

  test("POST / debe usar un nombre parcial si faltan nombres o apellidos", async () => {
    pool.query.mockResolvedValueOnce([[
      {
        id: 2,
        contrasenia: "hash456",
        activar_usuario: 1,
        correo: "usuario@gmail.com",
        primer_nombre: "Carlos",
        segundo_nombre: null,
        primer_apellido: "Perez",
        segundo_apellido: "",
        rol: null,
      },
    ]]);

    bcrypt.compare.mockResolvedValueOnce(true);

    const res = await request(app)
      .post("/login")
      .send({
        correo: "usuario@gmail.com",
        contrasena: "123456",
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.usuario.nombre).toBe("Carlos Perez");
    expect(res.body.usuario.rol).toBe("Sin rol asignado");
  });

  test("POST / debe retornar error 500 si falla la base de datos", async () => {
    pool.query.mockRejectedValueOnce(
      new Error("Error de conexión")
    );

    const res = await request(app)
      .post("/login")
      .send({
        correo: "lorena@gmail.com",
        contrasena: "123456",
      });

    expect(res.statusCode).toBe(500);
    expect(res.body.mensaje).toBe("Error en el servidor");
    expect(res.body.error).toBe("Error de conexión");
  });
});
