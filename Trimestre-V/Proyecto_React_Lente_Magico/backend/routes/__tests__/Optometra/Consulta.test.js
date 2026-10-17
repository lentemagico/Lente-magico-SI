import request from "supertest";
import express from "express";
import router from "../../Optometra/Consulta.js";

// Simulamos el módulo de la base de datos
jest.mock("../../../db.js");
import pool from "../../../db.js";

// Creamos una aplicación de Express para las pruebas
const app = express();

app.use(express.json());
app.use("/optometra", router);

// Conexión simulada: esta ruta usa pool.getConnection() para trabajar con una transacción
const conexion = {
  beginTransaction: jest.fn(),
  query: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
  release: jest.fn(),
};

// Datos válidos base para registrar una consulta con cita
const datosConCita = {
  id_cliente: 1,
  id_usuario: 3,
  id_agenda: 5,
  motivo: "Control anual",
  resultado_examen: "Agudeza visual 20/40",
  diagnostico: "Miopía",
  recomendaciones: "Uso permanente",
  evolucion: "Sin molestias",
};

// Cita pendiente que devuelve el SELECT de Agenda_consulta
const citaPendiente = { id_agenda: 5, estado: "Pendiente" };

describe("Pruebas de Caja Blanca - Consulta", () => {
  // Limpia los mocks antes de cada prueba
  beforeEach(() => {
    jest.clearAllMocks();

    // mockReset también descarta respuestas encoladas que no se hayan usado
    conexion.query.mockReset();

    pool.getConnection = jest.fn().mockResolvedValue(conexion);

    // El router escribe en console.error cuando falla; se silencia para no ensuciar la salida
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  // =====================================================
  // POST /consulta - flujo exitoso
  // =====================================================

  test("POST /consulta debe registrar una consulta con cita pendiente e historia existente", async () => {
    // 1) historia existente, 2) cita pendiente, 3) INSERT consulta, 4) UPDATE cita
    conexion.query
      .mockResolvedValueOnce([[{ id_historia: 10 }]])
      .mockResolvedValueOnce([[citaPendiente]])
      .mockResolvedValueOnce([{ insertId: 30 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const res = await request(app)
      .post("/optometra/consulta")
      .send(datosConCita);

    expect(res.statusCode).toBe(201);

    expect(res.body).toEqual({
      mensaje: "Consulta registrada correctamente.",
      id_consulta: 30,
      id_historia: 10,
      id_agenda: 5,
    });

    expect(conexion.query).toHaveBeenCalledTimes(4);
  });

  test("POST /consulta debe manejar la transacción: begin, commit y release", async () => {
    conexion.query
      .mockResolvedValueOnce([[{ id_historia: 10 }]])
      .mockResolvedValueOnce([[citaPendiente]])
      .mockResolvedValueOnce([{ insertId: 30 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    await request(app).post("/optometra/consulta").send(datosConCita);

    expect(pool.getConnection).toHaveBeenCalledTimes(1);
    expect(conexion.beginTransaction).toHaveBeenCalledTimes(1);
    expect(conexion.commit).toHaveBeenCalledTimes(1);
    expect(conexion.rollback).not.toHaveBeenCalled();
    expect(conexion.release).toHaveBeenCalledTimes(1);
  });

  test("POST /consulta debe reutilizar la historia clínica si el cliente ya tiene una", async () => {
    conexion.query
      .mockResolvedValueOnce([[{ id_historia: 10 }]])
      .mockResolvedValueOnce([[citaPendiente]])
      .mockResolvedValueOnce([{ insertId: 30 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    await request(app).post("/optometra/consulta").send(datosConCita);

    const [sqlHistoria, paramsHistoria] = conexion.query.mock.calls[0];

    expect(sqlHistoria).toContain("SELECT id_historia FROM Historia_clinica");
    expect(paramsHistoria).toEqual([1]);

    // Ninguna de las consultas ejecutadas debe crear una historia
    const sqls = conexion.query.mock.calls.map((llamada) => llamada[0]);

    expect(
      sqls.some((sql) => sql.includes("INSERT INTO Historia_clinica"))
    ).toBe(false);
  });

  test("POST /consulta debe crear la historia clínica si el cliente no tiene una", async () => {
    // 1) sin historia, 2) INSERT historia, 3) cita pendiente, 4) INSERT consulta, 5) UPDATE cita
    conexion.query
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ insertId: 11 }])
      .mockResolvedValueOnce([[citaPendiente]])
      .mockResolvedValueOnce([{ insertId: 31 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const res = await request(app)
      .post("/optometra/consulta")
      .send(datosConCita);

    expect(res.statusCode).toBe(201);

    expect(res.body.id_historia).toBe(11);

    const [sqlInsertHistoria, paramsInsertHistoria] =
      conexion.query.mock.calls[1];

    expect(sqlInsertHistoria).toContain("INSERT INTO Historia_clinica");
    expect(sqlInsertHistoria).toContain("CURDATE()");
    expect(paramsInsertHistoria).toEqual([1]);
  });

  test("POST /consulta debe validar la cita con su id y el id del cliente", async () => {
    conexion.query
      .mockResolvedValueOnce([[{ id_historia: 10 }]])
      .mockResolvedValueOnce([[citaPendiente]])
      .mockResolvedValueOnce([{ insertId: 30 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    await request(app).post("/optometra/consulta").send(datosConCita);

    const [sqlAgenda, paramsAgenda] = conexion.query.mock.calls[1];

    expect(sqlAgenda).toContain("FROM Agenda_consulta");
    expect(paramsAgenda).toEqual([5, 1]);
  });

  test("POST /consulta debe ejecutar INSERT de la consulta con los datos enviados", async () => {
    conexion.query
      .mockResolvedValueOnce([[{ id_historia: 10 }]])
      .mockResolvedValueOnce([[citaPendiente]])
      .mockResolvedValueOnce([{ insertId: 30 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    await request(app).post("/optometra/consulta").send(datosConCita);

    const [sqlConsulta, paramsConsulta] = conexion.query.mock.calls[2];

    expect(sqlConsulta).toContain("INSERT INTO Consulta");
    expect(sqlConsulta).toContain("NOW()");

    // id_usuario, id_historia, motivo, resultado, diagnóstico, recomendaciones, evolución, id_agenda
    expect(paramsConsulta).toEqual([
      3,
      10,
      "Control anual",
      "Agudeza visual 20/40",
      "Miopía",
      "Uso permanente",
      "Sin molestias",
      5,
    ]);
  });

  test("POST /consulta debe usar textos por defecto en los campos opcionales", async () => {
    conexion.query
      .mockResolvedValueOnce([[{ id_historia: 10 }]])
      .mockResolvedValueOnce([[citaPendiente]])
      .mockResolvedValueOnce([{ insertId: 30 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    await request(app).post("/optometra/consulta").send({
      id_cliente: 1,
      id_usuario: 3,
      id_agenda: 5,
      motivo: "Control anual",
    });

    const paramsConsulta = conexion.query.mock.calls[2][1];

    expect(paramsConsulta).toEqual([
      3,
      10,
      "Control anual",
      "Sin resultado registrado",
      "Sin diagnóstico registrado",
      "Sin recomendaciones",
      "Sin evolución registrada",
      5,
    ]);
  });

  test("POST /consulta debe marcar la cita como atendida", async () => {
    conexion.query
      .mockResolvedValueOnce([[{ id_historia: 10 }]])
      .mockResolvedValueOnce([[citaPendiente]])
      .mockResolvedValueOnce([{ insertId: 30 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    await request(app).post("/optometra/consulta").send(datosConCita);

    const [sqlUpdate, paramsUpdate] = conexion.query.mock.calls[3];

    expect(sqlUpdate).toContain("UPDATE Agenda_consulta SET estado = 'Atendida'");
    expect(paramsUpdate).toEqual([5]);
  });

  // =====================================================
  // POST /consulta - consulta sin cita previa
  // =====================================================

  test("POST /consulta debe crear una cita si la consulta se atiende sin agendar", async () => {
    // 1) historia existente, 2) INSERT cita, 3) INSERT consulta
    conexion.query
      .mockResolvedValueOnce([[{ id_historia: 10 }]])
      .mockResolvedValueOnce([{ insertId: 20 }])
      .mockResolvedValueOnce([{ insertId: 32 }]);

    const res = await request(app).post("/optometra/consulta").send({
      id_cliente: 1,
      id_usuario: 3,
      motivo: "Control anual",
    });

    expect(res.statusCode).toBe(201);

    expect(res.body).toEqual({
      mensaje: "Consulta registrada correctamente.",
      id_consulta: 32,
      id_historia: 10,
      id_agenda: 20,
    });

    const [sqlAgenda, paramsAgenda] = conexion.query.mock.calls[1];

    expect(sqlAgenda).toContain("INSERT INTO Agenda_consulta");
    expect(paramsAgenda).toEqual([1, "Control anual"]);

    // La consulta queda ligada a la cita recién creada
    const paramsConsulta = conexion.query.mock.calls[2][1];

    expect(paramsConsulta[paramsConsulta.length - 1]).toBe(20);

    // No hay cita pendiente que actualizar: solo 3 consultas y sin UPDATE
    expect(conexion.query).toHaveBeenCalledTimes(3);
  });

  // =====================================================
  // POST /consulta - validaciones
  // =====================================================

  test("POST /consulta debe retornar 400 si no se envía el cliente", async () => {
    const res = await request(app).post("/optometra/consulta").send({
      id_usuario: 3,
      motivo: "Control anual",
    });

    expect(res.statusCode).toBe(400);

    expect(res.body).toEqual({
      error: "Faltan datos obligatorios para registrar la consulta.",
    });

    expect(conexion.beginTransaction).not.toHaveBeenCalled();
    expect(conexion.query).not.toHaveBeenCalled();
  });

  test("POST /consulta debe retornar 400 si no se envía el usuario", async () => {
    const res = await request(app).post("/optometra/consulta").send({
      id_cliente: 1,
      motivo: "Control anual",
    });

    expect(res.statusCode).toBe(400);

    expect(res.body).toEqual({
      error: "Faltan datos obligatorios para registrar la consulta.",
    });

    expect(conexion.query).not.toHaveBeenCalled();
  });

  test("POST /consulta debe retornar 400 si no se envía el motivo", async () => {
    const res = await request(app).post("/optometra/consulta").send({
      id_cliente: 1,
      id_usuario: 3,
    });

    expect(res.statusCode).toBe(400);

    expect(res.body).toEqual({
      error: "Faltan datos obligatorios para registrar la consulta.",
    });

    expect(conexion.query).not.toHaveBeenCalled();
  });

  test("POST /consulta debe liberar la conexión aunque falle la validación", async () => {
    await request(app).post("/optometra/consulta").send({});

    expect(conexion.release).toHaveBeenCalledTimes(1);

    // La transacción nunca se abrió, así que no hay nada que revertir
    expect(conexion.rollback).not.toHaveBeenCalled();
  });

  test("POST /consulta debe retornar 400 si la cita no existe o no es del paciente", async () => {
    conexion.query
      .mockResolvedValueOnce([[{ id_historia: 10 }]])
      .mockResolvedValueOnce([[]]);

    const res = await request(app)
      .post("/optometra/consulta")
      .send(datosConCita);

    expect(res.statusCode).toBe(400);

    expect(res.body).toEqual({
      error: "La cita seleccionada no existe o no pertenece a este paciente.",
    });

    // Se revierte la transacción y no se inserta la consulta
    expect(conexion.rollback).toHaveBeenCalledTimes(1);
    expect(conexion.commit).not.toHaveBeenCalled();
    expect(conexion.release).toHaveBeenCalledTimes(1);
    expect(conexion.query).toHaveBeenCalledTimes(2);
  });

  test("POST /consulta debe retornar 409 si la cita ya no está pendiente", async () => {
    conexion.query
      .mockResolvedValueOnce([[{ id_historia: 10 }]])
      .mockResolvedValueOnce([[{ id_agenda: 5, estado: "Atendida" }]]);

    const res = await request(app)
      .post("/optometra/consulta")
      .send(datosConCita);

    expect(res.statusCode).toBe(409);

    expect(res.body).toEqual({
      error: "La cita seleccionada ya fue atendida o no esta pendiente.",
    });

    expect(conexion.rollback).toHaveBeenCalledTimes(1);
    expect(conexion.commit).not.toHaveBeenCalled();
    expect(conexion.release).toHaveBeenCalledTimes(1);
    expect(conexion.query).toHaveBeenCalledTimes(2);
  });

  // =====================================================
  // POST /consulta - errores de base de datos
  // =====================================================

  test("POST /consulta debe retornar 500 y revertir si falla la búsqueda de la historia", async () => {
    conexion.query.mockRejectedValueOnce(new Error("Error de conexión"));

    const res = await request(app)
      .post("/optometra/consulta")
      .send(datosConCita);

    expect(res.statusCode).toBe(500);

    expect(res.body).toEqual({
      error: "Error al registrar la consulta.",
    });

    expect(conexion.rollback).toHaveBeenCalledTimes(1);
    expect(conexion.commit).not.toHaveBeenCalled();
    expect(conexion.release).toHaveBeenCalledTimes(1);
  });

  test("POST /consulta debe retornar 500 y revertir si falla el INSERT de la consulta", async () => {
    conexion.query
      .mockResolvedValueOnce([[{ id_historia: 10 }]])
      .mockResolvedValueOnce([[citaPendiente]])
      .mockRejectedValueOnce(new Error("Error al insertar"));

    const res = await request(app)
      .post("/optometra/consulta")
      .send(datosConCita);

    expect(res.statusCode).toBe(500);

    expect(res.body).toEqual({
      error: "Error al registrar la consulta.",
    });

    expect(conexion.rollback).toHaveBeenCalledTimes(1);
    expect(conexion.commit).not.toHaveBeenCalled();
    expect(conexion.release).toHaveBeenCalledTimes(1);
  });

  test("POST /consulta debe retornar 500 y revertir si falla el commit", async () => {
    conexion.query
      .mockResolvedValueOnce([[{ id_historia: 10 }]])
      .mockResolvedValueOnce([[citaPendiente]])
      .mockResolvedValueOnce([{ insertId: 30 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    conexion.commit.mockRejectedValueOnce(new Error("Error al confirmar"));

    const res = await request(app)
      .post("/optometra/consulta")
      .send(datosConCita);

    expect(res.statusCode).toBe(500);

    expect(res.body).toEqual({
      error: "Error al registrar la consulta.",
    });

    expect(conexion.rollback).toHaveBeenCalledTimes(1);
    expect(conexion.release).toHaveBeenCalledTimes(1);
  });
});