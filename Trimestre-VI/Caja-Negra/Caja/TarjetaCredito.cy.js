// cypress/e2e/Caja/TarjetaCredito.cy.js
 
const VENTA = { id_venta: 501, total: 150000 };
const RUTA_CONFIRMAR_VENTA = '/caja/confirmar-venta';
 
const RESPUESTA_OK = {
  mensaje: 'Pago registrado exitosamente',
  cuotas: 3,
  factura_generada: true,
  num_factura: 'FAC-000123',
};
 
// Entra a la app con sesión iniciada. Si se pasa venta, la deja como venta activa.
function visitarConSesion(venta = null) {
  cy.visit('/', {
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
 
      if (venta) {
        win.sessionStorage.setItem('ventaActiva', JSON.stringify(venta));
        win.sessionStorage.setItem(
          'clienteSeleccionado',
          JSON.stringify({ id: 10, primer_nombre: 'Cliente Cypress' })
        );
      }
    },
  });
}
 
// Navega por el menú: Caja -> Formas de Pago -> Tarjeta de crédito
// (si en tu menú el texto es distinto, ajusta la expresión regular)
function irATarjetaCredito() {
  cy.contains('.nav-link, .dropdown-toggle, a, button', 'Caja').click();
  cy.contains('Formas de Pago').trigger('mouseover').click({ force: true });
  cy.contains(/tarjeta/i).click({ force: true });
}
 
function confirmarCobro() {
  cy.contains('button', 'Confirmar cobro con tarjeta de crédito').click();
}
 
