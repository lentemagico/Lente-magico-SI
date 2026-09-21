import { useState } from "react";
import { Link } from "react-router-dom";
import logo from "../../assets/Img/Logo.png";
import "../../Styles/Login.css";

function RecuperarContrasena() {
  const [correo, setCorreo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMensaje("");
    setError("");
    setCargando(true);

    try {
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

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudo recuperar la contraseña."
        );
      }

      setMensaje(
        `${data.mensaje} Código: ${data.codigo}`
      );

      setCorreo("");

    } catch (error) {
      console.error("Error:", error);

      setError(
        error.message || "Error de conexión con el servidor."
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-page">

      <div className="caja-login">

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

       
            {error && (
              <div className="alert alert-danger text-center">
                {error}
              </div>
            )}

            {mensaje && (
              <div className="alert alert-success text-center">
                {mensaje}
              </div>
            )}

            <form onSubmit={handleSubmit}>

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