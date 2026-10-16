import request from "supertest";
import express from "express";
import router from "../../Administrador/autorizaciones.js";

// Simulamos el módulo de la base de datos
jest.mock("../../../db.js");
import pool from "../../../db.js";

// Creamos una aplicación de Express para las pruebas
const app = express();

app.use(express.json());
app.use("/autorizaciones", router);

describe("Pruebas de Caja Blanca - Autorizaciones", () => {
  // Limpia los mocks antes de cada prueba
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =====================================================
  // GET /
  // =====================================================

  test("GET / debe retornar todas las autorizaciones", async () => {
    pool.query.mockResolvedValueOnce([
      [
        { id: 1, nombre: "Administrador" },
        { id: 2, nombre: "Bodega" },
      ],
    ]);

    const res = await request(app).get("/autorizaciones");

    expect(res.statusCode).toBe(200);

    expect(res.body).toHaveLength(2);

    expect(res.body[0]).toHaveProperty("id", 1);
    expect(res.body[0]).toHaveProperty("nombre", "Administrador");

    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test("GET / debe ejecutar la consulta SELECT correcta", async () => {
    pool.query.mockResolvedValueOnce([[{ id: 1, nombre: "Administrador" }]]);

    await request(app).get("/autorizaciones");

    expect(pool.query).toHaveBeenCalled();

    const queryEjecutada = pool.query.mock.calls[0][0];

    expect(queryEjecutada).toContain("SELECT");
    expect(queryEjecutada).toContain("Autorizacion");
    expect(queryEjecutada).toContain("ORDER BY id ASC");
  });

  test("GET / debe retornar error 500 si falla la base de datos", async () => {
    pool.query.mockRejectedValueOnce(new Error("Error de conexión"));

    const res = await request(app).get("/autorizaciones");

    expect(res.statusCode).toBe(500);

    expect(res.body).toHaveProperty("error", "Error de conexión");
  });

  // =====================================================
  // GET /:id
  // =====================================================

  test("GET /:id debe retornar una autorización existente", async () => {
    pool.query.mockResolvedValueOnce([[{ id: 1, nombre: "Administrador" }]]);

    const res = await request(app).get("/autorizaciones/1");

    expect(res.statusCode).toBe(200);

    expect(res.body).toHaveProperty("id", 1);
    expect(res.body).toHaveProperty("nombre", "Administrador");

    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test("GET /:id debe enviar el id como parámetro a la consulta", async () => {
    pool.query.mockResolvedValueOnce([[{ id: 2, nombre: "Bodega" }]]);

    await request(app).get("/autorizaciones/2");

    expect(pool.query).toHaveBeenCalledWith(
      "SELECT id, nombre FROM Autorizacion WHERE id = ?",
      ["2"],
    );
  });

  test("GET /:id debe retornar 404 si la autorización no existe", async () => {
    pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app).get("/autorizaciones/999");

    expect(res.statusCode).toBe(404);

    expect(res.body).toEqual({
      error: "Autorización no encontrada",
    });
  });

  test("GET /:id debe retornar 500 si falla la base de datos", async () => {
    pool.query.mockRejectedValueOnce(new Error("Error de conexión"));

    const res = await request(app).get("/autorizaciones/1");

    expect(res.statusCode).toBe(500);

    expect(res.body).toHaveProperty("error", "Error de conexión");
  });

  // =====================================================
  // POST /
  // =====================================================

  test("POST / debe crear una nueva autorización", async () => {
    pool.query.mockResolvedValueOnce([{ insertId: 3 }]);

    const res = await request(app).post("/autorizaciones").send({
      nombre: "Usuario",
    });

    expect(res.statusCode).toBe(201);

    expect(res.body).toEqual({
      mensaje: "Autorización creada exitosamente",
    });

    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test("POST / debe ejecutar INSERT correctamente", async () => {
    pool.query.mockResolvedValueOnce([{ insertId: 4 }]);

    await request(app).post("/autorizaciones").send({
      nombre: "Caja",
    });

    expect(pool.query).toHaveBeenCalledWith(
      "INSERT INTO Autorizacion (nombre) VALUES (?)",
      ["Caja"],
    );
  });

  test("POST / debe retornar 400 si no se envía el nombre", async () => {
    const res = await request(app).post("/autorizaciones").send({});

    expect(res.statusCode).toBe(400);

    expect(res.body).toEqual({
      error: "El nombre de la autorización es requerido",
    });

    expect(pool.query).not.toHaveBeenCalled();
  });

  test("POST / debe retornar 400 si el nombre está vacío", async () => {
    const res = await request(app).post("/autorizaciones").send({
      nombre: "",
    });

    expect(res.statusCode).toBe(400);

    expect(res.body).toEqual({
      error: "El nombre de la autorización es requerido",
    });

    expect(pool.query).not.toHaveBeenCalled();
  });

  test("POST / debe retornar 400 si el nombre contiene solo espacios", async () => {
    const res = await request(app).post("/autorizaciones").send({
      nombre: "   ",
    });

    expect(res.statusCode).toBe(400);

    expect(res.body).toEqual({
      error: "El nombre de la autorización es requerido",
    });

    expect(pool.query).not.toHaveBeenCalled();
  });

  test("POST / debe retornar 500 si falla la base de datos", async () => {
    pool.query.mockRejectedValueOnce(new Error("Error al insertar"));

    const res = await request(app).post("/autorizaciones").send({
      nombre: "Compras",
    });

    expect(res.statusCode).toBe(500);

    expect(res.body).toHaveProperty("error", "Error al insertar");
  });

  // =====================================================
  // PUT /:id
  // =====================================================

  test("PUT /:id debe actualizar una autorización", async () => {
    pool.query.mockResolvedValueOnce([
      {
        affectedRows: 1,
      },
    ]);

    const res = await request(app).put("/autorizaciones/1").send({
      nombre: "Administrador actualizado",
    });

    expect(res.statusCode).toBe(200);

    expect(res.body).toEqual({
      mensaje: "Autorización actualizada exitosamente",
    });

    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test("PUT /:id debe ejecutar UPDATE correctamente", async () => {
    pool.query.mockResolvedValueOnce([
      {
        affectedRows: 1,
      },
    ]);

    await request(app).put("/autorizaciones/2").send({
      nombre: "Bodega actualizada",
    });

    expect(pool.query).toHaveBeenCalledWith(
      "UPDATE Autorizacion SET nombre = ? WHERE id = ?",
      ["Bodega actualizada", "2"],
    );
  });

  test("PUT /:id debe retornar 400 si no se envía el nombre", async () => {
    const res = await request(app).put("/autorizaciones/1").send({});

    expect(res.statusCode).toBe(400);

    expect(res.body).toEqual({
      error: "El nombre es requerido",
    });

    expect(pool.query).not.toHaveBeenCalled();
  });

  test("PUT /:id debe retornar 400 si el nombre está vacío", async () => {
    const res = await request(app).put("/autorizaciones/1").send({
      nombre: "",
    });

    expect(res.statusCode).toBe(400);

    expect(res.body).toEqual({
      error: "El nombre es requerido",
    });

    expect(pool.query).not.toHaveBeenCalled();
  });

  test("PUT /:id debe retornar 400 si el nombre contiene solo espacios", async () => {
    const res = await request(app).put("/autorizaciones/1").send({
      nombre: "   ",
    });

    expect(res.statusCode).toBe(400);

    expect(res.body).toEqual({
      error: "El nombre es requerido",
    });

    expect(pool.query).not.toHaveBeenCalled();
  });

  test("PUT /:id debe retornar 404 si la autorización no existe", async () => {
    pool.query.mockResolvedValueOnce([
      {
        affectedRows: 0,
      },
    ]);

    const res = await request(app).put("/autorizaciones/999").send({
      nombre: "No existe",
    });

    expect(res.statusCode).toBe(404);

    expect(res.body).toEqual({
      error: "Autorización no encontrada",
    });
  });

  test("PUT /:id debe retornar 500 si falla la base de datos", async () => {
    pool.query.mockRejectedValueOnce(new Error("Error al actualizar"));

    const res = await request(app).put("/autorizaciones/1").send({
      nombre: "Administrador",
    });

    expect(res.statusCode).toBe(500);

    expect(res.body).toHaveProperty("error", "Error al actualizar");
  });

  // =====================================================
  // DELETE /:id
  // =====================================================

  test("DELETE /:id debe eliminar una autorización", async () => {
    pool.query.mockResolvedValueOnce([
      {
        affectedRows: 1,
      },
    ]);

    const res = await request(app).delete("/autorizaciones/1");

    expect(res.statusCode).toBe(200);

    expect(res.body).toEqual({
      mensaje: "Autorización eliminada exitosamente",
    });

    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test("DELETE /:id debe ejecutar DELETE correctamente", async () => {
    pool.query.mockResolvedValueOnce([
      {
        affectedRows: 1,
      },
    ]);

    await request(app).delete("/autorizaciones/2");

    expect(pool.query).toHaveBeenCalledWith(
      "DELETE FROM Autorizacion WHERE id = ?",
      ["2"],
    );
  });

  test("DELETE /:id debe retornar 404 si la autorización no existe", async () => {
    pool.query.mockResolvedValueOnce([
      {
        affectedRows: 0,
      },
    ]);

    const res = await request(app).delete("/autorizaciones/999");

    expect(res.statusCode).toBe(404);

    expect(res.body).toEqual({
      error: "Autorización no encontrada",
    });
  });

  test("DELETE /:id debe retornar 500 si falla la base de datos", async () => {
    pool.query.mockRejectedValueOnce(new Error("Error al eliminar"));

    const res = await request(app).delete("/autorizaciones/1");

    expect(res.statusCode).toBe(500);

    expect(res.body).toHaveProperty("error", "Error al eliminar");
  });
});
