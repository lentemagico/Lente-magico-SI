// cypress/e2e/Caja/TarjetaDebito.cy.js
// Cambia esta constante si la ruta real del componente es otra
// (búscala en tu archivo de rutas: <Route path="..." element={<TarjetaDebito />} />)
const RUTA = '/caja/tarjeta-debito';
 
// Venta de ejemplo que normalmente deja la pantalla "Confirmar Venta" en sessionStorage
const VENTA = { id_venta: 77, total: 250000 };
 
// Visita la ruta con sesión de usuario (localStorage) y, opcionalmente, una venta activa (sessionStorage)
function visitar(ruta, venta = VENTA) {
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
            if (venta) {
                win.sessionStorage.setItem('ventaActiva', JSON.stringify(venta));
                win.sessionStorage.setItem('clienteSeleccionado', JSON.stringify({ id: 1 }));
            }
        },
    });
}
 
describe('Pruebas de Caja Negra - Pago con Tarjeta Débito (UI)', () => {
 
    const API = '**/api/pagos/tarjeta-debito';
 
    // ============================================
    // SIN VENTA ACTIVA
    // ============================================
    it('CP-TD-01: Debe mostrar una advertencia si no hay venta activa', () => {
        visitar(RUTA, null);
 
        cy.contains('No hay ninguna venta activa para pagar.').should('be.visible');
        cy.get('[data-cy="btn-cobrar"]').should('not.exist');
    });
 
    it('CP-TD-02: El atajo debe llevar a Confirmar Venta', () => {
        visitar(RUTA, null);
 
        cy.get('[data-cy="btn-ir-confirmar"]').click();
        cy.url().should('include', '/caja/confirmar-venta');
    });
 
    // ============================================
    // CON VENTA ACTIVA
    // ============================================
    it('CP-TD-03: Debe mostrar el título y el resumen de la venta', () => {
        visitar(RUTA);
 
        cy.contains('h4', 'Pago con Tarjeta Débito').should('be.visible');
        cy.get('[data-cy="venta-id"]').should('contain.text', 'Venta #77');
        cy.get('[data-cy="venta-total"]').should('contain.text', '250');
    });
 
    it('CP-TD-04: Debe mostrar el botón de cobro habilitado', () => {
        visitar(RUTA);
 
        cy.get('[data-cy="btn-cobrar"]')
            .should('be.visible')
            .and('be.enabled')
            .and('contain.text', 'Confirmar cobro con tarjeta débito');
    });
 
    // ============================================
    // PAGO (backend simulado, no registra pagos reales)
    // ============================================
    it('CP-TD-05: Debe enviar id_venta y monto al backend', () => {
        cy.intercept('POST', API, { statusCode: 200, body: { mensaje: 'Pago registrado' } }).as('pagar');
        visitar(RUTA);
 
        cy.get('[data-cy="btn-cobrar"]').click();
 
        cy.wait('@pagar').its('request.body').should('deep.equal', {
            id_venta: 77,
            monto: 250000,
        });
    });
 
    it('CP-TD-06: Debe mostrar el mensaje de éxito tras pagar', () => {
        cy.intercept('POST', API, { statusCode: 200, body: { mensaje: 'Pago registrado' } }).as('pagar');
        visitar(RUTA);
 
        cy.get('[data-cy="btn-cobrar"]').click();
        cy.wait('@pagar');
 
        cy.get('[data-cy="pago-exitoso"]').should('be.visible');
        cy.get('[data-cy="mensaje-exito"]').should('contain.text', 'Pago registrado');
        // El resumen y el botón de cobro desaparecen
        cy.get('[data-cy="btn-cobrar"]').should('not.exist');
    });
 
    it('CP-TD-07: Debe limpiar la venta y el cliente de sessionStorage tras pagar', () => {
    cy.intercept('POST', API, { statusCode: 200, body: { mensaje: 'Pago registrado' } }).as('pagar');
    visitar(RUTA);

    cy.get('[data-cy="btn-cobrar"]').click();
    cy.wait('@pagar');

    // Esperar a que el resultado aparezca en pantalla antes de revisar el storage
    cy.get('[data-cy="pago-exitoso"]').should('be.visible');

    cy.window().its('sessionStorage').should((storage) => {
        expect(storage.getItem('ventaActiva')).to.be.null;
        expect(storage.getItem('clienteSeleccionado')).to.be.null;
    });
});
 
    it('CP-TD-08: Debe deshabilitar el botón mientras se procesa el pago', () => {
        // Se retrasa la respuesta para poder ver el estado "Procesando..."
        cy.intercept('POST', API, {
            delay: 1000,
            statusCode: 200,
            body: { mensaje: 'Pago registrado' },
        }).as('pagar');
        visitar(RUTA);
 
        cy.get('[data-cy="btn-cobrar"]').click();
        cy.get('[data-cy="btn-cobrar"]')
            .should('be.disabled')
            .and('contain.text', 'Procesando...');
 
        cy.wait('@pagar');
        cy.get('[data-cy="pago-exitoso"]').should('be.visible');
    });
 
    it('CP-TD-09: Debe mostrar el error si el backend rechaza el pago', () => {
        cy.intercept('POST', API, {
            statusCode: 400,
            body: { mensaje: 'La venta ya fue pagada', error: 'La venta ya fue pagada' },
        }).as('pagar');
        visitar(RUTA);
 
        cy.get('[data-cy="btn-cobrar"]').click();
        cy.wait('@pagar');
 
        cy.get('[data-cy="error-pago"]').should('be.visible');
        // El usuario puede reintentar: el botón sigue disponible y la venta no se borró
        cy.get('[data-cy="btn-cobrar"]').should('be.enabled');
        cy.window().then((win) => {
            expect(win.sessionStorage.getItem('ventaActiva')).to.not.be.null;
        });
    });
 
    // ============================================
    // DESPUÉS DEL PAGO
    // ============================================
    it('CP-TD-10: "Registrar otra venta" debe llevar a Confirmar Venta', () => {
        cy.intercept('POST', API, { statusCode: 200, body: { mensaje: 'Pago registrado' } }).as('pagar');
        visitar(RUTA);
 
        cy.get('[data-cy="btn-cobrar"]').click();
        cy.wait('@pagar');
 
        cy.get('[data-cy="btn-otra-venta"]').click();
        cy.url().should('include', '/caja/confirmar-venta');
    });
 
});