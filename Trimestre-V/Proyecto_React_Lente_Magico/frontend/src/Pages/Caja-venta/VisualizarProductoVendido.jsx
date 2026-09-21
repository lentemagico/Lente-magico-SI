import React, { useState, useEffect, useCallback } from "react";

const API_URL = "http://localhost:5000/api/productos-vendidos";

function VisualizarProductoVendido() {

  const [productosVendidos, setProductosVendidos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cargar productos vendidos
  const cargarProductosVendidos = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(API_URL);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          data.mensaje ||
          "Error al cargar los productos vendidos"
        );
      }

      // Adaptar la respuesta del backend
      setProductosVendidos(
        data.productosVendidos ||
        data.productos ||
        data
      );

    } catch (err) {
      console.error(
        "Error al cargar productos vendidos:",
        err
      );

      setError(err.message);

    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar al iniciar el componente
  useEffect(() => {
    cargarProductosVendidos();
  }, [cargarProductosVendidos]);

  return (
    <div
      className="d-flex justify-content-center align-items-center"
      style={{ minHeight: "75vh" }}
    >

      <div
        className="card shadow border-0 p-4"
        style={{
          width: "100%",
          maxWidth: "450px"
        }}
      >

        <div className="card-body">

          <h3 className="text-center fw-bold text-primary mb-4">
            Productos Vendidos
          </h3>

          {/* Error */}
          {error && (
            <div className="alert alert-danger">
              {error}
            </div>
          )}

          <div
            className="overflow-auto"
            style={{ maxHeight: "300px" }}
          >

            {/* Cargando */}
            {loading ? (

              <div className="text-center py-4">

                <div
                  className="spinner-border text-primary"
                  role="status"
                >
                  <span className="visually-hidden">
                    Cargando...
                  </span>
                </div>

                <div className="mt-2 text-muted">
                  Cargando productos...
                </div>

              </div>

            ) : productosVendidos.length === 0 ? (

              /* Sin productos */
              <div className="text-center text-muted py-4">
                No se encontraron productos vendidos
              </div>

            ) : (

              /* Lista de productos */
              productosVendidos.map((prod, index) => (

                <div
                  key={prod.id || prod.id_producto || index}
                  className="p-3 bg-dark text-warning rounded text-center mb-3 shadow-sm"
                >

                  {/* Nombre del producto */}
                  <div className="fw-bold fs-6 mb-1 text-white">
                    {prod.nombre ||
                      prod.nombre_producto ||
                      prod.descripcion}
                  </div>

                                   {/* Detalles adicionales */}
                  <div className="d-flex justify-content-between align-items-center mt-2 px-2 small text-muted">

                    <span className="badge bg-warning text-dark fw-bold">
                      $
                      {Number(
                        prod.precio_unitario ||
                        prod.precio ||
                        prod.precio_producto ||
                        0
                      ).toLocaleString("es-CO")}
                    </span>

                    <span className="text-warning font-monospace">
                      {prod.fecha_venta
                        ? new Date(prod.fecha_venta).toLocaleString("es-CO")
                        : prod.hora || prod.hora_venta || ""}
                    </span>

                  </div>

                </div>

              ))

            )}

          </div>

        </div>

      </div>

    </div>
  );
}

export default VisualizarProductoVendido;