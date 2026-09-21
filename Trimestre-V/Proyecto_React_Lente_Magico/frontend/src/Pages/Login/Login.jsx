import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import imagen from "../../assets/Img/Logo.png";
import "../../Styles/Login.css";

const API_URL = "http://localhost:5000/api";

function Login() {
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const navigate = useNavigate();

  const manejarIngresar = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          correo,
          contrasena, 
        }),
      });

      const respuesta = await res.json();

      if (!res.ok) {
        throw new Error(
          respuesta.mensaje || "Correo electrónico o contraseña incorrectos."
        );
      }

      const { usuario } = respuesta;

      localStorage.setItem(
        "usuario_logueado",
        JSON.stringify({
          id: usuario.id,
          nombre: usuario.nombre,
          correo: usuario.correo,
          rol: usuario.rol,
          id_autorizacion: usuario.id_autorizacion,
        })
      );

      alert(`¡Bienvenido al sistema, ${usuario.nombre}!`);

      navigate("/");
    } catch (error) {
      console.error("Error en el login:", error);
      setErrorMsg(error.message || "Error de conexión con el servidor.");
    }
  };

  return (
    <div className="container">
      <div className="caja-login mx-auto" style={{ marginTop: "8%" }}>
        <h2 className="text-center titulo-sistema">
          <img src={imagen} width="60" height="60" alt="Logo Lente Mágico" />
          <br />
          Lente Mágico
        </h2>

        <p className="text-center text-muted mb-4">Módulo Administrador</p>

        <div className="card shadow border-0">
          <div className="card-body p-4">
            <h5 className="card-title mb-3 fw-bold">Iniciar Sesión</h5>

            {errorMsg && (
              <div className="alert alert-danger py-2 small" role="alert">
                {errorMsg}
              </div>
            )}

            <form onSubmit={manejarIngresar}>
              <div className="mb-3">
                <label className="form-label text-muted small">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="admin@mail.com"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label text-muted small">
                  Contraseña
                </label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="****"
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary w-100 py-2 fw-medium">
                Ingresar
              </button>
            </form>

            <hr className="text-muted" />

            <p className="text-center mb-0 small">
              ¿Olvidaste tu contraseña?{" "}
              <Link to="/recuperar">Recupérala aquí</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;