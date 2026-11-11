import request from "supertest";
import express from "express";
import router from "../../Optometra/historiaClinica.js";

// Simulamos el módulo de la base de datos
jest.mock("../../../db.js");
import pool from "../../../db.js";

// Creamos una aplicación de Express para las pruebas
const app = express();

app.use(express.json());
app.use("/optometra", router);

describe("Pruebas de Caja Blanca - Optometra", () => {
  // Limpia los mocks antes de cada prueba
  beforeEach(() => {
    jest.clearAllMocks();

    // El router escribe en console.error cuando falla; se silencia para no ensuciar la salida
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  // =====================================================
  // GET /cliente
  // =====================================================

  test("GET /cliente debe retornar todos los pacientes", async () => {
    pool.query.mockResolvedValueOnce([
      [
        {
          id_cliente: 1,
          nombre: "Matias  Bravo ",
          numeroDocumento: "633663653",
          id_historia: 6,
        },
        {
          id_cliente: 2,
          nombre: "Gume  Cassiani ",
          numeroDocumento: "0000000222",
          id_historia: null,
        },
      ],
    ]);

    const res = await request(app).get("/optometra/cliente");

    expect(res.statusCode).toBe(200);

    expect(res.body).toHaveLength(2);

    expect(res.body[0]).toHaveProperty("id_cliente", 1);
    expect(res.body[0]).toHaveProperty("nombre", "Matias  Bravo ");
    expect(res.body[0]).toHaveProperty("numeroDocumento", "633663653");
    expect(res.body[0]).toHaveProperty("id_historia", 6);

    // Un paciente sin historia clínica llega con id_historia en null
    expect(res.body[1]).toHaveProperty("id_historia", null);

    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test("GET /cliente debe retornar un arreglo vacío si no hay pacientes", async () => {
    pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app).get("/optometra/cliente");

    expect(res.statusCode).toBe(200);

    expect(res.body).toEqual([]);
  });

  test("GET /cliente debe ejecutar la consulta SELECT correcta", async () => {
    pool.query.mockResolvedValueOnce([[]]);

    await request(app).get("/optometra/cliente");

    expect(pool.query).toHaveBeenCalled();

    const queryEjecutada = pool.query.mock.calls[0][0];

    expect(queryEjecutada).toContain("SELECT");
    expect(queryEjecutada).toContain("FROM Cliente c");
    expect(queryEjecutada).toContain("INNER JOIN Datos_personales dp");
    expect(queryEjecutada).toContain("LEFT JOIN Historia_clinica hc");
    expect(queryEjecutada).toContain("ORDER BY dp.primer_nombre ASC");
  });

  test("GET /cliente debe retornar error 500 si falla la base de datos", async () => {
    pool.query.mockRejectedValueOnce(new Error("Error de conexión"));

    const res = await request(app).get("/optometra/cliente");

    expect(res.statusCode).toBe(500);

    expect(res.body).toEqual({
      error: "No fue posible cargar los pacientes.",
    });
  });

  // =====================================================
  // POST /historia-clinica
  // =====================================================

  test("POST /historia-clinica debe crear una nueva historia clínica", async () => {
    // 1) el cliente existe, 2) no tiene historia, 3) INSERT exitoso
    pool.query
      .mockResolvedValueOnce([[{ id_cliente: 1 }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ insertId: 5 }]);

    const res = await request(app).post("/optometra/historia-clinica").send({
      id_cliente: 1,
      fecha_apertura: "2026-10-16",
    });

    expect(res.statusCode).toBe(201);

    expect(res.body).toEqual({
      mensaje: "Historia clínica registrada correctamente.",
      id_historia: 5,
    });

    expect(pool.query).toHaveBeenCalledTimes(3);
  });

  test("POST /historia-clinica debe verificar que el cliente exista con su id", async () => {
    pool.query
      .mockResolvedValueOnce([[{ id_cliente: 1 }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ insertId: 5 }]);

    await request(app).post("/optometra/historia-clinica").send({
      id_cliente: 1,
      fecha_apertura: "2026-10-16",
    });

    const [sqlCliente, paramsCliente] = pool.query.mock.calls[0];

    expect(sqlCliente).toContain("FROM Cliente");
    expect(paramsCliente).toEqual([1]);

    const [sqlHistoria, paramsHistoria] = pool.query.mock.calls[1];

    expect(sqlHistoria).toContain("FROM Historia_clinica");
    expect(paramsHistoria).toEqual([1]);
  });

  test("POST /historia-clinica debe ejecutar INSERT con los valores por defecto", async () => {
    pool.query
      .mockResolvedValueOnce([[{ id_cliente: 1 }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ insertId: 5 }]);

    await request(app).post("/optometra/historia-clinica").send({
      id_cliente: 1,
      fecha_apertura: "2026-10-16",
    });

    const [sqlInsert, paramsInsert] = pool.query.mock.calls[2];

    expect(sqlInsert).toContain("INSERT INTO Historia_clinica");

    expect(paramsInsert).toEqual([
      1,
      "2026-10-16",
      "Sin evolución inicial",
      0,
    ]);
  });

  test("POST /historia-clinica debe usar la evolución y el número de consulta enviados", async () => {
    pool.query
      .mockResolvedValueOnce([[{ id_cliente: 1 }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ insertId: 7 }]);

    await request(app).post("/optometra/historia-clinica").send({
      id_cliente: 1,
      fecha_apertura: "2026-10-16",
      evolucion: "Paciente con miopía leve",
      num_consulta: 3,
    });

    const paramsInsert = pool.query.mock.calls[2][1];

    expect(paramsInsert).toEqual([
      1,
      "2026-10-16",
      "Paciente con miopía leve",
      3,
    ]);
  });

  test("POST /historia-clinica debe usar la evolución por defecto si viene vacía", async () => {
    pool.query
      .mockResolvedValueOnce([[{ id_cliente: 1 }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ insertId: 8 }]);

    await request(app).post("/optometra/historia-clinica").send({
      id_cliente: 1,
      fecha_apertura: "2026-10-16",
      evolucion: "",
    });

    const paramsInsert = pool.query.mock.calls[2][1];

    expect(paramsInsert[2]).toBe("Sin evolución inicial");
  });

  test("POST /historia-clinica debe conservar num_consulta en 0 si se envía 0", async () => {
    pool.query
      .mockResolvedValueOnce([[{ id_cliente: 1 }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ insertId: 9 }]);

    await request(app).post("/optometra/historia-clinica").send({
      id_cliente: 1,
      fecha_apertura: "2026-10-16",
      num_consulta: 0,
    });

    const paramsInsert = pool.query.mock.calls[2][1];

    expect(paramsInsert[3]).toBe(0);
  });

  test("POST /historia-clinica debe retornar 400 si no se envía el cliente", async () => {
    const res = await request(app).post("/optometra/historia-clinica").send({
      fecha_apertura: "2026-10-16",
    });

    expect(res.statusCode).toBe(400);

    expect(res.body).toEqual({
      error: "El paciente y la fecha de apertura son obligatorios.",
    });

    expect(pool.query).not.toHaveBeenCalled();
  });

  test("POST /historia-clinica debe retornar 400 si no se envía la fecha de apertura", async () => {
    const res = await request(app).post("/optometra/historia-clinica").send({
      id_cliente: 1,
    });

    expect(res.statusCode).toBe(400);

    expect(res.body).toEqual({
      error: "El paciente y la fecha de apertura son obligatorios.",
    });

    expect(pool.query).not.toHaveBeenCalled();
  });

  test("POST /historia-clinica debe retornar 400 si no se envía ningún dato", async () => {
    const res = await request(app).post("/optometra/historia-clinica").send({});

    expect(res.statusCode).toBe(400);

    expect(res.body).toEqual({
      error: "El paciente y la fecha de apertura son obligatorios.",
    });

    expect(pool.query).not.toHaveBeenCalled();
  });

  test("POST /historia-clinica debe retornar 404 si el cliente no existe", async () => {
    pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app).post("/optometra/historia-clinica").send({
      id_cliente: 999,
      fecha_apertura: "2026-10-16",
    });

    expect(res.statusCode).toBe(404);

    expect(res.body).toEqual({
      error: "El cliente seleccionado no existe.",
    });

    // Se detiene en la primera consulta: no revisa historias ni inserta
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test("POST /historia-clinica debe retornar 400 si el cliente ya tiene historia clínica", async () => {
    pool.query
      .mockResolvedValueOnce([[{ id_cliente: 1 }]])
      .mockResolvedValueOnce([[{ id_historia: 3 }]]);

    const res = await request(app).post("/optometra/historia-clinica").send({
      id_cliente: 1,
      fecha_apertura: "2026-10-16",
    });

    expect(res.statusCode).toBe(400);

    expect(res.body).toEqual({
      error: "Este cliente ya tiene una historia clínica registrada.",
    });

    // Solo se hicieron las dos consultas de validación, sin INSERT
    expect(pool.query).toHaveBeenCalledTimes(2);
  });

  test("POST /historia-clinica debe retornar 500 si falla la base de datos al verificar el cliente", async () => {
    pool.query.mockRejectedValueOnce(new Error("Error de conexión"));

    const res = await request(app).post("/optometra/historia-clinica").send({
      id_cliente: 1,
      fecha_apertura: "2026-10-16",
    });

    expect(res.statusCode).toBe(500);

    expect(res.body).toEqual({
      error: "No fue posible registrar la historia clínica.",
    });
  });

  test("POST /historia-clinica debe retornar 500 si falla el INSERT", async () => {
    pool.query
      .mockResolvedValueOnce([[{ id_cliente: 1 }]])
      .mockResolvedValueOnce([[]])
      .mockRejectedValueOnce(new Error("Error al insertar"));

    const res = await request(app).post("/optometra/historia-clinica").send({
      id_cliente: 1,
      fecha_apertura: "2026-10-16",
    });

    expect(res.statusCode).toBe(500);

    expect(res.body).toEqual({
      error: "No fue posible registrar la historia clínica.",
    });
  });
});