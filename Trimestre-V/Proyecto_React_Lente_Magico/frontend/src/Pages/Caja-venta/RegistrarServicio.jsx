import React, { useState } from 'react';

// Endpoint del backend para registrar un servicio (URL absoluta apuntando al backend local)
const API_URL = 'http://localhost:5000/api/servicios';

function RegistrarServicio() {

  // Bandera para deshabilitar el botón mientras se envía el formulario
  const [loading, setLoading] = useState(false);
  // Mensaje de error a mostrar
  const [error, setError] = useState(null);
  // Mensaje de éxito a mostrar (se borra solo después de unos segundos)
  const [success, setSuccess] = useState(null);

  // Valida, envía y procesa el registro de un nuevo servicio
  const crearServicio = async (e) => {
    e.preventDefault();

    const form = e.currentTarget;

    // Validación del formulario (usa la validación nativa del navegador)
    if (form.checkValidity() === false) {
      e.stopPropagation();
      return;
    }

    // Lee los valores directamente del formulario por el "name" de cada campo
    const tipo = form.tipoServicio.value;
    const nombre = form.nombreServicio.value;
    const costo = form.costoServicio.value;

    const datosServicio = {
      tipo_servicio: tipo,
      nombre_servicio: nombre,
      costo_servicio: costo
    };

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(datosServicio)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          data.mensaje ||
          'Error al registrar el servicio'
        );
      }

      setSuccess('Servicio registrado exitosamente');

      alert(
        `✓ ¡Servicio registrado con éxito!\n\n` +
        `Tipo: ${tipo}\n` +
        `Nombre: ${nombre}\n` +
        `Costo: $${costo}`
      );

      // Limpiar formulario
      form.reset();

      // Quitar mensaje después de 3 segundos
      setTimeout(() => {
        setSuccess(null);
      }, 3000);

    } catch (err) {
      console.error('Error completo atrapado en Servicios:', err);

      setError(err.message);

      alert(
        `❌ Error al registrar el servicio en la API\n\n` +
        `Detalle técnico: ${err.message}\n\n` +
        `Asegúrate de que tu backend esté corriendo en el puerto 5000.`
      );

      // Quitar el mensaje de error después de 5 segundos
      setTimeout(() => {
        setError(null);
      }, 5000);

    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="d-flex justify-content-center align-items-center"
      style={{ minHeight: "75vh" }}
    >
      <div
        className="card shadow border-0 p-4"
        style={{ width: "100%", maxWidth: "450px" }}
      >
        <div className="card-body">

          <h3 className="text-center fw-bold text-primary mb-4">
            Registrar Servicio
          </h3>

          {/* Mensaje de error */}
          {error && (
            <div className="alert alert-danger">
              {error}
            </div>
          )}

          {/* Mensaje de éxito */}
          {success && (
            <div className="alert alert-success">
              {success}
            </div>
          )}

          <form onSubmit={crearServicio}>

            {/* Seleccionar el Tipo de Servicio */}
            <div className="mb-3">
              <select
                name="tipoServicio"
                className="form-select py-2 text-muted"
                defaultValue=""
                required
                // Mensajes de validación nativos personalizados
                onInvalid={(e) =>
                  e.target.setCustomValidity(
                    "Por favor, rellena este campo."
                  )
                }
                onInput={(e) =>
                  e.target.setCustomValidity("")
                }
              >
                <option value="" disabled hidden>
                  Selecciona el Tipo de Servicio
                </option>

                <option
                  value="Servicio de Venta Óptica"
                  className="text-dark"
                >
                  Servicio de Venta de Productos Ópticos
                </option>

                <option
                  value="Consulta Médica"
                  className="text-dark"
                >
                  Consulta Médica
                </option>
              </select>
            </div>

            {/* Nombre del Servicio */}
            <div className="mb-3">
              <input
                type="text"
                name="nombreServicio"
                className="form-control py-2"
                placeholder="Nombre (Ej: Montura Negra / Examen General)"
                required
                onInvalid={(e) =>
                  e.target.setCustomValidity(
                    "Por favor, rellena este campo."
                  )
                }
                onInput={(e) =>
                  e.target.setCustomValidity("")
                }
              />
            </div>

            {/* Costo del Servicio */}
            <div className="mb-4">
              <input
                type="number"
                name="costoServicio"
                className="form-control py-2"
                placeholder="Costo del Servicio ($)"
                required
                onInvalid={(e) =>
                  e.target.setCustomValidity(
                    "Por favor, rellena este campo."
                  )
                }
                onInput={(e) =>
                  e.target.setCustomValidity("")
                }
              />
            </div>

            {/* Botón de acción */}
            <button
              type="submit"
              className="btn btn-warning text-dark w-100 fw-bold py-2 shadow-sm"
              disabled={loading}
            >
              {loading ? 'Registrando...' : 'Registrar Servicio'}
            </button>

          </form>

        </div>
      </div>
    </div>
  );
}

export default RegistrarServicio;