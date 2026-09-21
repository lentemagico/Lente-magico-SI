import React, { useState } from "react";

const API_URL = "/api/precio-producto";

function PrecioCadaProducto() {
  const [catalogoPrecios, setCatalogoPrecios] = useState([]);

  const [formData, setFormData] = useState({
    nombre: "",
    codigo: "",
    precio: ""
  });

  const [cargando, setCargando] = useState(false);

  // ==========================================
  // MANEJAR CAMBIOS DEL FORMULARIO
  // ==========================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  // ==========================================
  // GUARDAR PRECIO
  // ==========================================

  const guardarPrecio = async (e) => {
    e.preventDefault();

    // Validar precio
    const precio = parseFloat(formData.precio);

    if (isNaN(precio) || precio <= 0) {
      alert("El precio debe ser mayor a 0.");
      return;
    }

    // ==========================================
    // DATOS PARA EL BACKEND
    // ==========================================

    const nuevoProducto = {
      nombre: formData.nombre,
      codigo: formData.codigo,
      precio: precio
    };

    try {
      setCargando(true);

      // ========================================
      // ENVIAR DATOS CON FETCH
      // ========================================

      const response = await fetch(API_URL, {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify(nuevoProducto)
      });

      // Intentar obtener respuesta JSON
      const resultado = await response.json().catch(() => ({}));

      // ========================================
      // VALIDAR RESPUESTA
      // ========================================

      if (!response.ok) {
        throw new Error(
          resultado.mensaje ||
          resultado.error ||
          "No fue posible guardar el precio."
        );
      }

      // ========================================
      // PRODUCTO PARA MOSTRAR EN LA LISTA
      // ========================================

      const productoGuardado = {
        id: resultado.id || Date.now(),
        nombre: formData.nombre,
        codigo: formData.codigo,
        precio: precio
      };

      setCatalogoPrecios((prev) => [
        productoGuardado,
        ...prev
      ]);

      // ========================================
      // MENSAJE DE CONFIRMACIÓN
      // ========================================

      alert(
        `✓ Precio registrado correctamente.\n\n` +
        `Producto: ${formData.nombre}\n` +
        `Código: ${formData.codigo}\n` +
        `Precio: $${precio.toLocaleString()} COP`
      );

      // ========================================
      // LIMPIAR FORMULARIO
      // ========================================

      setFormData({
        nombre: "",
        codigo: "",
        precio: ""
      });

    } catch (error) {

      console.error(
        "Error al guardar el precio:",
        error
      );

      alert(
        `❌ Error al guardar el precio.\n\n` +
        `Detalle: ${error.message}\n\n` +
        `Verifica que el backend esté funcionando.`
      );

    } finally {
      setCargando(false);
    }
  };

  // ==========================================
  // RENDERIZADO
  // ==========================================

  return (
    <div className="container py-4">

      {/* ======================================
          FORMULARIO
      ====================================== */}

      <div className="d-flex justify-content-center align-items-center">

        <div
          className="card shadow border-0 p-4"
          style={{
            width: "100%",
            maxWidth: "450px"
          }}
        >

          <div className="card-body">

            <h3 className="text-center fw-bold text-primary mb-2">
              Precios de Productos
            </h3>

            <p className="text-muted text-center small mb-4">
              Registra los valores unitarios de los productos
              de la óptica Lente Mágico
            </p>

            <form onSubmit={guardarPrecio}>

              {/* ==================================
                  NOMBRE
              ================================== */}

              <div className="mb-3">

                <label className="small fw-bold text-muted mb-1">
                  Nombre del Producto
                </label>

                <input
                  type="text"
                  name="nombre"
                  placeholder="Ej: Lentes Fotocromáticos"
                  className="form-control py-2"
                  value={formData.nombre}
                  onChange={handleChange}
                  required
                  onInvalid={(e) =>
                    e.target.setCustomValidity(
                      "Por favor, ingresa el nombre del producto."
                    )
                  }
                  onInput={(e) =>
                    e.target.setCustomValidity("")
                  }
                />

              </div>

              {/* ==================================
                  CÓDIGO
              ================================== */}

              <div className="mb-3">

                <label className="small fw-bold text-muted mb-1">
                  Código del Producto
                </label>

                <input
                  type="text"
                  name="codigo"
                  placeholder="Ej: OPT-001"
                  className="form-control py-2"
                  value={formData.codigo}
                  onChange={handleChange}
                  required
                  onInvalid={(e) =>
                    e.target.setCustomValidity(
                      "Por favor, ingresa el código del producto."
                    )
                  }
                  onInput={(e) =>
                    e.target.setCustomValidity("")
                  }
                />

              </div>

              {/* ==================================
                  PRECIO
              ================================== */}

              <div className="mb-4">

                <label className="small fw-bold text-muted mb-1">
                  Valor del Producto ($)
                </label>

                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="precio"
                  placeholder="Ej: 210000"
                  className="form-control py-2"
                  value={formData.precio}
                  onChange={handleChange}
                  required
                  onInvalid={(e) =>
                    e.target.setCustomValidity(
                      "Por favor, ingresa el valor del producto."
                    )
                  }
                  onInput={(e) =>
                    e.target.setCustomValidity("")
                  }
                />

              </div>

              {/* ==================================
                  BOTÓN
              ================================== */}

              <button
                type="submit"
                className="btn btn-primary w-100 fw-bold py-2 shadow-sm"
                disabled={cargando}
              >

                {cargando ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                    />

                    Guardando precio...
                  </>
                ) : (
                  "Guardar Precio"
                )}

              </button>

            </form>

          </div>

        </div>

      </div>

      {/* ======================================
          LISTA DE PRECIOS
      ====================================== */}

      {catalogoPrecios.length > 0 && (

        <div className="d-flex justify-content-center mt-4">

          <div
            className="card shadow border-0 p-3"
            style={{
              width: "100%",
              maxWidth: "450px"
            }}
          >

            <h5 className="fw-bold text-secondary mb-3 text-center">
              Catálogo de Precios Guardados
            </h5>

            <div
              className="overflow-auto"
              style={{
                maxHeight: "280px"
              }}
            >

              {catalogoPrecios.map((prod) => (

                <div
                  key={prod.id}
                  className="p-3 bg-light rounded border mb-2 d-flex justify-content-between align-items-center shadow-sm"
                >

                  <div className="text-start me-2">

                    <span className="d-block fw-bold text-dark small">
                      {prod.nombre}
                    </span>

                    <span
                      className="badge bg-secondary text-white"
                      style={{
                        fontSize: "10px"
                      }}
                    >
                      {prod.codigo}
                    </span>

                  </div>

                  <div className="text-end font-monospace text-success fw-bold fs-5">
                    ${prod.precio.toLocaleString()} COP
                  </div>

                </div>

              ))}

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default PrecioCadaProducto;