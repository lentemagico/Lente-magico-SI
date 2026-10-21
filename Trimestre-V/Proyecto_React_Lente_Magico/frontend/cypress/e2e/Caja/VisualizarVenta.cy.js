// cypress/e2e/Caja/VisualizarVenta.cy.js
// Cambia esta constante si la ruta real del componente es otra
// (búscala en App.jsx: <Route path="..." element={<VisualizarVenta />} />)
const RUTA = '/caja/visualizar-venta';
const RUTA_CONFIRMAR = '/caja/confirmar-venta';

const VENTAS = [
    {
        id_venta: 101,
        fecha_venta: '2025-03-10T14:30:00',
        cliente: 'Juan Pérez',
        documento_cliente: '1012345678',
        estado: 'Pagada',
        total: 50000,
    },
    {
        id_venta: 102,
        fecha_venta: '2025-03-11T09:15:00',
        cliente: 'María Gómez',
        documento_cliente: '52987654',
        estado: 'Pendiente',
        total: 120000,
    },
];

// Visita la ruta con sesión de usuario simulada
function visitar() {
    cy.visit(RUTA, {
        onBeforeLoad(win) {
            win.localStorage.setItem(
                'usuario_logueado',
                JSON.stringify({ id: 1, nombre: 'Admin Cypress', login: 'admin', rol: 'Administrador' })
            );
        },
    });
}

// Intercept del listado: GET .../ventas?limit=20
const interceptVentas = (respuesta) =>
    cy.intercept({ method: 'GET', pathname: '**/ventas' }, respuesta).as('ventas');

describe('Pruebas de Caja Negra - Historial de Ventas (UI)', () => {

    // ============================================
    // ENCABEZADO
    // ============================================
    describe('Encabezado', () => {
        beforeEach(() => {
            interceptVentas({ statusCode: 200, body: { ventas: VENTAS } });
            visitar();
        });

        it('CP-VV-01: Debe mostrar el título y el nombre de la óptica', () => {
            cy.contains('h3', 'Historial de Ventas').should('be.visible');
            cy.contains('Óptica Lente Mágico').should('be.visible');
        });

        it('CP-VV-02: El botón "+ Nueva Venta" debe redirigir a confirmar venta', () => {
            // La pantalla destino puede lanzar errores propios al no tener el backend simulado
            cy.on('uncaught:exception', () => false);

            cy.contains('button', '+ Nueva Venta').click();
            cy.url().should('include', RUTA_CONFIRMAR);
        });
    });

    // ============================================
    // CARGA DE DATOS
    // ============================================
    describe('Carga de datos', () => {
        it('CP-VV-03: Debe mostrar "Cargando ventas..." mientras llega la respuesta', () => {
            interceptVentas({ delay: 800, statusCode: 200, body: { ventas: VENTAS } });
            visitar();

            cy.contains('Cargando ventas...').should('be.visible');
            cy.wait('@ventas');
            cy.contains('Cargando ventas...').should('not.exist');
            cy.get('table').should('be.visible');
        });

        it('CP-VV-04: Debe pedir las últimas 20 ventas al backend', () => {
            interceptVentas({ statusCode: 200, body: { ventas: VENTAS } });
            visitar();

            cy.wait('@ventas').its('request.url').should('include', 'limit=20');
        });
    });

    // ============================================
    // CON VENTAS
    // ============================================
    describe('Con ventas registradas', () => {
        beforeEach(() => {
            interceptVentas({ statusCode: 200, body: { ventas: VENTAS } });
            visitar();
            cy.wait('@ventas');
        });

        it('CP-VV-05: Debe mostrar la tabla con sus columnas', () => {
            cy.get('table').should('be.visible');
            ['#', 'Fecha', 'Cliente', 'Documento', 'Estado'].forEach((col) => {
                cy.contains('th', col).should('be.visible');
            });
        });

        it('CP-VV-06: Debe mostrar una fila por cada venta', () => {
            cy.get('tbody tr').should('have.length', VENTAS.length);
        });

        it('CP-VV-07: Debe mostrar los datos de cada venta en su fila', () => {
    cy.get('tbody tr').should('have.length', VENTAS.length);

    // Se compara por posición y con el texto normalizado (acentos compuestos/descompuestos)
    const norm = (t) => String(t).normalize('NFC');

    VENTAS.forEach((venta, i) => {
        cy.get('tbody tr').eq(i).should(($fila) => {
            const texto = norm($fila.text());
            expect(texto, `fila ${i + 1}`).to.include(norm(venta.id_venta));
            expect(texto, `fila ${i + 1}`).to.include(norm(venta.cliente));
            expect(texto, `fila ${i + 1}`).to.include(norm(venta.documento_cliente));
            expect(texto, `fila ${i + 1}`).to.include(norm(venta.estado));
        });
    });
});

        it('CP-VV-08: Debe mostrar la fecha sin segundos y sin la "T"', () => {
            cy.contains('td', '2025-03-10 14:30').should('be.visible');
            cy.contains('td', '2025-03-11 09:15').should('be.visible');
            cy.contains('td', '2025-03-10T14:30').should('not.exist');
        });

        it('CP-VV-09: No debe mostrar el mensaje de lista vacía ni errores', () => {
            cy.contains('No hay ventas registradas aún').should('not.exist');
            cy.get('.alert-danger').should('not.exist');
        });
    });

    // ============================================
    // SIN VENTAS
    // ============================================
    describe('Sin ventas registradas', () => {
        beforeEach(() => {
            interceptVentas({ statusCode: 200, body: { ventas: [] } });
            visitar();
            cy.wait('@ventas');
        });

        it('CP-VV-10: Debe mostrar el aviso de que no hay ventas y ocultar la tabla', () => {
            cy.contains('No hay ventas registradas aún').should('be.visible');
            cy.get('table').should('not.exist');
        });

        it('CP-VV-11: El botón "Registrar primera venta" debe redirigir a confirmar venta', () => {
            cy.on('uncaught:exception', () => false);

            cy.contains('button', 'Registrar primera venta').click();
            cy.url().should('include', RUTA_CONFIRMAR);
        });

        it('CP-VV-12: Si la respuesta no trae el campo "ventas" debe tratarse como lista vacía', () => {
            interceptVentas({ statusCode: 200, body: {} });
            visitar();
            cy.wait('@ventas');

            cy.contains('No hay ventas registradas aún').should('be.visible');
            cy.get('table').should('not.exist');
        });
    });

    // ============================================
    // ERRORES DEL BACKEND
    // ============================================
    describe('Errores del backend', () => {
        it('CP-VV-13: Si el backend falla debe mostrar la alerta de error', () => {
            interceptVentas({ statusCode: 500, body: { error: 'Error interno del servidor' } });
            visitar();
            cy.wait('@ventas');

            cy.get('.alert-danger').should('be.visible');
            cy.contains('Cargando ventas...').should('not.exist');
            cy.get('table').should('not.exist');
        });
    });

});