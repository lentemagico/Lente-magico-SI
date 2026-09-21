// Importamos React y dos hooks:
// - useEffect: para ejecutar efectos secundarios (como leer sessionStorage al montar)
// - useState: para manejar estado local del componente
import React, { useEffect, useState } from "react";

// Hook de react-router-dom que permite navegar programáticamente
// entre rutas (redirigir a otra página con código, no con un <a>)
import { useNavigate } from "react-router-dom";

// Función propia del proyecto que envuelve "fetch" para llamar a la API
// (probablemente agrega la URL base, headers, manejo de errores, etc.)
import { apiFetch } from "../../config/api";

// Componente funcional principal: pantalla de confirmación de pago bancario
export default function ConfirmacionBanco() {

  // Hook que da acceso a la función "navigate" para redirigir a otras rutas
  const navigate = useNavigate();

  // =====================================================
  // ESTADOS
  // =====================================================

  // Guarda los datos de la venta activa (la que se va a pagar). null si no hay ninguna
  const [venta, setVenta] = useState(null);

  // Banco seleccionado en el <select> (uno de la lista predefinida, o "Otro banco")
  const [banco, setBanco] = useState("");

  // Texto libre que el usuario escribe cuando elige la opción "Otro banco"
  const [otroBanco, setOtroBanco] = useState("");

  // Monto que se va a confirmar como pagado (inicialmente se llena con el total de la venta)
  const [monto, setMonto] = useState("");

  // Checkbox: si está marcado, se generará una factura automáticamente al confirmar el pago.
  // Empieza en "true" (marcado por defecto)
  const [generarFactura, setGenerarFactura] =
    useState(true);

  // Guarda el mensaje de error a mostrar (o null si no hay error)
  const [error, setError] = useState(null);

  // Guarda la respuesta exitosa del backend después de confirmar el pago
  // (mientras es null, se muestra el formulario; cuando tiene datos, se muestra el resumen)
  const [resultado, setResultado] = useState(null);

  // Bandera para saber si se está procesando la confirmación del pago
  // (se usa para deshabilitar el formulario y cambiar el texto del botón)
  const [cargando, setCargando] = useState(false);


  // =====================================================
  // CARGAR VENTA ACTIVA
  // =====================================================

  // Este efecto se ejecuta UNA sola vez, al montar el componente (dependencias vacías [])
  useEffect(() => {

    // Se intenta leer del almacenamiento temporal del navegador (sessionStorage)
    // la venta que quedó "activa" desde una pantalla anterior
    const ventaGuardada =
      sessionStorage.getItem("ventaActiva");

    // Solo si existe algo guardado, se procesa
    if (ventaGuardada) {

      try {

        // Convierte el texto JSON guardado en un objeto JS
        const ventaData =
          JSON.parse(ventaGuardada);

        // Guarda la venta en el estado del componente
        setVenta(ventaData);

        // Si la venta tiene un total definido, se precarga como monto a pagar
        if (ventaData.total != null) {

          setMonto(ventaData.total);

        }

      } catch (error) {

        // Si el JSON guardado está corrupto o mal formado, se captura el error
        console.error(
          "Error leyendo venta activa:",
          error
        );

        // Y se le muestra un mensaje al usuario
        setError(
          "No se pudo cargar la venta activa."
        );

      }

    }

  }, []); // arreglo vacío = solo se ejecuta al montar el componente


  // =====================================================
  // BANCOS DISPONIBLES
  // =====================================================

  // Lista fija (hardcodeada) de bancos que aparecen como opciones en el <select>.
  // "Otro banco" es la última opción y habilita un input de texto libre
  const bancos = [
    "Bancolombia",
    "Banco de Bogotá",
    "Davivienda",
    "BBVA",
    "Banco de Occidente",
    "Banco Popular",
    "Banco AV Villas",
    "Banco Caja Social",
    "Scotiabank Colpatria",
    "Otro banco"
  ];


  // =====================================================
  // CAMBIAR BANCO
  // =====================================================

  // Handler que se ejecuta cuando el usuario elige una opción del <select> de bancos
  const seleccionarBanco = (e) => {

    const valorSeleccionado =
      e.target.value; // valor de la opción elegida

    setBanco(valorSeleccionado); // guarda el banco elegido

    setError(null); // limpia cualquier error previo al cambiar la selección

    // Si el usuario cambia a una opción distinta de "Otro banco",
    // se limpia el campo de texto libre (para no dejar basura de una elección anterior)
    if (valorSeleccionado !== "Otro banco") {

      setOtroBanco("");

    }

  };


  // =====================================================
  // CONFIRMAR PAGO
  // =====================================================

  // Handler del submit del formulario: valida todo y envía el pago al backend
  const confirmarPago = async (e) => {

    e.preventDefault(); // evita que el navegador recargue la página al enviar el form

    setError(null); // limpia errores previos antes de validar de nuevo


    // ===================================================
    // VALIDAR VENTA
    // ===================================================

    // No se puede confirmar un pago si no hay una venta activa cargada
    if (!venta) {

      setError(
        "No hay una venta activa para pagar."
      );

      return; // corta la ejecución aquí

    }


    // ===================================================
    // VALIDAR BANCO
    // ===================================================

    // Es obligatorio haber elegido un banco en el <select>
    if (!banco) {

      setError(
        "Por favor selecciona un banco."
      );

      return;

    }


    // ===================================================
    // OBTENER NOMBRE DEL BANCO
    // ===================================================

    // Por defecto, el nombre del banco a enviar es el valor del <select>
    let nombreBanco = banco;


    // Caso especial: si eligió "Otro banco", se usa el texto que escribió a mano
    if (banco === "Otro banco") {

      // Si no escribió nada (o solo espacios), se marca error y se detiene
      if (!otroBanco.trim()) {

        setError(
          "Por favor escribe el nombre del banco."
        );

        return;

      }

      // Se usa el texto ingresado (sin espacios extra al inicio/fin) como nombre del banco
      nombreBanco =
        otroBanco.trim();

    }


    // ===================================================
    // VALIDAR MONTO
    // ===================================================

    // El monto debe existir y ser mayor a 0
    if (!monto || Number(monto) <= 0) {

      setError(
        "Ingresa un monto válido."
      );

      return;

    }


    // ===================================================
    // VALIDAR MONTO CONTRA LA VENTA
    // ===================================================

    // El monto ingresado no puede ser menor al total de la venta
    if (
      Number(monto) <
      Number(venta.total)
    ) {

      // Mensaje de error que incluye el total formateado con separador de miles
      setError(
        `El monto debe ser igual o mayor al total de la venta: $${Number(
          venta.total
        ).toLocaleString()}`
      );

      return;

    }


    setCargando(true); // activa el estado de "cargando" (deshabilita el form, cambia el botón)


    try {

      // =================================================
      // ENVIAR PAGO AL BACKEND
      // =================================================

      // Llama a la API con POST, mandando los datos del pago como JSON
      const data = await apiFetch(
        "/confirmacion-banco",
        {
          method: "POST",

          body: JSON.stringify({

            id_venta:
              venta.id_venta, // id de la venta que se está pagando

            monto:
              Number(monto), // monto convertido a número

            // AQUÍ SE GUARDA EL BANCO
            metodo_pago:
              nombreBanco, // nombre del banco (de la lista o el escrito a mano)

            generar_factura:
              generarFactura // true/false según el checkbox

          })

        }
      );


      // =================================================
      // MOSTRAR RESULTADO
      // =================================================

      // Guarda la respuesta del backend; esto hace que la vista cambie
      // del formulario a la pantalla de "resultado" (pago confirmado)
      setResultado(data);


      // =================================================
      // LIMPIAR VENTA
      // =================================================

      // Se borra la venta activa y el cliente seleccionado del sessionStorage,
      // ya que el pago quedó registrado y no deben reutilizarse
      sessionStorage.removeItem(
        "ventaActiva"
      );

      sessionStorage.removeItem(
        "clienteSeleccionado"
      );


    } catch (err) {

      // Si la petición falla (red, backend, validación del servidor, etc.)
      console.error(
        "Error registrando pago:",
        err
      );

      // Se muestra el mensaje de error al usuario (o uno genérico si no viene ninguno)
      setError(
        err.message ||
        "No se pudo registrar el pago."
      );

    } finally {

      // Pase lo que pase, se desactiva el estado de "cargando" al finalizar
      setCargando(false);

    }

  };


  // =====================================================
  // SIN VENTA
  // =====================================================

  // Si no hay ninguna venta cargada Y tampoco hay un resultado ya confirmado,
  // se muestra una pantalla alternativa en vez del formulario normal
  if (!venta && !resultado) {

    return (

      <div className="container py-4">

        <div className="alert alert-warning">

          No hay ninguna venta activa para pagar.

          {/* Botón para redirigir a la pantalla de confirmar venta */}
          <button
            className="btn btn-sm btn-primary ms-2"
            onClick={() =>
              navigate("/caja/confirmar-venta")
            }
          >
            Ir a Confirmar Venta
          </button>

        </div>

      </div>

    );

  }


  // =====================================================
  // VISTA
  // =====================================================

  // Si sí hay venta (o ya hay un resultado), se renderiza la pantalla completa
  return (

    <div className="container py-4">

      {/* Tarjeta contenedora centrada, con ancho máximo de 650px */}
      <div
        className="card shadow mx-auto p-4"
        style={{
          width: "100%",
          maxWidth: "650px"
        }}
      >

        {/* ============================================= */}
        {/* TÍTULO */}
        {/* ============================================= */}

        <h3 className="text-primary fw-bold text-center mb-1">
          Confirmación Bancaria
        </h3>

        <p className="text-muted text-center small mb-4">
          Selecciona o escribe el banco utilizado
          para realizar el pago.
        </p>


        {/* ============================================= */}
        {/* ERROR */}
        {/* ============================================= */}

        {/* Solo se muestra si "error" tiene contenido (renderizado condicional) */}
        {error && (

          <div className="alert alert-danger">
            {error}
          </div>

        )}


        {/* ============================================= */}
        {/* RESULTADO */}
        {/* ============================================= */}

        {/* Si ya hay un "resultado" (pago confirmado), se muestra el resumen;
            si no, se muestra el formulario (bloque "else" más abajo) */}
        {resultado ? (

          <div className="alert alert-success">

            <h5 className="fw-bold">
              ✅ Pago confirmado correctamente
            </h5>

            {/* Mensaje que viene directamente del backend */}
            <p>
              {resultado.mensaje}
            </p>

            <hr />


            {/* Número de la venta pagada */}
            <p className="mb-1">
              <strong>Venta:</strong>{" "}
              #{resultado.id_venta}
            </p>


            {/* Banco con el que se pagó */}
            <p className="mb-1">
              <strong>Banco:</strong>{" "}
              {resultado.metodo_pago}
            </p>


            {/* Monto pagado, formateado con separador de miles */}
            <p className="mb-1">
              <strong>Valor:</strong>{" "}
              $
              {Number(
                resultado.monto
              ).toLocaleString()}
            </p>


            {/* ========================================= */}
            {/* FACTURA */}
            {/* ========================================= */}

            {/* Si el backend indica que se generó factura, se muestra el bloque de éxito */}
            {resultado.factura_generada && (

              <div className="bg-white border rounded p-3 mt-3">

                <h5 className="text-success fw-bold">
                  🧾 Factura generada
                </h5>

                <p className="mb-0">

                  Número de factura:

                  <strong className="ms-2">
                    {resultado.num_factura}
                  </strong>

                </p>

                <small className="text-muted">

                  La factura fue registrada
                  correctamente en la base de datos.

                </small>

              </div>

            )}


            {/* Si NO se generó factura, se muestra una advertencia en su lugar */}
            {!resultado.factura_generada && (

              <div className="alert alert-warning mt-3 mb-0">

                No se generó factura para este pago.

              </div>

            )}


            {/* ========================================= */}
            {/* NUEVA VENTA */}
            {/* ========================================= */}

            {/* Botón para volver a la pantalla de confirmar venta y empezar otra */}
            <button
              className="btn btn-primary mt-3"
              onClick={() =>
                navigate("/caja/confirmar-venta")
              }
            >
              Registrar otra venta
            </button>

          </div>

        ) : (

          // ============= FORMULARIO (cuando aún no hay resultado) =============
          <form onSubmit={confirmarPago}>


            {/* ========================================= */}
            {/* INFORMACIÓN DE LA VENTA */}
            {/* ========================================= */}

            {/* Solo se muestra si hay una venta cargada */}
            {venta && (

              <div className="bg-light rounded p-3 mb-4">

                <div className="d-flex justify-content-between">

                  <span>
                    Venta #{venta.id_venta}
                  </span>

                  {/* Total de la venta, formateado con separador de miles */}
                  <strong className="text-primary">

                    $
                    {Number(
                      venta.total
                    ).toLocaleString()}

                  </strong>

                </div>

              </div>

            )}


            {/* ========================================= */}
            {/* SELECCIONAR BANCO */}
            {/* ========================================= */}

            <div className="mb-3">

              <label
                htmlFor="banco"
                className="form-label fw-bold"
              >
                Banco utilizado
              </label>

              <select
                id="banco"
                className="form-select form-select-lg"
                value={banco}              // select controlado por React
                onChange={seleccionarBanco} // handler definido más arriba
                disabled={cargando}         // se bloquea mientras se está enviando el pago
                required                    // obligatorio
              >

                {/* Opción vacía/placeholder inicial */}
                <option value="">
                  Selecciona un banco
                </option>

                {/* Genera una <option> por cada banco de la lista "bancos" */}
                {bancos.map((nombre, index) => (

                  <option
                    key={index}     // key requerida por React (se usa el índice del arreglo)
                    value={nombre}
                  >
                    {nombre}
                  </option>

                ))}

              </select>

            </div>


            {/* ========================================= */}
            {/* OTRO BANCO */}
            {/* ========================================= */}

            {/* Este input solo aparece si el usuario eligió "Otro banco" en el select */}
            {banco === "Otro banco" && (

              <div className="mb-3">

                <label
                  htmlFor="otroBanco"
                  className="form-label fw-bold"
                >
                  Escribe el nombre del banco
                </label>

                <input
                  id="otroBanco"
                  type="text"
                  className="form-control form-control-lg"
                  placeholder="Ej: Banco Falabella"
                  value={otroBanco}    // input controlado por React
                  onChange={(e) =>
                    setOtroBanco(
                      e.target.value   // actualiza el texto libre en cada tecla
                    )
                  }
                  disabled={cargando}  // bloqueado mientras se envía el pago
                  required             // obligatorio si esta opción está visible
                />

                <small className="text-muted">
                  Puedes escribir cualquier banco.
                </small>

              </div>

            )}


            {/* ========================================= */}
            {/* MONTO */}
            {/* ========================================= */}

            <div className="mb-3">

              <label
                htmlFor="monto"
                className="form-label fw-bold"
              >
                Monto a confirmar
              </label>

              <input
                id="monto"
                type="number"
                min="1"                  // no permite valores menores a 1 desde el propio input
                className="form-control form-control-lg"
                value={monto}            // input controlado por React
                onChange={(e) =>
                  setMonto(
                    e.target.value       // actualiza el monto en cada tecla
                  )
                }
                disabled={cargando}      // bloqueado mientras se envía el pago
                required                 // obligatorio
              />

            </div>


            {/* ========================================= */}
            {/* RESUMEN */}
            {/* ========================================= */}

            {/* Caja de resumen que compara el total de la venta contra el monto ingresado,
                se actualiza en vivo mientras el usuario escribe */}
            <div className="border rounded p-3 mb-3">

              <div className="d-flex justify-content-between">

                <span>
                  Total de la venta:
                </span>

                {/* Si "venta" es null usa 0 como valor por defecto (operador ?.) */}
                <strong>
                  $
                  {Number(
                    venta?.total || 0
                  ).toLocaleString()}
                </strong>

              </div>


              <div className="d-flex justify-content-between mt-2">

                <span>
                  Monto recibido:
                </span>

                {/* Si "monto" está vacío usa 0 como valor por defecto */}
                <strong className="text-success">

                  $
                  {Number(
                    monto || 0
                  ).toLocaleString()}

                </strong>

              </div>

            </div>


            {/* ========================================= */}
            {/* FACTURA */}
            {/* ========================================= */}

            {/* Checkbox para decidir si se genera factura automáticamente */}
            <div className="border rounded p-3 mb-4">

              <div className="form-check">

                <input
                  className="form-check-input"
                  type="checkbox"
                  id="generarFactura"
                  checked={generarFactura}   // checkbox controlado por React
                  onChange={(e) =>
                    setGenerarFactura(
                      e.target.checked        // guarda true/false según el estado del checkbox
                    )
                  }
                  disabled={cargando}         // bloqueado mientras se envía el pago
                />

                <label
                  className="form-check-label fw-bold"
                  htmlFor="generarFactura"
                >
                  🧾 Generar factura
                </label>

              </div>

              <small className="text-muted">

                Si está marcada, se creará y registrará
                una factura automáticamente al confirmar
                el pago.

              </small>

            </div>


            {/* ========================================= */}
            {/* BOTÓN */}
            {/* ========================================= */}

            {/* Botón de envío del formulario, se deshabilita mientras "cargando" es true
                y cambia su texto para indicar que la operación está en curso */}
            <button
              type="submit"
              className="btn btn-success w-100 fw-bold"
              disabled={cargando}
            >

              {cargando
                ? "Confirmando pago..."
                : "Confirmar transacción"}

            </button>


          </form>

        )}

      </div>

    </div>

  );

}