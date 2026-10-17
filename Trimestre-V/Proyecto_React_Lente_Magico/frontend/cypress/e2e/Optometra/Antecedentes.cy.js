// cypress/e2e/Optometra/registroAntecedentes.cy.js
const RUTA = '/optometra/antecedentes';

// El backend se simula con cy.intercept para no depender de los datos de la
// base ni crear antecedentes reales en cada ejecución.
// Matias tiene historia clínica (#6); Gume no tiene.
const PACIENTES = [
    {
        id_cliente: 1,
        nombre: 'Matias Bravo',
        numeroDocumento: '633663653',
        id_historia: 6,
    },
    {
        id_cliente: 2,
        nombre: 'Gume Cassiani',
        numeroDocumento: '0000000222',
        id_historia: null,
    },
];

function visitarConSesion(ruta) {
    cy.visit(ruta, {
        onBeforeLoad(win) {
            win.localStorage.setItem(
                'usuario_logueado',
                JSON.stringify({
                    id: 1,
                    nombre: 'Optometra Cypress',
                    login: 'optometra',
                    rol: 'Optómetra',
                })
            );
        },
    });
}

// Abre el formulario y espera a que lleguen los pacientes.
function abrirFormulario() {
    visitarConSesion(RUTA);

    cy.wait('@getPacientes');
}

// Busca un campo a partir del texto de su etiqueta.
function campo(etiqueta, tipo) {
    return cy.contains('label', etiqueta).parent().find(tipo);
}

describe('Pruebas de Caja Negra - Registro de Antecedentes (UI)', () => {
    beforeEach(() => {
        cy.on('window:confirm', () => true);
        cy.on('window:alert', () => true);

        // Pantallas a las que redirige o vuelve (generar fórmula, historia clínica):
        // cualquier otra petición GET a la API se simula para que no llame al backend real.
        // Se define primero para que las respuestas específicas de abajo tengan prioridad.
        cy.intercept('GET', '**/api/**', {
            statusCode: 200,
            body: [],
        });

        // Respuestas por defecto del backend. Una prueba puede definir otra
        // respuesta antes de abrir la página y esa será la que se use.
        cy.intercept('GET', '**/api/optometra/cliente', {
            statusCode: 200,
            body: PACIENTES,
        }).as('getPacientes');

        cy.intercept('POST', '**/api/optometra/antecedentes', {
            statusCode: 201,
            body: { mensaje: 'Antecedente registrado correctamente.' },
        }).as('crearAntecedente');
    });

    // ============================================
    // CASOS BÁSICOS
    // ============================================
    it('CP-ANT-01: Debe cargar la página con el título, los campos y los botones', () => {
        abrirFormulario();

        cy.url().should('include', RUTA);

        cy.contains('h4', 'Registrar antecedente').should('be.visible');
        cy.contains('label', 'Paciente').should('be.visible');
        cy.contains('label', 'Historia clínica').should('be.visible');
        cy.contains('label', 'Antecedentes').should('be.visible');
        cy.contains('button', 'Guardar antecedente').should('be.visible');
        cy.contains('a', 'Cancelar').should('be.visible');
    });

    it('CP-ANT-02: Debe listar los pacientes y mostrar la historia clínica del elegido', () => {
        abrirFormulario();

        cy.contains('option', 'Matias Bravo - Documento: 633663653').should('exist');
        cy.contains('option', 'Gume Cassiani - Documento: 0000000222').should('exist');

        campo('Historia clínica', 'input').should('have.value', 'Seleccione un paciente');

        campo('Paciente', 'select').select('1');

        campo('Historia clínica', 'input').should('have.value', 'Historia clínica #6');
    });

    // ============================================
    // CASOS DE VALIDACIÓN
    // ============================================
    it('CP-ANT-03: NO debe guardar el antecedente sin seleccionar un paciente', () => {
        abrirFormulario();

        campo('Antecedentes', 'textarea').type('Glaucoma familiar');
        cy.contains('button', 'Guardar antecedente').click();

        // El navegador bloquea el envío porque el paciente es obligatorio
        campo('Paciente', 'select').then(($select) => {
            expect($select[0].checkValidity()).to.eq(false);
        });

        cy.get('@crearAntecedente.all').should('have.length', 0);
    });

    it('CP-ANT-04: NO debe guardar el antecedente sin texto', () => {
        abrirFormulario();

        campo('Paciente', 'select').select('1');
        cy.contains('button', 'Guardar antecedente').click();

        // El navegador bloquea el envío porque los antecedentes son obligatorios
        campo('Antecedentes', 'textarea').then(($textarea) => {
            expect($textarea[0].checkValidity()).to.eq(false);
        });

        cy.get('@crearAntecedente.all').should('have.length', 0);
    });

    it('CP-ANT-05: NO debe guardar si el paciente no tiene historia clínica', () => {
        abrirFormulario();

        campo('Paciente', 'select').select('2');
        campo('Antecedentes', 'textarea').type('Glaucoma familiar');

        cy.contains('button', 'Guardar antecedente').click();

        cy.get('.alert-danger')
            .should('be.visible')
            .and('contain.text', 'Este paciente no tiene historia clínica');

        cy.get('@crearAntecedente.all').should('have.length', 0);
    });

    it('CP-ANT-06: Los antecedentes NO deben aceptar caracteres especiales', () => {
        abrirFormulario();

        campo('Antecedentes', 'textarea').type('Glaucoma@#$ familiar');

        campo('Antecedentes', 'textarea').should('have.value', 'Glaucoma familiar');
    });

    // ============================================
    // CASOS DE GUARDADO
    // ============================================
    it('CP-ANT-07: Debe guardar el antecedente y redirigir a generar fórmula', () => {
        abrirFormulario();

        campo('Paciente', 'select').select('1');
        campo('Antecedentes', 'textarea').type('Glaucoma familiar');

        cy.contains('button', 'Guardar antecedente').click();

        cy.wait('@crearAntecedente').then(({ request, response }) => {
            expect(response.statusCode).to.eq(201);

            // Solo se envían las dos columnas de la tabla Antecedentes
            expect(request.body).to.have.all.keys('id_historia', 'antecedentes');
            expect(request.body.id_historia).to.eq(6);
            expect(request.body.antecedentes).to.eq('Glaucoma familiar');
        });

        cy.contains('.alert-success', '¡Antecedente registrado con éxito!')
            .should('be.visible');

        // La redirección ocurre tras un breve retraso
        cy.url().should('include', '/optometra/generar-formula');
    });

    it('CP-ANT-08: Debe mostrar el error que devuelve el backend al guardar', () => {
        cy.intercept('POST', '**/api/optometra/antecedentes', {
            statusCode: 500,
            body: { error: 'Error al guardar el antecedente.' },
        }).as('crearAntecedente');

        abrirFormulario();

        campo('Paciente', 'select').select('1');
        campo('Antecedentes', 'textarea').type('Glaucoma familiar');

        cy.contains('button', 'Guardar antecedente').click();

        cy.wait('@crearAntecedente')
            .its('response.statusCode')
            .should('eq', 500);

        cy.get('.alert-danger')
            .should('be.visible')
            .and('contain.text', 'Error al guardar el antecedente.');

        // No debe salir de la pantalla
        cy.url().should('include', RUTA);
    });

    // ============================================
    // CASO DE NAVEGACIÓN
    // ============================================
    it('CP-ANT-09: El botón Cancelar debe volver a la historia clínica', () => {
        abrirFormulario();

        cy.contains('a', 'Cancelar').click();

        cy.url().should('include', '/optometra/historia-clinica');
    });
});