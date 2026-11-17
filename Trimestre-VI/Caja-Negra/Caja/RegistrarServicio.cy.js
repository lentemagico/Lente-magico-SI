// cypress/e2e/Caja/RegistrarServicio.cy.js
const RUTA = '/caja/registrar-servicio'; // coincide con <Route path> de App.jsx
const API = '**/api/servicios';

const MENSAJE_NATIVO = 'Por favor, rellena este campo.';

const SERVICIO = { tipo: 'Consulta Médica', nombre: 'Examen General', costo: '25000' };

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

describe('Pruebas de Caja Negra - Registrar Servicio (UI)', () => {

    // Selectores basados en los campos del formulario
    const selectTipo = () => cy.get('select[name="tipoServicio"]');
    const inputNombre = () => cy.get('input[name="nombreServicio"]');
    const inputCosto = () => cy.get('input[name="costoServicio"]');
    const botonRegistrar = () => cy.contains('button', /Registrar Servicio|Registrando/);

    const llenarFormulario = ({ tipo, nombre, costo } = SERVICIO) => {
        if (tipo) selectTipo().select(tipo);
        if (nombre) inputNombre().type(nombre);
        if (costo) inputCosto().type(costo);
    };

    const respuestaExitosa = { mensaje: 'Servicio registrado' };

    beforeEach(() => {
        cy.intercept('POST', API, { statusCode: 201, body: respuestaExitosa }).as('guardar');
        visitar();

        // Los mensajes de éxito/error también salen como alert(): se espía window.alert
        cy.window().then((win) => {
            cy.stub(win, 'alert').as('alerta');
        });
    });

    // ============================================
    // VISTA INICIAL
    // ============================================
    it('CP-UI-01: Debe mostrar el título, el selector, los campos y el botón sin mensajes', () => {
        cy.contains('h3', 'Registrar Servicio').should('be.visible');

        selectTipo().should('be.visible').and('have.value', null);
        selectTipo().contains('option', 'Servicio de Venta de Productos Ópticos').should('exist');
        selectTipo().contains('option', 'Consulta Médica').should('exist');

        cy.get('input[placeholder="Nombre (Ej: Montura Negra / Examen General)"]').should('be.visible');
        cy.get('input[placeholder="Costo del Servicio ($)"]').should('be.visible');

        botonRegistrar().should('be.visible').and('not.be.disabled');
        cy.get('.alert-danger').should('not.exist');
        cy.get('.alert-success').should('not.exist');
    });

    // ============================================
    // VALIDACIONES
    // ============================================
    describe('Validaciones', () => {
        const noDebeEnviarServicio = () => {
            cy.get('@guardar.all').should('have.length', 0);
            cy.get('.alert-success').should('not.exist');
        };

        it('CP-UI-02: NO debe registrar con todos los campos vacíos', () => {
            botonRegistrar().click();

            cy.get('select:invalid, input:invalid').should('have.length', 3);
            noDebeEnviarServicio();
        });

        it('CP-UI-03: NO debe registrar sin tipo de servicio', () => {
            llenarFormulario({ ...SERVICIO, tipo: null });
            botonRegistrar().click();

            selectTipo().then(($i) => expect($i[0].validationMessage).to.eq(MENSAJE_NATIVO));
            noDebeEnviarServicio();
        });

        it('CP-UI-04: NO debe registrar sin nombre del servicio', () => {
            llenarFormulario({ ...SERVICIO, nombre: null });
            botonRegistrar().click();

            inputNombre().then(($i) => expect($i[0].validationMessage).to.eq(MENSAJE_NATIVO));
            noDebeEnviarServicio();
        });

        it('CP-UI-05: NO debe registrar sin costo del servicio', () => {
            llenarFormulario({ ...SERVICIO, costo: null });
            botonRegistrar().click();

            inputCosto().then(($i) => expect($i[0].validationMessage).to.eq(MENSAJE_NATIVO));
            noDebeEnviarServicio();
        });
    });

    // ============================================
    // REGISTRO DEL SERVICIO
    // ============================================
    describe('Registro del servicio', () => {
        it('CP-UI-06: Debe enviar los datos al backend y mostrar los mensajes de éxito', () => {
            llenarFormulario();
            botonRegistrar().click();

            cy.wait('@guardar').its('request.body').should((body) => {
                expect(body.tipo_servicio).to.eq('Consulta Médica');
                expect(body.nombre_servicio).to.eq(SERVICIO.nombre);
                expect(String(body.costo_servicio)).to.eq(SERVICIO.costo);
            });

            cy.get('.alert-success').should('be.visible').and('contain', 'Servicio registrado exitosamente');
            cy.get('@alerta').should('have.been.calledWithMatch', /Servicio registrado con éxito/);
            cy.get('@alerta').should('have.been.calledWithMatch', /Tipo: Consulta Médica/);
            cy.get('@alerta').should('have.been.calledWithMatch', /Nombre: Examen General/);
            cy.get('@alerta').should('have.been.calledWithMatch', /Costo: \$25000/);
        });

        it('CP-UI-07: Debe limpiar el formulario después de registrar', () => {
            llenarFormulario();
            botonRegistrar().click();
            cy.wait('@guardar');

            selectTipo().should('have.value', null);
            inputNombre().should('have.value', '');
            inputCosto().should('have.value', '');
        });

        it('CP-UI-08: Debe mostrar "Registrando..." y deshabilitar el botón mientras se guarda', () => {
            cy.intercept('POST', API, {
                delay: 800,
                statusCode: 201,
                body: respuestaExitosa,
            }).as('guardarLento');

            llenarFormulario();
            botonRegistrar().click();

            cy.contains('button', 'Registrando...').should('be.disabled');
            cy.wait('@guardarLento');
            cy.contains('button', 'Registrar Servicio').should('not.be.disabled');
        });

        it('CP-UI-09: Debe enviar el tipo "Servicio de Venta Óptica" al elegir venta de productos ópticos', () => {
            llenarFormulario({ ...SERVICIO, tipo: 'Servicio de Venta de Productos Ópticos', nombre: 'Montura Negra' });
            botonRegistrar().click();

            cy.wait('@guardar').its('request.body.tipo_servicio').should('eq', 'Servicio de Venta Óptica');
        });
    });

    // ============================================
    // ERROR DEL BACKEND
    // ============================================
    it('CP-UI-10: Si el backend rechaza el registro debe mostrar el error y conservar los datos', () => {
        cy.intercept('POST', API, {
            statusCode: 400,
            body: { error: 'El servicio ya existe' },
        }).as('guardarError');

        llenarFormulario();
        botonRegistrar().click();
        cy.wait('@guardarError');

        cy.get('.alert-danger').should('be.visible').and('contain', 'El servicio ya existe');
        cy.get('.alert-success').should('not.exist');
        cy.get('@alerta').should('have.been.calledWithMatch', /Error al registrar el servicio/);
        cy.get('@alerta').should('have.been.calledWithMatch', /Detalle técnico: El servicio ya existe/);

        selectTipo().should('have.value', 'Consulta Médica');
        inputNombre().should('have.value', SERVICIO.nombre);
        inputCosto().should('have.value', SERVICIO.costo);
        botonRegistrar().should('not.be.disabled');
    });

});