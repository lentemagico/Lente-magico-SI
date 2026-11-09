// ================== IMPORTS ==================
import { useState } from "react";
import { Link } from "react-router-dom";
import logo from "../../assets/Img/Logo.png";
import "../../Styles/Login.css";

// ================== COMPONENTE PRINCIPAL ==================
function RecuperarContrasena() {
  // ---------- Estados del componente ----------
  const [correo, setCorreo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  // Maneja el envío del formulario: llama a la API de recuperación
  // y muestra el mensaje de éxito (con el código) o el error correspondiente
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Limpia mensajes previos y activa el estado de carga
    setMensaje("");
    setError("");
    setCargando(true);

    try {
      // Envía el correo al backend para iniciar la recuperación de contraseña
      const response = await fetch(
        "http://localhost:5000/api/recuperar/recuperar",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            correo: correo,
          }),
        }
      );

      const data = await response.json();

      // Si la respuesta no es exitosa, lanza el mensaje de error del backend
      if (!response.ok) {
        throw new Error(
          data.error || "No se pudo recuperar la contraseña."
        );
      }

      // Muestra el mensaje de éxito junto con el código recibido, y limpia el input
      setMensaje(
        `${data.mensaje} Código: ${data.codigo}`
      );

      setCorreo("");

    } catch (error) {
      // Si algo falla (validación o red), se muestra el mensaje de error
      console.error("Error:", error);

      setError(
        error.message || "Error de conexión con el servidor."
      );
    } finally {
      // Se desactiva el estado de carga sin importar el resultado
      setCargando(false);
    }
  };

  // ================== RENDER ==================
  return (
    <div className="login-page">

      <div className="caja-login">

        {/* Logo y título del sistema */}
        <div className="titulo-sistema text-center">

          <img
            src={logo}
            alt="Logo Lente Mágico"
            width="90"
          />

          <h1>Lente Mágico</h1>

          <p>Recuperar contraseña</p>

        </div>

        <div className="card shadow">

          <div className="card-body">

            <h4 className="text-center mb-3">
              Recuperar contraseña
            </h4>

            <p className="text-muted text-center">
              Ingresa tu correo electrónico para recuperar
              el acceso a tu cuenta.
            </p>


            {/* Mensaje de error, visible solo si existe */}
            {error && (
              <div className="alert alert-danger text-center">
                {error}
              </div>
            )}

            {/* Mensaje de éxito (incluye el código recibido), visible solo si existe */}
            {mensaje && (
              <div className="alert alert-success text-center">
                {mensaje}
              </div>
            )}

            {/* Formulario de recuperación de contraseña */}
            <form onSubmit={handleSubmit}>

              {/* Campo: correo electrónico */}
              <div className="mb-3">

                <label className="form-label">
                  Correo electrónico
                </label>

                <input
                  type="email"
                  className="form-control"
                  placeholder="Ingrese su correo"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  required
                />

              </div>

              {/* Botón de envío: se deshabilita y cambia de texto mientras carga */}
              <button
                type="submit"
                className="btn btn-primary w-100"
                disabled={cargando}
              >
                {cargando
                  ? "Enviando..."
                  : "Enviar solicitud"}
              </button>

            </form>

            {/* Enlace para volver a la pantalla de login */}
            <div className="recuperar-clave">

              <Link to="/login">
                Volver
              </Link>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

export default RecuperarContrasena;