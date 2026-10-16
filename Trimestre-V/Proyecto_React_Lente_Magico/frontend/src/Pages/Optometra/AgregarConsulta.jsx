import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "../../Styles/AgregarConsulta.css";

function RegistroConsulta() {
  // NUEVO (diagrama): permite leer los datos que llegan desde la agenda
  // (id_agenda e id_cliente) cuando se atiende una cita agendada por caja.
  const location = useLocation();

  // Lista de pacientes disponibles para el <select> y bandera de carga.
  const [pacientes, setPacientes] = useState([]);
  const [cargandoPacientes, setCargandoPacientes] = useState(true);

  // Campos del formulario de la consulta.
  // NUEVO: si se llega desde una cita de la agenda, el paciente ya viene
  // seleccionado (location.state.id_cliente).
  const [idCliente, setIdCliente] = useState(
    location.state?.id_cliente ? String(location.state.id_cliente) : ""
  );
  const [motivo, setMotivo] = useState("");
  const [resultadoExamen, setResultadoExamen] = useState("");
  const [diagnostico, setDiagnostico] = useState("");
  const [recomendaciones, setRecomendaciones] = useState("");

  // NUEVO (diagrama): campo "evolucion" de la tabla consulta (varchar 1000).
  const [evolucion, setEvolucion] = useState("");

  // NUEVO (diagrama): campo "antecedentes" de la tabla Antecedentes (varchar 1000).
  // Es opcional: la historia clínica ya existe (la crea caja al agendar),
  // y si se escribe algo se agrega como un nuevo antecedente de esa historia.
  const [antecedentes, setAntecedentes] = useState("");

  // Mensajes de error/éxito y bandera de guardado en curso.
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [guardando, setGuardando] = useState(false);

  const navigate = useNavigate();

  // NUEVO (diagrama): id_agenda es opcional. Puede llegar por la ruta
  // (navigate("/optometra/agregar-consulta", { state: { id_agenda, id_cliente } }))
  // o por query string (?id_agenda=12). Si no hay cita, queda en null.
  const idAgenda =
    location.state?.id_agenda ||
    new URLSearchParams(location.search).get("id_agenda") ||
    null;

  // NUEVO: la agenda de caja identifica al paciente por numero_documento,
  // así que si no llega id_cliente se usa el documento para seleccionarlo.
  const numeroDocumentoAgenda = location.state?.numero_documento || null;

  // Se obtiene el usuario logueado desde localStorage para saber
  // quién es el optómetra que está registrando la consulta.
  const usuarioLogueado = JSON.parse(
    localStorage.getItem("usuario_logueado") || "null"
  );

  const idUsuario = usuarioLogueado?.id || null;

  // Nombre a mostrar del optómetra: usa "nombre", si no existe usa "login",
  // y como último recurso muestra "Optómetra".
  const nombreUsuario =
    usuarioLogueado?.nombre ||
    usuarioLogueado?.login ||
    "Optómetra";

  // Cargar pacientes
  // Al montar el componente se piden todos los pacientes al backend
  // para llenar el <select> de selección de paciente.
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
        const lista = Array.isArray(data) ? data : [];

        setPacientes(lista);

        // NUEVO: si se llegó desde la agenda sin id_cliente, se busca el
        // paciente por su número de documento y se deja seleccionado.
        if (numeroDocumentoAgenda && !location.state?.id_cliente) {
          const encontrado = lista.find(
            (p) =>
              String(p.numeroDocumento) === String(numeroDocumentoAgenda)
          );

          if (encontrado) {
            setIdCliente(String(encontrado.id_cliente));
          }
        }
      })
      .catch((err) => {
        console.error("Error al cargar pacientes:", err);
        setError(err.message);
      })
      .finally(() => {
        setCargandoPacientes(false);
      });
  }, []);


  // Busca en la lista de pacientes el que coincide con el id
  // seleccionado en el formulario.
  const pacienteSeleccionado = pacientes.find(
    (paciente) =>
      Number(paciente.id_cliente) === Number(idCliente)
  );


  // Historia clínica del paciente seleccionado. Según el flujo, la crea el
  // módulo de caja cuando agenda la consulta, así que debería existir siempre.
  // Se usa para mostrar un mensaje informativo al usuario y, según el
  // diagrama, también se envía como id_historia de la consulta.
  const idHistoria = pacienteSeleccionado?.id_historia || null;

  // NUEVO: true cuando hay un paciente seleccionado pero no se encontró su
  // historia clínica (caso anormal: caja no la generó). Solo se advierte.
  const sinHistoria =
    Boolean(idCliente) && !cargandoPacientes && !idHistoria;

  // Maneja el envío del formulario de registro de consulta.
  function manejarGuardar(e) {
    e.preventDefault();

    setError("");
    setExito("");

    // Validaciones obligatorias antes de guardar: paciente seleccionado,
    // usuario con sesión activa y motivo de consulta no vacío.
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


    // Objeto con los datos de la consulta que se enviará al backend.
    // Los campos opcionales usan un texto por defecto si quedan vacíos.
    // Los nombres coinciden con las columnas del diagrama.
    // fecha_hora no se envía: la asigna el backend con la fecha y hora actual.
    const nuevaConsulta = {
      id_cliente: Number(idCliente),
      id_usuario: Number(idUsuario),

      // NUEVO (diagrama): consulta.id_historia, la historia que creó caja.
      id_historia: idHistoria ? Number(idHistoria) : null,

      // NUEVO (diagrama): consulta.id_agenda (la cita que agendó caja).
      id_agenda: idAgenda ? Number(idAgenda) : null,

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

      // NUEVO (diagrama): consulta.evolucion
      evolucion:
        evolucion.trim() ||
        "Sin evolución registrada",

      // NUEVO (diagrama): si se escribió, el backend lo inserta como una
      // nueva fila en Antecedentes ligada a id_historia. Si no, va null.
      antecedentes: antecedentes.trim() || null,
    };

    console.log("Datos enviados:", nuevaConsulta);

    // Envío de la consulta al backend mediante POST.
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

        // Se muestra el mensaje de éxito y se limpia el formulario.
        setExito("¡Consulta registrada con éxito!");

        setIdCliente("");
        setMotivo("");
        setResultadoExamen("");
        setDiagnostico("");
        setRecomendaciones("");
        setEvolucion("");
        setAntecedentes("");

        // NUEVO (diagrama): formula_optica.id_consulta es FK de consulta
        // (fk_for_con), por eso se toma el id de la consulta recién creada
        // y se pasa a la pantalla de fórmula.
        const idConsulta = data.id_consulta ?? data.id ?? null;

        // Tras un breve retraso, se redirige a la pantalla de generar fórmula
        // (ahora enviando el id_consulta en el state de la navegación).
        setTimeout(() => {
          navigate("/optometra/generar-formula", {
            state: { id_consulta: idConsulta },
          });
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

            {/* Sección: datos de quién atiende y a quién */}
            <div className="seccion-form mt-3">
              <h6>Información de atención</h6>
            </div>

            <div className="row g-3">


              {/* Select de paciente, con mensaje según tenga o no historia clínica */}
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

                    // NUEVO: al cambiar de paciente se limpian los antecedentes
                    // escritos para no mezclarlos con otro paciente.
                    setAntecedentes("");

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


                {/* Mensaje informativo: la historia clínica la genera caja al
                    agendar la consulta; si no aparece, se muestra una advertencia */}
                {idCliente && !cargandoPacientes && (
                  <small
                    className={
                      sinHistoria ? "text-danger" : "text-muted"
                    }
                  >
                    {idHistoria
                      ? "Historia clínica generada al agendar la consulta."
                      : "No se encontró la historia clínica de este paciente. Debe generarse al agendar la consulta desde caja."}
                  </small>
                )}
              </div>


              {/* Campo de solo lectura con el optómetra de la sesión actual */}
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


              {/* NUEVO (diagrama): aviso cuando la consulta viene de una cita
                  de la agenda (consulta.id_agenda) */}
              {idAgenda && (
                <div className="col-12">
                  <small className="text-muted">
                    Esta consulta queda asociada a la cita de agenda #{idAgenda}.
                  </small>
                </div>
              )}

            </div>


            {/* NUEVO (diagrama): sección de antecedentes (tabla Antecedentes).
                Los antecedentes cuelgan de historia_clinica y pueden ser
                varios por historia, por eso se muestra siempre como un
                campo opcional para agregar uno nuevo. */}
            {idCliente && (
              <>
                <div className="seccion-form mt-4">
                  <h6>Antecedentes del paciente</h6>
                </div>

                <div className="row g-3">

                  {/* Antecedentes: texto libre opcional, limitado a 1000 caracteres */}
                  <div className="col-12">
                    <label className="form-label">
                      Nuevo antecedente
                    </label>

                    <textarea
                      className="form-control"
                      rows="3"
                      maxLength={1000}
                      placeholder="Ej: Diabetes, uso previo de lentes, antecedentes familiares..."
                      value={antecedentes}
                      onChange={(e) =>
                        setAntecedentes(e.target.value)
                      }
                    />

                    <small className="text-muted">
                      Opcional. {antecedentes.length}/1000
                    </small>
                  </div>

                </div>
              </>
            )}


            {/* Sección: datos propios de la consulta */}
            <div className="seccion-form mt-4">
              <h6>Datos de la consulta</h6>
            </div>

            <div className="row g-3">


              {/* Motivo de la consulta: permite letras, números, espacios y
                  puntuación básica (con tildes/ñ). Límite de 40 caracteres
                  según el diagrama (varchar(40)). */}
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
                    setMotivo(e.target.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúñÑüÜ0-9\s]/g, ""))
                  }
                  required
                />

                <small className="text-muted">
                  {motivo.length}/40
                </small>
              </div>


              {/* Diagnóstico: lista fija de opciones predefinidas */}
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


              {/* Resultado del examen: texto libre, limitado a 1000 caracteres
                  (antes 100; ahora coincide con varchar(1000) del diagrama) */}
              <div className="col-12">
                <label className="form-label">
                  Resultado del examen
                </label>

                <textarea
                  className="form-control"
                  rows="3"
                  maxLength={1000}
                  placeholder="Describe el resultado del examen..."
                  value={resultadoExamen}
                  onChange={(e) =>
                    setResultadoExamen(e.target.value)
                  }
                />

                <small className="text-muted">
                  {resultadoExamen.length}/1000
                </small>
              </div>


              {/* Recomendaciones: texto libre, limitado a 1000 caracteres */}
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

                <small className="text-muted">
                  {recomendaciones.length}/1000
                </small>
              </div>


              {/* NUEVO (diagrama): Evolución, texto libre, limitado a
                  1000 caracteres (consulta.evolucion) */}
              <div className="col-12">
                <label className="form-label">
                  Evolución
                </label>

                <textarea
                  className="form-control"
                  rows="3"
                  maxLength={1000}
                  placeholder="Ej: Mejoría con el uso de lentes, sin molestias..."
                  value={evolucion}
                  onChange={(e) =>
                    setEvolucion(e.target.value)
                  }
                />

                <small className="text-muted">
                  {evolucion.length}/1000
                </small>
              </div>

            </div>


            {/* Botones de acción: guardar consulta o cancelar */}
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