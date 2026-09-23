import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../config/api";

export default function Plataformas() {
  // Venta activa que se va a pagar (se lee de sessionStorage)
  const [venta, setVenta] = useState(null);

  // Plataforma elegida: "Nequi", "Daviplata", "PSE" u "Otros"
  const [plataformaSeleccionada, setPlataformaSeleccionada] =
    useState("");

  // Nombre escrito a mano cuando la plataforma elegida es "Otros"
  const [otroNombre, setOtroNombre] = useState("");
  // Número o referencia de la transacción
  const [numero, setNumero] = useState("");
  // Valor pagado (se precarga con el total de la venta)
  const [valor, setValor] = useState("");

  // Factura
  // Si se debe generar factura al confirmar el pago
  const [generarFactura, setGenerarFactura] = useState(true);

  // Mensaje de error
  const [error, setError] = useState(null);
  // Respuesta del backend tras registrar el pago
  const [resultado, setResultado] = useState(null);
  // Bandera para deshabilitar el formulario mientras se procesa el pago
  const [cargando, setCargando] = useState(false);

  const navigate = useNavigate();

  // =====================================================
  // CARGAR VENTA ACTIVA
  // =====================================================

  // Al montar el componente se recupera la venta activa y se precarga el valor a pagar con su total
  useEffect(() => {
    const ventaGuardada = sessionStorage.getItem("ventaActiva");

    if (ventaGuardada) {
      try {
        const ventaData = JSON.parse(ventaGuardada);

        setVenta(ventaData);

        if (ventaData.total != null) {
          setValor(ventaData.total);
        }
      } catch (error) {
        console.error("Error leyendo venta activa:", error);
        setError("No se pudo cargar la venta activa.");
      }
    }
  }, []);

  // =====================================================
  // SELECCIONAR PLATAFORMA
  // =====================================================

  // Cambia la plataforma activa y limpia los campos que dependían de la selección anterior
  const seleccionarPlataforma = (plataforma) => {
    setPlataformaSeleccionada(plataforma);
    setError(null);

    if (plataforma !== "Otros") {
      setOtroNombre("");
    }

    // Limpiar número al cambiar de plataforma
    setNumero("");
  };

  // =====================================================
  // PROCESAR PAGO
  // =====================================================

  // Valida todos los campos y envía el pago por plataforma al backend
  const procesarPago = async (e) => {
    e.preventDefault();

    setError(null);

    // Validar venta
    if (!venta) {
      setError(
        "No hay una venta activa. Vuelve a Confirmar Venta."
      );
      return;
    }

    // Validar plataforma
    if (!plataformaSeleccionada) {
      setError(
        "Por favor selecciona una plataforma de pago."
      );
      return;
    }

    // Validar nombre de Otros
    if (
      plataformaSeleccionada === "Otros" &&
      !otroNombre.trim()
    ) {
      setError(
        "Por favor escribe el nombre de la plataforma."
      );
      return;
    }

    // Validar número o referencia
    if (!numero.trim()) {
      setError(
        "Por favor ingresa el número o referencia del pago."
      );
      return;
    }

    // Validar valor
    if (!valor || Number(valor) <= 0) {
      setError(
        "Por favor ingresa un valor válido."
      );
      return;
    }

    // Validar que el valor sea igual al total
    if (Number(valor) !== Number(venta.total)) {
      setError(
        `El valor del pago debe ser igual al total de la venta: $${Number(
          venta.total
        ).toLocaleString()}.`
      );
      return;
    }

    setCargando(true);

    try {
      // Nombre que se guardará en Pago.metodo_pago
      const nombrePlataforma =
        plataformaSeleccionada === "Otros"
          ? otroNombre.trim()
          : plataformaSeleccionada;

      // =================================================
      // REGISTRAR PAGO
      // IMPORTANTE:
      // La ruta correcta es /pagos/plataformas
      // =================================================

      const data = await apiFetch(
        "/pagos/plataformas",
        {
          method: "POST",

          body: JSON.stringify({
            id_venta: venta.id_venta,
            monto: Number(valor),
            plataforma: nombrePlataforma,
            numero: numero.trim(),
            generar_factura: generarFactura
          })
        }
      );

      // Guardar respuesta del backend
      setResultado(data);

      // Limpiar venta activa solamente después
      // de que el backend confirme el pago
      sessionStorage.removeItem("ventaActiva");
      sessionStorage.removeItem("clienteSeleccionado");

    } catch (err) {
      console.error("Error registrando pago:", err);
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  // =====================================================
  // NO HAY VENTA: se muestra una advertencia con atajo para volver a Confirmar Venta
  // =====================================================

  if (!venta && !resultado) {
    return (
      <div className="container py-4">

        <div className="alert alert-warning">
          <strong>No hay ninguna venta activa para pagar.</strong>

          <button
            className="btn btn-sm btn-primary ms-2"
            onClick={() =>
              navigate("/caja/confirmar-venta")
            }
          >
            Ir a Confirmar Venta
          </button>
        </div>

      </div>
    );
  }

  return (
    <div className="container py-4">

      <div
        className="card shadow p-4 mx-auto"
        style={{
          width: "100%",
          maxWidth: "800px"
        }}
      >

        {/* ================================================= */}
        {/* TÍTULO */}
        {/* ================================================= */}

        <h3 className="fw-bold text-primary text-center mb-1">
          Plataformas de Pago
        </h3>

        <p className="text-muted small text-center mb-4">
          Selecciona la plataforma utilizada para realizar el pago.
        </p>

        {/* ================================================= */}
        {/* ERROR */}
        {/* ================================================= */}

        {error && (
          <div className="alert alert-danger">
            {error}
          </div>
        )}

        {/* ================================================= */}
        {/* RESULTADO DEL PAGO: reemplaza al formulario una vez el pago fue confirmado */}
        {/* ================================================= */}

        {resultado ? (

          <div className="alert alert-success">

            <h5 className="fw-bold">
              ✅ Pago registrado correctamente
            </h5>

            <p className="mb-2">
              {resultado.mensaje ||
                "El pago fue registrado correctamente."}
            </p>

            <hr />

            <p className="mb-1">
              <strong>Venta:</strong>{" "}
              #{resultado.id_venta}
            </p>

            <p className="mb-1">
              <strong>Plataforma:</strong>{" "}
              {resultado.plataforma}
            </p>

            <p className="mb-1">
              <strong>Valor:</strong>{" "}
              $
              {Number(
                resultado.monto
              ).toLocaleString()}
            </p>

            {/* ================================================= */}
            {/* FACTURA GENERADA */}
            {/* ================================================= */}

            {resultado.factura_generada && (
              <div className="bg-white border rounded p-3 mt-3">

                <p className="mb-1 fw-bold">
                  🧾 Factura generada correctamente
                </p>

                <p className="mb-0">
                  Número de factura:
                  <strong className="ms-2 text-primary">
                    {resultado.num_factura}
                  </strong>
                </p>

                <small className="text-muted">
                  La factura fue registrada en la base de datos.
                </small>

              </div>
            )}

            {!resultado.factura_generada && (
              <div className="alert alert-warning mt-3 mb-0">
                No se generó factura para este pago.
              </div>
            )}

            {/* ================================================= */}
            {/* NUEVA VENTA */}
            {/* ================================================= */}

            <button
              className="btn btn-primary mt-3"
              onClick={() =>
                navigate("/caja/confirmar-venta")
              }
            >
              Registrar otra venta
            </button>

          </div>

        ) : (

          <form onSubmit={procesarPago}>

            {/* ================================================= */}
            {/* INFORMACIÓN DE LA VENTA */}
            {/* ================================================= */}

            {venta && (
              <div className="bg-light rounded p-3 mb-4">

                <div className="d-flex justify-content-between align-items-center">

                  <span>
                    Venta #{venta.id_venta}
                  </span>

                  <strong className="text-primary">
                    $
                    {Number(
                      venta.total
                    ).toLocaleString()}
                  </strong>

                </div>

              </div>
            )}

            {/* ================================================= */}
            {/* PLATAFORMAS - UNA SOLA FILA */}
            {/* Cada plataforma es un botón-tarjeta que llama a seleccionarPlataforma(); */}
            {/* la tarjeta activa se resalta con un borde azul comparando contra plataformaSeleccionada */}
            {/* ================================================= */}

            <h5 className="fw-bold text-center mb-3">
              Selecciona una plataforma
            </h5>

            <div
              className="row g-3 mb-4"
              style={{
                display: "flex",
                flexWrap: "nowrap"
              }}
            >

              {/* ================================================= */}
              {/* NEQUI */}
              {/* ================================================= */}

              <div className="col-3">

                <button
                  type="button"
                  className={`card w-100 h-100 ${plataformaSeleccionada === "Nequi"
                      ? "border-primary border-3"
                      : ""
                    }`}
                  onClick={() =>
                    seleccionarPlataforma("Nequi")
                  }
                  disabled={cargando}
                  style={{
                    cursor: "pointer",
                    background: "white"
                  }}
                >

                  <div className="card-body text-center p-3">

                    <div
                      style={{
                        fontSize: "35px",
                        marginBottom: "8px"
                      }}
                    >
                      📱
                    </div>

                    <h6 className="fw-bold text-primary mb-1">
                      Nequi
                    </h6>

                    <small className="text-muted">
                      Pago con Nequi
                    </small>

                  </div>

                </button>

              </div>

              {/* ================================================= */}
              {/* DAVIPLATA */}
              {/* ================================================= */}

              <div className="col-3">

                <button
                  type="button"
                  className={`card w-100 h-100 ${plataformaSeleccionada === "Daviplata"
                      ? "border-primary border-3"
                      : ""
                    }`}
                  onClick={() =>
                    seleccionarPlataforma("Daviplata")
                  }
                  disabled={cargando}
                  style={{
                    cursor: "pointer",
                    background: "white"
                  }}
                >

                  <div className="card-body text-center p-3">

                    <div
                      style={{
                        fontSize: "35px",
                        marginBottom: "8px"
                      }}
                    >
                      💳
                    </div>

                    <h6 className="fw-bold text-primary mb-1">
                      Daviplata
                    </h6>

                    <small className="text-muted">
                      Pago con Daviplata
                    </small>

                  </div>

                </button>

              </div>

              {/* ================================================= */}
              {/* PSE */}
              {/* ================================================= */}

              <div className="col-3">

                <button
                  type="button"
                  className={`card w-100 h-100 ${plataformaSeleccionada === "PSE"
                      ? "border-primary border-3"
                      : ""
                    }`}
                  onClick={() =>
                    seleccionarPlataforma("PSE")
                  }
                  disabled={cargando}
                  style={{
                    cursor: "pointer",
                    background: "white"
                  }}
                >

                  <div className="card-body text-center p-3">

                    <div
                      style={{
                        fontSize: "35px",
                        marginBottom: "8px"
                      }}
                    >
                      🏦
                    </div>

                    <h6 className="fw-bold text-primary mb-1">
                      PSE
                    </h6>

                    <small className="text-muted">
                      Pago por PSE
                    </small>

                  </div>

                </button>

              </div>

              {/* ================================================= */}
              {/* OTROS */}
              {/* ================================================= */}

              <div className="col-3">

                <button
                  type="button"
                  className={`card w-100 h-100 ${plataformaSeleccionada === "Otros"
                      ? "border-primary border-3"
                      : ""
                    }`}
                  onClick={() =>
                    seleccionarPlataforma("Otros")
                  }
                  disabled={cargando}
                  style={{
                    cursor: "pointer",
                    background: "white"
                  }}
                >

                  <div className="card-body text-center p-3">

                    <div
                      style={{
                        fontSize: "35px",
                        marginBottom: "8px"
                      }}
                    >
                      💰
                    </div>

                    <h6 className="fw-bold text-primary mb-1">
                      Otros
                    </h6>

                    <small className="text-muted">
                      Otro método
                    </small>

                  </div>

                </button>

              </div>

            </div>

            {/* ================================================= */}
            {/* INFORMACIÓN DE OTROS: campo extra que solo aparece si se eligió "Otros" */}
            {/* ================================================= */}

            {plataformaSeleccionada === "Otros" && (

              <div className="border rounded p-3 mb-3">

                <h5 className="fw-bold mb-3">
                  Información del pago
                </h5>

                <label className="form-label fw-bold">
                  Nombre de la plataforma
                </label>

                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: Bancolombia, Transfiya..."
                  value={otroNombre}
                  onChange={(e) =>
                    setOtroNombre(e.target.value)
                  }
                  disabled={cargando}
                />

              </div>

            )}

            {/* ================================================= */}
            {/* DATOS DEL PAGO: número/referencia y valor, visibles solo tras elegir plataforma */}
            {/* ================================================= */}

            {plataformaSeleccionada && (

              <div className="border rounded p-3 mb-3">

                <h5 className="fw-bold mb-3 text-center">

                  Datos del pago con{" "}

                  {plataformaSeleccionada === "Otros"
                    ? otroNombre || "Otros"
                    : plataformaSeleccionada}

                </h5>

                {/* ================================================= */}
                {/* NÚMERO */}
                {/* ================================================= */}

                <div className="mb-3">

                  <label className="form-label fw-bold">
                    Número o referencia del pago
                  </label>

                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ingrese el número o referencia"
                    value={numero}
                    onChange={(e) =>
                      setNumero(e.target.value)
                    }
                    disabled={cargando}
                    required
                  />

                </div>

                {/* ================================================= */}
                {/* VALOR */}
                {/* ================================================= */}

                <div className="mb-3">

                  <label className="form-label fw-bold">
                    Valor pagado
                  </label>

                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    value={valor}
                    onChange={(e) =>
                      setValor(e.target.value)
                    }
                    disabled={cargando}
                    required
                  />

                  <small className="text-muted">
                    El valor debe coincidir con el total de la venta.
                  </small>

                </div>

              </div>

            )}

            {/* ================================================= */}
            {/* FACTURA: checkbox para decidir si se genera factura al confirmar */}
            {/* ================================================= */}

            {plataformaSeleccionada && (

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
                  La factura se registrará en la tabla
                  <strong> factura </strong>
                  de la base de datos al confirmar el pago.
                </small>

              </div>

            )}

            {/* ================================================= */}
            {/* BOTÓN CONFIRMAR */}
            {/* ================================================= */}

            {plataformaSeleccionada && (

              <button
                type="submit"
                className="btn btn-primary w-100 fw-bold"
                disabled={cargando}
              >

                {cargando
                  ? "Registrando pago..."
                  : "Confirmar pago"}

              </button>

            )}

          </form>

        )}

      </div>

    </div>
  );
}