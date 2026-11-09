import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../config/api";

export default function TarjetaCredito() {
  // Venta activa que se va a pagar
  const [venta, setVenta] = useState(null);
  // Mensaje de error
  const [error, setError] = useState(null);
  // Respuesta del backend tras registrar el pago
  const [resultado, setResultado] = useState(null);
  // Bandera para deshabilitar el botón mientras se procesa el pago
  const [cargando, setCargando] = useState(false);

  // Cuotas
  // Número de cuotas elegido para el pago
  const [cuotas, setCuotas] = useState("1");

  // Factura
  // Si se debe generar factura al confirmar el pago
  const [generarFactura, setGenerarFactura] = useState(true);

  const navigate = useNavigate();

  // =====================================================
  // CARGAR VENTA ACTIVA
  // =====================================================

  // Al montar el componente se recupera la venta activa desde sessionStorage
  useEffect(() => {
    const v = sessionStorage.getItem("ventaActiva");

    if (v) {
      try {
        setVenta(JSON.parse(v));
      } catch (error) {
        console.error(
          "Error cargando venta:",
          error
        );
      }
    }
  }, []);

  // =====================================================
  // PROCESAR PAGO
  // =====================================================

  // Valida y envía el pago con tarjeta de crédito al backend
  const procesarPago = async () => {
    setError(null);

    if (!venta) {
      setError(
        "No hay una venta activa para pagar."
      );
      return;
    }

    if (!cuotas) {
      setError(
        "Por favor selecciona el número de cuotas."
      );
      return;
    }

    setCargando(true);

    try {

      // =================================================
      // ENVIAR PAGO AL BACKEND
      // =================================================

      const data = await apiFetch(
        "/pagos/tarjeta-credito",
        {
          method: "POST",

          body: JSON.stringify({
            id_venta: venta.id_venta,

            monto: Number(
              venta.total
            ),

            cuotas: Number(
              cuotas
            ),

            // NUEVO
            generar_factura:
              generarFactura
          })
        }
      );


      // =================================================
      // GUARDAR RESPUESTA
      // =================================================

      setResultado(data);


      // =================================================
      // LIMPIAR VENTA ACTIVA
      // =================================================

      sessionStorage.removeItem(
        "ventaActiva"
      );

      sessionStorage.removeItem(
        "clienteSeleccionado"
      );


    } catch (err) {

      console.error(
        "Error procesando pago:",
        err
      );

      setError(
        err.message
      );

    } finally {

      setCargando(false);

    }
  };


  // =====================================================
  // SI NO HAY VENTA: se muestra una advertencia con atajo para volver a Confirmar Venta
  // =====================================================

  if (!venta && !resultado) {

    return (
      <div className="container py-4">

        <div className="alert alert-warning">

          No hay ninguna venta activa para pagar.

          <button
            className="btn btn-sm btn-primary ms-2"
            onClick={() =>
              navigate(
                "/caja/confirmar-venta"
              )
            }
          >
            Ir a Confirmar Venta
          </button>

        </div>

      </div>
    );
  }


  // =====================================================
  // INTERFAZ
  // =====================================================

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
          Pago con Tarjeta de Crédito
        </h4>

        <p className="text-muted small mb-4">
          Lente Mágico — Caja
        </p>


        {/* =================================================
            ERROR
        ================================================= */}

        {error && (

          <div className="alert alert-danger">
            {error}
          </div>

        )}


        {/* =================================================
            RESULTADO: se muestra en vez del formulario tras confirmar el pago
        ================================================= */}

        {resultado ? (

          <div className="alert alert-success">

            <p className="mb-2">
              ✅ {resultado.mensaje}
            </p>


            {resultado.cuotas && (

              <p className="mb-2">
                Número de cuotas:{" "}
                <strong>
                  {resultado.cuotas}
                </strong>
              </p>

            )}


            {/* =============================================
                FACTURA GENERADA
            ============================================= */}

            {resultado.factura_generada && (

              <div className="alert alert-info mt-3 mb-2">

                🧾 <strong>
                  Factura generada
                </strong>

                <br />

                Número de factura:

                <strong className="ms-1">
                  {resultado.num_factura}
                </strong>

              </div>

            )}


            {!resultado.factura_generada && (

              <p className="small text-muted">
                No se solicitó factura para este pago.
              </p>

            )}


            <button
              className="btn btn-primary btn-sm mt-2"
              onClick={() =>
                navigate(
                  "/caja/confirmar-venta"
                )
              }
            >
              Registrar otra venta
            </button>

          </div>

        ) : (

          <>

            {/* =================================================
                INFORMACIÓN DE LA VENTA
            ================================================= */}

            <div className="bg-light rounded p-3 mb-3 d-flex justify-content-between">

              <span>
                Venta #{venta.id_venta}
              </span>

              <strong>
                $
                {Number(
                  venta.total
                ).toLocaleString()}
              </strong>

            </div>


            {/* =================================================
                CUOTAS
            ================================================= */}

            <div className="mb-4">

              <label
                htmlFor="cuotas"
                className="form-label fw-bold"
              >
                ¿A cuántas cuotas desea realizar el pago?
              </label>


              <select
                id="cuotas"
                className="form-select"
                value={cuotas}
                onChange={(e) =>
                  setCuotas(
                    e.target.value
                  )
                }
                disabled={cargando}
              >

                <option value="1">
                  1 cuota
                </option>

                <option value="3">
                  3 cuotas
                </option>

                <option value="6">
                  6 cuotas
                </option>

                <option value="12">
                  12 cuotas
                </option>

                <option value="18">
                  18 cuotas
                </option>

                <option value="24">
                  24 cuotas
                </option>

              </select>


              <small className="text-muted">
                Seleccione el número de cuotas
                para financiar esta compra.
              </small>

            </div>


            {/* =================================================
                RESUMEN
            ================================================= */}

            <div className="border rounded p-3 mb-3">

              <div className="d-flex justify-content-between">

                <span>
                  Total de la compra:
                </span>

                <strong>
                  $
                  {Number(
                    venta.total
                  ).toLocaleString()}
                </strong>

              </div>


              <div className="d-flex justify-content-between mt-2">

                <span>
                  Cuotas:
                </span>

                <strong>
                  {cuotas}{" "}
                  {Number(cuotas) === 1
                    ? "cuota"
                    : "cuotas"}
                </strong>

              </div>

            </div>


            {/* =================================================
                FACTURA
            ================================================= */}

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
                La factura se registrará en la base
                de datos al confirmar el pago.
              </small>

            </div>


            {/* =================================================
                BOTÓN
            ================================================= */}

            <button
              className="btn btn-info w-100 fw-bold"
              onClick={procesarPago}
              disabled={cargando}
            >

              {cargando
                ? "Procesando..."
                : "Confirmar cobro con tarjeta de crédito"}

            </button>

          </>

        )}

      </div>

    </div>
  );
}