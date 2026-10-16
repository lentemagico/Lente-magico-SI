// cypress/e2e/Administrador/logErrores.cy.js
const RUTA = '/log-errores';

const erroresPrueba = [
  {
    id: 1,
    nivel: 'Crítico',
    nombre_usuario: 'Ana',
    mensaje: 'Error al guardar usuario',
    fecha: '2026-10-14T10:00:00',
  },
  {
    id: 2,
    nivel: 'Advertencia',
    nombre_usuario: 'Carlos',
    mensaje: 'Advertencia de inventario',
    fecha: '2026-10-14T11:00:00',
  },
  {
    id: 3,
    nivel: 'Info',
    nombre_usuario: 'Sistema',
    mensaje: 'Inicio de sesión correcto',
    fecha: '2026-10-14T12:00:00',
  },
];

function visitarConSesion(ruta) {
  cy.visit(ruta, {
    onBeforeLoad(win) {
      win.localStorage.setItem(
        'usuario_logueado',
        JSON.stringify({
          id: 1,
          nombre: 'Admin Cypress',
          login: 'admin',
          rol: 'Administrador',
        })
      );
    },
  });
}

describe('Pruebas de Caja Negra - Log de errores (UI)', () => {
  beforeEach(() => {
    cy.on('window:confirm', () => true);
    cy.on('window:alert', () => true);

    cy.intercept('GET', '**/api/administrador/logErrores', {
      statusCode: 200,
      body: erroresPrueba,
    }).as('getErrores');

    visitarConSesion(RUTA);
    cy.wait('@getErrores');
  });

  // ============================================
  // CASOS BÁSICOS
  // ============================================
  it('CP-LOG-01: Debe cargar la página del log de errores', () => {
    cy.url().should('include', RUTA);
  });

  it('CP-LOG-02: Debe mostrar el título "Log de errores"', () => {
    cy.contains('h3', 'Log de errores').should('be.visible');
  });

  // ============================================
  // CASO DE CARGA
  // ============================================
  it('CP-LOG-03: Debe mostrar los registros recibidos', () => {
    cy.contains('th', 'Nivel').should('be.visible');
    cy.contains('th', 'Usuario').should('be.visible');
    cy.contains('th', 'Mensaje').should('be.visible');
    cy.contains('th', 'Fecha').should('be.visible');

    cy.get('table tbody tr').should('have.length', 3);
    cy.contains('td', 'Ana').should('be.visible');
    cy.contains('td', 'Error al guardar usuario').should('be.visible');
  });

  // ============================================
  // CASOS DE BÚSQUEDA Y FILTRO
  // ============================================
  it('CP-LOG-04: Debe buscar por usuario o mensaje', () => {
    cy.get('input[placeholder="Buscar por usuario o mensaje"]')
      .type('inventario');

    cy.get('table tbody tr').should('have.length', 1);
    cy.contains('td', 'Carlos').should('be.visible');
    cy.contains('td', 'Ana').should('not.exist');
  });

  it('CP-LOG-05: Debe filtrar los registros por nivel', () => {
    cy.get('select').select('Crítico');

    cy.get('table tbody tr').should('have.length', 1);
    cy.contains('td', 'Ana').should('be.visible');
    cy.contains('td', 'Carlos').should('not.exist');
  });

  it('CP-LOG-06: Debe mostrar un mensaje cuando no hay resultados', () => {
    cy.get('input[placeholder="Buscar por usuario o mensaje"]')
      .type('UsuarioInexistente');

    cy.contains('No se encontraron registros de error')
      .should('be.visible');

    cy.contains('0 registro(s) encontrados').should('be.visible');
  });

  // ============================================
  // CASO DE ERROR
  // ============================================
  it('CP-LOG-07: Debe mostrar un mensaje si falla la carga', () => {
    cy.intercept('GET', '**/api/administrador/logErrores', {
      statusCode: 500,
      body: { error: 'Error del servidor' },
    }).as('errorAlCargar');

    visitarConSesion(RUTA);
    cy.wait('@errorAlCargar');

    cy.contains(
      'No se pudieron cargar los errores. ¿Está corriendo el servidor Backend?'
    ).should('be.visible');
  });
});