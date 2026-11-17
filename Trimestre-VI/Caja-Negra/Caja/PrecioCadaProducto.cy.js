// cypress/e2e/Caja/PrecioCadaProducto.cy.js
const RUTA = '/caja/precio-cada-producto'; // coincide con <Route path> de App.jsx
const API = '**/api/precio-producto';

const PRODUCTO = { nombre: 'Lentes Fotocromáticos', codigo: 'OPT-001', precio: 210000 };

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

describe('Pruebas de Caja Negra - Precio de Cada Producto (UI)', () => {

    // Selectores basados en lo que ve el usuario (textos, placeholders, labels)
    const inputNombre = () => cy.get('input[name="nombre"]');
    const inputCodigo = () => cy.get('input[name="codigo"]');
    const inputPrecio = () => cy.get('input[name="precio"]');
    const botonGuardar = () => cy.contains('button', /Guardar Precio|Guardando precio/);

    const llenarFormulario = ({ nombre, codigo, precio } = PRODUCTO) => {
        inputNombre().type(nombre);
        inputCodigo().type(codigo);
        inputPrecio().type(String(precio));
    };

    const respuestaExitosa = { id: 1, mensaje: 'Precio registrado' };

    beforeEach(() => {
        visitar();
        // Los mensajes de la pantalla son alert(): se espía window.alert para verificarlos
        cy.window().then((win) => {
            cy.stub(win, 'alert').as('alerta');
        });
    });

    // ============================================
    // VISTA INICIAL
    // ============================================
    it('CP-UI-01: Debe mostrar el título, los campos, el botón y NO mostrar el catálogo', () => {
        cy.contains('h3', 'Precios de Productos').should('be.visible');
        cy.contains('Registra los valores unitarios de los productos').should('be.visible');

        cy.contains('label', 'Nombre del Producto').should('be.visible');
        cy.contains('label', 'Código del Producto').should('be.visible');
        cy.contains('label', 'Valor del Producto ($)').should('be.visible');

        inputNombre().should('have.value', '');
        inputCodigo().should('have.value', '');
        inputPrecio().should('have.value', '');
        botonGuardar().should('be.visible').and('not.be.disabled');

        cy.contains('Catálogo de Precios Guardados').should('not.exist');
    });

    // ============================================
    // VALIDACIONES
    // ============================================
    describe('Validaciones', () => {
        beforeEach(() => {
            cy.intercept('POST', API).as('guardar');
        });

        const noDebeEnviarPrecio = () => {
            cy.get('@guardar.all').should('have.length', 0);
            cy.get('@alerta').should('not.have.been.calledWithMatch', /Precio registrado correctamente/);
        };

        it('CP-UI-02: NO debe guardar con el nombre vacío', () => {
            inputCodigo().type(PRODUCTO.codigo);
            inputPrecio().type(String(PRODUCTO.precio));
            botonGuardar().click();

            inputNombre().then(($i) => {
                expect($i[0].validationMessage).to.eq('Por favor, ingresa el nombre del producto.');
            });
            noDebeEnviarPrecio();
        });

        it('CP-UI-03: NO debe guardar con el código vacío', () => {
            inputNombre().type(PRODUCTO.nombre);
            inputPrecio().type(String(PRODUCTO.precio));
            botonGuardar().click();

            inputCodigo().then(($i) => {
                expect($i[0].validationMessage).to.eq('Por favor, ingresa el código del producto.');
            });
            noDebeEnviarPrecio();
        });

        it('CP-UI-04: NO debe guardar con el precio vacío', () => {
            inputNombre().type(PRODUCTO.nombre);
            inputCodigo().type(PRODUCTO.codigo);
            botonGuardar().click();

            inputPrecio().then(($i) => {
                expect($i[0].validationMessage).to.eq('Por favor, ingresa el valor del producto.');
            });
            noDebeEnviarPrecio();
        });

        it('CP-UI-05: NO debe guardar con precio 0 y debe avisar que sea mayor a 0', () => {
            llenarFormulario({ ...PRODUCTO, precio: 0 });
            botonGuardar().click();

            cy.get('@alerta').should('have.been.calledWith', 'El precio debe ser mayor a 0.');
            noDebeEnviarPrecio();
        });

        it('CP-UI-06: NO debe guardar con un precio negativo', () => {
            llenarFormulario({ ...PRODUCTO, precio: -500 });
            botonGuardar().click();
            noDebeEnviarPrecio();
        });
    });

    // ============================================
    // REGISTRO DEL PRECIO
    // ============================================
    describe('Registro del precio', () => {
        beforeEach(() => {
            cy.intercept('POST', API, { statusCode: 201, body: respuestaExitosa }).as('guardar');
        });

        it('CP-UI-07: Debe enviar los datos al backend y mostrar el mensaje de confirmación', () => {
            llenarFormulario();
            botonGuardar().click();

            cy.wait('@guardar').its('request.body').should((body) => {
                expect(body.nombre).to.eq(PRODUCTO.nombre);
                expect(body.codigo).to.eq(PRODUCTO.codigo);
                expect(body.precio).to.eq(PRODUCTO.precio);
            });

            cy.get('@alerta').should('have.been.calledWithMatch', /Precio registrado correctamente/);
            cy.get('@alerta').should('have.been.calledWithMatch', /Producto: Lentes Fotocromáticos/);
            cy.get('@alerta').should('have.been.calledWithMatch', /Código: OPT-001/);
        });

        it('CP-UI-08: Debe limpiar el formulario y mostrar el producto en el catálogo', () => {
            llenarFormulario();
            botonGuardar().click();
            cy.wait('@guardar');

            inputNombre().should('have.value', '');
            inputCodigo().should('have.value', '');
            inputPrecio().should('have.value', '');

            cy.contains('Catálogo de Precios Guardados').should('be.visible');
            cy.contains('.bg-light', PRODUCTO.nombre).within(() => {
                cy.contains(PRODUCTO.codigo).should('be.visible');
                cy.contains(/\$210[.,]000 COP/).should('be.visible');
            });
        });

        it('CP-UI-09: El producto más reciente debe aparecer primero en el catálogo', () => {
            llenarFormulario();
            botonGuardar().click();
            cy.wait('@guardar');

            llenarFormulario({ nombre: 'Estuche Rígido', codigo: 'OPT-002', precio: 15000 });
            botonGuardar().click();
            cy.wait('@guardar');

            cy.get('.bg-light.rounded').should('have.length', 2);
            cy.get('.bg-light.rounded').first().should('contain', 'Estuche Rígido');
            cy.get('.bg-light.rounded').last().should('contain', PRODUCTO.nombre);
        });
    });

    // ============================================
    // ERROR DEL BACKEND
    // ============================================
    it('CP-UI-10: Si el backend falla debe mostrar el error, conservar los datos y NO agregar al catálogo', () => {
        cy.intercept('POST', API, {
            statusCode: 400,
            body: { mensaje: 'El código ya existe' },
        }).as('guardar');

        llenarFormulario();
        botonGuardar().click();
        cy.wait('@guardar');

        cy.get('@alerta').should('have.been.calledWithMatch', /Error al guardar el precio/);
        cy.get('@alerta').should('have.been.calledWithMatch', /Detalle: El código ya existe/);

        inputNombre().should('have.value', PRODUCTO.nombre);
        inputCodigo().should('have.value', PRODUCTO.codigo);
        inputPrecio().should('have.value', String(PRODUCTO.precio));
        cy.contains('Catálogo de Precios Guardados').should('not.exist');
        cy.contains('button', 'Guardar Precio').should('not.be.disabled');
    });

});