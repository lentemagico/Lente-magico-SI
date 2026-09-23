// import { useEffect, useState } from "react";
// import { Link } from "react-router-dom";

// const URL_USUARIOS = "/api/administrador/usuarios";
// const URL_AUTORIZACIONES = "/api/administrador/autorizaciones";
// const URL_LOG_ERRORES = "/api/administrador/logErrores";

// function DeshboardAdmin() {
//   const [usuarios, setUsuarios] = useState([]);
//   const [roles, setRoles] = useState([]);
//   const [logs, setLogs] = useState([]);

//   const [cargando, setCargando] = useState(true);
//   const [error, setError] = useState("");

//   useEffect(() => {
//     async function cargarDashboard() {
//       try {
//         setCargando(true);
//         setError("");

//         const [respuestaUsuarios, respuestaRoles, respuestaLogs] =
//           await Promise.all([
//             fetch(URL_USUARIOS),
//             fetch(URL_AUTORIZACIONES),
//             fetch(URL_LOG_ERRORES),
//           ]);

//         if (!respuestaUsuarios.ok || !respuestaRoles.ok || !respuestaLogs.ok) {
//           throw new Error("No fue posible cargar la información del panel.");
//         }

//         const dataUsuarios = await respuestaUsuarios.json();
//         const dataRoles = await respuestaRoles.json();
//         const dataLogs = await respuestaLogs.json();

//         setUsuarios(Array.isArray(dataUsuarios) ? dataUsuarios : []);
//         setRoles(Array.isArray(dataRoles) ? dataRoles : []);
//         setLogs(Array.isArray(dataLogs) ? dataLogs : []);
//       } catch (err) {
//         console.error("Error al cargar dashboard:", err);
//         setError(err.message);
//       } finally {
//         setCargando(false);
//       }
//     }

//     cargarDashboard();
//   }, []);

//   const fechaHoy = new Date().toISOString().slice(0, 10);

//   const erroresCriticosHoy = logs.filter((log) => {
//     const nivel = (log.nivel || "").toLowerCase();
//     const fechaLog = String(log.fecha || "").slice(0, 10);

//     return (
//       (nivel === "crítico" || nivel === "critico") && fechaLog === fechaHoy
//     );
//   });

//   const ultimosUsuarios = usuarios.slice(0, 5);

//   return (
//     <div className="container mt-4 mb-5">
//       <div className="mb-4">
//         <h1 className="fw-bold">Bienvenido al Módulo de Administrador</h1>

//         <p className="text-muted fs-5">
//           Gestiona accesos, roles de usuario y registros del sistema.
//         </p>
//       </div>

//       {error && <div className="alert alert-danger">{error}</div>}

//       <div className="row g-3 mb-4">
//         <div className="col-md-6 col-lg-3">
//           <div className="card shadow-sm h-100 border-start border-4 border-primary">
//             <div className="card-body">
//               <p className="text-muted mb-2">Usuarios registrados</p>
//               <h2 className="fw-bold mb-0">
//                 {cargando ? "..." : usuarios.length}
//               </h2>
//             </div>
//           </div>
//         </div>

//         <div className="col-md-6 col-lg-3">
//           <div className="card shadow-sm h-100 border-start border-4 border-success">
//             <div className="card-body">
//               <p className="text-muted mb-2">Roles disponibles</p>
//               <h2 className="fw-bold mb-0">
//                 {cargando ? "..." : roles.length}
//               </h2>
//             </div>
//           </div>
//         </div>

//         <div className="col-md-6 col-lg-3">
//           <div className="card shadow-sm h-100 border-start border-4 border-danger">
//             <div className="card-body">
//               <p className="text-muted mb-2">Errores críticos hoy</p>
//               <h2 className="fw-bold mb-0">
//                 {cargando ? "..." : erroresCriticosHoy.length}
//               </h2>
//             </div>
//           </div>
//         </div>

//         <div className="col-md-6 col-lg-3">
//           <div className="card shadow-sm h-100 border-start border-4 border-warning">
//             <div className="card-body">
//               <p className="text-muted mb-2">Logs del sistema</p>
//               <h2 className="fw-bold mb-0">{cargando ? "..." : logs.length}</h2>
//             </div>
//           </div>
//         </div>
//       </div>

//       <h3 className="fw-bold mb-3">Acciones rápidas</h3>

