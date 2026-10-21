// cypress/e2e/Caja/RegistrarDatosCliente.cy.js
const RUTA = '/caja/registrar-datos-cliente';      // coincide con <Route path> de App.jsx
const RUTA_CONSULTAR = '/caja/consultar-cliente';  // a donde redirige tras registrar
const API_TIPOS = '**/administrador/tipos-documento';
const API_REGISTRAR = '**/registrar-cliente';

const TIPOS = [
    { id: 1, sigla: 'CC', nombre_documento: 'Cédula de ciudadanía' },
    { id: 2, sigla: 'TI', nombre_documento: 'Tarjeta de identidad' },
];

const CLIENTE = {
    numero_documento: '1234567890',
    primer_nombre: 'Juan',
    segundo_nombre: 'Carlos',
    primer_apellido: 'Pérez',
    segundo_apellido: 'Gómez',
    fecha_nacimiento: '1990-05-20',
    genero: 'Masculino',
    correo: 'juan@correo.com',
    telefono: '3001234567',
};

const respuestaExitosa = {
    mensaje: 'Cliente registrado exitosamente',
    cliente: { id: 7, numero_documento: CLIENTE.numero_documento, primer_nombre: CLIENTE.primer_nombre },
};

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

// Simula los tipos de documento (se llaman al montar la pantalla) y visita la ruta
function iniciar() {
    cy.intercept('GET', API_TIPOS, { statusCode: 200, body: TIPOS }).as('tipos');
    visitar();
    cy.wait('@tipos');
}

