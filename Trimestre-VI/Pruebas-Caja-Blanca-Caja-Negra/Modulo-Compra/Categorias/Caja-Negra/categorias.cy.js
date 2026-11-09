// cypress/e2e/Compra-bodega/categorias.cy.js
const RUTA = '/categorias';

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

// El input de nombre solo acepta letras (el componente borra números y símbolos
// con una regex), así que el nombre único se arma con letras a partir del timestamp.
function nombreUnico(prefijo = 'Cypress') {
    const sufijo = String(Date.now())
        .split('')
        .map((digito) => String.fromCharCode(65 + Number(digito)))
        .join('');

    return `${prefijo} ${sufijo}`;
}

describe('Pruebas de Caja Negra - Categorías (UI)', () => {

    // Selector de las tarjetas de categoría (el componente usa cards, no <table>)
    const CARD = '.rounded-4.bg-white.shadow-sm';

    // Abre el formulario "Agregar nueva categoría"
    const abrirFormularioAgregar = () => {
        cy.contains('button', '+ Agregar categoría').click();
        cy.contains('h6', 'Agregar nueva categoría').should('be.visible');
    };

    beforeEach(() => {
        cy.on('window:alert', () => true); // el componente usa alert() cuando falla algo
        visitarConSesion(RUTA);
    });

    // ============================================
    // CASOS BÁSICOS
    // ============================================
    it('CP-UI-01: Debe cargar la página de categorías', () => {
        cy.url().should('include', RUTA);
    });

    it('CP-UI-02: Debe mostrar el título "Categorías"', () => {
        cy.contains('h4', 'Categorías').should('be.visible');
    });

    // ============================================
    // CREACIÓN
    // ============================================
    it('CP-UI-03: Debe crear una nueva categoría correctamente', () => {
        const nombre = nombreUnico('Cypress Test');

        cy.intercept('POST', '**/api/categorias').as('crearCategoria');

        abrirFormularioAgregar();

        // Se trabaja dentro del formulario (.card) para no confundir
        // el botón "Agregar categoría" del form con "+ Agregar categoría" de la barra
        cy.get('.card').within(() => {
            cy.get('input[name="nombreCategoria"]').type(nombre);
            cy.get('textarea[name="descripcion"]').type('Descripcion creada por Cypress');
            cy.contains('button', 'Agregar categoría').click();
        });

        cy.wait('@crearCategoria').its('response.statusCode').should('be.oneOf', [200, 201]);
        cy.contains(CARD, nombre).should('be.visible');
    });

    it('CP-UI-04: NO debe crear una categoría con el campo vacío', () => {
        cy.intercept('GET', '**/api/categorias').as('getCategorias');
        visitarConSesion(RUTA);
        cy.wait('@getCategorias');

        // Contamos las tarjetas una vez cargados los datos reales
        cy.get(CARD).then(($tarjetas) => {
            const cantidadAntes = $tarjetas.length;

            abrirFormularioAgregar();
            cy.get('.card').within(() => {
                cy.get('input[name="nombreCategoria"]').clear();
                cy.contains('button', 'Agregar categoría').click();
            });

            // La cantidad no debe cambiar
            cy.get(CARD).should('have.length', cantidadAntes);
        });
    });

    // ============================================
    // LISTADO
    // ============================================
    it('CP-UI-05: La lista debe cargar los datos desde el backend', () => {
        cy.intercept('GET', '**/api/categorias').as('getCategorias');
        visitarConSesion(RUTA);
        cy.wait('@getCategorias').its('response.statusCode').should('eq', 200);
        cy.get(CARD).should('have.length.greaterThan', 0);
    });

    // ============================================
    // ELIMINACIÓN
    // ============================================
    it('CP-UI-06: Debe eliminar una categoría existente', () => {
        const nombre = nombreUnico('Para Borrar');

        cy.intercept('POST', '**/api/categorias').as('crearCategoria');
        cy.intercept('DELETE', '**/api/categorias/*').as('borrarCategoria');

        // 1. Crear la categoría
        abrirFormularioAgregar();
        cy.get('.card').within(() => {
            cy.get('input[name="nombreCategoria"]').type(nombre);
            cy.contains('button', 'Agregar categoría').click();
        });
        cy.wait('@crearCategoria');
        cy.contains(CARD, nombre).should('be.visible');

        // 2. Clic en el botón 🗑️ de esa tarjeta
        cy.contains(CARD, nombre).within(() => {
            cy.contains('button', '🗑️').click();
        });

        // 3. Confirmar en el modal propio (no es window.confirm)
        cy.contains('Confirmar eliminación').should('be.visible');
        cy.contains('button', 'Sí, eliminar').click();

        // 4. Esperar el DELETE y verificar que ya no existe
        cy.wait('@borrarCategoria').its('response.statusCode').should('be.oneOf', [200, 204]);
        cy.contains(nombre).should('not.exist');
    });

    // ============================================
    // EDICIÓN
    // ============================================
    it('CP-UI-07: Debe abrir la edición de una categoría', () => {
        cy.get(CARD).first().within(() => {
            cy.contains('button', '✏️').click();
        });

        // Aparece el formulario de edición con los datos cargados
        cy.contains('h6', 'Editando categoría').should('be.visible');
        cy.get('input[name="nombreCategoria"]').should('be.visible').and('not.have.value', '');
    });

});