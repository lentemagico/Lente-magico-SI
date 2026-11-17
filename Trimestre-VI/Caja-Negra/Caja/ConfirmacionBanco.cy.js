// cypress/e2e/Caja/ConfirmacionBanco.cy.js

describe('Pruebas de Caja Negra - Confirmación de Banco (UI)', () => {
  // Ruta exacta definida en App.jsx
  const RUTA = '/caja/confirmacion-banco';
  const VENTA = { id_venta: 1, total: 150000 };

  const RESPUESTA_OK = {
    mensaje: 'Pago registrado correctamente',
    id_venta: 1,
    metodo_pago: 'Bancolombia',
    monto: 150000,
    factura_generada: true,
    num_factura: 'FAC-0001'
  };

  // Inyecta la sesión requerida por verificarSesion() en App.jsx
  const inyectarSesion = (win) => {
    win.localStorage.setItem(
      'usuario_logueado',
      JSON.stringify({ id: 1, nombre: 'Cajero Prueba', rol: 'Caja' })
    );
  };

  // Abre la página con sesión activa y una venta simulada en sessionStorage
  const abrirConVenta = () => {
    cy.visit(RUTA, {
      onBeforeLoad(win) {
        inyectarSesion(win);
        win.sessionStorage.setItem('ventaActiva', JSON.stringify(VENTA));
      }
    });
    cy.get('#banco', { timeout: 15000 }).should('be.visible');
  };

  // Simula el POST del pago (no usa el backend real)
  const simularPago = (cuerpo = RESPUESTA_OK) =>
    cy.intercept('POST', '**/confirmacion-banco', { statusCode: 200, body: cuerpo }).as('confirmarPago');

  beforeEach(() => {
    cy.on('window:confirm', () => true);
    cy.on('window:alert', () => true);
  });

  it('CP-UI-01: Debe redirigir a /login si no existe sesión activa', () => {
    cy.clearLocalStorage();
    cy.visit(RUTA);
    cy.url().should('include', '/login');
  });

  it('CP-UI-02: Debe cargar la página y mostrar el título', () => {
    abrirConVenta();
    cy.url().should('include', RUTA);
    cy.contains('h3', 'Confirmación Bancaria').should('be.visible');
    cy.contains('Venta #1').should('be.visible');
  });

  it('CP-UI-03: Debe avisar si no existe una venta activa', () => {
    cy.visit(RUTA, {
      onBeforeLoad(win) {
        inyectarSesion(win);
        win.sessionStorage.clear();
      }
    });
    cy.contains('No hay ninguna venta activa para pagar').should('be.visible');
  });

  it('CP-UI-04: No debe enviar el pago si no se selecciona un banco', () => {
    simularPago();
    abrirConVenta();

    cy.contains('button', 'Confirmar transacción').click();

    cy.get('#banco:invalid').should('exist');
    cy.get('@confirmarPago.all').should('have.length', 0);
  });

  it('CP-UI-05: No debe enviar el pago si el monto es menor al total', () => {
    simularPago();
    abrirConVenta();

    cy.get('#banco').select('Bancolombia');
    cy.get('#monto').clear().type('1000');
    cy.contains('button', 'Confirmar transacción').click();

    cy.get('.alert-danger').should('contain', 'El monto debe ser igual o mayor al total');
    cy.get('@confirmarPago.all').should('have.length', 0);
  });

  it('CP-UI-06: Debe confirmar el pago y generar la factura', () => {
    simularPago();
    abrirConVenta();

    cy.get('#banco').select('Bancolombia');
    cy.contains('button', 'Confirmar transacción').click();

    cy.wait('@confirmarPago').then(({ request }) => {
      expect(request.body.id_venta).to.eq(1);
      expect(request.body.monto).to.eq(150000);
      expect(request.body.metodo_pago).to.eq('Bancolombia');
      expect(request.body.generar_factura).to.eq(true);
    });

    cy.contains('Pago confirmado correctamente').should('be.visible');
    cy.contains('FAC-0001').should('be.visible');
  });

  it('CP-UI-07: Debe enviar el nombre escrito cuando se elige "Otro banco"', () => {
    simularPago({ ...RESPUESTA_OK, metodo_pago: 'Banco Falabella' });
    abrirConVenta();

    cy.get('#banco').select('Otro banco');
    cy.get('#otroBanco').should('be.visible').type('Banco Falabella');
    cy.contains('button', 'Confirmar transacción').click();

    cy.wait('@confirmarPago')
      .its('request.body.metodo_pago')
      .should('eq', 'Banco Falabella');
  });
});