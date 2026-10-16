import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../../assets/Img/Logo.png";
import "../../Styles/Login.css";

function RestablecerContrasena() {
  const navigate = useNavigate();
  const [correo, setCorreo] = useState(sessionStorage.getItem("correoRecuperacion") || "");
  const [codigo, setCodigo] = useState("");
  const [nuevaContrasena, setNuevaContrasena] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje("");
    setError("");

    if (nuevaContrasena !== confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setCargando(true);
    try {
      const response = await fetch(
        "http://localhost:5000/api/recuperar/cambiar-contrasena",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ correo, codigo, nuevaContrasena }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo cambiar la contraseña.");

      setMensaje(data.mensaje);
      sessionStorage.removeItem("correoRecuperacion");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(err.message || "Error de conexión con el servidor.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-page">
      <div className="caja-login">
        <div className="titulo-sistema text-center">
          <img src={logo} alt="Logo Lente Mágico" width="90" />
          <h1>Lente Mágico</h1>
          <p>Restablecer contraseña</p>
        </div>

        <div className="card shadow">
          <div className="card-body">
            <h4 className="text-center mb-3">Nueva contraseña</h4>
            <p className="text-muted text-center">
              Ingresa el código que enviamos a tu correo y tu nueva contraseña.
            </p>

            {error && <div className="alert alert-danger text-center">{error}</div>}
            {mensaje && <div className="alert alert-success text-center">{mensaje}</div>}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Correo electrónico</label>
                <input
                  type="email"
                  className="form-control"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Código de recuperación</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Código recibido por correo"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Nueva contraseña</label>
                <input
                  type="password"
                  className="form-control"
                  value={nuevaContrasena}
                  onChange={(e) => setNuevaContrasena(e.target.value)}
                  minLength={8}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Confirmar contraseña</label>
                <input
                  type="password"
                  className="form-control"
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary w-100" disabled={cargando}>
                {cargando ? "Guardando..." : "Cambiar contraseña"}
              </button>
            </form>

            <div className="recuperar-clave">
              <Link to="/login">Volver</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RestablecerContrasena;