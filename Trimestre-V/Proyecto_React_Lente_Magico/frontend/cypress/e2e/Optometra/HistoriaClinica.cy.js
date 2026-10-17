// cypress/e2e/Optometra/registroHistoriaClinica.cy.js
const RUTA = '/optometra/historia-clinica';

// El backend se simula con cy.intercept para no depender de los datos de la
// base ni crear historias clínicas reales en cada ejecución.
// Matias ya tiene historia (id_historia 6): no debe aparecer en el select.
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
  {
    id_cliente: 3,
    nombre: 'Alex Cassiani',
    numeroDocumento: '01132',
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

// Fecha de hoy en el mismo formato que usa el componente (YYYY-MM-DD).
function fechaHoy() {
  return new Date().toISOString().split('T')[0];
}

describe('Pruebas de Caja Negra - Registro de Historia Clínica (UI)', () => {
  beforeEach(() => {
    cy.on('window:confirm', () => true);
    cy.on('window:alert', () => true);

    // Respuestas por defecto del backend. Una prueba puede definir otra
    // respuesta antes de abrir la página y esa será la que se use.
    cy.intercept('GET', '**/api/optometra/cliente', {
      statusCode: 200,
      body: PACIENTES,
    }).as('getPacientes');

    cy.intercept('POST', '**/api/optometra/historia-clinica', {
      statusCode: 201,
      body: {
        mensaje: 'Historia clínica registrada correctamente.',
        id_historia: 20,
      },
    }).as('crearHistoria');

    // Pantalla a la que redirige al guardar: se simula para que no llame al backend real
    cy.intercept('GET', '**/api/agendar-consulta*', {
      statusCode: 200,
      body: { consultas: [] },
    });
  });

  // ============================================
  // CASOS BÁSICOS
  // ============================================
  it('CP-HIS-01: Debe cargar la página con el título, los campos y los botones', () => {
    abrirFormulario();

    cy.url().should('include', RUTA);

    cy.contains('h4', 'Registrar historia clínica').should('be.visible');
    cy.contains('label', 'Paciente').should('be.visible');
    cy.contains('label', 'Fecha de apertura').should('be.visible');
    cy.contains('button', 'Guardar historia clínica').should('be.visible');
    cy.contains('a', 'Cancelar').should('be.visible');
  });

  it('CP-HIS-02: El select solo debe listar los pacientes sin historia clínica', () => {
    abrirFormulario();

    cy.contains('option', 'Gume Cassiani — Documento: 0000000222').should('exist');
    cy.contains('option', 'Alex Cassiani — Documento: 01132').should('exist');

    // Matias ya tiene historia clínica, no debe aparecer
    cy.contains('option', 'Matias Bravo').should('not.exist');
  });

  it('CP-HIS-03: La fecha de apertura debe venir con la fecha de hoy', () => {
    abrirFormulario();

    campo('Fecha de apertura', 'input').should(($input) => {
      expect($input.val()).to.eq(fechaHoy());
    });
  });

  // ============================================
  // CASOS DE VALIDACIÓN
  // ============================================
  it('CP-HIS-04: NO debe guardar la historia sin seleccionar un paciente', () => {
    abrirFormulario();

    cy.contains('button', 'Guardar historia clínica').click();

    // El navegador bloquea el envío porque el paciente es obligatorio
    campo('Paciente', 'select').then(($select) => {
      expect($select[0].checkValidity()).to.eq(false);
    });

    cy.get('@crearHistoria.all').should('have.length', 0);
  });

  it('CP-HIS-05: NO debe guardar la historia sin fecha de apertura', () => {
    abrirFormulario();

    campo('Paciente', 'select').select('2');
    campo('Fecha de apertura', 'input').clear();

    cy.contains('button', 'Guardar historia clínica').click();

    // El navegador bloquea el envío porque la fecha es obligatoria
    campo('Fecha de apertura', 'input').then(($input) => {
      expect($input[0].checkValidity()).to.eq(false);
    });

    cy.get('@crearHistoria.all').should('have.length', 0);
  });

  // ============================================
  // CASOS DE GUARDADO
  // ============================================
  it('CP-HIS-06: Debe guardar la historia clínica y redirigir a agregar consulta', () => {
    abrirFormulario();

    campo('Paciente', 'select').select('2');

    cy.contains('button', 'Guardar historia clínica').click();

    cy.wait('@crearHistoria').then(({ request, response }) => {
      expect(response.statusCode).to.eq(201);

      // Solo se envían las dos columnas de la tabla Historia_clinica
      expect(request.body).to.have.all.keys('id_cliente', 'fecha_apertura');
      expect(request.body.id_cliente).to.eq(2);
      expect(request.body.fecha_apertura).to.eq(fechaHoy());
    });

    cy.contains('.alert-success', '¡Historia clínica registrada con éxito!')
      .should('be.visible');

    // La redirección ocurre tras un breve retraso
    cy.url().should('include', '/optometra/agregar-consulta');
  });

  it('CP-HIS-07: Debe mostrar el error que devuelve el backend al guardar', () => {
    cy.intercept('POST', '**/api/optometra/historia-clinica', {
      statusCode: 400,
      body: { error: 'Este cliente ya tiene una historia clínica registrada.' },
    }).as('crearHistoria');

    abrirFormulario();

    campo('Paciente', 'select').select('2');

    cy.contains('button', 'Guardar historia clínica').click();

    cy.wait('@crearHistoria')
      .its('response.statusCode')
      .should('eq', 400);

    cy.get('.alert-danger')
      .should('be.visible')
      .and('contain.text', 'Este cliente ya tiene una historia clínica registrada.');

    // No debe salir de la pantalla
    cy.url().should('include', RUTA);
  });

  // ============================================
  // CASOS ESPECIALES Y NAVEGACIÓN
  // ============================================
  it('CP-HIS-08: Debe avisar cuando todos los pacientes ya tienen historia clínica', () => {
    cy.intercept('GET', '**/api/optometra/cliente', {
      statusCode: 200,
      body: [PACIENTES[0]],
    }).as('getPacientes');

    abrirFormulario();

    cy.contains('Todos los pacientes ya tienen historia clínica.')
      .should('be.visible');
  });

  it('CP-HIS-09: El botón Cancelar debe volver a agregar consulta', () => {
    abrirFormulario();

    cy.contains('a', 'Cancelar').click();

    cy.url().should('include', '/optometra/agregar-consulta');
  });
});