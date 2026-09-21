import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../Styles/Antecedentes.css";

function RegistroAntecedentes() {
  const [pacientes, setPacientes] = useState([]);
  const [idCliente, setIdCliente] = useState("");
  const [antecedentes, setAntecedentes] = useState("");

  const [cargandoPacientes, setCargandoPacientes] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://localhost:5000/api/optometra/cliente")
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(
            data.error || "No fue posible cargar los pacientes."
          );
        }

        return data;
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

  const idHistoria =
    pacienteSeleccionado?.id_historia || "";

  const manejarGuardar = async (e) => {
    e.preventDefault();

    if (!idCliente || !idHistoria || !antecedentes.trim()) {
      setError(
        "Selecciona un paciente y completa los antecedentes obligatorios."
      );
      return;
    }

    setError("");
    setExito("");
    setGuardando(true);

    const nuevoAntecedente = {
      id_historia: Number(idHistoria),
      antecedentes: antecedentes.trim(),
    };

    try {
      const res = await fetch(
        "http://localhost:5000/api/optometra/antecedentes",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(nuevoAntecedente),
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data.error || "Error al guardar el antecedente."
        );
      }

      setExito("¡Antecedente registrado con éxito!");

      setIdCliente("");
      setAntecedentes("");

      setTimeout(() => {
        navigate("/optometra/historia-clinica");
      }, 1500);
    } catch (err) {
      console.error(
        "Error al guardar antecedente:",
        err
      );

      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="container mt-4 mb-5">
      <div className="card shadow-sm">
        <div className="card-body p-4">

          <h4>Registrar antecedente</h4>

          <p className="text-muted">
            Registra antecedentes oculares asociados a
            la historia clínica del paciente.
          </p>

          {/* ERROR */}
          {error && (
            <div className="alert alert-danger py-2 small">
              {error}
            </div>
          )}

          {/* ÉXITO */}
          {exito && (
            <div className="alert alert-success py-2 small">
              {exito}
            </div>
          )}

          <form onSubmit={manejarGuardar}>

            <div className="seccion-form mt-3">
              <h6>Paciente e historia clínica</h6>
            </div>

            <div className="row g-3">

              {/* PACIENTE */}
              <div className="col-md-7">
                <label className="form-label">
                  Paciente{" "}
                  <span className="text-danger">*</span>
                </label>

                <select
                  className="form-select"
                  value={idCliente}
                  onChange={(e) =>
                    setIdCliente(e.target.value)
                  }
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
                      {paciente.nombre} - Documento:{" "}
                      {paciente.numeroDocumento}
                    </option>
                  ))}
                </select>
              </div>

              {/* HISTORIA */}
              <div className="col-md-5">
                <label className="form-label">
                  Historia clínica
                </label>

                <input
                  type="text"
                  className="form-control"
                  value={
                    idHistoria
                      ? `Historia clínica #${idHistoria}`
                      : "Seleccione un paciente"
                  }
                  readOnly
                />

                <small className="text-muted">
                  Se obtiene automáticamente al
                  seleccionar el paciente.
                </small>
              </div>
            </div>
            <div className="seccion-form mt-4">
              <h6>Datos del antecedente</h6>
            </div>

            <div className="row g-3">

              <div className="col-12">
                <label className="form-label">
                  Antecedentes{" "}
                  <span className="text-danger">*</span>
                </label>

                <textarea
                  className="form-control"
                  rows="4"
                  placeholder="Ejemplo: antecedentes familiares de glaucoma..."
                  value={antecedentes}
                  onChange={(e) =>
                    setAntecedentes(e.target.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúñÑ\s]/g, ""))
                  }
                  required
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
                  : "Guardar antecedente"}
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

export default RegistroAntecedentes;