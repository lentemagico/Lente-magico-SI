import { Link, useNavigate } from "react-router-dom";
import { NavDropdown } from "react-bootstrap";
import { useState } from "react";

function Nav() {
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [bodegaAbierta, setBodegaAbierta] = useState(false);

  const cerrarMenu = () => {
    setMenuAbierto(false);
    setBodegaAbierta(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("usuario_logueado");
    navigate("/login");
  };

  return (
    <nav
      className="navbar navbar-expand-lg bg-body-tertiary"
      data-bs-theme="dark"
    >
      <div className="container-fluid">
        <Link className="navbar-brand" to="/">
          Lente Mágico
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNavDropdown"
          aria-controls="navbarNavDropdown"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNavDropdown">
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <Link className="nav-link active" aria-current="page" to="/">
                Inicio
              </Link>
            </li>

            {/* Dropdown Administrador */}
            <li className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle text-white"
                href="#"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                Administrador
              </a>
              <ul className="dropdown-menu">
                <li>
                  <Link className="dropdown-item" to="/autorizaciones">
                    01 - Autorizaciones
                  </Link>
                </li>
                <li>
                  <Link className="dropdown-item" to="/usuarios">
                    03 - Usuarios
                  </Link>
                </li>
                <li>
                  <Link className="dropdown-item" to="/log-errores">
                    62 - Log de Errores
                  </Link>
                </li>
              </ul>
            </li>

            {/* Menú único: Caja */}
            <NavDropdown title="Caja" id="dropdown-caja" className="text-white">
              {/* Clientes */}
              <NavDropdown title="Clientes" id="dropdown-clientes" drop="end">
                <NavDropdown.Item as={Link} to="/caja/consultar-cliente">
                  Consultar Cliente
                </NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/caja/registrar-datos-cliente">
                  Registrar Cliente
                </NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/caja/agendar-consulta">
                  Agendar Consulta
                </NavDropdown.Item>
              </NavDropdown>

              <NavDropdown.Divider />

              {/* Productos */}
              <NavDropdown title="Productos" id="dropdown-productos" drop="end">
                <NavDropdown.Item as={Link} to="/caja/agregar-productos">
                  Agregar Productos
                </NavDropdown.Item>

                <NavDropdown.Item as={Link} to="/caja/cantidad-productos-vendidos">
                  Cantidad de Productos Vendidos
                </NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/caja/visualizar-producto-vendido">
                 Visualizar Productos Vendidos
                </NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/caja/precio-cada-producto">
                  Precio del Producto
                </NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item as={Link} to="/caja/registrar-servicio">
                  Registrar Servicio
                </NavDropdown.Item>
              </NavDropdown>

              <NavDropdown.Divider />

              {/* Confirmar Venta */}
              <NavDropdown
                title="Confirmar Venta"
                id="dropdown-ventas"
                drop="end"
              >
                <NavDropdown.Item as={Link} to="/caja/confirmar-venta">
                  Confirmar Venta
                </NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/caja/visualizar-venta">
                  Visualizar Venta
                </NavDropdown.Item>
              </NavDropdown>

              <NavDropdown.Divider />

              {/* Formas de Pago */}
              <NavDropdown
                title="Formas de Pago"
                id="dropdown-pagos"
                drop="end"
              >
                <NavDropdown.Item as={Link} to="/caja/efectivo">
                  Efectivo
                </NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/caja/tarjeta-credito">
                  Tarjeta de Crédito
                </NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/caja/tarjeta-debito">
                  Tarjeta Débito
                </NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/caja/plataformas">
                  Plataformas
                </NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item as={Link} to="/caja/confirmacion-banco">
                  Confirmación de Banco
                </NavDropdown.Item>
              </NavDropdown>
            </NavDropdown>

            {/* Compra-bodega */}
            <li className={`nav-item dropdown ${menuAbierto ? 'show' : ''}`}>
              <button
                className="nav-link text-white dropdown-toggle btn btn-link border-0"
                role="button"
                onClick={() => setMenuAbierto(!menuAbierto)}
                style={{ background: 'none', boxShadow: 'none' }}
              >
                Compras
              </button>

              <ul className={`dropdown-menu ${menuAbierto ? 'show' : ''}`}>
                <li><Link className="dropdown-item" to="/consultar-proveedores" onClick={cerrarMenu}>Proveedores</Link></li>
                <li><Link className="dropdown-item" to="/categorias" onClick={cerrarMenu}>Categorias</Link></li>
                <li><Link className="dropdown-item" to="/registro-compras" onClick={cerrarMenu}>Registro de compras</Link></li>
              </ul>
            </li>

            <li className={`nav-item dropdown ${bodegaAbierta ? 'show' : ''}`}>
              <button
                className="nav-link text-white dropdown-toggle btn btn-link border-0"
                role="button"
                onClick={() => setBodegaAbierta(!bodegaAbierta)}
                style={{ background: 'none', boxShadow: 'none' }}
              >
                Bodega
              </button>

              <ul className={`dropdown-menu ${bodegaAbierta ? 'show' : ''}`}>
                <li><Link className="dropdown-item" to="/consultarProducto" onClick={cerrarMenu}>Consultar Producto</Link></li>
              </ul>
            </li>

            {/* Dropdown Optómetra */}
            <li className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle text-white"
                href="#"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                Optómetra
              </a>
              <ul className="dropdown-menu">
                <li>
                  <Link className="dropdown-item" to="/optometra/agregar-consulta">
                    Agregar Consulta
                  </Link>
                </li>
                <li>
                  <Link className="dropdown-item" to="/optometra/generar-formula">
                    Generar Fórmula
                  </Link>
                </li>
                <li>
                  <Link className="dropdown-item" to="/optometra/historia-clinica">
                    Historia Clínica
                  </Link>
                </li>
                <li>
                  <Link className="dropdown-item" to="/optometra/antecedentes">
                    Antecedentes
                  </Link>
                </li>
              </ul>
            </li>
          </ul>
          <button
            className="btn btn-outline-light ms-auto"
            onClick={handleLogout}
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Nav;