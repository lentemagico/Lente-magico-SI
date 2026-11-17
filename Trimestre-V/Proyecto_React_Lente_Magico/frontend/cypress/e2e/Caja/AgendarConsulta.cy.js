describe('Pruebas de Caja Negra (E2E) - Módulo Agendar Consulta', () => {
  const RUTA_FRONTEND = '/caja/agendar-consulta';
  const API_CONSULTAS = 'http://localhost:5000/api/agendar-consulta*';
  const API_CLIENTES = 'http://localhost:5000/api/optometra/cliente*';

  // Datos simulados (Mocks)
  const mockClientes = [
    { id_cliente: 1, nombre: 'Carlos Gómez', numeroDocumento: '1020304050' },
    { id_cliente: 2, nombre: 'Ana Martínez', numeroDocumento: '9876543210' },
  ];

  const mockConsultasIniciales = {
    consultas: [
      {
        id_agenda: 10,
        id_cliente: 1,
        numero_documento: '1020304050',
        id_tipo_documento: 1,
        primer_nombre: 'Carlos',
        segundo_nombre: '',
        primer_apellido: 'Gómez',
        segundo_apellido: '',
        fecha_nacimiento: '1990-05-15',
        motivo: 'Control anual',
        fecha_hora: '2026-11-20T10:00:00',
        estado: 'Pendiente',
      },
    ],
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 1,
      limit: 5,
      hasPrevPage: false,
      hasNextPage: false,
    },
  };

  beforeEach(() => {
    // 1. Interceptar llamadas iniciales antes de visitar la página
    cy.intercept('GET', API_CLIENTES, {
      statusCode: 200,
      body: mockClientes,
    }).as('getClientes');

    cy.intercept('GET', API_CONSULTAS, {
      statusCode: 200,
      body: mockConsultasIniciales,
    }).as('getConsultas');

    // 2. Visitar la ruta inyectando la sesión en localStorage (requerido por verificarSesion en App.jsx)
    cy.visit(RUTA_FRONTEND, {
      onBeforeLoad(win) {
        win.localStorage.setItem(
          'usuario_logueado',
          JSON.stringify({ id: 1, nombre: 'Cajero Prueba', rol: 'Caja' })
        );
      },
    });

    cy.wait(['@getClientes', '@getConsultas']);
  });

  // =========================================================================
  // CP01: SEGURIDAD / PROTECCIÓN DE RUTA
  // =========================================================================
  it('CP01 - Debe redirigir a /login si no existe sesión activa en localStorage', () => {
    cy.clearLocalStorage();
    cy.visit(RUTA_FRONTEND);
    cy.url().should('include', '/login');
  });

  // =========================================================================
  // CP02: CARGA Y RENDERIZADO DE TABLA
  // =========================================================================
  it('CP02 - Debe cargar y mostrar las consultas agendadas en la tabla principal', () => {
    cy.contains('h2', 'Gestión de Consultas').should('be.visible');
    cy.get('table tbody tr').should('have.length', 1);
    cy.contains('td', '1020304050').should('be.visible');
    cy.contains('td', 'C.C.').should('be.visible');
    cy.contains('td', 'Carlos Gómez').should('be.visible');
    cy.contains('td', 'Control anual').should('be.visible');
    cy.contains('span.badge', 'Pendiente').should('be.visible');
  });

  // =========================================================================
  // CP03: BÚSQUEDA CON DEBOUNCE
  // =========================================================================
  it('CP03 - Debe filtrar consultas al escribir en el buscador (debounce 500ms)', () => {
    cy.intercept('GET', '*search=Ana*', {
      statusCode: 200,
      body: { consultas: [], pagination: { currentPage: 1, totalPages: 1, totalItems: 0 } },
    }).as('buscarConsulta');

    cy.get('input[placeholder*="Buscar por documento"]').type('Ana');

    // Espera a que pase el debounce de 500ms y se dispare la petición
    cy.wait('@buscarConsulta');
    cy.contains('td', 'No se encontraron consultas').should('be.visible');
  });

  // =========================================================================
  // CP04: VALIDACIÓN DE CAMPOS OBLIGATORIOS (CAJA NEGRA NEGATIVA)
  // =========================================================================
  it('CP04 - No debe enviar petición POST si se intenta guardar el formulario vacío', () => {
    cy.intercept('POST', 'http://localhost:5000/api/agendar-consulta').as('postConsulta');

    cy.contains('button', 'Nueva Consulta').click();
    cy.get('.modal-content').should('be.visible');

    // Intentar guardar sin llenar nada
    cy.get('.modal-footer button[type="submit"]').click();

    // Verifica que Bootstrap marque los mensajes de error de validación
    cy.contains('El cliente es requerido').should('be.visible');
    cy.contains('La fecha y hora son requeridas').should('be.visible');
    cy.contains('El motivo es requerido').should('be.visible');

    // Verifica que nunca salió una petición HTTP al backend
    cy.get('@postConsulta.all').should('have.length', 0);
  });

  // =========================================================================
  // CP05: CREACIÓN DE CONSULTA EXITOSA (CAMINO FELIZ)
  // =========================================================================
  it('CP05 - Debe agendar una nueva consulta exitosamente con datos válidos', () => {
    cy.intercept('POST', 'http://localhost:5000/api/agendar-consulta', {
      statusCode: 201,
      body: { mensaje: 'Consulta agendada exitosamente' },
    }).as('crearConsulta');

    cy.contains('button', 'Nueva Consulta').click();

    // Llenar formulario según los names exactos de AgendarConsulta.jsx
    cy.get('select[name="id_cliente"]').select('2'); // Ana Martínez
    cy.get('input[name="fecha_hora"]').type('2026-11-25T14:30');
    cy.get('select[name="estado"]').select('Pendiente');
    cy.get('textarea[name="motivo"]').type('Examen de agudeza visual');

    cy.get('.modal-footer button[type="submit"]').click();

    // Verificar el payload enviado al backend
    cy.wait('@crearConsulta').then((interception) => {
      expect(interception.request.body).to.deep.equal({
        id_cliente: 2,
        fecha_hora: '2026-11-25T14:30',
        estado: 'Pendiente',
        motivo: 'Examen de agudeza visual',
      });
    });

    // Verificar cierre del modal y alerta de éxito
    cy.get('.modal-content').should('not.exist');
    cy.contains('.alert-success', 'Consulta agendada exitosamente').should('be.visible');
  });

  // =========================================================================
  // CP06: MANEJO DE ERROR DEL SERVIDOR AL CREAR (400 / 500)
  // =========================================================================
  it('CP06 - Debe mostrar alerta de error si el backend rechaza el agendamiento', () => {
    cy.intercept('POST', 'http://localhost:5000/api/agendar-consulta', {
      statusCode: 400,
      body: { error: 'Ya existe una cita programada en ese horario' },
    }).as('errorCrear');

    cy.contains('button', 'Nueva Consulta').click();

    cy.get('select[name="id_cliente"]').select('1');
    cy.get('input[name="fecha_hora"]').type('2026-11-20T10:00');
    cy.get('textarea[name="motivo"]').type('Revisión de lentes');

    cy.get('.modal-footer button[type="submit"]').click();

    cy.wait('@errorCrear');
    cy.contains('.alert-danger', 'Ya existe una cita programada en ese horario').should('be.visible');
  });

  // =========================================================================
  // CP07: EDICIÓN DE CONSULTA EXISTENTE
  // =========================================================================
  it('CP07 - Debe permitir editar el motivo y estado de una consulta existente', () => {
    cy.intercept('PUT', 'http://localhost:5000/api/agendar-consulta/10', {
      statusCode: 200,
      body: { mensaje: 'Consulta actualizada exitosamente' },
    }).as('actualizarConsulta');

    // Clic en el botón editar (amarillo) de la primera fila
    cy.get('table tbody tr').first().find('button[title="Editar"]').click();

    cy.contains('.modal-title', 'Editar Consulta').should('be.visible');
    // El select de cliente debe estar deshabilitado al editar
    cy.get('select[name="id_cliente"]').should('be.disabled');

    cy.get('select[name="estado"]').select('Completada');
    cy.get('textarea[name="motivo"]').clear().type('Control anual finalizado');

    cy.get('.modal-footer button[type="submit"]').click();

    cy.wait('@actualizarConsulta').its('request.body').should('include', {
      estado: 'Completada',
      motivo: 'Control anual finalizado',
    });

    cy.contains('.alert-success', 'Consulta actualizada exitosamente').should('be.visible');
  });

  // =========================================================================
  // CP08: ELIMINACIÓN DE CONSULTA CON CONFIRMACIÓN
  // =========================================================================
  it('CP08 - Debe eliminar una consulta al confirmar el diálogo del navegador', () => {
    cy.intercept('DELETE', 'http://localhost:5000/api/agendar-consulta/10', {
      statusCode: 200,
      body: { mensaje: 'Consulta eliminada exitosamente' },
    }).as('eliminarConsulta');

    // Sobrescribir el GET que se ejecuta al refrescar la tabla tras borrar
    cy.intercept('GET', API_CONSULTAS, {
      statusCode: 200,
      body: {
        consultas: [],
        pagination: { currentPage: 1, totalPages: 1, totalItems: 0, limit: 5 },
      },
    }).as('getConsultasVacio');

    // Simular clic en "Aceptar" en el window.confirm()
    cy.on('window:confirm', (texto) => {
      expect(texto).to.equal('¿Está seguro de eliminar esta consulta?');
      return true;
    });

    cy.get('table tbody tr').first().find('button[title="Eliminar"]').click();

    cy.wait(['@eliminarConsulta', '@getConsultasVacio']);
    cy.contains('.alert-success', 'Consulta eliminada exitosamente').should('be.visible');
    cy.contains('td', 'No se encontraron consultas').should('be.visible');
  });
});