describe('Pruebas de Caja Negra (E2E) - Módulo Formas de Pago', () => {
  const RUTA_FRONTEND = '/caja/formas-pago';
  // Se especifica /api/formas-pago para no interceptar la navegación de React (/caja/formas-pago)
  const API_URL = '**/api/formas-pago*';

  const MOCK_FORMAS_PAGO = {
    formasPago: [
      { metodo_pago: 'Efectivo', cantidad: 5, total: 450000 },
      { metodo_pago: 'Bancolombia', cantidad: 3, total: 350000 },
      { metodo_pago: 'Tarjeta Crédito', cantidad: 2, total: 200000 },
    ],
  };

  const visitarConSesion = () => {
    cy.visit(RUTA_FRONTEND, {
      onBeforeLoad(win) {
        win.localStorage.setItem(
          'usuario_logueado',
          JSON.stringify({ id: 1, nombre: 'Cajero Prueba', rol: 'Caja' })
        );
      },
    });
  };

  // =========================================================================
  // CP01: SEGURIDAD / PROTECCIÓN DE RUTA
  // =========================================================================
  it('CP01 - Debe redirigir a /login si no hay sesión activa en localStorage', () => {
    cy.clearLocalStorage();
    cy.visit(RUTA_FRONTEND);
    cy.url().should('include', '/login');
  });

  // =========================================================================
  // CP02: ESTADO DE CARGA INICIAL
  // =========================================================================
  it('CP02 - Debe mostrar el texto "Cargando..." mientras responde el servidor', () => {
    cy.intercept('GET', API_URL, {
      delay: 600,
      statusCode: 200,
      body: MOCK_FORMAS_PAGO,
    }).as('getFormasPagoLento');

    visitarConSesion();

    cy.contains('p', 'Cargando...').should('be.visible');
    cy.wait('@getFormasPagoLento');
    cy.contains('p', 'Cargando...').should('not.exist');
  });

  // =========================================================================
  // CP03: RENDERIZADO DE TABLA Y CÁLCULO DE TOTAL GENERAL (CAMINO FELIZ)
  // =========================================================================
  it('CP03 - Debe renderizar los métodos de pago, cantidades, subtotales y calcular el total general', () => {
    cy.intercept('GET', API_URL, {
      statusCode: 200,
      body: MOCK_FORMAS_PAGO,
    }).as('getFormasPago');

    visitarConSesion();
    cy.wait('@getFormasPago');

    cy.contains('h3', 'Formas de Pago').should('be.visible');
    cy.get('table tbody tr').should('have.length', 3);

    // Verificar filas individuales
    cy.contains('table tbody tr', 'Efectivo').within(() => {
      cy.contains('td', '5').should('be.visible');
      cy.contains('td', '450').should('be.visible');
    });

    cy.contains('table tbody tr', 'Bancolombia').within(() => {
      cy.contains('td', '3').should('be.visible');
      cy.contains('td', '350').should('be.visible');
    });

    // Verificar pie de tabla con la suma total ($450,000 + $350,000 + $200,000 = $1,000,000)
    cy.get('table tfoot tr').within(() => {
      cy.contains('td', 'Total general').should('be.visible');
      cy.contains('td', '1').should('be.visible');
    });
  });

  // =========================================================================
  // CP04: SIN PAGOS REGISTRADOS (LISTA VACÍA)
  // =========================================================================
  it('CP04 - Debe mostrar alerta informativa cuando aún no hay pagos registrados', () => {
    cy.intercept('GET', API_URL, {
      statusCode: 200,
      body: { formasPago: [] },
    }).as('getFormasPagoVacio');

    visitarConSesion();
    cy.wait('@getFormasPagoVacio');

    cy.contains('.alert-info', 'Aún no hay pagos registrados.').should('be.visible');
    cy.get('table').should('not.exist');
  });

  // =========================================================================
  // CP05: MANEJO DE ERROR DEL SERVIDOR
  // =========================================================================
  it('CP05 - Debe mostrar alerta roja si falla la petición al backend', () => {
    cy.intercept('GET', API_URL, {
      statusCode: 500,
      body: { error: 'Error al consultar el resumen de formas de pago' },
    }).as('getFormasPagoError');

    visitarConSesion();
    cy.wait('@getFormasPagoError');

    cy.get('.alert-danger').should('be.visible');
    cy.contains('.alert-info', 'Aún no hay pagos registrados.').should('be.visible');
  });
});