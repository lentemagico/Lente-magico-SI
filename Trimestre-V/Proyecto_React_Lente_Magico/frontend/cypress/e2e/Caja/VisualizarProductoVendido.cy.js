// cypress/e2e/Caja/VisualizarProductoVendido.cy.js
const RUTA = '/caja/visualizar-producto-vendido'; // coincide con <Route path> de App.jsx
const API = '**/api/productos-vendidos';

const PRODUCTOS = [
    { id: 1, nombre: 'Montura Negra', precio_unitario: 25000, fecha_venta: '2026-03-15T14:30:00' },
    { id: 2, nombre: 'Lentes Fotocromáticos', precio_unitario: 210000, fecha_venta: '2026-03-15T15:10:00' },
    { id: 3, nombre: 'Estuche Rígido', precio_unitario: 15000, hora: '10:45 AM' },
];

// Visita la ruta con sesión simulada
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

// Simula la respuesta de productos vendidos (la pantalla la pide al montarse) y visita la ruta
function visitarConRespuesta(body, statusCode = 200) {
    cy.intercept('GET', API, { statusCode, body }).as('productos');
    visitar();
    cy.wait('@productos');
}

describe('Pruebas de Caja Negra - Visualizar Producto Vendido (UI)', () => {

    // Cada producto vendido se muestra en una tarjeta oscura
    const tarjetas = () => cy.get('.bg-dark.text-warning');

    // ============================================
    // CARGA Y LISTADO
    // ============================================
    describe('Carga y listado', () => {
        it('CP-UI-01: Debe mostrar el título y el indicador "Cargando productos..." mientras llega la respuesta', () => {
            cy.intercept('GET', API, {
                delay: 800,
                statusCode: 200,
                body: { productosVendidos: PRODUCTOS },
            }).as('productos');
            visitar();

            cy.contains('h3', 'Productos Vendidos').should('be.visible');
            cy.contains('Cargando productos...').should('be.visible');
            cy.contains('No se encontraron productos vendidos').should('not.exist');

            cy.wait('@productos');
            cy.contains('Cargando productos...').should('not.exist');
            cy.contains('Montura Negra').should('be.visible');
        });

        it('CP-UI-02: Debe mostrar una tarjeta por cada producto vendido', () => {
            visitarConRespuesta({ productosVendidos: PRODUCTOS });

            tarjetas().should('have.length', PRODUCTOS.length);
            PRODUCTOS.forEach((p) => cy.contains(p.nombre).should('be.visible'));
            cy.get('.alert-danger').should('not.exist');
        });

        it('CP-UI-03: Debe mostrar el precio de cada producto con formato de pesos', () => {
            visitarConRespuesta({ productosVendidos: PRODUCTOS });

            cy.contains('.bg-dark', 'Montura Negra').contains(/\$25[.,]000/).should('be.visible');
            cy.contains('.bg-dark', 'Lentes Fotocromáticos').contains(/\$210[.,]000/).should('be.visible');
            cy.contains('.bg-dark', 'Estuche Rígido').contains(/\$15[.,]000/).should('be.visible');
        });

        it('CP-UI-04: Debe mostrar la fecha de venta, o la hora si el producto no trae fecha', () => {
            visitarConRespuesta({ productosVendidos: PRODUCTOS });

            cy.contains('.bg-dark', 'Montura Negra').should('contain', '2026');
            cy.contains('.bg-dark', 'Estuche Rígido').should('contain', '10:45 AM');
        });
    });

    // ============================================
    // FORMAS DE RESPUESTA DEL BACKEND
    // ============================================
    describe('Formas de respuesta del backend', () => {
        it('CP-UI-05: Debe funcionar si el backend responde con la lista en "productos"', () => {
            visitarConRespuesta({ productos: PRODUCTOS });

            tarjetas().should('have.length', PRODUCTOS.length);
            cy.contains('Montura Negra').should('be.visible');
        });

        it('CP-UI-06: Debe funcionar si el backend responde directamente con un arreglo', () => {
            visitarConRespuesta(PRODUCTOS);

            tarjetas().should('have.length', PRODUCTOS.length);
            cy.contains('Lentes Fotocromáticos').should('be.visible');
        });

        it('CP-UI-07: Debe aceptar nombres de campo alternativos para nombre y precio', () => {
            visitarConRespuesta({
                productosVendidos: [
                    { id_producto: 10, nombre_producto: 'Líquido Limpiador', precio: 8000 },
                    { id_producto: 11, descripcion: 'Cordón Deportivo', precio_producto: 5000 },
                ],
            });

            tarjetas().should('have.length', 2);
            cy.contains('.bg-dark', 'Líquido Limpiador').contains(/\$8[.,]000/).should('be.visible');
            cy.contains('.bg-dark', 'Cordón Deportivo').contains(/\$5[.,]000/).should('be.visible');
        });
    });

    // ============================================
    // SIN DATOS Y ERRORES
    // ============================================
    describe('Sin datos y errores', () => {
        it('CP-UI-08: Debe mostrar "No se encontraron productos vendidos" si la lista viene vacía', () => {
            visitarConRespuesta({ productosVendidos: [] });

            cy.contains('No se encontraron productos vendidos').should('be.visible');
            tarjetas().should('not.exist');
            cy.get('.alert-danger').should('not.exist');
        });

        it('CP-UI-09: Si el backend falla debe mostrar el error devuelto y la lista vacía', () => {
            visitarConRespuesta({ error: 'Error interno del servidor' }, 500);

            cy.get('.alert-danger').should('be.visible').and('contain', 'Error interno del servidor');
            cy.contains('No se encontraron productos vendidos').should('be.visible');
            tarjetas().should('not.exist');
        });

        it('CP-UI-10: Si el backend falla sin enviar mensaje debe mostrar el mensaje por defecto', () => {
            visitarConRespuesta({}, 500);

            cy.get('.alert-danger')
                .should('be.visible')
                .and('contain', 'Error al cargar los productos vendidos');
        });
    });

});