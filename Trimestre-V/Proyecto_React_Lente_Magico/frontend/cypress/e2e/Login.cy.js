// cypress/e2e/Administrador/login.cy.js
const RUTA = '/login'; // Ruta definida en App.jsx

// Credenciales de un usuario REAL de tu BD de pruebas
const CORREO_VALIDO = 'Admin@gmail.com';
const CLAVE_VALIDA = '123580';

const campoCorreo = () => cy.contains('label', 'Correo electrónico').parent().find('input');
const campoClave = () => cy.contains('label', 'Contraseña').parent().find('input');
const botonIngresar = () => cy.contains('button', 'Ingresar');

describe('Pruebas de Caja Negra - Login (UI)', () => {

  beforeEach(() => {
    cy.visit(RUTA);
  });

  // ============================================
  // CASO BÁSICO
  // ============================================
  it('CP-LOG-01: Debe cargar la página de login con sus campos', () => {
    cy.url().should('include', RUTA);
    cy.contains('h5', 'Iniciar Sesión').should('be.visible');
    campoCorreo().should('be.visible');
    campoClave().should('be.visible');
    botonIngresar().should('be.visible');
  });

  // ============================================
  // VALIDACIÓN DE FORMULARIO
  // ============================================
  it('CP-LOG-02: NO debe enviar el formulario con los campos vacíos', () => {
    cy.intercept('POST', '**/api/login').as('login');

    botonIngresar().click(); // Los campos required bloquean el envío

    cy.get('@login.all').should('have.length', 0);
    cy.url().should('include', RUTA);
  });

  // ============================================
  // LOGIN FALLIDO
  // ============================================
  it('CP-LOG-03: Debe mostrar error con credenciales incorrectas', () => {
    cy.intercept('POST', '**/api/login').as('login');

    campoCorreo().type('noexiste@test.com');
    campoClave().type('ClaveIncorrecta999');
    botonIngresar().click();

    cy.wait('@login').its('response.statusCode').should('not.eq', 200);
    cy.get('.alert-danger').should('be.visible');
    cy.url().should('include', RUTA);
  });

  // ============================================
  // LOGIN EXITOSO
  // ============================================
  it('CP-LOG-04: Debe iniciar sesión con credenciales válidas', () => {
    cy.window().then((win) => {
      cy.stub(win, 'alert').as('alerta');
    });
    cy.intercept('POST', '**/api/login').as('login');

    campoCorreo().type(CORREO_VALIDO);
    campoClave().type(CLAVE_VALIDA);
    botonIngresar().click();

    cy.wait('@login').its('response.statusCode').should('eq', 200);
    cy.get('@alerta').should('have.been.calledWithMatch', /Bienvenido al sistema/);
    cy.location('pathname').should('not.include', '/login');
  });
it('CP-LOG-05: Debe guardar el usuario en localStorage tras el login', () => {
  cy.on('window:alert', () => true);
  cy.intercept('POST', '**/api/login').as('login');

  campoCorreo().type(CORREO_VALIDO);
  campoClave().type(CLAVE_VALIDA);
  botonIngresar().click();

  cy.wait('@login').its('response.statusCode').should('eq', 200);

  // .should() reintenta hasta que la app termine de guardar en localStorage
  cy.window().should((win) => {
    const raw = win.localStorage.getItem('usuario_logueado');
    expect(raw, 'usuario_logueado en localStorage').to.not.be.null;

    const usuario = JSON.parse(raw);
    expect(usuario).to.have.all.keys('id', 'nombre', 'correo', 'rol', 'id_autorizacion');
    expect(usuario.correo.toLowerCase()).to.eq(CORREO_VALIDO.toLowerCase());
  });
});

  // ============================================
  // RECUPERAR CONTRASEÑA
  // ============================================
  it('CP-LOG-06: El enlace "Recupérala aquí" debe llevar a /recuperar', () => {
    cy.contains('¿Olvidaste tu contraseña?').should('be.visible');
    cy.contains('a', 'Recupérala aquí').click();
    cy.url().should('include', '/recuperar');
  });

  // ============================================
  // PROTECCIÓN DE RUTAS
  // ============================================
  it('CP-LOG-07: Una ruta protegida sin sesión debe redirigir a /login', () => {
    cy.visit('/usuarios');
    cy.url().should('include', RUTA);
  });

});