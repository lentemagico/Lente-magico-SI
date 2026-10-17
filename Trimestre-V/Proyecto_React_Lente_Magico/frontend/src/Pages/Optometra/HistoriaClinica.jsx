import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../Styles/HistoriaClinica.css";

function RegistroHistoriaClinica() {
  // Lista de pacientes para el <select> y campos del formulario.
  const [pacientes, setPacientes] = useState([]);
  const [idCliente, setIdCliente] = useState("");

  // Fecha de apertura de la historia clínica, iniciada con la fecha actual
  // en formato YYYY-MM-DD (requerido por el input type="date").
  const [fechaApertura, setFechaApertura] = useState(
    new Date().toISOString().split("T")[0]
  );

  // CAMBIO (diagrama): se quitaron "evolucion" y "numConsulta". La tabla
  // historia_clinica solo tiene id_historia, id_cliente y fecha_apertura;
  // la evolución pertenece a la tabla consulta y el número de consultas
  // se puede calcular contando las consultas de la historia.
  const [cargandoPacientes, setCargandoPacientes] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Mensajes de error y éxito.
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  const navigate = useNavigate();

  // Al montar el componente, se cargan los pacientes existentes
  // para elegir a cuál se le abrirá la historia clínica.
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

  // CAMBIO: como la historia la genera caja al agendar, aquí solo se
  // ofrecen los pacientes que todavía no tienen historia clínica.
  const pacientesSinHistoria = pacientes.filter(
    (paciente) => !paciente.id_historia
  );

  // Maneja el envío del formulario de registro de historia clínica.
  function manejarGuardar(e) {
    e.preventDefault();

    // Validaciones: paciente y fecha de apertura obligatorios.
    if (!idCliente || !fechaApertura) {
      setError(
        "Selecciona un paciente e indica la fecha de apertura."
      );
      return;
    }

    setError("");
    setExito("");
    setGuardando(true);

    // Objeto con los datos de la nueva historia clínica a enviar al backend.
    // Coincide con las columnas de historia_clinica del diagrama.
    const nuevaHistoria = {
      id_cliente: Number(idCliente),
      fecha_apertura: fechaApertura,
    };

    // Envío de la historia clínica al backend mediante POST.
    fetch("http://localhost:5000/api/optometra/historia-clinica", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(nuevaHistoria),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(
            data.error || "Error al guardar la historia clínica."
          );
        }

        return data;
      })
      .then(() => {
        // Si todo sale bien, se muestra el éxito, se limpia el formulario
        // y se redirige a la pantalla de agregar consulta.
        setExito("¡Historia clínica registrada con éxito!");

        setIdCliente("");

        setTimeout(() => {
          navigate("/optometra/agregar-consulta");
        }, 1500);
      })
      .catch((err) => {
        console.error(
          "Error al guardar historia clínica:",
          err
        );

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

          <h4>Registrar historia clínica</h4>

          <p className="text-muted">
            Abre una historia clínica para un paciente existente.
          </p>

          
         

          {/* Alerta de error */}
          {error && (
            <div className="alert alert-danger py-2 small">
              {error}
            </div>
          )}

          {/* Alerta de éxito */}
          {exito && (
            <div className="alert alert-success py-2 small">
              {exito}
            </div>
          )}

          <form onSubmit={manejarGuardar}>

            {/* Sección: datos generales de la historia clínica */}
            <div className="seccion-form mt-3">
              <h6>Datos de la historia clínica</h6>
            </div>

            <div className="row g-3">

              {/* Select de paciente (solo pacientes sin historia clínica) */}
              <div className="col-md-6">
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

                  {pacientesSinHistoria.map((paciente) => (
                    <option
                      key={paciente.id_cliente}
                      value={paciente.id_cliente}
                    >
                      {paciente.nombre} — Documento:{" "}
                      {paciente.numeroDocumento}
                    </option>
                  ))}
                </select>

                {/* Mensaje cuando todos los pacientes ya tienen historia */}
                {!cargandoPacientes &&
                  pacientesSinHistoria.length === 0 && (
                    <small className="text-muted">
                      Todos los pacientes ya tienen historia clínica.
                    </small>
                  )}
              </div>

              {/* Fecha de apertura de la historia clínica */}
              <div className="col-md-6">
                <label className="form-label">
                  Fecha de apertura{" "}
                  <span className="text-danger">*</span>
                </label>

                <input
                  type="date"
                  className="form-control"
                  value={fechaApertura}
                  onChange={(e) =>
                    setFechaApertura(e.target.value)
                  }
                  required
                />
              </div>

            </div>

            {/* Botones de acción: guardar historia clínica o cancelar */}
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
                  : "Guardar historia clínica"}
              </button>

              <Link
                to="/optometra/agregar-consulta"
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

export default RegistroHistoriaClinica;