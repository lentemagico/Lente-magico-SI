// cypress/e2e/Optometra/registroConsulta.cy.js
const RUTA = '/optometra/agregar-consulta';

// Datos de apoyo: el backend se simula con cy.intercept para que las pruebas
// no dependan de lo que haya en la base de datos ni la llenen de consultas.
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

const AGENDAS = {
  consultas: [
    {
      id_agenda: 12,
      id_cliente: 1,
      cliente: 'Matias Bravo',
      motivo: 'Control anual',
      estado: 'Pendiente',
      fecha_hora: '2026-10-20T10:00:00',
    },
  ],
};

const RESPUESTA_CREADA = {
  mensaje: 'Consulta registrada correctamente.',
  id_consulta: 99,
  id_historia: 6,
  id_agenda: 12,
};

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

// Abre el formulario y espera a que lleguen los pacientes y las citas.
function abrirFormulario() {
  visitarConSesion(RUTA);

  cy.wait('@getPacientes');
  cy.wait('@getAgendas');
}

// Busca un campo a partir del texto de su etiqueta.
function campo(etiqueta, tipo) {
  return cy.contains('label', etiqueta).parent().find(tipo);
}

// Elige la cita pendiente #12 (completa paciente y motivo) y llena el resto.
function llenarConsultaConCita() {
  campo('Cita agendada', 'select').select('12');

  campo('Diagnóstico', 'select').select('Miopía');
  campo('Resultado del examen', 'textarea').type('Agudeza visual 20/40');
  campo('Recomendaciones', 'textarea').type('Uso permanente');
  campo('Evolución', 'textarea').type('Sin molestias');
}