describe('Pruebas de Caja Negra - Pago con Tarjeta de Crédito (UI)', () => {
  // ============================================
  // SIN VENTA ACTIVA
  // ============================================
  it('CP-TC-01: Sin venta activa debe mostrar la advertencia y permitir ir a Confirmar Venta', () => {
    visitarConSesion(null);
    irATarjetaCredito();
 
    cy.contains('.alert-warning', 'No hay ninguna venta activa para pagar').should('be.visible');
    cy.contains('button', 'Ir a Confirmar Venta').click();
 
    cy.url().should('include', RUTA_CONFIRMAR_VENTA);
  });
 
  // ============================================
  // CON VENTA ACTIVA
  // ============================================
  describe('Con venta activa', () => {
    beforeEach(() => {
      // Se simula el backend para no crear pagos ni facturas reales.
      cy.intercept('POST', '**/pagos/tarjeta-credito', {
        statusCode: 200,
        body: RESPUESTA_OK,
      }).as('pagar');
 
      visitarConSesion(VENTA);
      irATarjetaCredito();
      cy.contains('h4', 'Pago con Tarjeta de Crédito').should('be.visible');
    });
 
    // ------------------------------------------
    // Interfaz
    // ------------------------------------------
    it('CP-TC-02: Debe mostrar la venta, el total, las cuotas, la factura y el botón de cobro', () => {
      cy.contains('Venta #501').should('be.visible');
      cy.contains(/150[.,]000/).should('be.visible');
      cy.get('#cuotas').should('be.visible');
      cy.get('#generarFactura').should('be.visible');
      cy.contains('button', 'Confirmar cobro con tarjeta de crédito').should('be.enabled');
    });
 
    it('CP-TC-03: Las cuotas deben ofrecer 1, 3, 6, 12, 18 y 24 con 1 seleccionada por defecto', () => {
      cy.get('#cuotas').should('have.value', '1');
 
      cy.get('#cuotas option').then(($opciones) => {
        const valores = [...$opciones].map((o) => o.value);
        expect(valores).to.deep.equal(['1', '3', '6', '12', '18', '24']);
      });
    });
 
    it('CP-TC-04: El resumen debe actualizarse al cambiar el número de cuotas', () => {
      cy.contains('div', 'Cuotas:').should('contain.text', '1 cuota');
 
      cy.get('#cuotas').select('6');
      cy.contains('div', 'Cuotas:').should('contain.text', '6 cuotas');
    });
 
    it('CP-TC-05: La opción de generar factura debe venir marcada y poder desmarcarse', () => {
      cy.get('#generarFactura').should('be.checked');
 
      cy.get('#generarFactura').uncheck();
      cy.get('#generarFactura').should('not.be.checked');
    });
 
    // ------------------------------------------
    // Pago exitoso
    // ------------------------------------------
    it('CP-TC-06: Debe enviar el pago con los datos correctos y mostrar el resultado con factura', () => {
      cy.get('#cuotas').select('3');
      confirmarCobro();
 
      cy.wait('@pagar').then(({ request }) => {
        expect(request.body).to.deep.equal({
          id_venta: 501,
          monto: 150000,
          cuotas: 3,
          generar_factura: true,
        });
      });
 
      cy.get('.alert-success').should('contain.text', 'Pago registrado exitosamente');
      cy.contains('Número de cuotas:').should('contain.text', '3');
      cy.contains('Factura generada').should('be.visible');
      cy.contains('FAC-000123').should('be.visible');
    });
 
    it('CP-TC-07: Sin factura debe enviar generar_factura en false y mostrar el aviso', () => {
      cy.intercept('POST', '**/pagos/tarjeta-credito', {
        statusCode: 200,
        body: { mensaje: 'Pago registrado exitosamente', cuotas: 1, factura_generada: false },
      }).as('pagarSinFactura');
 
      cy.get('#generarFactura').uncheck();
      confirmarCobro();
 
      cy.wait('@pagarSinFactura')
        .its('request.body.generar_factura')
        .should('eq', false);
 
      cy.contains('No se solicitó factura para este pago').should('be.visible');
      cy.contains('Factura generada').should('not.exist');
    });
 
    it('CP-TC-08: Debe limpiar la venta activa y el cliente seleccionado tras pagar', () => {
      confirmarCobro();
      cy.wait('@pagar');
      cy.get('.alert-success').should('be.visible');
 
      cy.window().then((win) => {
        expect(win.sessionStorage.getItem('ventaActiva')).to.be.null;
        expect(win.sessionStorage.getItem('clienteSeleccionado')).to.be.null;
      });
    });
 
    it('CP-TC-09: "Registrar otra venta" debe llevar a Confirmar Venta', () => {
      confirmarCobro();
      cy.wait('@pagar');
 
      cy.contains('button', 'Registrar otra venta').click();
      cy.url().should('include', RUTA_CONFIRMAR_VENTA);
    });
 
    // ------------------------------------------
    // Errores y estado de carga
    // ------------------------------------------
    it('CP-TC-10: Debe mostrar un error si el servidor rechaza el pago y conservar la venta', () => {
      cy.intercept('POST', '**/pagos/tarjeta-credito', {
        statusCode: 400,
        body: { error: 'No se pudo procesar el pago', mensaje: 'No se pudo procesar el pago' },
      }).as('pagoRechazado');
 
      confirmarCobro();
      cy.wait('@pagoRechazado');
 
      cy.get('.alert-danger').should('be.visible');
      cy.get('.alert-success').should('not.exist');
      cy.contains('button', 'Confirmar cobro con tarjeta de crédito').should('be.enabled');
 
      cy.window().then((win) => {
        expect(win.sessionStorage.getItem('ventaActiva')).to.not.be.null;
      });
    });
 
    it('CP-TC-11: Mientras se procesa el pago debe mostrar "Procesando..." y bloquear los controles', () => {
      cy.intercept('POST', '**/pagos/tarjeta-credito', (req) => {
        req.reply({ delay: 1500, statusCode: 200, body: RESPUESTA_OK });
      }).as('pagoLento');
 
      confirmarCobro();
 
      cy.contains('button', 'Procesando...').should('be.disabled');
      cy.get('#cuotas').should('be.disabled');
      cy.get('#generarFactura').should('be.disabled');
 
      cy.wait('@pagoLento');
      cy.get('.alert-success').should('be.visible');
    });
  });
});