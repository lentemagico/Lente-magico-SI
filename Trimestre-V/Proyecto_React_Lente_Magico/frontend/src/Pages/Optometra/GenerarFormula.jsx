import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../../Styles/GenerarFormula.css";

function RegistroFormulaOptica() {
  // Lista de consultas disponibles (cargadas desde el backend) y de pacientes,
  // usados para poblar el <select> de consultas y mostrar el nombre del paciente.
  const [consultas, setConsultas] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [idConsulta, setIdConsulta] = useState("");

  // Valores de graduación óptica para cada ojo (OD = ojo derecho, OI = ojo izquierdo).
  const [esferaOD, setEsferaOD] = useState("");
  const [esferaOI, setEsferaOI] = useState("");
  const [cilindroOD, setCilindroOD] = useState("");
  const [cilindroOI, setCilindroOI] = useState("");
  const [ejeOD, setEjeOD] = useState("");
  const [ejeOI, setEjeOI] = useState("");
  const [adicion, setAdicion] = useState("");

  // Datos adicionales del lente recetado.
  const [tipoLente, setTipoLente] = useState("");
  const [uso, setUso] = useState("");
  const [observaciones, setObservaciones] = useState("");

  // Estados de control de la interfaz: carga de datos, guardado en curso
  // y si ya se generó una fórmula (para habilitar el botón de imprimir).
  const [cargandoConsultas, setCargandoConsultas] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [formulaGenerada, setFormulaGenerada] = useState(false);

  // Mensajes de error y éxito mostrados en la interfaz.
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  // Al montar el componente, se cargan todas las consultas registradas
  // para que el optómetra pueda seleccionar sobre cuál generar la fórmula.
  useEffect(() => {
    fetch("http://localhost:5000/api/optometra/consultas")
      .then(async (res) => {
        const data = await res.json().catch(() => []);

        if (!res.ok) {
          throw new Error(
            data.error || "No fue posible cargar las consultas."
          );
        }

        return data;
      })
      .then((data) => {
        setConsultas(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Error al cargar consultas:", err);
        setError(err.message);
      })
      .finally(() => {
        setCargandoConsultas(false);
      });
  }, []);

  // Se cargan también todos los pacientes, para poder cruzar cada
  // consulta con el nombre del paciente correspondiente.
  useEffect(() => {
    fetch("http://localhost:5000/api/optometra/cliente")
      .then((res) => res.json())
      .then((data) => {
        setPacientes(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Error al cargar pacientes:", err);
      });
  }, []);

  // Busca en la lista de consultas la que coincide con el id seleccionado
  // en el <select>, para obtener sus datos (por ejemplo el id del cliente).
  const consultaSeleccionada = consultas.find(
    (consulta) =>
      Number(consulta.id_consulta) === Number(idConsulta)
  );

  const idCliente = consultaSeleccionada?.id_cliente || "";


  // A partir del id del cliente obtenido de la consulta, se busca el
  // paciente correspondiente para poder mostrar su nombre en pantalla.
  const pacienteSeleccionado = pacientes.find(
    (paciente) => Number(paciente.id_cliente) === Number(idCliente)
  );

  const nombrePaciente = pacienteSeleccionado?.nombre || "";

  // Maneja el envío del formulario: valida los campos obligatorios,
  // arma el objeto de la fórmula y lo envía al backend por POST.
  const manejarGenerar = async (e) => {
    e.preventDefault();

    // Validación básica: se requiere consulta, cliente asociado,
    // tipo de lente y uso antes de poder generar la fórmula.
    if (!idConsulta || !idCliente || !tipoLente || !uso) {
      setError(
        "Selecciona una consulta y completa el tipo de lente y el uso."
      );
      return;
    }

    // Se limpian mensajes previos y se activan los estados de carga.
    setError("");
    setExito("");
    setGuardando(true);
    setFormulaGenerada(false);

    // Objeto con los datos de la fórmula que se enviará al backend.
    // Los campos de graduación combinan OD y OI en un solo texto,
    // usando "0.00" u otros valores por defecto si quedan vacíos.
    const nuevaFormula = {
      id_consulta: Number(idConsulta),
      id_cliente: Number(idCliente),

      esfera_ojo_derecho_e_izquierdo: `OD: ${esferaOD || "0.00"
        } | OI: ${esferaOI || "0.00"}`,

      cilindro_ojo_derecho_e_izquierdo: `OD: ${cilindroOD || "0.00"
        } | OI: ${cilindroOI || "0.00"}`,

      eje_ojo_derecho_e_izquierdo: `OD: ${ejeOD || "0°"
        } | OI: ${ejeOI || "0°"}`,

      adicion: adicion.trim() || "Sin adición",

      tipo_lente: tipoLente,

      uso: uso,

      observaciones:
        observaciones.trim() || "Sin observaciones",
    };

    // Envío del formulario al backend mediante fetch con async/await.
    try {
      const res = await fetch(
        "http://localhost:5000/api/optometra/formulas",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(nuevaFormula),
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data.error || "Error al guardar la fórmula."
        );
      }

      // Si todo sale bien, se muestra el mensaje de éxito y se habilita
      // el botón de imprimir (formulaGenerada = true).
      setExito("¡Fórmula óptica generada con éxito!");
      setFormulaGenerada(true);

    } catch (err) {
      // Si algo falla, se captura el error y se muestra al usuario.
      console.error("Error al guardar fórmula:", err);
      setError(err.message);

    } finally {
      // Pase lo que pase, se desactiva el indicador de "guardando".
      setGuardando(false);
    }
  };


  // Dispara el diálogo de impresión del navegador para imprimir la fórmula.
  const imprimirFormula = () => {
    window.print();
  };

  return (
    <div className="container mt-4 mb-5">

      <div className="card shadow-sm">
        <div className="card-body p-4">

          {/* Título y descripción de la pantalla */}
          <h4>Generar fórmula óptica</h4>

          <p className="text-muted">
            Registra la graduación y las recomendaciones
            de una consulta.
          </p>

          {/* Alerta de error, solo se muestra si hay un mensaje de error */}
          {error && (
            <div className="alert alert-danger py-2 small">
              {error}
            </div>
          )}

          {/* Alerta de éxito, solo se muestra si hay un mensaje de éxito */}
          {exito && (
            <div className="alert alert-success py-2 small">
              {exito}
            </div>
          )}

          <form onSubmit={manejarGenerar}>



            {/* Sección: selección de la consulta sobre la que se genera la fórmula */}
            <div className="seccion-form mt-3">
              <h6>Consulta seleccionada</h6>
            </div>

            <div className="row g-3">

              <div className="col-md-7">

                <label className="form-label">
                  Consulta{" "}
                  <span className="text-danger">*</span>
                </label>

                {/* Select con todas las consultas cargadas; al cambiar,
                    se reinicia el estado de "formulaGenerada" */}
                <select
                  className="form-select"
                  value={idConsulta}
                  onChange={(e) => {
                    setIdConsulta(e.target.value);
                    setFormulaGenerada(false);
                  }}
                  disabled={cargandoConsultas}
                  required
                >
                  <option value="">
                    {cargandoConsultas
                      ? "Cargando consultas..."
                      : "Seleccione una consulta"}
                  </option>

                  {consultas.map((consulta) => {
                    // Por cada consulta se busca el paciente asociado
                    // para mostrar su nombre junto al motivo de consulta.
                    const paciente = pacientes.find(
                      (p) =>
                        Number(p.id_cliente) ===
                        Number(consulta.id_cliente)
                    );

                    const nombre =
                      paciente?.nombre ||
                      `Paciente ID: ${consulta.id_cliente}`;

                    return (
                      <option
                        key={consulta.id_consulta}
                        value={consulta.id_consulta}
                      >
                        {nombre} — {consulta.motivo}
                      </option>
                    );
                  })}
                </select>

              </div>

              <div className="col-md-5">

                <label className="form-label">
                  Paciente
                </label>

                {/* Campo de solo lectura: muestra el nombre del paciente
                    derivado automáticamente de la consulta seleccionada */}
                <input
                  type="text"
                  className="form-control"
                  value={
                    idCliente
                      ? nombrePaciente || `Paciente ID: ${idCliente}`
                      : "Seleccione una consulta"
                  }
                  readOnly
                />

                <small className="text-muted">
                  Se obtiene automáticamente desde la consulta.
                </small>

              </div>

            </div>



            {/* Sección: datos de graduación (esfera, cilindro, eje, adición) */}
            <div className="seccion-form mt-4">
              <h6>Datos de la fórmula (graduación)</h6>
            </div>

            <div className="row g-3">

              {/* Esfera ojo derecho */}
              <div className="col-md-6">
                <label className="form-label">
                  Esfera — Ojo derecho (OD)
                </label>

                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: -1.50"
                  value={esferaOD}
                  onChange={(e) =>
                    setEsferaOD(e.target.value)
                  }
                />
              </div>

              {/* Esfera ojo izquierdo */}
              <div className="col-md-6">
                <label className="form-label">
                  Esfera — Ojo izquierdo (OI)
                </label>

                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: -2.00"
                  value={esferaOI}
                  onChange={(e) =>
                    setEsferaOI(e.target.value)
                  }
                />
              </div>

              {/* Cilindro ojo derecho */}
              <div className="col-md-6">
                <label className="form-label">
                  Cilindro — Ojo derecho (OD)
                </label>

                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: -0.75"
                  value={cilindroOD}
                  onChange={(e) =>
                    setCilindroOD(e.target.value)
                  }
                />
              </div>

              {/* Cilindro ojo izquierdo */}
              <div className="col-md-6">
                <label className="form-label">
                  Cilindro — Ojo izquierdo (OI)
                </label>

                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: -1.00"
                  value={cilindroOI}
                  onChange={(e) =>
                    setCilindroOI(e.target.value)
                  }
                />
              </div>

              {/* Eje ojo derecho */}
              <div className="col-md-4">
                <label className="form-label">
                  Eje — Ojo derecho (OD)
                </label>

                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: 90°"
                  value={ejeOD}
                  onChange={(e) =>
                    setEjeOD(e.target.value)
                  }
                />
              </div>

              {/* Eje ojo izquierdo */}
              <div className="col-md-4">
                <label className="form-label">
                  Eje — Ojo izquierdo (OI)
                </label>

                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: 85°"
                  value={ejeOI}
                  onChange={(e) =>
                    setEjeOI(e.target.value)
                  }
                />
              </div>

              {/* Adición (para lentes bifocales/progresivos) */}
              <div className="col-md-4">
                <label className="form-label">
                  Adición
                </label>

                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: +2.00"
                  value={adicion}
                  onChange={(e) =>
                    setAdicion(e.target.value)
                  }
                />
              </div>

            </div>



            {/* Sección: datos del lente (tipo, uso y observaciones) */}
            <div className="seccion-form mt-4">
              <h6>Datos del lente</h6>
            </div>

            <div className="row g-3">

              <div className="col-md-6">

                <label className="form-label">
                  Tipo de lente{" "}
                  <span className="text-danger">*</span>
                </label>

                {/* Select con las opciones fijas de tipo de lente */}
                <select
                  className="form-select"
                  value={tipoLente}
                  onChange={(e) =>
                    setTipoLente(e.target.value)
                  }
                  required
                >
                  <option value="">
                    Seleccione...
                  </option>

                  <option value="Monofocal">
                    Monofocal
                  </option>

                  <option value="Bifocal">
                    Bifocal
                  </option>

                  <option value="Progresivo">
                    Progresivo
                  </option>

                  <option value="Contacto">
                    Contacto
                  </option>

                </select>

              </div>

              <div className="col-md-6">

                <label className="form-label">
                  Uso{" "}
                  <span className="text-danger">*</span>
                </label>

                {/* Select con las opciones fijas de uso del lente */}
                <select
                  className="form-select"
                  value={uso}
                  onChange={(e) =>
                    setUso(e.target.value)
                  }
                  required
                >
                  <option value="">
                    Seleccione...
                  </option>

                  <option value="Permanente">
                    Permanente
                  </option>

                  <option value="Para lectura">
                    Para lectura
                  </option>

                  <option value="Para distancia">
                    Para distancia
                  </option>

                  <option value="Ocasional">
                    Ocasional
                  </option>

                </select>

              </div>

              <div className="col-12">

                <label className="form-label">
                  Observaciones
                </label>

                {/* Campo libre para observaciones adicionales de la fórmula */}
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="Información adicional relevante..."
                  value={observaciones}
                  onChange={(e) =>
                    setObservaciones(e.target.value)
                  }
                />

              </div>

            </div>



            {/* Botones de acción: generar, imprimir (solo si ya se generó) y cancelar */}
            <div className="d-flex justify-content-center gap-2 mt-4">

              <button
                type="submit"
                className="btn btn-success px-4"
                disabled={
                  guardando || cargandoConsultas
                }
              >
                {guardando
                  ? "Generando..."
                  : "Generar fórmula"}
              </button>

              <button
                type="button"
                className="btn btn-outline-primary px-4"
                onClick={imprimirFormula}
                disabled={!formulaGenerada}
              >
                Imprimir fórmula
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



      {/* Vista previa en vivo de la fórmula, con los datos capturados hasta el momento */}
      <div className="card vista-formula mt-4 p-4 border-start border-3 border-info shadow-sm">

        <h5 className="text-info fw-bold mb-3">
          Vista previa de la fórmula
        </h5>

        <div className="row g-2">

          {/* Datos generales: consulta y paciente */}
          <div className="col-md-6">
            <strong>Consulta:</strong>{" "}
            {idConsulta || "---"}
          </div>

          <div className="col-md-6">
            <strong>Paciente:</strong>{" "}
            {nombrePaciente || idCliente || "---"}
          </div>

          {/* Tipo de lente y uso seleccionados */}
          <div className="col-md-6">
            <strong>Tipo de lente:</strong>{" "}
            <span className="text-primary fw-medium">
              {tipoLente || "---"}
            </span>
          </div>

          <div className="col-md-6">
            <strong>Uso:</strong>{" "}
            <span className="text-primary fw-medium">
              {uso || "---"}
            </span>
          </div>

          <div className="col-md-6">
            <strong>Adición:</strong>{" "}
            {adicion || "---"}
          </div>

          <div className="col-12 mt-2">
            <hr />
          </div>

          {/* Valores de graduación por ojo */}
          <div className="col-md-6">
            <strong>Esfera OD:</strong>{" "}
            {esferaOD || "---"}
          </div>

          <div className="col-md-6">
            <strong>Esfera OI:</strong>{" "}
            {esferaOI || "---"}
          </div>

          <div className="col-md-6">
            <strong>Cilindro OD:</strong>{" "}
            {cilindroOD || "---"}
          </div>

          <div className="col-md-6">
            <strong>Cilindro OI:</strong>{" "}
            {cilindroOI || "---"}
          </div>

          <div className="col-md-6">
            <strong>Eje OD:</strong>{" "}
            {ejeOD || "---"}
          </div>

          <div className="col-md-6">
            <strong>Eje OI:</strong>{" "}
            {ejeOI || "---"}
          </div>

          {/* Las observaciones solo se muestran si el usuario escribió algo */}
          {observaciones && (
            <div className="col-12 mt-2">
              <hr />

              <strong>Observaciones:</strong>

              <p className="bg-light p-2 rounded mt-1 text-secondary mb-0">
                {observaciones}
              </p>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}

export default RegistroFormulaOptica;