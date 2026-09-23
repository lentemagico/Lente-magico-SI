import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";

import "bootstrap/dist/css/bootstrap.min.css";
import Nav from "./Components/Nav";
import Footer from "./Components/Footer";
import Login from "./Pages/Login/Login";
import Recuperar from "./Pages/Login/Recuperar";
{
  /* Admin */
}
import DeshboardAdmin from "./Components/DeshboardAdmin";
import Usuarios from "./Pages/Administrador/Usuarios";
import Autorizaciones from "./Pages/Administrador/Autorizacion";
import LogErrores from "./Pages/Administrador/LogErrores";

{
  /*Módulo Optometra*/
}
import HistoriaClinica from "./Pages/Optometra/HistoriaClinica";
import AgregarConsulta from "./Pages/Optometra/AgregarConsulta";
import GenerarFormula from "./Pages/Optometra/GenerarFormula";
import Antecedentes from "./Pages/Optometra/Antecedentes";

{
  /* caja-venta */
}
import ConsultarCliente from "./Pages/Caja-venta/ConsultarCliente";
import RegistrarDatosCliente from "./Pages/Caja-venta/RegistrarDatosCliente";
import AgendarConsulta from "./Pages/Caja-venta/AgendarConsulta";
import RegistrarServicio from "./Pages/Caja-venta/RegistrarServicio";
import AgregarProductos from "./Pages/Caja-venta/AgregarProductos";
import ConfirmarVenta from "./Pages/Caja-venta/ConfirmarVenta";
import VisualizarVenta from "./Pages/Caja-venta/VisualizarVenta";
import VisualizarProductoVendido from "./Pages/Caja-venta/VisualizarProductoVendido";
import CantidadProductosVendidos from "./Pages/Caja-venta/CantidadProductosVendidos";
import PrecioCadaProducto from "./Pages/Caja-venta/PrecioCadaProducto";
import FormasPago from "./Pages/Caja-venta/FormasPago";
import Efectivo from "./Pages/Caja-venta/Efectivo";
import TarjetaCredito from "./Pages/Caja-venta/TarjetaCredito";
import TarjetaDebito from "./Pages/Caja-venta/TarjetaDebito";
import ConfirmacionBanco from "./Pages/Caja-venta/ConfirmacionBanco";
import Plataformas from "./Pages/Caja-venta/Plataformas";
import "./Styles/estilosproyecto.css";

{
  /* Compra-bodega */
}
import "./Styles/Stylec.css";
import ConsultarProveedores from "./Pages/Compra-bodega/Proveedores.jsx";
import Categorias from "./Pages/Compra-bodega/Categorias.jsx";
import RegistroCompras from "./Pages/Compra-bodega/Registrocompras.jsx";
import ConsultarProducto from "./Pages/Compra-bodega/ConsultarProducto.jsx";

// ============================================================
// PROTECCIÓN DE RUTAS
// ============================================================
// Función que revisa si hay un usuario logueado (en localStorage)
// antes de mostrar el elemento de una ruta. Si no hay sesión,
// redirige al login en vez de mostrar el contenido protegido.
function verificarSesion(elemento) {
  const usuarioLogueado = localStorage.getItem("usuario_logueado");

  // Si no existe la sesión, redirige al login
  // ("replace" evita que con el botón "atrás" se vuelva a la página protegida)
  if (!usuarioLogueado) {
    return <Navigate to="/login" replace />;
  }

  // Si sí hay sesión, muestra la página normalmente
  return elemento;
}

function AppRoutes() {
  const location = useLocation();
  const paginasSinNav = ["/login", "/recuperar"];

  const ocultarNav = paginasSinNav.includes(location.pathname);
  return (
    <div className="app">
      {!ocultarNav && <Nav />}

      <main className="contenido">
        <Routes>
          <Route path="/" element={verificarSesion(<DeshboardAdmin />)} />
          <Route path="/usuarios" element={verificarSesion(<Usuarios />)} />
          <Route path="/autorizaciones" element={verificarSesion(<Autorizaciones />)}/>
          <Route path="/log-errores" element={verificarSesion(<LogErrores />)}/>
          <Route path="/login" element={<Login />} />
          <Route path="/recuperar" element={<Recuperar />} />
          <Route path="/optometra/historia-clinica" element={verificarSesion(<HistoriaClinica />)}/>
          <Route path="/optometra/agregar-consulta" element={verificarSesion(<AgregarConsulta />)}/>
          <Route path="/optometra/generar-formula" element={verificarSesion(<GenerarFormula />)}/>
          <Route path="/optometra/antecedentes" element={verificarSesion(<Antecedentes />)}/>

          {/* caja-venta */}
          <Route path="/caja/consultar-cliente" element={verificarSesion(<ConsultarCliente />)}/>
          <Route path="/caja/registrar-datos-cliente" element={verificarSesion(<RegistrarDatosCliente />)}/>
          <Route path="/caja/agendar-consulta" element={verificarSesion(<AgendarConsulta />)}/>
          <Route path="/caja/registrar-servicio" element={verificarSesion(<RegistrarServicio />)}/>
          <Route path="/caja/agregar-productos" element={verificarSesion(<AgregarProductos />)}/>
          <Route path="/caja/confirmar-venta" element={verificarSesion(<ConfirmarVenta />)}/>
          <Route path="/caja/visualizar-venta" element={verificarSesion(<VisualizarVenta />)}/>
          <Route path="/caja/visualizar-producto-vendido" element={verificarSesion(<VisualizarProductoVendido />)}/>
          <Route path="/caja/cantidad-productos-vendidos" element={verificarSesion(<CantidadProductosVendidos />)}/>
          <Route path="/caja/precio-cada-producto" element={verificarSesion(<PrecioCadaProducto />)}/>
          <Route path="/caja/formas-pago" element={verificarSesion(<FormasPago />)}/>
          <Route path="/caja/efectivo" element={verificarSesion(<Efectivo />)}/>
          <Route path="/caja/tarjeta-credito" element={verificarSesion(<TarjetaCredito />)}/>
          <Route path="/caja/tarjeta-debito" element={verificarSesion(<TarjetaDebito />)}/>
          <Route path="/caja/confirmacion-banco" element={verificarSesion(<ConfirmacionBanco />)}/>
          <Route path="/caja/plataformas" element={verificarSesion(<Plataformas />)}/>

          {/* Compra-bodega */}
          <Route path="/consultar-proveedores" element={verificarSesion(<ConsultarProveedores />)}/>
          <Route path="/categorias" element={verificarSesion(<Categorias />)}/>
          <Route path="/registro-compras" element={verificarSesion(<RegistroCompras />)} />
          <Route path="/ConsultarProducto" element={verificarSesion(<ConsultarProducto />)} />
        </Routes>
      </main>

      {!ocultarNav && <Footer />}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;