describe('Pruebas de Caja Negra - Registrar Datos del Cliente (UI)', () => {

    // Selectores basados en los campos del formulario
    const tipoDoc = () => cy.get('select[name="id_tipo_documento"]');
    const numeroDoc = () => cy.get('input[name="numero_documento"]');
    const primerNombre = () => cy.get('input[name="primer_nombre"]');
    const segundoNombre = () => cy.get('input[name="segundo_nombre"]');
    const primerApellido = () => cy.get('input[name="primer_apellido"]');
    const segundoApellido = () => cy.get('input[name="segundo_apellido"]');
    const fechaNacimiento = () => cy.get('input[name="fecha_nacimiento"]');
    const genero = () => cy.get('select[name="genero"]');
    const correo = () => cy.get('input[name="correo"]');
    const telefono = () => cy.get('input[name="telefono"]');
    const botonRegistrar = () => cy.contains('button', /Registrar cliente|Guardando/);

    const llenarFormulario = (c = CLIENTE) => {
        numeroDoc().type(c.numero_documento);
        primerNombre().type(c.primer_nombre);
        segundoNombre().type(c.segundo_nombre);
        primerApellido().type(c.primer_apellido);
        segundoApellido().type(c.segundo_apellido);
        fechaNacimiento().type(c.fecha_nacimiento);
        genero().select(c.genero);
        correo().type(c.correo);
        telefono().type(c.telefono);
    };

    // ============================================
    // VISTA INICIAL
    // ============================================
    describe('Vista inicial', () => {
        beforeEach(() => iniciar());

        it('CP-UI-01: Debe mostrar el título, las etiquetas, el botón y ningún mensaje', () => {
            cy.contains('h3', 'Registrar Cliente').should('be.visible');

            ['Tipo doc. *', 'Número de documento *', 'Primer nombre *', 'Segundo nombre',
                'Primer apellido *', 'Segundo apellido', 'Fecha de nacimiento *', 'Género', 'Correo', 'Teléfono']
                .forEach((texto) => cy.contains('label', texto).should('be.visible'));

            botonRegistrar().should('be.visible').and('not.be.disabled').and('contain', 'Registrar cliente');
            cy.get('.alert-danger').should('not.exist');
            cy.get('.alert-success').should('not.exist');
        });

        it('CP-UI-02: Debe cargar los tipos de documento y seleccionar el primero automáticamente', () => {
            tipoDoc().should('not.be.disabled').and('have.value', '1');
            tipoDoc().find('option').should('have.length', TIPOS.length);
            tipoDoc().contains('option', 'CC').should('exist');
            tipoDoc().contains('option', 'TI').should('exist');
        });
    });

    // ============================================
    // VALIDACIONES
    // ============================================
    describe('Validaciones', () => {
        beforeEach(() => {
            iniciar();
            cy.intercept('POST', API_REGISTRAR).as('registrar');
        });

        const noDebeEnviarRegistro = () => {
            cy.get('@registrar.all').should('have.length', 0);
            cy.get('.alert-success').should('not.exist');
        };

        it('CP-UI-03: NO debe registrar con los campos obligatorios vacíos', () => {
            botonRegistrar().click();

            numeroDoc().then(($i) => expect($i[0].validity.valueMissing).to.eq(true));
            primerNombre().then(($i) => expect($i[0].validity.valueMissing).to.eq(true));
            primerApellido().then(($i) => expect($i[0].validity.valueMissing).to.eq(true));
            noDebeEnviarRegistro();
        });

        it('CP-UI-04: Los campos deben rechazar caracteres no permitidos mientras se escribe', () => {
            numeroDoc().type('abc123def456');
            numeroDoc().should('have.value', '123456');

            primerNombre().type('Juan123!');
            primerNombre().should('have.value', 'Juan');

            primerApellido().type('Pérez9@');
            primerApellido().should('have.value', 'Pérez');

            telefono().type('30a1-2');
            telefono().should('have.value', '3012');
        });

        it('CP-UI-05: NO debe registrar con un correo inválido', () => {
            llenarFormulario({ ...CLIENTE, correo: 'correo-invalido' });
            botonRegistrar().click();

            correo().then(($i) => expect($i[0].validity.typeMismatch).to.eq(true));
            noDebeEnviarRegistro();
        });
    });

    // ============================================
    // REGISTRO DEL CLIENTE
    // ============================================
    describe('Registro del cliente', () => {
        beforeEach(() => {
            iniciar();
            cy.intercept('POST', API_REGISTRAR, { statusCode: 201, body: respuestaExitosa }).as('registrar');
        });

        it('CP-UI-06: Debe enviar los datos al backend y mostrar el mensaje de éxito', () => {
            llenarFormulario();
            botonRegistrar().click();

            cy.wait('@registrar').its('request.body').should((body) => {
                expect(String(body.id_tipo_documento)).to.eq('1');
                expect(body.numero_documento).to.eq(CLIENTE.numero_documento);
                expect(body.primer_nombre).to.eq(CLIENTE.primer_nombre);
                expect(body.segundo_nombre).to.eq(CLIENTE.segundo_nombre);
                expect(body.primer_apellido).to.eq(CLIENTE.primer_apellido);
                expect(body.segundo_apellido).to.eq(CLIENTE.segundo_apellido);
                expect(body.fecha_nacimiento).to.eq(CLIENTE.fecha_nacimiento);
                expect(body.genero).to.eq(CLIENTE.genero);
                expect(body.correo).to.eq(CLIENTE.correo);
                expect(body.telefono).to.eq(CLIENTE.telefono);
            });

            cy.get('.alert-success').should('be.visible').and('contain', 'Cliente registrado exitosamente');
            cy.get('.alert-danger').should('not.exist');
        });

        it('CP-UI-07: Tras registrar debe limpiar el formulario, guardar el cliente y redirigir a consultar cliente', () => {
            // La pantalla destino puede lanzar errores propios al no tener el backend simulado
            cy.on('uncaught:exception', () => false);

            llenarFormulario();
            botonRegistrar().click();
            cy.wait('@registrar');

            numeroDoc().should('have.value', '');
            primerNombre().should('have.value', '');
            correo().should('have.value', '');

            cy.window().its('sessionStorage').should((storage) => {
                const cliente = JSON.parse(storage.getItem('clienteSeleccionado'));
                expect(cliente.id).to.eq(7);
                expect(cliente.numero_documento).to.eq(CLIENTE.numero_documento);
            });

            cy.url().should('include', RUTA_CONSULTAR);
        });

        it('CP-UI-08: Debe mostrar "Guardando..." y deshabilitar el botón mientras se registra', () => {
            cy.intercept('POST', API_REGISTRAR, {
                delay: 800,
                statusCode: 201,
                body: respuestaExitosa,
            }).as('registrarLento');

            llenarFormulario();
            botonRegistrar().click();

            cy.contains('button', 'Guardando...').should('be.disabled');
            cy.wait('@registrarLento');
        });
    });

    // ============================================
    // ERRORES DEL BACKEND
    // ============================================
    describe('Errores del backend', () => {
        it('CP-UI-09: Si el registro falla debe mostrar el error, conservar los datos y NO redirigir', () => {
            iniciar();
            cy.intercept('POST', API_REGISTRAR, {
                statusCode: 400,
                body: { error: 'El cliente ya existe', mensaje: 'El cliente ya existe' },
            }).as('registrar');

            llenarFormulario();
            botonRegistrar().click();
            cy.wait('@registrar');

            cy.get('.alert-danger').should('be.visible');
            cy.get('.alert-success').should('not.exist');
            numeroDoc().should('have.value', CLIENTE.numero_documento);
            primerNombre().should('have.value', CLIENTE.primer_nombre);
            cy.url().should('include', RUTA);
            botonRegistrar().should('not.be.disabled');
        });

        it('CP-UI-10: Si fallan los tipos de documento debe avisar y dejar el selector deshabilitado', () => {
            cy.intercept('GET', API_TIPOS, {
                statusCode: 500,
                body: { error: 'Error interno del servidor' },
            }).as('tipos');
            visitar();
            cy.wait('@tipos');

            cy.get('.alert-danger')
                .should('be.visible')
                .and('contain', 'No se pudieron cargar los tipos de documento');
            tipoDoc().should('be.disabled');
            tipoDoc().contains('option', 'Cargando...').should('exist');
        });
    });

});