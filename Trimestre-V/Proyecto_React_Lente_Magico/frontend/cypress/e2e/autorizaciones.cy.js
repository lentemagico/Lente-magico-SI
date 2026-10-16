// cypress/e2e/Administrador/autorizaciones.cy.js
const RUTA = '/autorizaciones';

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

function nombreUnico(prefijo = 'Rol Cypress') {
  const sufijo = String(Date.now())
    .split('')
    .map((digito) => String.fromCharCode(65 + Number(digito)))
    .join('');

  return `${prefijo} ${sufijo}`;
}

describe('Pruebas de Caja Negra - Autorizaciones (UI)', () => {
  beforeEach(() => {
    cy.on('window:confirm', () => true);
    cy.on('window:alert', () => true);
    visitarConSesion(RUTA);
  });

  // ============================================
  // CASOS BÁSICOS
  // ============================================
  it('CP-AUT-01: Debe cargar la página de autorizaciones', () => {
    cy.url().should('include', RUTA);
  });

  it('CP-AUT-02: Debe mostrar el título y la tabla', () => {
    cy.contains('h3', 'Autorizaciones').should('be.visible');
    cy.contains('th', 'Nombre de la autorización').should('be.visible');
    cy.contains('th', 'Acciones').should('be.visible');
  });

  // ============================================
  // CASOS DE CREACIÓN
  // ============================================
  it('CP-AUT-03: Debe crear una autorización correctamente', () => {
    const nombre = nombreUnico();

    cy.intercept('POST', '**/api/administrador/autorizaciones')
      .as('crearAutorizacion');

    cy.intercept('GET', '**/api/administrador/autorizaciones')
      .as('getAutorizaciones');

    cy.contains('button', '+ Nueva autorización').click();

    cy.contains('label', 'Nombre de la autorización')
      .parent()
      .find('input')
      .type(nombre);

    cy.contains('button', 'Guardar').click();

    cy.wait('@crearAutorizacion')
      .its('response.statusCode')
      .should('eq', 201);

    // El componente vuelve a cargar la lista tras guardar.
    cy.wait('@getAutorizaciones');

    cy.contains('td', nombre).should('be.visible');
  });

  it('CP-AUT-04: NO debe crear una autorización con el nombre vacío', () => {
    cy.intercept('POST', '**/api/administrador/autorizaciones')
      .as('crearAutorizacion');

    cy.contains('button', '+ Nueva autorización').click();
    cy.contains('button', 'Guardar').click();

    cy.on('window:alert', (texto) => {
      expect(texto).to.contain('El nombre de la autorización es obligatorio');
    });

    cy.get('@crearAutorizacion.all').should('have.length', 0);
  });

  // ============================================
  // CASO DE BÚSQUEDA
  // ============================================
  it('CP-AUT-05: El buscador debe filtrar las autorizaciones', () => {
    cy.get('input[placeholder="Buscar autorización"]')
      .type('Administrador');

    cy.get('table tbody tr')
      .should('contain.text', 'Administrador');
  });

  // ============================================
  // CASO DE EDICIÓN
  // ============================================
  it('CP-AUT-06: Debe abrir la edición de una autorización', () => {
    cy.get('table tbody tr')
      .not(':has(td[colspan="3"])')
      .first()
      .within(() => {
        cy.get('button.btn-outline-secondary').click();
      });

    cy.contains('.card-title', 'Editar autorización').should('be.visible');
    cy.get('.card input[placeholder="Ej: Administrador"]').should('be.visible');
  });

  // ============================================
  // CASO DE ELIMINACIÓN
  // ============================================
  it('CP-AUT-07: Debe eliminar una autorización creada por la prueba', () => {
    const nombre = nombreUnico('Rol Para Borrar');

    cy.intercept('POST', '**/api/administrador/autorizaciones')
      .as('crearAutorizacion');

    cy.intercept('DELETE', '**/api/administrador/autorizaciones/*')
      .as('borrarAutorizacion');

    cy.intercept('GET', '**/api/administrador/autorizaciones')
      .as('getAutorizaciones');

    // 1. Crear una autorización para esta prueba.
    cy.contains('button', '+ Nueva autorización').click();

    cy.contains('label', 'Nombre de la autorización')
      .parent()
      .find('input')
      .type(nombre);

    cy.contains('button', 'Guardar').click();

    cy.wait('@crearAutorizacion')
      .its('response.statusCode')
      .should('eq', 201);

    // Esperar la actualización de la lista después de crear.
    cy.wait('@getAutorizaciones');
    cy.contains('td', nombre).should('be.visible');

    // 2. Eliminar la autorización creada.
    cy.contains('tr', nombre).within(() => {
      cy.get('button.btn-outline-danger').click();
    });

    cy.wait('@borrarAutorizacion')
      .its('response.statusCode')
      .should('eq', 200);

    // El componente vuelve a cargar la lista después de eliminar.
    cy.wait('@getAutorizaciones');

    // 3. Verificar que ya no aparezca en la tabla.
    cy.contains('td', nombre).should('not.exist');
  });
});