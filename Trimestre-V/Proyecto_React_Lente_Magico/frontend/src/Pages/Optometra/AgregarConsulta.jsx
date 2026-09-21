import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../Styles/AgregarConsulta.css";

function RegistroConsulta() {
  const [pacientes, setPacientes] = useState([]);
  const [cargandoPacientes, setCargandoPacientes] = useState(true);

  const [idCliente, setIdCliente] = useState("");
  const [motivo, setMotivo] = useState("");
  const [resultadoExamen, setResultadoExamen] = useState("");
  const [diagnostico, setDiagnostico] = useState("");
  const [recomendaciones, setRecomendaciones] = useState("");

  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [guardando, setGuardando] = useState(false);

  const navigate = useNavigate();

  const usuarioLogueado = JSON.parse(
    localStorage.getItem("usuario_logueado") || "null"
  );

  const idUsuario = usuarioLogueado?.id || null;

  const nombreUsuario =
    usuarioLogueado?.nombre ||
    usuarioLogueado?.login ||
    "Optómetra";

  // Cargar pacientes
  useEffect(() => {
    fetch("http://localhost:5000/api/optometra/cliente")
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));

          throw new Error(
            data.error || "No fue posible cargar los pacientes."
          );
        }

        return res.json();
      })
      .then((data) => {
        setPacientes(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Error al cargar pacientes:", err);
        setError(err.message);
      })
      .finally(() => {
        setCargandoPacientes(false);
      });
  }, []);

  
  const pacienteSeleccionado = pacientes.find(
    (paciente) =>
      Number(paciente.id_cliente) === Number(idCliente)
  );

  
  const idHistoria = pacienteSeleccionado?.id_historia || null;

  function manejarGuardar(e) {
    e.preventDefault();

    setError("");
    setExito("");

        if (!idCliente) {
      setError("Selecciona un paciente.");
      return;
    }

    if (!idUsuario) {
      setError("No se encontró el usuario de la sesión.");
      return;
    }

    if (!motivo.trim()) {
      setError("Completa el motivo de la consulta.");
      return;
    }

    setGuardando(true);

    
    const nuevaConsulta = {
      id_cliente: Number(idCliente),
      id_usuario: Number(idUsuario),

      motivo: motivo.trim(),

      resultado_examen:
        resultadoExamen.trim() ||
        "Sin resultado registrado",

      diagnostico:
        diagnostico.trim() ||
        "Sin diagnóstico registrado",

      recomendaciones:
        recomendaciones.trim() ||
        "Sin recomendaciones",
    };

    console.log("Datos enviados:", nuevaConsulta);

    fetch("http://localhost:5000/api/optometra/consulta", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(nuevaConsulta),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(
            data.error || "Error al guardar la consulta."
          );
        }

        return data;
      })
      .then((data) => {
        console.log("Consulta guardada:", data);

        setExito("¡Consulta registrada con éxito!");

        setIdCliente("");
        setMotivo("");
        setResultadoExamen("");
        setDiagnostico("");
        setRecomendaciones("");

        setTimeout(() => {
          navigate("/optometra/generar-formula");
        }, 1500);
      })
      .catch((err) => {
        console.error("Error al guardar consulta:", err);
        setError(err.message);
      })
      .finally(() => {
        setGuardando(false);
      });
  }

  return (
    <div className="container mt-4 mb-5">
      <div className="card shadow-sm">
        <div className="card-body p-4">

          <h4>Registrar consulta</h4>

          <p className="text-muted">
            Registra una nueva valoración para un paciente.
          </p>

          {error && (
            <div className="alert alert-danger py-2 small">
              {error}
            </div>
          )}

          {exito && (
            <div className="alert alert-success py-2 small">
              {exito}
            </div>
          )}

          <form onSubmit={manejarGuardar}>

            <div className="seccion-form mt-3">
              <h6>Información de atención</h6>
            </div>

            <div className="row g-3">

              
              <div className="col-md-7">
                <label className="form-label">
                  Paciente{" "}
                  <span className="text-danger">*</span>
                </label>

                <select
                  className="form-select"
                  value={idCliente}
                  onChange={(e) => {
                    setIdCliente(e.target.value);
                    setError("");
                  }}
                  disabled={cargandoPacientes}
                  required
                >
                  <option value="">
                    {cargandoPacientes
                      ? "Cargando pacientes..."
                      : "Seleccione un paciente"}
                  </option>

                  {pacientes.map((paciente) => (
                    <option
                      key={paciente.id_cliente}
                      value={paciente.id_cliente}
                    >
                      {paciente.nombre} — Documento:{" "}
                      {paciente.numeroDocumento}
                    </option>
                  ))}
                </select>

                
                {idCliente && (
                  <small className="text-muted">
                    {idHistoria
                      ? "Este paciente ya tiene historia clínica."
                      : "Paciente nuevo. Se creará su historia clínica al registrar la consulta."}
                  </small>
                )}
              </div>

              
              <div className="col-md-5">
                <label className="form-label">
                  Optómetra responsable
                </label>

                <input
                  type="text"
                  className="form-control"
                  value={
                    idUsuario
                      ? `${nombreUsuario} (ID: ${idUsuario})`
                      : "No hay una sesión activa"
                  }
                  readOnly
                />

                <small className="text-muted">
                  Se obtiene automáticamente del inicio de sesión.
                </small>
              </div>

            </div>

            
            <div className="seccion-form mt-4">
              <h6>Datos de la consulta</h6>
            </div>

            <div className="row g-3">

             
              <div className="col-md-6">
                <label className="form-label">
                  Motivo{" "}
                  <span className="text-danger">*</span>
                </label>

                <input
                  type="text"
                  className="form-control"
                  maxLength={40}
                  placeholder="Ej: Control anual"
                  value={motivo}
                  onChange={(e) =>
                    setMotivo(e.target.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúñÑ\s]/g, ""))
                  }
                  required
                />
              </div>

              
              <div className="col-md-6">
                <label className="form-label">
                  Diagnóstico
                </label>

                <select
                  className="form-select"
                  value={diagnostico}
                  onChange={(e) =>
                    setDiagnostico(e.target.value)
                  }
                >
                  <option value="">
                    Seleccione...
                  </option>

                  <option value="Astigmatismo y Miopía">
                    Astigmatismo y Miopía
                  </option>

                  <option value="Astigmatismo">
                    Astigmatismo
                  </option>

                  <option value="Miopía">
                    Miopía
                  </option>

                  <option value="Hipermetropía">
                    Hipermetropía
                  </option>

                  <option value="Presbicia">
                    Presbicia
                  </option>
                </select>
              </div>

             
              <div className="col-12">
                <label className="form-label">
                  Resultado del examen
                </label>

                <textarea
                  className="form-control"
                  rows="3"
                  maxLength={100}
                  placeholder="Describe el resultado del examen..."
                  value={resultadoExamen}
                  onChange={(e) =>
                    setResultadoExamen(e.target.value)
                  }
                />
              </div>

              
              <div className="col-12">
                <label className="form-label">
                  Recomendaciones
                </label>

                <textarea
                  className="form-control"
                  rows="3"
                  maxLength={1000}
                  placeholder="Ej: Uso permanente, control en seis meses..."
                  value={recomendaciones}
                  onChange={(e) =>
                    setRecomendaciones(e.target.value)
                  }
                />
              </div>

            </div>

            
            <div className="d-flex justify-content-center gap-2 mt-4">

              <button
                type="submit"
                className="btn btn-success px-4"
                disabled={
                  guardando || cargandoPacientes
                }
              >
                {guardando
                  ? "Guardando..."
                  : "Guardar consulta"}
              </button>

              <Link
                to="/optometra/historia-clinica"
                className="btn btn-outline-secondary px-4"
              >
                Cancelar
              </Link>

            </div>

          </form>

        </div>
      </div>
    </div>
  );
}

export default RegistroConsulta;