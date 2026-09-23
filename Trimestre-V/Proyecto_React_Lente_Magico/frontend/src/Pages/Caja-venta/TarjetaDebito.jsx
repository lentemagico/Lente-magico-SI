import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../config/api";

export default function TarjetaDebito() {
  // Venta activa que se va a pagar
  const [venta, setVenta] = useState(null);
  // Mensaje de error
  const [error, setError] = useState(null);
  // Respuesta del backend tras registrar el pago
  const [resultado, setResultado] = useState(null);
  // Bandera para deshabilitar el botón mientras se procesa el pago
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  // Al montar el componente se recupera la venta activa desde sessionStorage
  useEffect(() => {
    const v = sessionStorage.getItem("ventaActiva");
    if (v) setVenta(JSON.parse(v));
  }, []);

  // Envía el pago con tarjeta débito al backend
  const procesarPago = async () => {
    setError(null);
    setCargando(true);

    try {
      // Backend real: POST /api/pagos/tarjeta-debito -> {id_venta, monto}
      const data = await apiFetch("/pagos/tarjeta-debito", {
        method: "POST",
        body: JSON.stringify({ id_venta: venta.id_venta, monto: venta.total })
      });

      setResultado(data);
      // Se limpia la venta y el cliente activos porque el pago ya quedó registrado
      sessionStorage.removeItem("ventaActiva");
      sessionStorage.removeItem("clienteSeleccionado");

    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  // Si no hay venta activa ni resultado, se muestra una advertencia con atajo para volver a Confirmar Venta
  if (!venta && !resultado) {
    return (
      <div className="container py-4">
        <div className="alert alert-warning">
          No hay ninguna venta activa para pagar.{" "}
          <button className="btn btn-sm btn-primary ms-2" onClick={() => navigate("/caja/confirmar-venta")}>
            Ir a Confirmar Venta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4 d-flex justify-content-center">
      <div className="card shadow p-4" style={{ width: "100%", maxWidth: 480 }}>
        <h4 className="fw-bold text-primary mb-1">Pago con Tarjeta Débito</h4>
        <p className="text-muted small mb-4">Lente Mágico — Caja</p>

        {/* Alerta de error */}
        {error && <div className="alert alert-danger">{error}</div>}

        {/* Resultado: se muestra en vez del formulario tras confirmar el pago */}
        {resultado ? (
          <div className="alert alert-success">
            <p className="mb-1">✅ {resultado.mensaje}</p>
            <button className="btn btn-primary btn-sm mt-2" onClick={() => navigate("/caja/confirmar-venta")}>
              Registrar otra venta
            </button>
          </div>
        ) : (
          <>
            {/* Información de la venta a pagar */}
            <div className="bg-light rounded p-3 mb-3 d-flex justify-content-between">
              <span>Venta #{venta.id_venta}</span>
              <strong>${venta.total.toLocaleString()}</strong>
            </div>

            {/* Botón que dispara el cobro (no hay formulario, es pago directo) */}
            <button className="btn btn-info w-100 fw-bold" onClick={procesarPago} disabled={cargando}>
              {cargando ? "Procesando..." : "Confirmar cobro con tarjeta débito"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}