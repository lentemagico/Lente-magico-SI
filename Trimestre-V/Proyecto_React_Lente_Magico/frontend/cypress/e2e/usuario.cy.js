// cypress/e2e/Administrador/usuarios.cy.js
const RUTA = '/usuarios'; // Ruta definida en App.jsx

// Las rutas están protegidas (verificarSesion en App.jsx): sin "usuario_logueado"
// en localStorage la app redirige a /login. Cypress limpia el localStorage entre
// tests, por eso la sesión se simula en cada visita.
function visitarConSesion(ruta) {
  cy.visit(ruta, {
    onBeforeLoad(win) {
      win.localStorage.setItem(
        'usuario_logueado',
        JSON.stringify({ id: 1, nombre: 'Admin Cypress', login: 'admin', rol: 'Administrador' })
      );
    },
  });
}

// Últimos n dígitos de un valor único (documento y teléfono deben ser únicos en la BD)
function digitos(n) {
  return String(Date.now() + Math.floor(Math.random() * 1000)).slice(-n);
}

// Llena los campos obligatorios del formulario con datos únicos.
// Los nombres son solo letras porque el input rechaza números.
function llenarFormulario(documento) {
  cy.contains('label', 'Tipo de documento').parent().find('select').select(1);
  cy.contains('label', 'Número de documento').parent().find('input').type(documento);
  cy.contains('label', 'Primer nombre').parent().find('input').type('Prueba');
  cy.contains('label', 'Primer apellido').parent().find('input').type('Cypress');
  cy.contains('label', 'Fecha de nacimiento').parent().find('input').type('1995-05-20');
  cy.contains('label', 'Teléfono').parent().find('input').type('3' + digitos(9));
  cy.contains('label', 'Correo').parent().find('input').type(`cy${documento}@test.com`);
  cy.contains('label', 'Autorización').parent().find('select').select(1);
  cy.contains('label', 'Contraseña').parent().find('input').type('Clave1234');
}

describe('Pruebas de Caja Negra - Usuarios (UI)', () => {

  // 🔑 Registrar los handlers UNA VEZ, antes de todos los tests
  beforeEach(() => {
    cy.on('window:confirm', () => true);   // Aceptar cualquier confirm
    cy.on('window:alert', () => true);      // Aceptar cualquier alert
    visitarConSesion(RUTA);
  });

  // ============================================
  // CASOS BÁSICOS
  // ============================================
  it('CP-USU-01: Debe cargar la página de usuarios', () => {
    cy.url().should('include', RUTA);
  });

  it('CP-USU-02: Debe mostrar el título "Usuarios"', () => {
    cy.contains('h3', 'Usuarios').should('be.visible');
  });

  // ============================================
  // CASOS DE CREACIÓN
  // ============================================
  it('CP-USU-03: Debe crear un nuevo usuario correctamente', () => {
    const documento = digitos(9);

    cy.intercept('POST', '**/api/administrador/usuarios').as('crearUsuario');

    cy.contains('button', '+ Nuevo usuario').click();
    llenarFormulario(documento);
    cy.contains('button', 'Guardar').click();

    cy.wait('@crearUsuario').its('response.statusCode').should('eq', 201);
    cy.contains('td', documento).should('be.visible');
  });

  it('CP-USU-04: NO debe crear un usuario con los campos vacíos', () => {
    // El .then() espera a que la tabla esté cargada con datos reales
    cy.get('table tbody tr').then(($filas) => {
      const filasAntes = $filas.length;

      cy.contains('button', '+ Nuevo usuario').click();
      cy.contains('button', 'Guardar').click(); // Los campos required bloquean el envío

      // Verificamos que la cantidad no haya cambiado
      cy.get('table tbody tr').should('have.length', filasAntes);
    });
  });

  it('CP-USU-05: La lista debe cargar los datos desde el backend', () => {
    cy.intercept('GET', '**/api/administrador/usuarios').as('getUsuarios');
    visitarConSesion(RUTA);
    cy.wait('@getUsuarios').its('response.statusCode').should('eq', 200);
    cy.get('table tbody tr').should('have.length.greaterThan', 0);
  });

  // ============================================
  // CASO DE ELIMINACIÓN
  // ============================================
  // Pendiente: el frontend llama a DELETE /api/administrador/usuarios/:id, pero esa
  // ruta todavía no existe en usuarios.js. Quita el ".skip" cuando la crees.
  it('CP-USU-06: Debe eliminar un usuario existente', () => {
    const documento = digitos(9);

    cy.intercept('POST', '**/api/administrador/usuarios').as('crearUsuario');
    cy.intercept('DELETE', '**/api/administrador/usuarios/*').as('borrarUsuario');

    // 1. Crear el usuario
    cy.contains('button', '+ Nuevo usuario').click();
    llenarFormulario(documento);
    cy.contains('button', 'Guardar').click();
    cy.wait('@crearUsuario');
    cy.contains('td', documento).should('be.visible');

    // 2. Clic en eliminar (🗑️) en la fila correspondiente
    cy.contains('tr', documento).within(() => {
      cy.get('button.btn-outline-danger').click();
    });

    // 3. Esperar a que el DELETE se complete
    cy.wait('@borrarUsuario').its('response.statusCode').should('be.oneOf', [200, 204]);

    // 4. Verificar que ya no esté
    cy.contains('td', documento).should('not.exist');
  });

  // ============================================
  // CASO DE EDICIÓN
  // ============================================
  it('CP-USU-07: Debe abrir la edición de un usuario', () => {
    // Hacemos clic en el primer botón de editar (🖋️) de la tabla
    cy.get('table tbody tr').first().within(() => {
      cy.get('button.btn-outline-secondary').click();
    });

    // Verificar que aparece el formulario en modo edición
    cy.get('.card-title').should('contain', 'Editar usuario');
    cy.get('input[placeholder="Dejar vacío para no cambiar"]').should('be.visible');
  });

});