//       <div className="row g-3 mb-4">
//         <div className="col-md-4">
//           <Link
//             to="/usuarios"
//             className="card shadow-sm h-100 text-decoration-none text-dark"
//           >
//             <div className="card-body">
//               <h5 className="fw-bold">Gestionar usuarios</h5>
//               <p className="mb-0 text-muted">
//                 Crear, editar o desactivar cuentas de acceso.
//               </p>
//             </div>
//           </Link>
//         </div>

//         <div className="col-md-4">
//           <Link
//             to="/autorizaciones"
//             className="card shadow-sm h-100 text-decoration-none text-dark"
//           >
//             <div className="card-body">
//               <h5 className="fw-bold">Configurar roles</h5>
//               <p className="mb-0 text-muted">
//                 Administrar permisos y autorizaciones.
//               </p>
//             </div>
//           </Link>
//         </div>

//         <div className="col-md-4">
//           <Link
//             to="/log-errores"
//             className="card shadow-sm h-100 text-decoration-none text-dark"
//           >
//             <div className="card-body">
//               <h5 className="fw-bold">Log de errores</h5>
//               <p className="mb-0 text-muted">
//                 Consultar fallos y registros del sistema.
//               </p>
//             </div>
//           </Link>
//         </div>

//         <div className="col-md-4">
//           <Link
//             to="/caja/consultar-cliente"
//             className="card shadow-sm h-100 text-decoration-none text-dark"
//           >
//             <div className="card-body">
//               <h5 className="fw-bold">Caja</h5>
//               <p className="mb-0 text-muted">
//                 Gestionar clientes, ventas y pagos.
//               </p>
//             </div>
//           </Link>
//         </div>

//         <div className="col-md-4">
//           <Link
//             to="/consultar-proveedores"
//             className="card shadow-sm h-100 text-decoration-none text-dark"
//           >
//             <div className="card-body">
//               <h5 className="fw-bold">Compras</h5>
//               <p className="mb-0 text-muted">
//                 Gestionar proveedores, categorías y registros de compra.
//               </p>
//             </div>
//           </Link>
//         </div>

//         <div className="col-md-4">
//           <Link
//             to="/ConsultarProducto"
//             className="card shadow-sm h-100 text-decoration-none text-dark"
//           >
//             <div className="card-body">
//               <h5 className="fw-bold">Bodega</h5>
//               <p className="mb-0 text-muted">
//                 Consultar productos e inventario disponible.
//               </p>
//             </div>
//           </Link>
//         </div>

//         <div className="col-md-4">
//           <Link
//             to="/optometra/agregar-consulta"
//             className="card shadow-sm h-100 text-decoration-none text-dark"
//           >
//             <div className="card-body">
//               <h5 className="fw-bold">Optómetra</h5>
//               <p className="mb-0 text-muted">
//                 Consultas, historia clínica y fórmulas ópticas.
//               </p>
//             </div>
//           </Link>
//         </div>
//       </div>

//       <div className="card shadow-sm">
//         <div className="card-body p-4">
//           <h3 className="fw-bold mb-3">Últimos usuarios registrados</h3>

//           <div className="table-responsive">
//             <table className="table align-middle">
//               <thead className="table-light">
//                 <tr>
//                   <th>#ID</th>
//                   <th>Usuario</th>
//                   <th>Correo</th>
//                   <th>Estado</th>
//                   <th>Acciones</th>
//                 </tr>
//               </thead>

//               <tbody>
//                 {cargando && (
//                   <tr>
//                     <td colSpan="5" className="text-center text-muted py-4">
//                       Cargando información...
//                     </td>
//                   </tr>
//                 )}

//                 {!cargando &&
//                   ultimosUsuarios.map((usuario) => (
//                     <tr key={usuario.id}>
//                       <td>{usuario.id}</td>

//                       <td>
//                         {[
//                           usuario.primer_nombre,
//                           usuario.segundo_nombre,
//                           usuario.primer_apellido,
//                           usuario.segundo_apellido,
//                         ]
//                           .filter(Boolean)
//                           .join(" ") || "Sin nombre"}
//                       </td>

//                       <td>{usuario.correo || "-"}</td>