describe('Pruebas de Caja Negra - Registro de Consulta (UI)', () => {
  beforeEach(() => {
    cy.on('window:confirm', () => true);
    cy.on('window:alert', () => true);

    // Respuestas por defecto del backend. Una prueba puede definir otra
    // respuesta antes de abrir la página y esa será la que se use.
    cy.intercept('GET', '**/api/optometra/cliente', {
      statusCode: 200,
      body: PACIENTES,
    }).as('getPacientes');

    cy.intercept('GET', '**/api/agendar-consulta*', {
      statusCode: 200,
      body: AGENDAS,
    }).as('getAgendas');

    cy.intercept('POST', '**/api/optometra/consulta', {
      statusCode: 201,
      body: RESPUESTA_CREADA,
    }).as('crearConsulta');
  });

  // ============================================
  // CASOS BÁSICOS
  // ============================================
  it('CP-CON-01: Debe cargar la página con el título, los campos y los botones', () => {
    abrirFormulario();

    cy.url().should('include', RUTA);

    cy.contains('h4', 'Registrar consulta').should('be.visible');
    cy.contains('label', 'Cita agendada').should('be.visible');
    cy.contains('label', 'Paciente').should('be.visible');
    cy.contains('label', 'Motivo').should('be.visible');
    cy.contains('label', 'Diagnóstico').should('be.visible');
    cy.contains('label', 'Evolución').should('be.visible');
    cy.contains('button', 'Guardar consulta').should('be.visible');
    cy.contains('a', 'Cancelar').should('be.visible');
  });

  // ============================================
  // CASOS DE SELECCIÓN
  // ============================================
  it('CP-CON-02: Al elegir un paciente debe mostrar su historia clínica', () => {
    abrirFormulario();

    campo('Paciente', 'select').select('1');

    campo('Historia clínica', 'input').should('have.value', 'Historia clínica #6');
  });

  it('CP-CON-03: Al elegir una cita debe completar el paciente y el motivo', () => {
    abrirFormulario();

    campo('Cita agendada', 'select').select('12');

    campo('Paciente', 'select').should('have.value', '1');
    campo('Motivo', 'input').should('have.value', 'Control anual');
  });

  // ============================================
  // CASOS DE VALIDACIÓN
  // ============================================
  it('CP-CON-04: El motivo NO debe aceptar caracteres especiales', () => {
    abrirFormulario();

    campo('Motivo', 'input').type('Control@#$ 2026!');

    campo('Motivo', 'input').should('have.value', 'Control 2026');
  });

  it('CP-CON-05: NO debe guardar la consulta sin seleccionar un paciente', () => {
    abrirFormulario();

    campo('Motivo', 'input').type('Control anual');
    cy.contains('button', 'Guardar consulta').click();

    // El navegador bloquea el envío porque el paciente es obligatorio
    campo('Paciente', 'select').then(($select) => {
      expect($select[0].checkValidity()).to.eq(false);
    });

    cy.get('@crearConsulta.all').should('have.length', 0);
  });

  it('CP-CON-06: NO debe guardar la consulta sin motivo', () => {
    abrirFormulario();

    campo('Paciente', 'select').select('1');
    cy.contains('button', 'Guardar consulta').click();

    // El navegador bloquea el envío porque el motivo es obligatorio
    campo('Motivo', 'input').then(($input) => {
      expect($input[0].checkValidity()).to.eq(false);
    });

    cy.get('@crearConsulta.all').should('have.length', 0);
  });

  // ============================================
  // CASOS DE GUARDADO
  // ============================================
  it('CP-CON-07: Debe guardar una consulta con cita y redirigir a antecedentes', () => {
    abrirFormulario();

    llenarConsultaConCita();

    cy.contains('button', 'Guardar consulta').click();

    cy.wait('@crearConsulta').then(({ request, response }) => {
      expect(response.statusCode).to.eq(201);

      expect(request.body).to.include({
        id_cliente: 1,
        id_usuario: 1,
        id_historia: 6,
        id_agenda: 12,
        motivo: 'Control anual',
        resultado_examen: 'Agudeza visual 20/40',
        diagnostico: 'Miopía',
        recomendaciones: 'Uso permanente',
        evolucion: 'Sin molestias',
      });
    });

    // La redirección ocurre tras un breve retraso
    cy.url().should('include', '/optometra/antecedentes');
  });

  it('CP-CON-08: Debe guardar una consulta sin cita con los valores por defecto', () => {
    abrirFormulario();

    campo('Paciente', 'select').select('2');
    campo('Motivo', 'input').type('Revision general');

    cy.contains('button', 'Guardar consulta').click();

    cy.wait('@crearConsulta').then(({ request }) => {
      expect(request.body).to.include({
        id_cliente: 2,
        id_usuario: 1,
        motivo: 'Revision general',
        resultado_examen: 'Sin resultado registrado',
        diagnostico: 'Sin diagnóstico registrado',
        recomendaciones: 'Sin recomendaciones',
        evolucion: 'Sin evolución registrada',
      });

      // Sin cita y sin historia clínica se envían como null
      expect(request.body.id_agenda).to.eq(null);
      expect(request.body.id_historia).to.eq(null);
    });
  });

  it('CP-CON-09: Debe mostrar el error que devuelve el backend al guardar', () => {
    cy.intercept('POST', '**/api/optometra/consulta', {
      statusCode: 409,
      body: { error: 'La cita seleccionada ya fue atendida o no esta pendiente.' },
    }).as('crearConsulta');

    abrirFormulario();

    llenarConsultaConCita();

    cy.contains('button', 'Guardar consulta').click();

    cy.wait('@crearConsulta')
      .its('response.statusCode')
      .should('eq', 409);

    cy.get('.alert-danger')
      .should('be.visible')
      .and('contain.text', 'La cita seleccionada ya fue atendida o no esta pendiente.');

    // No debe salir de la pantalla
    cy.url().should('include', RUTA);
  });

  // ============================================
  // CASO DE NAVEGACIÓN
  // ============================================
  it('CP-CON-10: El botón Cancelar debe volver a la historia clínica', () => {
    abrirFormulario();

    cy.contains('a', 'Cancelar').click();

    cy.url().should('include', '/optometra/historia-clinica');
  });
});