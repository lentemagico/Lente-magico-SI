describe('Pruebas de Caja Negra (E2E) - Módulo Consultar Cliente', () => {
  const RUTA_FRONTEND = '/caja/consultar-cliente';

  const MOCK_TIPOS_DOC = [
    { id: 1, sigla: 'C.C.', nombre_documento: 'Cédula de Ciudadanía' },
    { id: 2, sigla: 'C.E.', nombre_documento: 'Cédula de Extranjería' },
  ];

  const MOCK_CLIENTES = {
    clientes: [
      {
        id_cliente: 25,
        id_tipo_documento: 1,
        sigla: 'C.C.',
        numero_documento: '1030405060',
        primer_nombre: 'Camila',
        segundo_nombre: 'Andrea',
        primer_apellido: 'Rojas',
        segundo_apellido: 'Díaz',
        fecha_nacimiento: '1995-08-20T00:00:00.000Z',
        genero: 'Femenino',
        correo: 'camila@correo.com',
        telefono: '3105556677',
        fecha_registro: '2026-05-10T12:00:00.000Z',
      },
    ],
    pagination: {
      totalItems: 1,
    },
  };

  beforeEach(() => {
    // 1. Interceptar llamadas iniciales al montar el componente
    cy.intercept('GET', '**/clientes?search=*', {
      statusCode: 200,
      body: MOCK_CLIENTES,
    }).as('getClientes');

    cy.intercept('GET', '**/administrador/tipos-documento', {
      statusCode: 200,
      body: MOCK_TIPOS_DOC,
    }).as('getTiposDoc');

    // 2. Visitar la ruta con sesión activa en localStorage
    cy.visit(RUTA_FRONTEND, {
      onBeforeLoad(win) {
        win.localStorage.setItem(
          'usuario_logueado',
          JSON.stringify({ id: 1, nombre: 'Cajero Prueba', rol: 'Caja' })
        );
      },
    });

    cy.wait(['@getClientes', '@getTiposDoc']);
  });

  // =========================================================================
  // CP01: SEGURIDAD / PROTECCIÓN DE RUTA
  // =========================================================================
  it('CP01 - Debe redirigir a /login si no hay sesión activa', () => {
    cy.clearLocalStorage();
    cy.visit(RUTA_FRONTEND);
    cy.url().should('include', '/login');
  });

  // =========================================================================
  // CP02: CARGA INICIAL Y RENDERIZADO DE TABLA
  // =========================================================================
  it('CP02 - Debe cargar y mostrar los clientes registrados en la tabla', () => {
    cy.contains('h3', 'Consultar Cliente').should('be.visible');
    cy.get('table tbody tr').should('have.length', 1);
    cy.contains('td', 'C.C.').should('be.visible');
    cy.contains('td', '1030405060').should('be.visible');
    cy.contains('td', 'Camila Andrea Rojas Díaz').should('be.visible');
    cy.contains('td', 'camila@correo.com').should('be.visible');
    cy.contains('td', '3105556677').should('be.visible');
  });

  // =========================================================================
  // CP03: BÚSQUEDA SIN RESULTADOS Y ATAJO A REGISTRO
  // =========================================================================
  it('CP03 - Debe mostrar alerta amarilla y botón de registro cuando la búsqueda no arroja resultados', () => {
    cy.intercept('GET', '**/clientes?search=Inexistente*', {
      statusCode: 200,
      body: { clientes: [], pagination: { totalItems: 0 } },
    }).as('buscarSinResultados');

    cy.get('input[placeholder="Documento, nombre, apellido o correo..."]').type('Inexistente');
    cy.contains('button', 'Buscar').click();

    cy.wait('@buscarSinResultados');
    cy.contains('.alert-warning', 'No se encontraron clientes con ese criterio.').should('be.visible');
    cy.contains('button', '+ Registrar nuevo cliente').should('be.visible');
  });

  // =========================================================================
  // CP04: FLUJO VENDER (GUARDAR EN SESSIONSTORAGE Y REDIRIGIR)
  // =========================================================================
  it('CP04 - Debe guardar el cliente seleccionado en sessionStorage y navegar a /caja/confirmar-venta', () => {
    cy.get('table tbody tr').first().contains('button', 'Vender').click();

    cy.url().should('include', '/caja/confirmar-venta');

    cy.window().then((win) => {
      const clienteGuardado = JSON.parse(win.sessionStorage.getItem('clienteSeleccionado'));
      expect(clienteGuardado).to.include({
        id_cliente: 25,
        numero_documento: '1030405060',
        primer_nombre: 'Camila',
      });
    });
  });

  // =========================================================================
  // CP05: FLUJO AGENDAR CONSULTA DESDE CLIENTE
  // =========================================================================
  it('CP05 - Debe redirigir a /caja/agendar-consulta al presionar Agendar', () => {
    // Interceptar las llamadas que hace AgendarConsulta al abrirse
    cy.intercept('GET', '**/api/agendar-consulta*', { statusCode: 200, body: { consultas: [] } });
    cy.intercept('GET', '**/api/optometra/cliente*', { statusCode: 200, body: [] });

    cy.get('table tbody tr').first().contains('button', 'Agendar').click();

    cy.url().should('include', '/caja/agendar-consulta');
  });

  // =========================================================================
  // CP06: EDICIÓN DE CLIENTE CON SANITIZACIÓN DE CAMPOS
  // =========================================================================
  it('CP06 - Debe abrir el modal de edición, sanitizar números/letras y actualizar el cliente', () => {
    cy.intercept('PUT', '**/clientes/25', {
      statusCode: 200,
      body: { mensaje: 'Cliente actualizado exitosamente' },
    }).as('putCliente');

    cy.get('table tbody tr').first().find('button[title="Editar"]').click();

    cy.contains('.modal-title', 'Editar Cliente').should('be.visible');

    // Probar sanitización: soloLetras elimina números en nombres; replace(/\D/g) elimina letras en teléfono
    cy.get('.modal-body input').eq(1).clear().type('Camila123'); // Primer nombre
    cy.get('.modal-body input').eq(7).clear().type('320abc9998877'); // Teléfono

    cy.get('.modal-footer button[type="submit"]').click();

    cy.wait('@putCliente').then(({ request }) => {
      expect(request.body.primer_nombre).to.equal('Camila');
      expect(request.body.telefono).to.equal('3209998877');
      expect(request.body.id_tipo_documento).to.equal(1);
    });

    cy.get('.modal-content').should('not.exist');
    cy.contains('.alert-success', 'Cliente actualizado exitosamente').should('be.visible');
  });

  // =========================================================================
  // CP07: ELIMINACIÓN DE CLIENTE (EXITOSA Y CON ERROR DE INTEGRIDAD)
  // =========================================================================
  it('CP07 - Debe eliminar el cliente al confirmar el diálogo del navegador', () => {
    cy.intercept('DELETE', '**/clientes/25', {
      statusCode: 200,
      body: { mensaje: 'Cliente eliminado exitosamente' },
    }).as('deleteCliente');

    // Sobrescribir el GET tras borrar para devolver lista vacía
    cy.intercept('GET', '**/clientes?search=*', {
      statusCode: 200,
      body: { clientes: [], pagination: { totalItems: 0 } },
    }).as('getClientesVacio');

    cy.on('window:confirm', (texto) => {
      expect(texto).to.equal('¿Está seguro de eliminar al cliente Camila Rojas?');
      return true;
    });

    cy.get('table tbody tr').first().find('button[title="Eliminar"]').click();

    cy.wait(['@deleteCliente', '@getClientesVacio']);
    cy.contains('.alert-success', 'Cliente eliminado exitosamente').should('be.visible');
  });

  it('CP08 - Debe mostrar alerta roja si el backend impide eliminar por registros asociados', () => {
    cy.intercept('DELETE', '**/clientes/25', {
      statusCode: 400,
      body: { error: 'No se puede eliminar el cliente porque tiene ventas o consultas asociadas' },
    }).as('deleteClienteError');

    cy.on('window:confirm', () => true);

    cy.get('table tbody tr').first().find('button[title="Eliminar"]').click();

    cy.wait('@deleteClienteError');
    cy.contains(
      '.alert-danger',
      'No se puede eliminar el cliente porque tiene ventas o consultas asociadas'
    ).should('be.visible');
  });
});