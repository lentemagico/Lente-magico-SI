import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../config/api";

export default function Efectivo() {
  const [venta, setVenta] = useState(null);
  const [recibido, setRecibido] = useState("");
  const [generarFactura, setGenerarFactura] = useState(true);

  const [error, setError] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const v = sessionStorage.getItem("ventaActiva");

    if (v) {
      setVenta(JSON.parse(v));
    }
  }, []);

  const montoRecibido = Number(recibido) || 0;

  const diferencia = venta
    ? montoRecibido - Number(venta.total)
    : 0;

  const procesarPago = async (e) => {
    e.preventDefault();

    setError(null);

    if (!venta) {
      setError(
        "No hay una venta activa. Vuelve a Confirmar Venta."
      );
      return;
    }

    if (montoRecibido < Number(venta.total)) {
      setError(
        `El dinero recibido no es suficiente. Faltan $${(
          Number(venta.total) - montoRecibido
        ).toLocaleString()}.`
      );
      return;
    }

    setCargando(true);

    try {
      /*
       * Registramos el pago.
       *
       * El backend debe:
       * 1. Registrar el pago.
       * 2. Obtener el id_pago.
       * 3. Si generar_factura === true,
       *    registrar la factura en la tabla facturas.
       */
      const data = await apiFetch("/pagos/efectivo", {
        method: "POST",

        body: JSON.stringify({
          id_venta: venta.id_venta,
          monto: Number(venta.total),
          monto_recibido: montoRecibido,

          // Indica al backend si debe crear la factura
          generar_factura: generarFactura
        })
      });

      setResultado(data);

      sessionStorage.removeItem("ventaActiva");
      sessionStorage.removeItem("clienteSeleccionado");

    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  if (!venta && !resultado) {
    return (
      <div className="container py-4">
        <div className="alert alert-warning">
          No hay ninguna venta activa para pagar.

          <button
            className="btn btn-sm btn-primary ms-2"
            onClick={() => navigate("/caja/confirmar-venta")}
          >
            Ir a Confirmar Venta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4 d-flex justify-content-center">

      <div
        className="card shadow p-4"
        style={{
          width: "100%",
          maxWidth: 480
        }}
      >

        <h4 className="fw-bold text-primary mb-1">
          Pago en Efectivo
        </h4>

        <p className="text-muted small mb-4">
          Lente Mágico — Caja
        </p>

        {/* ERROR */}
        {error && (
          <div className="alert alert-danger">
            {error}
          </div>
        )}

        {/* RESULTADO */}
        {resultado ? (

          <div className="alert alert-success">

            <h5 className="fw-bold">
              ✅ Pago confirmado
            </h5>

            <p className="mb-1">
              {resultado.mensaje ||
                "El pago fue registrado correctamente."}
            </p>

            <p className="mb-1">
              Cambio a entregar:{" "}
              <strong>
                $
                {Number(
                  resultado.cambio || diferencia
                ).toLocaleString()}
              </strong>
            </p>

            {/* INFORMACIÓN DE FACTURA */}
            {generarFactura && (
              <div className="mt-3 p-3 bg-white border rounded">

                <p className="mb-1 fw-bold">
                  🧾 Factura
                </p>

                {resultado.num_factura ? (
                  <p className="mb-0">
                    Número de factura:{" "}
                    <strong>
                      {resultado.num_factura}
                    </strong>
                  </p>
                ) : (
                  <p className="text-muted mb-0">
                    La factura fue solicitada.
                  </p>
                )}

              </div>
            )}

            <button
              className="btn btn-primary btn-sm mt-3"
              onClick={() =>
                navigate("/caja/confirmar-venta")
              }
            >
              Registrar otra venta
            </button>

          </div>

        ) : (

          <form onSubmit={procesarPago}>

            {/* INFORMACIÓN DE LA VENTA */}
            <div className="bg-light rounded p-3 mb-3 d-flex justify-content-between">

              <span>
                Venta #{venta.id_venta}
              </span>

              <strong>
                $
                {Number(venta.total).toLocaleString()}
              </strong>

            </div>

            {/* EFECTIVO RECIBIDO */}
            <label className="form-label small fw-bold">
              Efectivo recibido
            </label>

            <input
              type="number"
              min="0"
              className="form-control form-control-lg mb-3"
              value={recibido}
              onChange={(e) =>
                setRecibido(e.target.value)
              }
              disabled={cargando}
              required
            />

            {/* CAMBIO */}
            {recibido !== "" && (
              <div
                className={`alert ${
                  diferencia < 0
                    ? "alert-danger"
                    : "alert-info"
                } py-2`}
              >

                {diferencia < 0
                  ? `Faltan $${Math.abs(
                      diferencia
                    ).toLocaleString()}`
                  : `Cambio: $${diferencia.toLocaleString()}`}

              </div>
            )}

            {/* FACTURA */}
            <div className="border rounded p-3 mb-3">

              <div className="form-check">

                <input
                  className="form-check-input"
                  type="checkbox"
                  id="generarFactura"
                  checked={generarFactura}
                  onChange={(e) =>
                    setGenerarFactura(
                      e.target.checked
                    )
                  }
                  disabled={cargando}
                />

                <label
                  className="form-check-label fw-bold"
                  htmlFor="generarFactura"
                >
                  🧾 Generar factura
                </label>

              </div>

              <small className="text-muted">
                La factura será registrada en la base
                de datos al confirmar el pago.
              </small>

            </div>

            {/* BOTÓN */}
            <button
              type="submit"
              className="btn btn-warning w-100 fw-bold"
              disabled={cargando}
            >
              {cargando
                ? "Procesando..."
                : "Confirmar pago"}
            </button>

          </form>
        )}

      </div>

    </div>
  );
}