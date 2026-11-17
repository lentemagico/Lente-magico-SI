// cypress/e2e/Caja/plataformas.cy.js
const RUTA = '/caja/plataformas'; // <-- ajusta a la ruta real de tu router
const RUTA_CONFIRMAR = '/caja/confirmar-venta';

const VENTA = { id_venta: 101, total: 50000 };

// Visita la ruta con sesión simulada y (opcionalmente) una venta activa en sessionStorage
function visitarConVenta(venta = VENTA) {
    cy.visit(RUTA, {
        onBeforeLoad(win) {
            win.localStorage.setItem(
                'usuario_logueado',
                JSON.stringify({ id: 1, nombre: 'Admin Cypress', login: 'admin', rol: 'Administrador' })
            );
            if (venta) {
                win.sessionStorage.setItem('ventaActiva', JSON.stringify(venta));
            }
        },
    });
}

describe('Pruebas de Caja Negra - Plataformas de Pago (UI)', () => {

    // Selectores basados en lo que ve el usuario (textos, placeholders, labels)
    const tarjeta = (nombre) => cy.contains('button.card', nombre);
    const inputNumero = () => cy.get('input[placeholder="Ingrese el número o referencia"]');
    const inputValor = () => cy.get('input[type="number"]');
    const botonConfirmar = () => cy.contains('button', 'Confirmar pago');

    const respuestaExitosa = {
        mensaje: 'Pago registrado',
        id_venta: VENTA.id_venta,
        plataforma: 'Nequi',
        monto: VENTA.total,
        factura_generada: true,
        num_factura: 'FAC-0001',
    };

    beforeEach(() => {
        cy.on('window:alert', () => true);
    });

    // ============================================
    // SIN VENTA ACTIVA
    // ============================================
    describe('Sin venta activa', () => {
        it('CP-UI-01: Debe mostrar la advertencia cuando no hay venta activa', () => {
            visitarConVenta(null);
            cy.contains('No hay ninguna venta activa para pagar.').should('be.visible');
            cy.contains('Plataformas de Pago').should('not.exist');
        });

        it('CP-UI-02: El botón "Ir a Confirmar Venta" debe redirigir a confirmar venta', () => {
            visitarConVenta(null);
            cy.contains('button', 'Ir a Confirmar Venta').click();
            cy.url().should('include', RUTA_CONFIRMAR);
        });
    });

    // ============================================
    // VISTA INICIAL
    // ============================================
    describe('Vista inicial con venta activa', () => {
        beforeEach(() => visitarConVenta());

        it('CP-UI-03: Debe mostrar el título y la información de la venta', () => {
            cy.contains('h3', 'Plataformas de Pago').should('be.visible');
            cy.contains(`Venta #${VENTA.id_venta}`).should('be.visible');
            cy.contains('50').should('be.visible');
        });

        it('CP-UI-04: Debe mostrar las 4 plataformas disponibles', () => {
            ['Nequi', 'Daviplata', 'PSE', 'Otros'].forEach((nombre) => {
                tarjeta(nombre).should('be.visible');
            });
        });

        it('CP-UI-05: NO debe mostrar el formulario de pago ni el botón confirmar antes de elegir plataforma', () => {
            inputNumero().should('not.exist');
            botonConfirmar().should('not.exist');
            cy.contains('Generar factura').should('not.exist');
        });
    });

    // ============================================
    // SELECCIÓN DE PLATAFORMA
    // ============================================
    describe('Selección de plataforma', () => {
        beforeEach(() => visitarConVenta());

        it('CP-UI-06: Al elegir Nequi debe mostrar los datos del pago', () => {
            tarjeta('Nequi').click();
            cy.contains('Datos del pago con Nequi').should('be.visible');
            inputNumero().should('be.visible');
            botonConfirmar().should('be.visible');
        });

        it('CP-UI-07: El valor debe venir precargado con el total de la venta', () => {
            tarjeta('Nequi').click();
            inputValor().should('have.value', String(VENTA.total));
        });

        it('CP-UI-08: La opción "Otros" debe pedir el nombre de la plataforma', () => {
            tarjeta('Otros').click();
            cy.contains('Nombre de la plataforma').should('be.visible');
            cy.get('input[placeholder^="Ej: Bancolombia"]').should('be.visible');
        });

        it('CP-UI-09: Las otras plataformas NO deben mostrar el campo de nombre', () => {
            tarjeta('PSE').click();
            cy.contains('Nombre de la plataforma').should('not.exist');
        });

        it('CP-UI-10: Al cambiar de plataforma se debe limpiar el número ingresado', () => {
            tarjeta('Nequi').click();
            inputNumero().type('123456');
            tarjeta('Daviplata').click();
            cy.contains('Datos del pago con Daviplata').should('be.visible');
            inputNumero().should('have.value', '');
        });
    });

    // ============================================
    // VALIDACIONES
    // ============================================
    describe('Validaciones', () => {
        beforeEach(() => {
            cy.intercept('POST', '**/api/pagos/plataformas').as('pago');
            visitarConVenta();
        });

        const noDebeEnviarPago = () => {
            cy.get('@pago.all').should('have.length', 0);
        };

        it('CP-UI-11: NO debe registrar el pago con el número/referencia vacío', () => {
            tarjeta('Nequi').click();
            botonConfirmar().click();
            noDebeEnviarPago();
            cy.contains('Pago registrado correctamente').should('not.exist');
        });

        it('CP-UI-12: NO debe registrar el pago con "Otros" sin nombre de plataforma', () => {
            tarjeta('Otros').click();
            inputNumero().type('REF-123');
            botonConfirmar().click();
            cy.contains('Por favor escribe el nombre de la plataforma.').should('be.visible');
            noDebeEnviarPago();
        });

        it('CP-UI-13: NO debe registrar el pago si el valor es distinto al total', () => {
            tarjeta('Nequi').click();
            inputNumero().type('REF-123');
            inputValor().clear().type('1000');
            botonConfirmar().click();
            cy.contains('El valor del pago debe ser igual al total de la venta').should('be.visible');
            noDebeEnviarPago();
        });

        it('CP-UI-14: NO debe registrar el pago con valor 0 o vacío', () => {
            tarjeta('Nequi').click();
            inputNumero().type('REF-123');
            inputValor().clear();
            botonConfirmar().click();
            noDebeEnviarPago();

            inputValor().type('0');
            botonConfirmar().click();
            noDebeEnviarPago();
            cy.contains('Pago registrado correctamente').should('not.exist');
        });

        it('CP-UI-15: El mensaje de error debe desaparecer al cambiar de plataforma', () => {
            tarjeta('Otros').click();
            inputNumero().type('REF-123');
            botonConfirmar().click();
            cy.contains('Por favor escribe el nombre de la plataforma.').should('be.visible');

            tarjeta('Nequi').click();
            cy.contains('Por favor escribe el nombre de la plataforma.').should('not.exist');
        });
    });

    // ============================================
    // REGISTRO DEL PAGO
    // ============================================
    describe('Registro del pago', () => {
        beforeEach(() => visitarConVenta());

        it('CP-UI-16: Debe registrar el pago con Nequi y mostrar la factura generada', () => {
            cy.intercept('POST', '**/api/pagos/plataformas', {
                statusCode: 201,
                body: respuestaExitosa,
            }).as('pago');

            tarjeta('Nequi').click();
            inputNumero().type('REF-123');
            botonConfirmar().click();

            cy.wait('@pago').its('request.body').should((body) => {
                expect(body.id_venta).to.eq(VENTA.id_venta);
                expect(body.monto).to.eq(VENTA.total);
                expect(body.plataforma).to.eq('Nequi');
                expect(body.numero).to.eq('REF-123');
                expect(body.generar_factura).to.eq(true);
            });

            cy.contains('Pago registrado correctamente').should('be.visible');
            cy.contains('Factura generada correctamente').should('be.visible');
            cy.contains('FAC-0001').should('be.visible');
        });

        it('CP-UI-17: Con "Otros" debe enviar el nombre escrito como plataforma', () => {
            cy.intercept('POST', '**/api/pagos/plataformas', {
                statusCode: 201,
                body: { ...respuestaExitosa, plataforma: 'Bancolombia' },
            }).as('pago');

            tarjeta('Otros').click();
            cy.get('input[placeholder^="Ej: Bancolombia"]').type('Bancolombia');
            inputNumero().type('REF-999');
            botonConfirmar().click();

            cy.wait('@pago').its('request.body.plataforma').should('eq', 'Bancolombia');
            cy.contains('Bancolombia').should('be.visible');
        });

        it('CP-UI-18: Con "Generar factura" desmarcado NO debe generar factura', () => {
            cy.intercept('POST', '**/api/pagos/plataformas', {
                statusCode: 201,
                body: { ...respuestaExitosa, factura_generada: false, num_factura: null },
            }).as('pago');

            tarjeta('PSE').click();
            inputNumero().type('REF-555');
            cy.contains('label', 'Generar factura').click();
            botonConfirmar().click();

            cy.wait('@pago').its('request.body.generar_factura').should('eq', false);
            cy.contains('No se generó factura para este pago.').should('be.visible');
        });

        it('CP-UI-19: Debe mostrar un error si el backend rechaza el pago', () => {
            cy.intercept('POST', '**/api/pagos/plataformas', {
                statusCode: 400,
                body: { error: 'La venta ya fue pagada' },
            }).as('pago');

            tarjeta('Daviplata').click();
            inputNumero().type('REF-777');
            botonConfirmar().click();

            cy.wait('@pago');
            cy.get('.alert-danger').should('be.visible');
            cy.contains('Pago registrado correctamente').should('not.exist');
        });

        it('CP-UI-20: Tras el pago exitoso la venta activa debe limpiarse y se puede registrar otra', () => {
    cy.intercept('POST', '**/api/pagos/plataformas', {
        statusCode: 201,
        body: respuestaExitosa,
    }).as('pago');

    tarjeta('Nequi').click();
    inputNumero().type('REF-123');
    botonConfirmar().click();
    cy.wait('@pago');

    // Esperar a que el resultado aparezca en pantalla antes de revisar el storage
    cy.contains('Pago registrado correctamente').should('be.visible');

    cy.window().its('sessionStorage').should((storage) => {
        expect(storage.getItem('ventaActiva')).to.be.null;
    });

    cy.contains('button', 'Registrar otra venta').click();
    cy.url().should('include', RUTA_CONFIRMAR);
});
    });

});