// cypress/e2e/Administrador/cerrar-sesion.cy.js
const RUTA_INICIO = '/';
const RUTA_LOGIN = '/login';

// Las rutas están protegidas: se simula una sesión iniciada guardando
// "usuario_logueado" en localStorage antes de cargar la página.
function visitarConSesion(ruta) {
  cy.visit(ruta, {
    onBeforeLoad(win) {
      win.localStorage.setItem(
        'usuario_logueado',
        JSON.stringify({
          id: 1,
          nombre: 'Admin Cypress',
          correo: 'admin@test.com',
          rol: 'Administrador',
          id_autorizacion: 2,
        })
      );
    },
  });
}

// Si el menú está colapsado (hamburguesa), lo abre; luego pulsa "Cerrar sesión".
function cerrarSesion() {
  cy.get('body').then(($body) => {
    const $toggler = $body.find('.navbar-toggler:visible');
    if ($toggler.length) cy.wrap($toggler).click();
  });
  // Ajusta el texto si tu botón se llama distinto
  cy.contains(/cerrar sesi[oó]n|salir/i).click();
}

describe('Pruebas de Caja Negra - Cerrar sesión (UI)', () => {

  beforeEach(() => {
    cy.on('window:confirm', () => true);
    cy.on('window:alert', () => true);
    visitarConSesion(RUTA_INICIO);
  });

  it('CP-SES-01: Debe mostrar la opción de cerrar sesión a un usuario autenticado', () => {
    cy.url().should('not.include', RUTA_LOGIN);
    cy.get('body').then(($body) => {
      const $toggler = $body.find('.navbar-toggler:visible');
      if ($toggler.length) cy.wrap($toggler).click();
    });
    cy.contains(/cerrar sesi[oó]n|salir/i).should('be.visible');
  });

  it('CP-SES-02: Debe cerrar la sesión y redirigir al login', () => {
    cerrarSesion();

    cy.url().should('include', RUTA_LOGIN);
    cy.window().should((win) => {
      expect(win.localStorage.getItem('usuario_logueado')).to.be.null;
    });
  });

  it('CP-SES-03: Tras cerrar sesión NO debe permitir entrar a rutas protegidas', () => {
    cerrarSesion();
    cy.url().should('include', RUTA_LOGIN);

    cy.visit('/usuarios');
    cy.url().should('include', RUTA_LOGIN);
  });

});