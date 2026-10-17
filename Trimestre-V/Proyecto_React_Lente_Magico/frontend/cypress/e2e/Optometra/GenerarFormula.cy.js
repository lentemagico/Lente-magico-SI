// cypress/e2e/Optometra/registroFormulaOptica.cy.js
const RUTA = '/optometra/generar-formula';

// El backend se simula con cy.intercept para no depender de los datos de la
// base ni crear fórmulas reales en cada ejecución.
const CONSULTAS = [
    { id_consulta: 7, id_cliente: 1, motivo: 'Control anual' },
    { id_consulta: 8, id_cliente: 2, motivo: 'Revision general' },
];

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
        id_historia: 9,
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

// Abre el formulario y espera a que lleguen las consultas y los pacientes.
function abrirFormulario() {
    visitarConSesion(RUTA);

    cy.wait('@getConsultas');
    cy.wait('@getPacientes');
}

// Busca un campo a partir del texto de su etiqueta.
function campo(etiqueta, tipo) {
    return cy.contains('label', etiqueta).parent().find(tipo);
}

// Llena solo los campos obligatorios: consulta, tipo de lente y uso.
function llenarObligatorios() {
    campo('Consulta', 'select').select('7');
    campo('Tipo de lente', 'select').select('Monofocal');
    campo('Uso', 'select').select('Permanente');
}

