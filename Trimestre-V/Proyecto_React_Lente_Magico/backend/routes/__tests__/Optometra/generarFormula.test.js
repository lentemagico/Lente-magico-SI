// backend/routes/__tests__/Optometra/generarFormula.test.js
import request from "supertest";
import express from "express";
import router from "../../Optometra/generarFormula.js";

// Simulamos el módulo de la base de datos
jest.mock("../../../db.js");
import pool from "../../../db.js";

// App de Express mínima solo para las pruebas
const app = express();
app.use(express.json());
app.use("/historia", router);

describe("Pruebas de Caja Blanca - Consultas y Fórmulas ópticas", () => {
    beforeEach(() => {
        // Limpia llamadas y colas de mockResolvedValueOnce entre pruebas
        pool.query.mockReset();
        // Silencia console.error de los catch para no ensuciar la salida
        jest.spyOn(console, "error").mockImplementation(() => { });
    });

    afterEach(() => {
        console.error.mockRestore();
    });

    // =====================================================
    // GET /consultas
    // =====================================================
    describe("GET /consultas", () => {
        test("debe retornar todas las consultas", async () => {
            const filas = [
                { id_consulta: 2, id_cliente: 1, motivo: "Control", fecha_hora: "2026-02-01 10:00:00" },
                { id_consulta: 1, id_cliente: 1, motivo: "Visión borrosa", fecha_hora: "2026-01-01 09:00:00" },
            ];
            pool.query.mockResolvedValueOnce([filas]);

            const res = await request(app).get("/historia/consultas");

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveLength(2);
            expect(res.body[0].id_consulta).toBe(2);
            expect(pool.query).toHaveBeenCalledTimes(1);

            // Verifica la tabla consultada y el orden de la más reciente a la más antigua
            const sql = pool.query.mock.calls[0][0];
            expect(sql).toContain("FROM Consulta c");
            expect(sql).toContain("ORDER BY c.fecha_hora DESC");
        });

        test("debe retornar lista vacía si no hay consultas", async () => {
            pool.query.mockResolvedValueOnce([[]]);

            const res = await request(app).get("/historia/consultas");

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual([]);
        });

        test("debe capturar error de BD y retornar 500 con el mensaje del error", async () => {
            pool.query.mockRejectedValueOnce(new Error("Fallo de conexión"));

            const res = await request(app).get("/historia/consultas");

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe("Fallo de conexión");
        });
    });

    // =====================================================
    // GET /formulas/consulta/:id_consulta
    // =====================================================
    describe("GET /formulas/consulta/:id_consulta", () => {
        test("debe retornar la fórmula de la consulta", async () => {
            const formula = { id_formula: 4, id_consulta: 7, tipo_lente: "Monofocal" };
            pool.query.mockResolvedValueOnce([[formula]]);

            const res = await request(app).get("/historia/formulas/consulta/7");

            expect(res.statusCode).toBe(200);
            // Devuelve solo la primera fila (objeto), no un arreglo
            expect(res.body).toEqual(formula);
            expect(pool.query).toHaveBeenCalledTimes(1);

            const [sql, params] = pool.query.mock.calls[0];
            expect(sql).toContain("FROM Formula_optica");
            expect(sql).toContain("LIMIT 1");
            // El id llega desde la URL, por eso viaja como texto
            expect(params).toEqual(["7"]);
        });

        test("debe retornar 404 si la consulta no tiene fórmula", async () => {
            pool.query.mockResolvedValueOnce([[]]);

            const res = await request(app).get("/historia/formulas/consulta/7");

            expect(res.statusCode).toBe(404);
            expect(res.body.error).toBe("La consulta no tiene una fórmula óptica registrada.");
        });

        test("debe capturar error de BD y retornar 500 con el mensaje del error", async () => {
            pool.query.mockRejectedValueOnce(new Error("Fallo de conexión"));

            const res = await request(app).get("/historia/formulas/consulta/7");

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe("Fallo de conexión");
        });
    });

    // =====================================================
    // POST /formulas
    // =====================================================
    describe("POST /formulas", () => {
        const body = {
            id_consulta: 5,
            id_cliente: 3,
            esfera_ojo_derecho_e_izquierdo: "-1.25 / -1.00",
            cilindro_ojo_derecho_e_izquierdo: "-0.50 / -0.75",
            eje_ojo_derecho_e_izquierdo: "90 / 85",
            adicion: "+1.50",
            tipo_lente: "Progresivo",
            uso: "Permanente",
            observaciones: "Control en 6 meses",
        };

        const mensajeValidacion = "La consulta, el tipo de lente y el uso son obligatorios.";

        // Atajo: respuestas de BD para el flujo completo hasta el INSERT
        const mockFlujoExitoso = (idCliente = 3, insertId = 12) => {
            pool.query
                .mockResolvedValueOnce([[{ id_consulta: 5, id_cliente: idCliente }]]) // consulta existe
                .mockResolvedValueOnce([[{ id_cliente: idCliente }]]) // cliente existe
                .mockResolvedValueOnce([[]]) // sin fórmula previa
                .mockResolvedValueOnce([{ insertId }]); // INSERT
        };

        // ---- Validaciones (no deben tocar la BD) ----
        test("debe rechazar si falta id_consulta", async () => {
            const { id_consulta, ...incompleto } = body;

            const res = await request(app).post("/historia/formulas").send(incompleto);

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe(mensajeValidacion);
            expect(pool.query).not.toHaveBeenCalled();
        });

        test("debe rechazar si falta tipo_lente", async () => {
            const { tipo_lente, ...incompleto } = body;

            const res = await request(app).post("/historia/formulas").send(incompleto);

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe(mensajeValidacion);
            expect(pool.query).not.toHaveBeenCalled();
        });

        test("debe rechazar si falta uso", async () => {
            const { uso, ...incompleto } = body;

            const res = await request(app).post("/historia/formulas").send(incompleto);

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe(mensajeValidacion);
            expect(pool.query).not.toHaveBeenCalled();
        });

        test("debe rechazar un cuerpo vacío", async () => {
            const res = await request(app).post("/historia/formulas").send({});

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe(mensajeValidacion);
            expect(pool.query).not.toHaveBeenCalled();
        });

        test("id_cliente es opcional: sin él no debe responder 400", async () => {
            const { id_cliente, ...sinCliente } = body;
            mockFlujoExitoso();

            const res = await request(app).post("/historia/formulas").send(sinCliente);

            expect(res.statusCode).toBe(201);
        });

        // ---- Existencia de consulta, cliente y fórmula previa ----
        test("debe retornar 404 si la consulta no existe", async () => {
            pool.query.mockResolvedValueOnce([[]]); // SELECT consulta vacío

            const res = await request(app).post("/historia/formulas").send(body);

            expect(res.statusCode).toBe(404);
            expect(res.body.error).toBe("La consulta seleccionada no existe.");
            expect(pool.query).toHaveBeenCalledTimes(1); // No debe seguir con las demás validaciones
            expect(pool.query.mock.calls[0][1]).toEqual([5]);
        });

        test("debe retornar 404 si el cliente no existe", async () => {
            pool.query
                .mockResolvedValueOnce([[{ id_consulta: 5, id_cliente: 3 }]]) // consulta existe
                .mockResolvedValueOnce([[]]); // cliente no existe

            const res = await request(app).post("/historia/formulas").send(body);

            expect(res.statusCode).toBe(404);
            expect(res.body.error).toBe("El cliente seleccionado no existe.");
            expect(pool.query).toHaveBeenCalledTimes(2); // No debe llegar al INSERT
            expect(pool.query.mock.calls[1][1]).toEqual([3]);
        });

        test("debe retornar 409 si la consulta ya tiene una fórmula registrada", async () => {
            pool.query
                .mockResolvedValueOnce([[{ id_consulta: 5, id_cliente: 3 }]]) // consulta existe
                .mockResolvedValueOnce([[{ id_cliente: 3 }]]) // cliente existe
                .mockResolvedValueOnce([[{ id_formula: 1 }]]); // ya hay fórmula

            const res = await request(app).post("/historia/formulas").send(body);

            expect(res.statusCode).toBe(409);
            expect(res.body.error).toBe("Esta consulta ya tiene una fórmula óptica registrada.");
            expect(pool.query).toHaveBeenCalledTimes(3); // No debe llegar al INSERT
        });

        // ---- Flujos exitosos ----
        test("debe registrar la fórmula y retornar su id", async () => {
            mockFlujoExitoso(3, 12);

            const res = await request(app).post("/historia/formulas").send(body);

            expect(res.statusCode).toBe(201);
            expect(res.body.mensaje).toBe("Fórmula óptica registrada correctamente.");
            expect(res.body.id_formula).toBe(12);
            expect(pool.query).toHaveBeenCalledTimes(4);
            expect(pool.query.mock.calls[3][0]).toContain("INSERT INTO Formula_optica");

            // Verifica los 9 parámetros del INSERT en orden (la fecha la pone CURDATE() en SQL)
            expect(pool.query.mock.calls[3][1]).toEqual([
                5, 3, "-1.25 / -1.00", "-0.50 / -0.75", "90 / 85", "+1.50", "Progresivo", "Permanente", "Control en 6 meses",
            ]);
        });

        test("sin id_cliente debe tomar el cliente de la consulta", async () => {
            const { id_cliente, ...sinCliente } = body;
            mockFlujoExitoso(9, 15); // la consulta pertenece al cliente 9

            const res = await request(app).post("/historia/formulas").send(sinCliente);

            expect(res.statusCode).toBe(201);
            // Se busca y se inserta el cliente de la consulta
            expect(pool.query.mock.calls[1][1]).toEqual([9]);
            expect(pool.query.mock.calls[3][1][1]).toBe(9);
        });

        test("con id_cliente en el cuerpo debe usar ese cliente y no el de la consulta", async () => {
            // Documenta el comportamiento actual: el id_cliente del cuerpo tiene prioridad
            pool.query
                .mockResolvedValueOnce([[{ id_consulta: 5, id_cliente: 3 }]])
                .mockResolvedValueOnce([[{ id_cliente: 8 }]])
                .mockResolvedValueOnce([[]])
                .mockResolvedValueOnce([{ insertId: 16 }]);

            const res = await request(app)
                .post("/historia/formulas")
                .send({ ...body, id_cliente: 8 });

            expect(res.statusCode).toBe(201);
            expect(pool.query.mock.calls[1][1]).toEqual([8]);
            expect(pool.query.mock.calls[3][1][1]).toBe(8);
        });

        test("debe convertir los ids a número con Number() al insertar", async () => {
            mockFlujoExitoso(3, 13);

            const res = await request(app)
                .post("/historia/formulas")
                .send({ ...body, id_consulta: "5", id_cliente: "3" });

            expect(res.statusCode).toBe(201);
            const params = pool.query.mock.calls[3][1];
            expect(params[0]).toBe(5);
            expect(params[1]).toBe(3);
        });

        test("sin adición ni observaciones debe usar los valores por defecto", async () => {
            const { adicion, observaciones, ...sinOpcionales } = body;
            mockFlujoExitoso(3, 14);

            const res = await request(app).post("/historia/formulas").send(sinOpcionales);

            expect(res.statusCode).toBe(201);
            const params = pool.query.mock.calls[3][1];
            expect(params[5]).toBe("Sin adición");
            expect(params[8]).toBe("Sin observaciones");
        });

        // ---- Errores ----
        test("debe capturar error de BD y retornar 500 con el mensaje del error", async () => {
            pool.query.mockRejectedValueOnce(new Error("Fallo"));

            const res = await request(app).post("/historia/formulas").send(body);

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe("Fallo");
        });

        test("debe retornar 500 si falla el INSERT", async () => {
            pool.query
                .mockResolvedValueOnce([[{ id_consulta: 5, id_cliente: 3 }]])
                .mockResolvedValueOnce([[{ id_cliente: 3 }]])
                .mockResolvedValueOnce([[]])
                .mockRejectedValueOnce(new Error("Fallo al insertar"));

            const res = await request(app).post("/historia/formulas").send(body);

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe("Fallo al insertar");
        });
    });

    // =====================================================
    // PUT /formulas/:id
    // =====================================================
    describe("PUT /formulas/:id", () => {
        const body = {
            esfera_ojo_derecho_e_izquierdo: "-2.00 / -1.75",
            cilindro_ojo_derecho_e_izquierdo: "-0.25 / -0.50",
            eje_ojo_derecho_e_izquierdo: "80 / 95",
            adicion: "+2.00",
            tipo_lente: "Bifocal",
            uso: "Lectura",
            observaciones: "Revisar en 1 año",
        };

        const mensajeValidacion = "El tipo de lente y el uso son obligatorios.";

        // ---- Validaciones (no deben tocar la BD) ----
        test("debe rechazar si falta tipo_lente", async () => {
            const { tipo_lente, ...incompleto } = body;

            const res = await request(app).put("/historia/formulas/12").send(incompleto);

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe(mensajeValidacion);
            expect(pool.query).not.toHaveBeenCalled();
        });

        test("debe rechazar si falta uso", async () => {
            const { uso, ...incompleto } = body;

            const res = await request(app).put("/historia/formulas/12").send(incompleto);

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe(mensajeValidacion);
            expect(pool.query).not.toHaveBeenCalled();
        });

        // ---- Flujos ----
        test("debe actualizar la fórmula y confirmar el cambio", async () => {
            pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

            const res = await request(app).put("/historia/formulas/12").send(body);

            expect(res.statusCode).toBe(200);
            expect(res.body.mensaje).toBe("Fórmula óptica actualizada correctamente.");
            expect(pool.query).toHaveBeenCalledTimes(1);

            const [sql, params] = pool.query.mock.calls[0];
            expect(sql).toContain("UPDATE Formula_optica");
            expect(sql).toContain("WHERE id_formula = ?");

            // 7 campos en orden + el id de la URL (llega como texto)
            expect(params).toEqual([
                "-2.00 / -1.75", "-0.25 / -0.50", "80 / 95", "+2.00", "Bifocal", "Lectura", "Revisar en 1 año", "12",
            ]);
        });

        test("sin adición ni observaciones debe usar los valores por defecto", async () => {
            const { adicion, observaciones, ...sinOpcionales } = body;
            pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

            const res = await request(app).put("/historia/formulas/12").send(sinOpcionales);

            expect(res.statusCode).toBe(200);
            const params = pool.query.mock.calls[0][1];
            expect(params[3]).toBe("Sin adición");
            expect(params[6]).toBe("Sin observaciones");
        });

        test("debe retornar 404 si la fórmula no existe", async () => {
            pool.query.mockResolvedValueOnce([{ affectedRows: 0 }]);

            const res = await request(app).put("/historia/formulas/999").send(body);

            expect(res.statusCode).toBe(404);
            expect(res.body.error).toBe("Fórmula óptica no encontrada.");
        });

        // ---- Errores ----
        test("debe capturar error de BD y retornar 500 con el mensaje del error", async () => {
            pool.query.mockRejectedValueOnce(new Error("Fallo al actualizar"));

            const res = await request(app).put("/historia/formulas/12").send(body);

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe("Fallo al actualizar");
        });
    });
});