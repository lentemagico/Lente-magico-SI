import request from "supertest";
import express from "express";
import router from "../../Administrador/logErrores.js";

// Simulamos el módulo de la base de datos
jest.mock("../../../db.js");
import pool from "../../../db.js";

// Creamos una aplicación de Express para las pruebas
const app = express();

app.use(express.json());
app.use("/logerrores", router);

describe("Pruebas de Caja Blanca - LogErrores", () => {
  // Limpia los mocks antes de cada prueba
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =====================================================
  // GET /
  // =====================================================

  test("GET / debe retornar todos los registros de errores", async () => {
    pool.query.mockResolvedValueOnce([
      [
        {
          id: 1,
          id_usuario: 2,
          nivel: "ERROR",
          nombre_usuario: "Lorena",
          mensaje: "Error de conexión",
          fecha: "2026-10-08 10:00:00",
        },
        {
          id: 2,
          id_usuario: 3,
          nivel: "WARNING",
          nombre_usuario: "Sistema",
          mensaje: "Advertencia de prueba",
          fecha: "2026-10-08 09:00:00",
        },
      ],
    ]);

    const res = await request(app).get("/logerrores");

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toHaveProperty("id", 1);
    expect(res.body[0]).toHaveProperty(
      "mensaje",
      "Error de conexión"
    );
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test("GET / debe ejecutar la consulta SELECT correcta", async () => {
    pool.query.mockResolvedValueOnce([
      [
        {
          id: 1,
          id_usuario: 2,
          nivel: "ERROR",
          nombre_usuario: "Lorena",
          mensaje: "Error de conexión",
          fecha: "2026-10-08 10:00:00",
        },
      ],
    ]);

    await request(app).get("/logerrores");

    const queryEjecutada = pool.query.mock.calls[0][0];

    expect(queryEjecutada).toContain("SELECT");
    expect(queryEjecutada).toContain("log_errores");
    expect(queryEjecutada).toContain("ORDER BY fecha DESC, id DESC");
  });

  test("GET / debe retornar una lista vacía si no existen registros", async () => {
    pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app).get("/logerrores");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  test("GET / debe retornar error 500 si falla la base de datos", async () => {
    pool.query.mockRejectedValueOnce(
      new Error("Error de conexión")
    );

    const res = await request(app).get("/logerrores");

    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty(
      "error",
      "Error de conexión"
    );
  });

  // =====================================================
  // GET /usuario/:id_usuario
  // =====================================================

  test("GET /usuario/:id_usuario debe retornar los errores de un usuario", async () => {
    pool.query.mockResolvedValueOnce([
      [
        {
          id: 1,
          id_usuario: 2,
          nivel: "ERROR",
          nombre_usuario: "Lorena",
          mensaje: "Error de conexión",
          fecha: "2026-10-08 10:00:00",
        },
      ],
    ]);

    const res = await request(app).get("/logerrores/usuario/2");

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toHaveProperty("id_usuario", 2);
    expect(res.body[0]).toHaveProperty(
      "mensaje",
      "Error de conexión"
    );
  });

  test("GET /usuario/:id_usuario debe enviar el ID como parámetro", async () => {
    pool.query.mockResolvedValueOnce([[]]);

    await request(app).get("/logerrores/usuario/5");

    expect(pool.query).toHaveBeenCalledTimes(1);

    const queryEjecutada = pool.query.mock.calls[0][0];
    const parametros = pool.query.mock.calls[0][1];

    expect(queryEjecutada).toContain(
      "WHERE id_usuario = ?"
    );
    expect(queryEjecutada).toContain("ORDER BY fecha DESC, id DESC");
    expect(parametros).toEqual(["5"]);
  });

  test("GET /usuario/:id_usuario debe retornar lista vacía si no hay errores", async () => {
    pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app).get("/logerrores/usuario/999");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  test("GET /usuario/:id_usuario debe retornar error 500 si falla la base de datos", async () => {
    pool.query.mockRejectedValueOnce(
      new Error("Error al consultar usuario")
    );

    const res = await request(app).get("/logerrores/usuario/2");

    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty(
      "error",
      "Error al consultar usuario"
    );
  });

  // =====================================================
  // POST /
  // =====================================================

  test("POST / debe registrar un nuevo error", async () => {
    pool.query.mockResolvedValueOnce([{ insertId: 3 }]);

    const res = await request(app)
      .post("/logerrores")
      .send({
        id_usuario: 2,
        nivel: "ERROR",
        nombre_usuario: "Lorena",
        mensaje: "Error de conexión",
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({
      mensaje: "Error registrado exitosamente",
      id: 3,
    });
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test("POST / debe ejecutar INSERT correctamente", async () => {
    pool.query.mockResolvedValueOnce([{ insertId: 4 }]);

    await request(app)
      .post("/logerrores")
      .send({
        id_usuario: 2,
        nivel: "WARNING",
        nombre_usuario: "Sistema",
        mensaje: "Advertencia de prueba",
      });

    const queryEjecutada = pool.query.mock.calls[0][0];
    const parametros = pool.query.mock.calls[0][1];

    expect(queryEjecutada).toContain("INSERT INTO log_errores");
    expect(queryEjecutada).toContain("NOW()");
    expect(parametros).toEqual([
      2,
      "WARNING",
      "Sistema",
      "Advertencia de prueba",
    ]);
  });

  test("POST / debe registrar el error con valores predeterminados", async () => {
    pool.query.mockResolvedValueOnce([{ insertId: 5 }]);

    const res = await request(app)
      .post("/logerrores")
      .send({
        nivel: "ERROR",
        mensaje: "Error generado por el sistema",
      });

    expect(res.statusCode).toBe(201);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO log_errores"),
      [
        null,
        "ERROR",
        "Sistema",
        "Error generado por el sistema",
      ]
    );
  });

  test("POST / debe retornar 400 si no se envía el nivel", async () => {
    const res = await request(app)
      .post("/logerrores")
      .send({
        mensaje: "Error de prueba",
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: "Nivel y mensaje son requeridos",
    });
    expect(pool.query).not.toHaveBeenCalled();
  });

  test("POST / debe retornar 400 si no se envía el mensaje", async () => {
    const res = await request(app)
      .post("/logerrores")
      .send({
        nivel: "ERROR",
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: "Nivel y mensaje son requeridos",
    });
    expect(pool.query).not.toHaveBeenCalled();
  });

  test("POST / debe retornar 400 si el nivel está vacío", async () => {
    const res = await request(app)
      .post("/logerrores")
      .send({
        nivel: "",
        mensaje: "Error de prueba",
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty(
      "error",
      "Nivel y mensaje son requeridos"
    );
    expect(pool.query).not.toHaveBeenCalled();
  });

  test("POST / debe retornar 400 si el mensaje está vacío", async () => {
    const res = await request(app)
      .post("/logerrores")
      .send({
        nivel: "ERROR",
        mensaje: "",
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty(
      "error",
      "Nivel y mensaje son requeridos"
    );
    expect(pool.query).not.toHaveBeenCalled();
  });

  test("POST / debe retornar error 500 si falla la base de datos", async () => {
    pool.query.mockRejectedValueOnce(
      new Error("Error al registrar")
    );

    const res = await request(app)
      .post("/logerrores")
      .send({
        nivel: "ERROR",
        mensaje: "Error de prueba",
      });

    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty(
      "error",
      "Error al registrar"
    );
  });
});