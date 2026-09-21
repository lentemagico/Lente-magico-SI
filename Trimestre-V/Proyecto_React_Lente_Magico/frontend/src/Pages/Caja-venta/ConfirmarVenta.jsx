// Importamos React y dos hooks:
// - useState: para manejar estado local del componente
// - useEffect: para ejecutar efectos secundarios (como leer sessionStorage al montar)
import React, {
  useState,
  useEffect
} from "react";

// Hook de react-router-dom que permite navegar programáticamente entre rutas
import { useNavigate } from "react-router-dom";

// Funciones propias del proyecto:
// - apiFetch: envuelve "fetch" para llamar a la API (agrega URL base, headers, etc.)
// - obtenerSesion: devuelve los datos del usuario actualmente logueado
// import {
//   apiFetch,
//   obtenerSesion
// } from "../../config/api";
import { apiFetch } from "../../config/api";

function obtenerSesion() {
  const data = localStorage.getItem("usuario_logueado");
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}
// Componente funcional principal: pantalla donde se arma el carrito de una venta,
// se elige cliente y cajero, y se confirma la venta antes de pasar al pago
export default function ConfirmarVenta() {

  const navigate = useNavigate();


  // =====================================================
  // ESTADOS
  // =====================================================

  // Cliente seleccionado para la venta (viene de otra pantalla vía sessionStorage)
  const [cliente, setCliente] =
    useState(null);

  // Usuario (cajero) actualmente logueado
  const [usuario, setUsuario] =
    useState(null);

  // Texto que el usuario escribe en el buscador de productos
  const [busquedaProducto, setBusquedaProducto] =
    useState("");

  // Resultados de la búsqueda de productos (los que aparecen para poder "Agregar")
  const [resultados, setResultados] =
    useState([]);

  // Carrito de la venta: arreglo de productos con su cantidad y precio
  const [carrito, setCarrito] =
    useState([]);

  // Guarda el mensaje de error a mostrar (o null si no hay error)
  const [error, setError] =
    useState(null);

  // Bandera para saber si se está confirmando/guardando la venta
  const [cargando, setCargando] =
    useState(false);

  // Guarda los datos de la venta ya confirmada (id y total).
  // Mientras es null, se muestra el botón de "Confirmar venta";
  // cuando tiene datos, se muestran los botones de método de pago
  const [ventaConfirmada, setVentaConfirmada] =
    useState(null);


  // =====================================================
  // CARGAR CLIENTE Y USUARIO
  // =====================================================

  // Este efecto se ejecuta UNA sola vez, al montar el componente (dependencias vacías [])
  useEffect(() => {

    // -----------------------------------------------
    // CLIENTE
    // -----------------------------------------------

    // Se intenta leer del sessionStorage el cliente elegido en otra pantalla
    const clienteGuardado =
      sessionStorage.getItem(
        "clienteSeleccionado"
      );

    // Solo si hay algo guardado, se procesa
    if (clienteGuardado) {

      try {

        // Convierte el texto JSON guardado en un objeto JS y lo guarda en el estado
        setCliente(
          JSON.parse(clienteGuardado)
        );

      } catch (error) {

        // Si el JSON está corrupto, se registra el error en consola
        console.error(
          "Error al cargar cliente:",
          error
        );

        // Y se elimina la entrada corrupta del sessionStorage para evitar
        // que vuelva a fallar en un próximo intento
        sessionStorage.removeItem(
          "clienteSeleccionado"
        );

      }

    }


    // -----------------------------------------------
    // USUARIO LOGUEADO
    // -----------------------------------------------

    // Obtiene el usuario logueado desde la función auxiliar del proyecto
    const usuarioSesion =
      obtenerSesion();

    // Se imprime en consola para depuración
    console.log(
      "Usuario obtenido de la sesión:",
      usuarioSesion
    );


    // Si hay un usuario válido con un "id", se guarda en el estado
    if (
      usuarioSesion &&
      usuarioSesion.id
    ) {

      setUsuario(
        usuarioSesion
      );

    } else {

      // Si no hay sesión válida, se deja el usuario en null
      setUsuario(null);

    }

  }, []); // arreglo vacío = solo se ejecuta al montar el componente


  // =====================================================
  // BUSCAR PRODUCTOS
  // =====================================================

  // Handler del submit del formulario de búsqueda de productos
  const buscarProductos = async (e) => {

    e.preventDefault(); // evita que el navegador recargue la página al enviar el form

    setError(null); // limpia errores previos

    try {

      // Llama a la API pidiendo productos que coincidan con el texto buscado,
      // limitando el resultado a 8 productos
      const data = await apiFetch(
        `/productos?search=${encodeURIComponent(
          busquedaProducto
        )}&limit=8`
      );

      // Guarda los productos encontrados (o un arreglo vacío si no vino nada)
      setResultados(
        data.productos || []
      );

    } catch (err) {

      // Si la búsqueda falla, se registra en consola
      console.error(
        "Error buscando productos:",
        err
      );

      // Y se guarda el mensaje de error para mostrarlo al usuario
      setError(
        err.message
      );

    }

  };


  // =====================================================
  // AGREGAR PRODUCTO
  // =====================================================

  // Handler que agrega un producto de los resultados de búsqueda al carrito
  const agregarAlCarrito = (producto) => {

    // No se puede agregar un producto que no tenga stock disponible
    if (
      Number(producto.stock_actual) <= 0
    ) {

      setError(
        `El producto "${producto.nombre}" no tiene stock disponible.`
      );

      return; // corta la ejecución aquí

    }


    setError(null); // limpia errores previos


    // Se actualiza el carrito usando la forma funcional de setState,
    // ya que el nuevo valor depende del valor anterior del carrito
    setCarrito((prev) => {

      // Busca si el producto ya estaba en el carrito
      const existente =
        prev.find(
          (p) =>
            p.id_producto ===
            producto.id_producto
        );


      // -----------------------------------------------
      // SI YA EXISTE
      // -----------------------------------------------

      if (existente) {

        // Si ya está en el carrito, se le suma 1 a la cantidad actual
        const nuevaCantidad =
          existente.cantidad + 1;


        // Si la nueva cantidad supera el stock disponible, se muestra error
        // y se devuelve el carrito SIN cambios (prev, sin modificar)
        if (
          nuevaCantidad >
          Number(producto.stock_actual)
        ) {

          setError(
            `No puedes agregar más unidades de "${producto.nombre}". Stock disponible: ${producto.stock_actual}.`
          );

          return prev;

        }


        // Si hay stock suficiente, se recorre el carrito y se actualiza
        // solo la cantidad del producto que coincide con el agregado
        return prev.map((p) =>

          p.id_producto ===
          producto.id_producto

            ? {
                ...p,

                cantidad:
                  nuevaCantidad
              }

            : p

        );

      }


      // -----------------------------------------------
      // PRODUCTO NUEVO
      // -----------------------------------------------

      // Si el producto no estaba en el carrito, se agrega como un nuevo
      // elemento al final del arreglo, con cantidad inicial de 1
      return [

        ...prev,

        {

          id_producto:
            producto.id_producto,

          nombre:
            producto.nombre,

          // Se convierte el precio a número (por si viene como string desde la API)
          precio_unitario:
            Number(
              producto.precio_venta
            ),

          cantidad: 1,

          // Se guarda el stock disponible para poder validar cantidades después
          stock_actual:
            Number(
              producto.stock_actual
            )

        }

      ];

    });

  };


  // =====================================================
  // CAMBIAR CANTIDAD
  // =====================================================

  // Handler para cuando el usuario edita manualmente la cantidad de un producto
  // en el carrito (desde el input numérico de la tabla)
  const cambiarCantidad = (
    id_producto,
    cantidad
  ) => {

    // Busca el producto en el carrito por su id
    const producto =
      carrito.find(
        (p) =>
          p.id_producto ===
          id_producto
      );

    // Si por algún motivo no se encuentra, no se hace nada
    if (!producto) {
      return;
    }


    // Convierte el valor ingresado a entero; si no es un número válido, usa 1
    let cant =
      parseInt(
        cantidad,
        10
      ) || 1;


    // Nunca permite una cantidad menor a 1
    cant =
      Math.max(
        1,
        cant
      );


    // Si la cantidad pedida supera el stock disponible del producto
    if (
      cant >
      producto.stock_actual
    ) {

      setError(
        `Stock insuficiente. Disponible: ${producto.stock_actual}.`
      );

      // Se limita automáticamente la cantidad al máximo stock disponible
      cant =
        producto.stock_actual;

    } else {

      // Si la cantidad es válida, se limpia cualquier error previo
      setError(null);

    }


    // Actualiza el carrito, cambiando solo la cantidad del producto editado
    setCarrito((prev) =>

      prev.map((p) =>

        p.id_producto ===
        id_producto

          ? {
              ...p,
              cantidad: cant
            }

          : p

      )

    );

  };


  // =====================================================
  // QUITAR PRODUCTO
  // =====================================================

  // Handler para eliminar un producto del carrito
  const quitarDelCarrito = (
    id_producto
  ) => {

    // Filtra el carrito dejando fuera el producto con ese id
    setCarrito((prev) =>
      prev.filter(
        (p) =>
          p.id_producto !==
          id_producto
      )
    );

  };


  // =====================================================
  // TOTAL
  // =====================================================

  // Calcula el total de la venta sumando (precio_unitario * cantidad) de cada
  // producto del carrito. Se recalcula automáticamente en cada render
  // porque depende directamente del estado "carrito"
  const total =
    carrito.reduce(
      (acc, p) =>
        acc +
        Number(
          p.precio_unitario
        ) *
        Number(
          p.cantidad
        ),
      0 // valor inicial del acumulador
    );


  // =====================================================
  // CONFIRMAR VENTA
  // =====================================================

  // Handler que valida todo y envía la venta al backend
  const confirmarVenta = async () => {

    setError(null); // limpia errores previos


    // -----------------------------------------------
    // CLIENTE
    // -----------------------------------------------

    // No se puede confirmar sin un cliente seleccionado
    if (!cliente) {

      setError(
        "Debes seleccionar un cliente antes de continuar."
      );

      return;

    }


    // -----------------------------------------------
    // USUARIO
    // -----------------------------------------------

    // Se vuelve a consultar la sesión en este momento (por si cambió desde que se montó el componente)
    const usuarioActual =
      obtenerSesion();


    // Si no hay una sesión válida, no se puede continuar
    if (
      !usuarioActual ||
      !usuarioActual.id
    ) {

      setError(
        "No se encontró el usuario que inició sesión. Cierra sesión y vuelve a iniciar sesión."
      );

      return;

    }


    // -----------------------------------------------
    // CARRITO
    // -----------------------------------------------

    // No se puede confirmar una venta con el carrito vacío
    if (
      carrito.length === 0
    ) {

      setError(
        "Agrega al menos un producto al carrito."
      );

      return;

    }


    // Actualiza el estado "usuario" con los datos frescos de la sesión
    setUsuario(
      usuarioActual
    );

    setCargando(true); // activa el estado de "cargando"


    try {

      // =================================================
      // PAYLOAD
      // =================================================

      // Se arma el objeto que se enviará al backend con todos los datos de la venta
      const payload = {

        id_cliente:
          cliente.id_cliente,

        // IMPORTANTE:
        // viene automáticamente del login
        id_usuario:
          usuarioActual.id,

        estado:
          "Confirmada",

        // Se transforma cada producto del carrito al formato que espera el backend
        // (solo id, cantidad y precio unitario, sin datos extra como nombre o stock)
        productos:
          carrito.map((p) => ({

            id_producto:
              p.id_producto,

            cantidad:
              p.cantidad,

            precio_unitario:
              p.precio_unitario

          }))

      };


      // Se imprime en consola el payload completo, útil para depurar
      console.log(
        "Venta que se enviará al backend:",
        payload
      );


      // =================================================
      // ENVIAR VENTA
      // =================================================

      // Llama a la API con POST para registrar la venta
      const data =
        await apiFetch(
          "/confirmar-venta",
          {

            method: "POST",

            body:
              JSON.stringify(
                payload
              )

          }
        );


      // =================================================
      // GUARDAR VENTA ACTIVA
      // =================================================

      // Guarda en sessionStorage el id de la venta recién creada y su total,
      // para que la siguiente pantalla (pago) pueda leerlos
      sessionStorage.setItem(
        "ventaActiva",
        JSON.stringify({

          id_venta:
            data.id_venta,

          total:
            total

        })
      );


      // =================================================
      // LIMPIAR CARRITO
      // =================================================

      // Vacía el carrito ya que la venta quedó registrada
      setCarrito([]);


      // =================================================
      // MOSTRAR RESULTADO
      // =================================================

      // Guarda los datos de la venta confirmada; esto hace que la vista
      // cambie del botón "Confirmar venta" a los botones de método de pago
      setVentaConfirmada({

        id_venta:
          data.id_venta,

        total:
          total

      });


    } catch (err) {

      // Si algo falla al confirmar la venta, se registra en consola
      console.error(
        "Error al confirmar venta:",
        err
      );

      // Y se muestra el mensaje de error al usuario
      setError(
        err.message
      );

    } finally {

      // Pase lo que pase, se apaga el estado de "cargando" al final
      setCargando(false);

    }

  };


  // =====================================================
  // RENDER
  // =====================================================

  // Todo lo que retorna el componente es lo que realmente se ve en pantalla (JSX)
  return (

    <div className="container py-4">

      {/* Título principal de la página */}
      <h3 className="fw-bold text-primary mb-3">
        Confirmar Venta
      </h3>


      {/* =================================================
          ERROR
      ================================================= */}

      {/* Solo se muestra si "error" tiene contenido (renderizado condicional) */}
      {error && (

        <div className="alert alert-danger">

          {error}

        </div>

      )}


      {/* =================================================
          USUARIO CAJERO
     
        // Cambio para obtener el rol y el id_autorizacion del usuario logueado y mostrarlos en la pantalla de Confirmar Venta
         ================================================= */}
   <div className="card mb-3 p-3">

  <h6 className="text-muted text-uppercase small mb-2">
    {usuario?.rol || "Usuario"}
  </h6>

  {usuario ? (

    <div>

      <strong>
        {usuario.nombre}
      </strong>

      {" — "}

      {usuario.correo}

    </div>

  ) : (

          <div className="text-danger">

            No hay una sesión de cajero activa.

            <button
              className="btn btn-sm btn-primary ms-2"
              onClick={() =>
                navigate("/login")
              }
            >
              Iniciar sesión
            </button>

          </div>

        )}

      </div>


      {/* =================================================
          CLIENTE
      ================================================= */}

      <div className="card mb-3 p-3">

        <h6 className="text-muted text-uppercase small mb-2">
          Cliente
        </h6>


        {/* Si hay un cliente seleccionado, se muestra su nombre y documento/correo,
            con un botón para cambiarlo; si no, se muestra un botón para seleccionar uno */}
        {cliente ? (

          <div className="d-flex justify-content-between align-items-center">

            <span>

              <strong>

                {cliente.primer_nombre}

                {" "}

                {cliente.primer_apellido}

              </strong>

              {" — "}

              {/* Muestra el documento si existe; si no, usa el correo como respaldo */}
              {
                cliente.numero_documento ||
                cliente.correo
              }

            </span>


            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() =>
                navigate(
                  "/caja/consultar-cliente"
                )
              }
            >
              Cambiar
            </button>

          </div>

        ) : (

          <div className="d-flex justify-content-between align-items-center">

            <span className="text-muted">
              Ningún cliente seleccionado
            </span>


            <button
              className="btn btn-sm btn-primary"
              onClick={() =>
                navigate(
                  "/caja/consultar-cliente"
                )
              }
            >
              Seleccionar cliente
            </button>

          </div>

        )}

      </div>


      {/* =================================================
          PRODUCTOS
      ================================================= */}

      <div className="card mb-3 p-3">

        <h6 className="text-muted text-uppercase small mb-2">
          Productos
        </h6>


        {/* Formulario de búsqueda de productos */}
        <form
          onSubmit={buscarProductos}
          className="d-flex gap-2 mb-3"
        >

          <input
            className="form-control"
            placeholder="Buscar por nombre o código..."
            value={busquedaProducto}     // input controlado por React
            onChange={(e) =>
              setBusquedaProducto(
                e.target.value            // actualiza el texto en cada tecla
              )
            }
          />


          <button
            className="btn btn-outline-primary"
            type="submit"
          >
            Buscar
          </button>

        </form>


        {/* Solo se muestra la lista de resultados si hay al menos uno */}
        {resultados.length > 0 && (

          <div className="d-flex flex-column gap-2">

            {/* Se recorre cada producto encontrado y se muestra en una fila */}
            {resultados.map((p) => (

              <div
                key={p.id_producto} // key única requerida por React
                className="d-flex justify-content-between align-items-center p-2 bg-light rounded"
              >

                <span>

                  {p.nombre}

                  {" — $"}

                  {/* Precio formateado con separador de miles */}
                  {Number(
                    p.precio_venta
                  ).toLocaleString()}

                  {" "}

                  <small className="text-muted">

                    (stock:
                    {" "}
                    {p.stock_actual})

                  </small>

                </span>


                {/* Botón para agregar este producto al carrito;
                    se deshabilita si el producto no tiene stock */}
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() =>
                    agregarAlCarrito(p)
                  }
                  disabled={
                    Number(
                      p.stock_actual
                    ) <= 0
                  }
                >
                  Agregar
                </button>

              </div>

            ))}

          </div>

        )}

      </div>


      {/* =================================================
          CARRITO
      ================================================= */}

      <div className="card mb-3 p-3">

        <h6 className="text-muted text-uppercase small mb-2">
          Carrito
        </h6>


        {/* Si el carrito está vacío, se muestra un mensaje;
            si no, se muestra la tabla con los productos agregados */}
        {carrito.length === 0 ? (

          <p className="text-muted mb-0">
            El carrito está vacío
          </p>

        ) : (

          <table className="table table-sm align-middle mb-0">

            <thead>

              <tr>

                <th>
                  Producto
                </th>

                <th style={{ width: 90 }}>
                  Cant.
                </th>

                <th>
                  Precio
                </th>

                <th>
                  Subtotal
                </th>

                <th></th>

              </tr>

            </thead>


            <tbody>

              {/* Se recorre cada producto del carrito para dibujar su fila */}
              {carrito.map((p) => (

                <tr
                  key={
                    p.id_producto // key única requerida por React
                  }
                >

                  {/* Columna: nombre del producto */}
                  <td>
                    {p.nombre}
                  </td>


                  {/* Columna: input numérico para editar la cantidad,
                      limitado entre 1 y el stock disponible */}
                  <td>

                    <input
                      type="number"
                      min="1"
                      max={
                        p.stock_actual
                      }
                      className="form-control form-control-sm"
                      value={
                        p.cantidad
                      }
                      onChange={(e) =>
                        cambiarCantidad(
                          p.id_producto,
                          e.target.value
                        )
                      }
                    />

                  </td>


                  {/* Columna: precio unitario formateado */}
                  <td>

                    $
                    {Number(
                      p.precio_unitario
                    ).toLocaleString()}

                  </td>


                  {/* Columna: subtotal de esta fila (precio * cantidad), formateado */}
                  <td>

                    $

                    {(
                      Number(
                        p.precio_unitario
                      ) *
                      Number(
                        p.cantidad
                      )
                    ).toLocaleString()}

                  </td>


                  {/* Columna: botón para quitar el producto del carrito */}
                  <td>

                    <button
                      className="btn btn-sm btn-link text-danger"
                      onClick={() =>
                        quitarDelCarrito(
                          p.id_producto
                        )
                      }
                    >
                      Quitar
                    </button>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        )}


        {/* Fila final con el total general de la venta, formateado */}
        <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">

          <strong>
            Total
          </strong>


          <strong className="fs-5 text-success">

            $

            {total.toLocaleString()}

          </strong>

        </div>

      </div>


      {/* =================================================
          CONFIRMAR / PAGO
      ================================================= */}

      {/* Si aún no se ha confirmado la venta, se muestra el botón de confirmar;
          si ya se confirmó, se muestran los botones de método de pago */}
      {!ventaConfirmada ? (

        <button
          className="btn btn-success w-100 fw-bold py-2"
          onClick={confirmarVenta}
          disabled={
            cargando ||          // deshabilitado mientras se está guardando
            !usuario ||          // deshabilitado si no hay cajero logueado
            !cliente ||          // deshabilitado si no hay cliente seleccionado
            carrito.length === 0 // deshabilitado si el carrito está vacío
          }
        >

          {cargando
            ? "Guardando venta..."
            : "Confirmar venta y continuar al pago"
          }

        </button>

      ) : (

        <div className="card p-3 border-success">

          <p className="mb-2">

            ✅ Venta

            {" "}

            <strong>
              #{ventaConfirmada.id_venta}
            </strong>

            {" "}registrada por{" "}

            <strong>

              $

              {ventaConfirmada.total.toLocaleString()}

            </strong>

            .

            {" "}

            Elige cómo va a pagar el cliente:

          </p>


          {/* =================================================
              BOTONES DE MÉTODOS DE PAGO
          ================================================= */}

          {/* Cada botón navega a una ruta distinta según el método de pago elegido */}
          <div className="d-flex gap-2 flex-wrap">


            {/* =============================================
                EFECTIVO
            ============================================= */}

            <button
              className="btn btn-warning"
              onClick={() =>
                navigate("/caja/efectivo")
              }
            >
              Efectivo
            </button>


            {/* =============================================
                TARJETA CRÉDITO
            ============================================= */}

            <button
              className="btn btn-info"
              onClick={() =>
                navigate(
                  "/caja/tarjeta-credito"
                )
              }
            >
              Tarjeta crédito
            </button>


            {/* =============================================
                TARJETA DÉBITO
            ============================================= */}

            <button
              className="btn btn-info"
              onClick={() =>
                navigate(
                  "/caja/tarjeta-debito"
                )
              }
            >
              Tarjeta débito
            </button>


            {/* =============================================
                PLATAFORMAS DIGITALES
            ============================================= */}

            <button
              className="btn btn-primary"
              onClick={() =>
                navigate(
                  "/caja/plataformas"
                )
              }
            >
              Plataformas
            </button>


            {/* =============================================
                TRANSFERENCIA / BANCO
            ============================================= */}

            <button
              className="btn btn-secondary"
              onClick={() =>
                navigate(
                  "/caja/confirmacion-banco"
                )
              }
            >
              Transferencia / Banco
            </button>


          </div>

        </div>

      )}

    </div>

  );

}