//                       <td>
//                         <span
//                           className={
//                             Number(usuario.activar_usuario) === 1
//                               ? "badge text-bg-success"
//                               : "badge text-bg-secondary"
//                           }
//                         >
//                           {Number(usuario.activar_usuario) === 1
//                             ? "Activo"
//                             : "Inactivo"}
//                         </span>
//                       </td>

//                       <td>
//                         <Link
//                           to="/usuarios"
//                           className="btn btn-sm btn-outline-primary"
//                         >
//                           Ver usuarios
//                         </Link>
//                       </td>
//                     </tr>
//                   ))}

//                 {!cargando && ultimosUsuarios.length === 0 && (
//                   <tr>
//                     <td colSpan="5" className="text-center text-muted py-4">
//                       No se encontraron registros de usuarios en el servidor.
//                     </td>
//                   </tr>
//                 )}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default DeshboardAdmin;
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../Styles/DeshboardAdmin.css";

const URL_USUARIOS = "/api/administrador/usuarios";
const URL_AUTORIZACIONES = "/api/administrador/autorizaciones";
const URL_LOG_ERRORES = "/api/administrador/logErrores";

function DeshboardAdmin() {
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [logs, setLogs] = useState([]);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function cargarDashboard() {
      try {
        setCargando(true);
        setError("");

        const [respuestaUsuarios, respuestaRoles, respuestaLogs] =
          await Promise.all([
            fetch(URL_USUARIOS),
            fetch(URL_AUTORIZACIONES),
            fetch(URL_LOG_ERRORES),
          ]);

        if (!respuestaUsuarios.ok || !respuestaRoles.ok || !respuestaLogs.ok) {
          throw new Error("No fue posible cargar la información del panel.");
        }

        const dataUsuarios = await respuestaUsuarios.json();
        const dataRoles = await respuestaRoles.json();
        const dataLogs = await respuestaLogs.json();

        setUsuarios(Array.isArray(dataUsuarios) ? dataUsuarios : []);
        setRoles(Array.isArray(dataRoles) ? dataRoles : []);
        setLogs(Array.isArray(dataLogs) ? dataLogs : []);
      } catch (err) {
        console.error("Error al cargar dashboard:", err);
        setError(err.message);
      } finally {
        setCargando(false);
      }
    }

    cargarDashboard();
  }, []);

  const fechaHoy = new Date().toISOString().slice(0, 10);

  const erroresCriticosHoy = logs.filter((log) => {
    const nivel = (log.nivel || "").toLowerCase();
    const fechaLog = String(log.fecha || "").slice(0, 10);

    return (
      (nivel === "crítico" || nivel === "critico") && fechaLog === fechaHoy
    );
  });

  const ultimosUsuarios = usuarios.slice(0, 5);

  return (
    <div className="container mt-4 mb-5">
      <div className="mb-4">
        <h1 className="fw-bold dashboard-title">
          Bienvenido al Módulo de Administrador
        </h1>

        <p className="fs-5 dashboard-subtitle">
          Gestiona accesos, roles de usuario y registros del sistema.
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-3 mb-4">
        <div className="col-md-6 col-lg-3">
          <div className="card stat-card accent-primary h-100">
            <div className="card-body">
              <p className="stat-label mb-0">Usuarios registrados</p>
              <h2 className="stat-value mb-0">
                {cargando ? "..." : usuarios.length}
              </h2>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-lg-3">
          <div className="card stat-card accent-success h-100">
            <div className="card-body">
              <p className="stat-label mb-0">Roles disponibles</p>
              <h2 className="stat-value mb-0">
                {cargando ? "..." : roles.length}
              </h2>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-lg-3">
          <div className="card stat-card accent-danger h-100">
            <div className="card-body">
              <p className="stat-label mb-0">Errores críticos hoy</p>
              <h2 className="stat-value mb-0">
                {cargando ? "..." : erroresCriticosHoy.length}
              </h2>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-lg-3">
          <div className="card stat-card accent-warning h-100">
            <div className="card-body">
              <p className="stat-label mb-0">Logs del sistema</p>
              <h2 className="stat-value mb-0">
                {cargando ? "..." : logs.length}
              </h2>
            </div>
          </div>
        </div>
      </div>

      <h3 className="section-title mb-3">Acciones rápidas</h3>

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <Link
            to="/usuarios"
            className="card action-card h-100 text-decoration-none"
          >
            <div className="card-body">
              <div className="action-icon icon-blue">👤</div>
              <div>
                <h5 className="action-title">Gestionar usuarios</h5>
                <p className="action-desc">
                  Crear, editar o desactivar cuentas de acceso.
                </p>
              </div>
            </div>
          </Link>
        </div>

        <div className="col-md-4">
          <Link
            to="/autorizaciones"
            className="card action-card h-100 text-decoration-none"
          >
            <div className="card-body">
              <div className="action-icon icon-purple">🔐</div>
              <div>
                <h5 className="action-title">Configurar roles</h5>
                <p className="action-desc">
                  Administrar permisos y autorizaciones.
                </p>
              </div>
            </div>
          </Link>
        </div>

        <div className="col-md-4">
          <Link
            to="/log-errores"
            className="card action-card h-100 text-decoration-none"
          >
            <div className="card-body">
              <div className="action-icon icon-red">⚠️</div>
              <div>
                <h5 className="action-title">Log de errores</h5>
                <p className="action-desc">
                  Consultar fallos y registros del sistema.
                </p>
              </div>
            </div>
          </Link>
        </div>

        <div className="col-md-4">
          <Link
            to="/caja/consultar-cliente"
            className="card action-card h-100 text-decoration-none"
          >
            <div className="card-body">
              <div className="action-icon icon-green">💵</div>
              <div>
                <h5 className="action-title">Caja</h5>
                <p className="action-desc">
                  Gestionar clientes, ventas y pagos.
                </p>
              </div>
            </div>
          </Link>
        </div>

        <div className="col-md-4">
          <Link
            to="/consultar-proveedores"
            className="card action-card h-100 text-decoration-none"
          >
            <div className="card-body">
              <div className="action-icon icon-orange">📦</div>
              <div>
                <h5 className="action-title">Compras</h5>
                <p className="action-desc">
                  Gestionar proveedores, categorías y registros de compra.
                </p>
              </div>
            </div>
          </Link>
        </div>

        <div className="col-md-4">
          <Link
            to="/ConsultarProducto"
            className="card action-card h-100 text-decoration-none"
          >
            <div className="card-body">
              <div className="action-icon icon-teal">🏬</div>
              <div>
                <h5 className="action-title">Bodega</h5>
                <p className="action-desc">
                  Consultar productos e inventario disponible.
                </p>
              </div>
            </div>
          </Link>
        </div>

        <div className="col-md-4">
          <Link
            to="/optometra/agregar-consulta"
            className="card action-card h-100 text-decoration-none"
          >
            <div className="card-body">
              <div className="action-icon icon-pink">👓</div>
              <div>
                <h5 className="action-title">Optómetra</h5>
                <p className="action-desc">
                  Consultas, historia clínica y fórmulas ópticas.
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      <div className="card table-card">
        <div className="card-body p-4">
          <h3 className="section-title mb-3">Últimos usuarios registrados</h3>

          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>#ID</th>
                  <th>Usuario</th>
                  <th>Correo</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {cargando && (
                  <tr>
                    <td colSpan="5" className="text-center text-muted py-4">
                      Cargando información...
                    </td>
                  </tr>
                )}

                {!cargando &&
                  ultimosUsuarios.map((usuario) => (
                    <tr key={usuario.id}>
                      <td>{usuario.id}</td>

                      <td>
                        {[
                          usuario.primer_nombre,
                          usuario.segundo_nombre,
                          usuario.primer_apellido,
                          usuario.segundo_apellido,
                        ]
                          .filter(Boolean)
                          .join(" ") || "Sin nombre"}
                      </td>

                      <td>{usuario.correo || "-"}</td>

                      <td>
                        <span
                          className={
                            Number(usuario.activar_usuario) === 1
                              ? "badge text-bg-success"
                              : "badge text-bg-secondary"
                          }
                        >
                          {Number(usuario.activar_usuario) === 1
                            ? "Activo"
                            : "Inactivo"}
                        </span>
                      </td>

                      <td>
                        <Link
                          to="/usuarios"
                          className="btn btn-sm btn-outline-primary"
                        >
                          Ver usuarios
                        </Link>
                      </td>
                    </tr>
                  ))}

                {!cargando && ultimosUsuarios.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center text-muted py-4">
                      No se encontraron registros de usuarios en el servidor.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DeshboardAdmin;