describe('Pruebas de Caja Negra - Registro de Fórmula Óptica (UI)', () => {
    beforeEach(() => {
        cy.on('window:confirm', () => true);
        cy.on('window:alert', () => true);

        // Pantallas a las que vuelve (agregar consulta): cualquier otra petición GET
        // a la API se simula para que no llame al backend real.
        // Se define primero para que las respuestas específicas de abajo tengan prioridad.
        cy.intercept('GET', '**/api/**', {
            statusCode: 200,
            body: [],
        });

        // Respuestas por defecto del backend. Una prueba puede definir otra
        // respuesta antes de abrir la página y esa será la que se use.
        cy.intercept('GET', '**/api/optometra/consultas', {
            statusCode: 200,
            body: CONSULTAS,
        }).as('getConsultas');

        cy.intercept('GET', '**/api/optometra/cliente', {
            statusCode: 200,
            body: PACIENTES,
        }).as('getPacientes');

        cy.intercept('POST', '**/api/optometra/formulas', {
            statusCode: 201,
            body: { mensaje: 'Fórmula óptica registrada correctamente.' },
        }).as('crearFormula');
    });

    // ============================================
    // CASOS BÁSICOS
    // ============================================
    it('CP-FOR-01: Debe cargar la página con el título, los campos y los botones', () => {
        abrirFormulario();

        cy.url().should('include', RUTA);

        cy.contains('h4', 'Generar fórmula óptica').should('be.visible');
        cy.contains('label', 'Consulta').should('be.visible');
        cy.contains('label', 'Paciente').should('be.visible');
        cy.contains('label', 'Tipo de lente').should('be.visible');
        cy.contains('label', 'Uso').should('be.visible');
        cy.contains('h5', 'Vista previa de la fórmula').should('be.visible');

        cy.contains('button', 'Generar fórmula').should('be.visible');
        cy.contains('a', 'Cancelar').should('be.visible');

        // Sin fórmula generada no se puede imprimir
        cy.contains('button', 'Imprimir fórmula').should('be.disabled');
    });

    it('CP-FOR-02: Debe listar las consultas y mostrar el paciente de la elegida', () => {
        abrirFormulario();

        cy.contains('option', 'Matias Bravo — Control anual').should('exist');
        cy.contains('option', 'Gume Cassiani — Revision general').should('exist');

        campo('Paciente', 'input').should('have.value', 'Seleccione una consulta');

        campo('Consulta', 'select').select('7');

        campo('Paciente', 'input').should('have.value', 'Matias Bravo');
    });

    // ============================================
    // CASOS DE VALIDACIÓN
    // ============================================
    it('CP-FOR-03: NO debe generar la fórmula sin seleccionar una consulta', () => {
        abrirFormulario();

        campo('Tipo de lente', 'select').select('Monofocal');
        campo('Uso', 'select').select('Permanente');

        cy.contains('button', 'Generar fórmula').click();

        // El navegador bloquea el envío porque la consulta es obligatoria
        campo('Consulta', 'select').then(($select) => {
            expect($select[0].checkValidity()).to.eq(false);
        });

        cy.get('@crearFormula.all').should('have.length', 0);
    });

    it('CP-FOR-04: NO debe generar la fórmula sin tipo de lente ni uso', () => {
        abrirFormulario();

        campo('Consulta', 'select').select('7');

        cy.contains('button', 'Generar fórmula').click();

        // El navegador bloquea el envío porque el tipo de lente y el uso son obligatorios
        campo('Tipo de lente', 'select').then(($select) => {
            expect($select[0].checkValidity()).to.eq(false);
        });

        campo('Uso', 'select').then(($select) => {
            expect($select[0].checkValidity()).to.eq(false);
        });

        cy.get('@crearFormula.all').should('have.length', 0);
    });

    it('CP-FOR-05: La vista previa debe mostrar los datos que se van escribiendo', () => {
        abrirFormulario();

        campo('Consulta', 'select').select('7');
        campo('Esfera — Ojo derecho (OD)', 'input').type('-1.50');
        campo('Tipo de lente', 'select').select('Progresivo');

        cy.get('.vista-formula')
            .should('contain.text', 'Matias Bravo')
            .and('contain.text', '-1.50')
            .and('contain.text', 'Progresivo');
    });

    // ============================================
    // CASOS DE GUARDADO
    // ============================================
    it('CP-FOR-06: Debe generar la fórmula con la graduación y habilitar imprimir', () => {
        abrirFormulario();

        llenarObligatorios();

        campo('Esfera — Ojo derecho (OD)', 'input').type('-1.50');
        campo('Esfera — Ojo izquierdo (OI)', 'input').type('-2.00');
        campo('Cilindro — Ojo derecho (OD)', 'input').type('-0.75');
        campo('Cilindro — Ojo izquierdo (OI)', 'input').type('-1.00');
        campo('Eje — Ojo derecho (OD)', 'input').type('90°');
        campo('Eje — Ojo izquierdo (OI)', 'input').type('85°');
        campo('Adición', 'input').type('+2.00');
        campo('Observaciones', 'textarea').type('Control en seis meses');

        cy.contains('button', 'Generar fórmula').click();

        cy.wait('@crearFormula').then(({ request, response }) => {
            expect(response.statusCode).to.eq(201);

            expect(request.body).to.deep.equal({
                id_consulta: 7,
                esfera_ojo_derecho_e_izquierdo: 'OD: -1.50 | OI: -2.00',
                cilindro_ojo_derecho_e_izquierdo: 'OD: -0.75 | OI: -1.00',
                eje_ojo_derecho_e_izquierdo: 'OD: 90° | OI: 85°',
                adicion: '+2.00',
                tipo_lente: 'Monofocal',
                uso: 'Permanente',
                observaciones: 'Control en seis meses',
            });
        });

        cy.contains('.alert-success', '¡Fórmula óptica generada con éxito!')
            .should('be.visible');

        // Con la fórmula generada ya se puede imprimir
        cy.contains('button', 'Imprimir fórmula').should('not.be.disabled');
    });

    it('CP-FOR-07: Debe usar los valores por defecto en los campos opcionales', () => {
        abrirFormulario();

        llenarObligatorios();

        cy.contains('button', 'Generar fórmula').click();

        cy.wait('@crearFormula').then(({ request }) => {
            expect(request.body).to.deep.equal({
                id_consulta: 7,
                esfera_ojo_derecho_e_izquierdo: 'OD: 0.00 | OI: 0.00',
                cilindro_ojo_derecho_e_izquierdo: 'OD: 0.00 | OI: 0.00',
                eje_ojo_derecho_e_izquierdo: 'OD: 0° | OI: 0°',
                adicion: 'Sin adición',
                tipo_lente: 'Monofocal',
                uso: 'Permanente',
                observaciones: 'Sin observaciones',
            });
        });
    });

    it('CP-FOR-08: Debe avisar si la consulta ya tiene una fórmula generada', () => {
        cy.intercept('POST', '**/api/optometra/formulas', {
            statusCode: 409,
            body: { error: 'Duplicado' },
        }).as('crearFormula');

        abrirFormulario();

        llenarObligatorios();

        cy.contains('button', 'Generar fórmula').click();

        cy.wait('@crearFormula')
            .its('response.statusCode')
            .should('eq', 409);

        cy.get('.alert-danger')
            .should('be.visible')
            .and('contain.text', 'Esta consulta ya tiene una fórmula óptica generada.');

        // Sin fórmula generada no se puede imprimir
        cy.contains('button', 'Imprimir fórmula').should('be.disabled');
    });

    // ============================================
    // CASO DE NAVEGACIÓN
    // ============================================
    it('CP-FOR-09: El botón Cancelar debe volver a agregar consulta', () => {
        abrirFormulario();

        cy.contains('a', 'Cancelar').click();

        cy.url().should('include', '/optometra/agregar-consulta');
    });
});