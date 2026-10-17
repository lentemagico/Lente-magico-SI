// cypress/e2e/Compra-bodega/registroCompras.cy.js
// Cambia esta constante si la ruta real del componente es otra
const RUTA = '/registro-compras';

// Visita la ruta con una sesión simulada en localStorage
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

// Comprobante único (este campo acepta cualquier carácter)
const comprobanteUnico = () => `FAC-${Date.now()}`;

describe('Pruebas de Caja Negra - Registro de Compras (UI)', () => {

    // Tarjetas de compra (el modal de factura usa shadow-lg, así que no coincide)
    const CARD = '.rounded-4.bg-white.shadow-sm';

    // Registra una compra en estado "Anulada".
    // Se usa "Anulada" a propósito: el componente NO actualiza el inventario
    // en ese estado, así las pruebas no crean ni modifican productos reales.
    const registrarCompraAnulada = (comprobante) => {
        cy.contains('button', '+ Registrar compra').click();
        cy.contains('h6', 'Registrar nueva compra').should('be.visible');

        cy.get('.card').within(() => {
            cy.get('select[name="idProveedor"]').select(1); // primer proveedor real
            cy.get('input[name="fechaCompra"]').type('2026-10-15');
            cy.get('input[name="numComprobante"]').type(comprobante);
            cy.get('select[name="estado"]').select('Anulada');

            cy.get('input[name="nombreProducto"]').type('Producto Cypress');
            cy.get('input[name="cantidad"]').type('2');
            cy.get('input[name="costoUnitario"]').type('5000');

            cy.contains('button', 'Registrar compra').click();
        });
    };

    beforeEach(() => {
        cy.on('window:alert', () => true);   // el componente usa alert() al fallar un borrado
        cy.on('window:confirm', () => true); // confirmación de eliminar
        cy.intercept('GET', '**/api/compras*').as('getCompras');
        visitarConSesion(RUTA);
        cy.wait('@getCompras'); // esperamos a que lleguen los datos reales
    });

    // ============================================
    // CASOS BÁSICOS
    // ============================================
    it('CP-COMP-01: Debe cargar la página y mostrar el título', () => {
        cy.url().should('include', RUTA);
        cy.contains('h4', 'Registro de compras').should('be.visible');
    });

    it('CP-COMP-02: Debe cargar las compras desde el backend', () => {
        cy.get('@getCompras').its('response.statusCode').should('eq', 200);
        cy.get(CARD).should('have.length.greaterThan', 0);
    });

    it('CP-COMP-03: Debe mostrar las tarjetas de estadísticas', () => {
        ['Total compras', 'Completadas', 'Pendientes'].forEach((label) => {
            cy.contains(label).should('be.visible');
        });
    });

    // ============================================
    // BÚSQUEDA
    // ============================================
    it('CP-COMP-04: Debe filtrar compras por proveedor', () => {
        cy.get(CARD).first().find('.flex-grow-1 .fw-semibold').invoke('text').then((proveedor) => {
            cy.get('input[placeholder^="Buscar"]').type(proveedor.trim());

            cy.get(CARD).should('have.length.greaterThan', 0);
            cy.get(CARD).each(($card) => {
                expect($card.text().toLowerCase()).to.include(proveedor.trim().toLowerCase());
            });
        });
    });

    it('CP-COMP-05: Debe mostrar mensaje si la búsqueda no coincide', () => {
        cy.get('input[placeholder^="Buscar"]').type('zzzzqqqqxxxx');
        cy.get(CARD).should('not.exist');
        cy.contains('No se encontraron compras con ese criterio.').should('be.visible');
    });

    // ============================================
    // FORMULARIO DE REGISTRO
    // ============================================
    it('CP-COMP-06: Debe abrir y cancelar el formulario de registro', () => {
        cy.contains('button', '+ Registrar compra').click();
        cy.contains('h6', 'Registrar nueva compra').should('be.visible');

        cy.contains('button', 'Cancelar').click();
        cy.contains('h6', 'Registrar nueva compra').should('not.exist');
    });

    it('CP-COMP-07: Debe agregar y quitar líneas del detalle', () => {
        cy.contains('button', '+ Registrar compra').click();

        cy.get('input[name="nombreProducto"]').should('have.length', 1);

        cy.contains('button', '+ Agregar producto').click();
        cy.get('input[name="nombreProducto"]').should('have.length', 2);

        // Con 2 líneas aparece el botón ✕ para quitar una
        cy.contains('button', '✕').first().click();
        cy.get('input[name="nombreProducto"]').should('have.length', 1);
    });

    it('CP-COMP-08: Debe calcular el subtotal y el total del detalle', () => {
        cy.contains('button', '+ Registrar compra').click();

        cy.get('input[name="cantidad"]').type('2');
        cy.get('input[name="costoUnitario"]').type('5000');

        // 2 x 5000 = $10.000 (formato es-CO)
        cy.get('.card').contains('$10.000').should('be.visible');
    });

    it('CP-COMP-09: El campo producto no debe aceptar números ni símbolos', () => {
        cy.contains('button', '+ Registrar compra').click();

        cy.get('input[name="nombreProducto"]').type('Lente123!@#');
        cy.get('input[name="nombreProducto"]').should('have.value', 'Lente');
    });

    // ============================================
    // CREACIÓN
    // ============================================
    it('CP-COMP-10: Debe registrar una nueva compra correctamente', () => {
        const comprobante = comprobanteUnico();

        cy.intercept('POST', '**/api/compras').as('crearCompra');
        cy.intercept('DELETE', '**/api/compras/*').as('borrarCompra');

        registrarCompraAnulada(comprobante);

        cy.wait('@crearCompra').its('response.statusCode').should('be.oneOf', [200, 201]);
        cy.contains(CARD, comprobante).should('be.visible');

        // Limpieza: se elimina la compra creada por la prueba
        cy.contains(CARD, comprobante).find('button[title="Eliminar"]').click();
        cy.wait('@borrarCompra');
    });

    it('CP-COMP-11: NO debe registrar una compra con el formulario vacío', () => {
        cy.get(CARD).then(($antes) => {
            const cantidadAntes = $antes.length;

            cy.contains('button', '+ Registrar compra').click();
            cy.get('.card').within(() => {
                cy.contains('button', 'Registrar compra').click();
            });

            // La cantidad de compras no debe cambiar
            cy.get(CARD).should('have.length', cantidadAntes);
        });
    });

    // ============================================
    // FACTURA
    // ============================================
    it('CP-COMP-12: Debe abrir y cerrar la factura de una compra', () => {
        cy.get(CARD).first().contains('button', 'Ver factura').click();

        cy.contains('h5', 'Factura de compra').should('be.visible');
        cy.contains('th', 'Producto').should('be.visible');

        // Se busca el botón dentro del modal: en la barra de navegación hay otro
        // botón "Cerrar sesión" y cy.contains tomaba ese primero
        cy.contains('h5', 'Factura de compra')
            .closest('.position-fixed')
            .contains('button', /^Cerrar$/)
            .click();
        cy.contains('h5', 'Factura de compra').should('not.exist');
    });

    // ============================================
    // EDICIÓN
    // ============================================
    it('CP-COMP-13: Debe abrir el formulario de edición con los datos cargados', () => {
        cy.get(CARD).first().find('button[title="Editar"]').click();

        cy.contains('h6', 'Editar compra').should('be.visible');
        cy.get('input[name="numComprobante"]').should('not.have.value', '');

        cy.contains('button', 'Cancelar').click();
        cy.contains('h6', 'Editar compra').should('not.exist');
    });

    it('CP-COMP-14: Debe actualizar una compra (PUT)', () => {
        const comprobante = comprobanteUnico();

        cy.intercept('POST', '**/api/compras').as('crearCompra');
        cy.intercept('PUT', '**/api/compras/*').as('editarCompra');
        cy.intercept('DELETE', '**/api/compras/*').as('borrarCompra');

        // Se crea una compra propia para no modificar datos existentes
        registrarCompraAnulada(comprobante);
        cy.wait('@crearCompra');
        cy.contains(CARD, comprobante).should('be.visible');

        // Se edita el comprobante
        cy.contains(CARD, comprobante).find('button[title="Editar"]').click();
        cy.contains('h6', 'Editar compra').should('be.visible');
        cy.get('input[name="numComprobante"]').clear().type(comprobante + '-E');
        cy.contains('button', 'Actualizar compra').click();

        cy.wait('@editarCompra').its('response.statusCode').should('eq', 200);
        cy.contains(CARD, comprobante + '-E').should('be.visible');

        // Limpieza
        cy.contains(CARD, comprobante + '-E').find('button[title="Eliminar"]').click();
        cy.wait('@borrarCompra');
    });

    // ============================================
    // ELIMINACIÓN
    // ============================================
    it('CP-COMP-15: NO debe eliminar la compra si se cancela la confirmación', () => {
        cy.intercept('DELETE', '**/api/compras/*').as('borrarCompra');

        cy.get(CARD).then(($antes) => {
            const cantidadAntes = $antes.length;

            // Se fuerza que el confirm() devuelva "Cancelar"
            cy.window().then((win) => {
                cy.stub(win, 'confirm').returns(false).as('confirmar');
            });

            cy.get(CARD).first().find('button[title="Eliminar"]').click();

            cy.get('@confirmar').should('have.been.calledOnce');
            cy.get(CARD).should('have.length', cantidadAntes);
        });
    });

    it('CP-COMP-16: Debe eliminar una compra existente', () => {
        const comprobante = comprobanteUnico();

        cy.intercept('POST', '**/api/compras').as('crearCompra');
        cy.intercept('DELETE', '**/api/compras/*').as('borrarCompra');

        // Se crea una compra propia para borrarla
        registrarCompraAnulada(comprobante);
        cy.wait('@crearCompra');
        cy.contains(CARD, comprobante).should('be.visible');

        cy.contains(CARD, comprobante).find('button[title="Eliminar"]').click();

        cy.wait('@borrarCompra').its('response.statusCode').should('be.oneOf', [200, 204]);
        cy.contains(comprobante).should('not.exist');
    });

    // ============================================
    // NAVEGACIÓN
    // ============================================
    it('CP-COMP-17: Debe volver al inicio con el botón "Volver al inicio"', () => {
        cy.contains('button', 'Volver al inicio').click();
        cy.url().should('include', '/index');
    });

});