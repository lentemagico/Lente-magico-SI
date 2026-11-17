describe('Pruebas de Caja Negra (E2E) - Módulo Pago en Efectivo', () => {
  const RUTA_FRONTEND = '/caja/efectivo';
  const VENTA_MOCK = { id_venta: 42, total: 120000 };

  const inyectarSesion = (win) => {
    win.localStorage.setItem(
      'usuario_logueado',
      JSON.stringify({ id: 1, nombre: 'Cajero Prueba', rol: 'Caja' })
    );
  };

  const visitarConVenta = ({ conVenta = true } = {}) => {
    cy.visit(RUTA_FRONTEND, {
      onBeforeLoad(win) {
        inyectarSesion(win);
        if (conVenta) {
          win.sessionStorage.setItem('ventaActiva', JSON.stringify(VENTA_MOCK));
          win.sessionStorage.setItem('clienteSeleccionado', JSON.stringify({ id_cliente: 10 }));
        } else {
          win.sessionStorage.clear();
        }
      },
    });
  };

  // =========================================================================
  // CP01: SEGURIDAD / PROTECCIÓN DE RUTA
  // =========================================================================
  it('CP01 - Debe redirigir a /login si no hay sesión activa en localStorage', () => {
    cy.clearLocalStorage();
    cy.visit(RUTA_FRONTEND);
    cy.url().should('include', '/login');
  });

  // =========================================================================
  // CP02: SIN VENTA ACTIVA EN SESSIONSTORAGE
  // =========================================================================
  it('CP02 - Debe mostrar advertencia y permitir volver a Confirmar Venta si no hay venta activa', () => {
    visitarConVenta({ conVenta: false });

    cy.contains('.alert-warning', 'No hay ninguna venta activa para pagar.').should('be.visible');
    cy.contains('button', 'Ir a Confirmar Venta').click();
    cy.url().should('include', '/caja/confirmar-venta');
  });

  // =========================================================================
  // CP03: CÁLCULO EN VIVO DE FALTANTE Y VALIDACIÓN DE MONTO INSUFICIENTE
  // =========================================================================
  it('CP03 - Debe calcular el faltante en vivo e impedir procesar el pago si el dinero recibido es menor al total', () => {
    cy.intercept('POST', '**/pagos/efectivo').as('postPagoEfectivo');

    visitarConVenta({ conVenta: true });

    cy.contains('h4', 'Pago en Efectivo').should('be.visible');
    cy.contains('Venta #42').should('be.visible');
    cy.contains('120').should('be.visible');

    // Escribir un monto menor al total ($100,000 < $120,000)
    cy.get('input[type="number"]').type('100000');

    // Alerta informativa en vivo mostrando el faltante ($20,000)
    cy.contains('.alert-danger', 'Faltan $20').should('be.visible');

    // Intentar confirmar el pago
    cy.contains('button', 'Confirmar pago').click();

    // Debe mostrar el error de validación y NO disparar petición al backend
    cy.contains('.alert-danger', 'El dinero recibido no es suficiente. Faltan $20').should('be.visible');
    cy.get('@postPagoEfectivo.all').should('have.length', 0);
  });

  // =========================================================================
  // CP04: PAGO EXITOSO CON CAMBIO Y GENERACIÓN DE FACTURA (CAMINO FELIZ)
  // =========================================================================
  it('CP04 - Debe calcular el cambio en vivo, confirmar el pago, generar factura y limpiar sessionStorage', () => {
    cy.intercept('POST', '**/pagos/efectivo', {
      statusCode: 201,
      body: {
        mensaje: 'Pago en efectivo registrado correctamente',
        cambio: 30000,
        num_factura: 'FAC-0042',
      },
    }).as('postPagoEfectivo');

    visitarConVenta({ conVenta: true });

    // Entregar $150,000 para una venta de $120,000
    cy.get('input[type="number"]').type('150000');

    // Alerta azul en vivo mostrando el cambio ($30,000)
    cy.contains('.alert-info', 'Cambio: $30').should('be.visible');

    // Verificar que el checkbox de factura está marcado por defecto
    cy.get('#generarFactura').should('be.checked');

    cy.contains('button', 'Confirmar pago').click();

    // Validar payload exacto enviado al backend
    cy.wait('@postPagoEfectivo').then(({ request }) => {
      expect(request.body).to.deep.equal({
        id_venta: 42,
        monto: 120000,
        monto_recibido: 150000,
        generar_factura: true,
      });
    });

    // Esperar confirmación visual en pantalla
    cy.contains('.alert-success', 'Pago confirmado').should('be.visible');
    cy.contains('Pago en efectivo registrado correctamente').should('be.visible');
    cy.contains('Cambio a entregar:').should('contain', '30');
    cy.contains('Número de factura:').should('contain', 'FAC-0042');

    // Verificar que sessionStorage fue limpiado tras pagar
    cy.window().then((win) => {
      expect(win.sessionStorage.getItem('ventaActiva')).to.be.null;
      expect(win.sessionStorage.getItem('clienteSeleccionado')).to.be.null;
    });

    // Verificar botón para registrar otra venta
    cy.contains('button', 'Registrar otra venta').click();
    cy.url().should('include', '/caja/confirmar-venta');
  });

  // =========================================================================
  // CP05: PAGO SIN GENERAR FACTURA (CHECKBOX DESMARCADO)
  // =========================================================================
  it('CP05 - Debe enviar generar_factura: false y ocultar la sección de factura al desmarcar el checkbox', () => {
    cy.intercept('POST', '**/pagos/efectivo', {
      statusCode: 201,
      body: {
        mensaje: 'Pago registrado sin factura',
        cambio: 0,
      },
    }).as('postPagoSinFactura');

    visitarConVenta({ conVenta: true });

    cy.get('input[type="number"]').type('120000');
    cy.get('#generarFactura').uncheck().should('not.be.checked');

    cy.contains('button', 'Confirmar pago').click();

    cy.wait('@postPagoSinFactura')
      .its('request.body.generar_factura')
      .should('eq', false);

    cy.contains('.alert-success', 'Pago confirmado').should('be.visible');
    cy.contains('Número de factura:').should('not.exist');
  });

  // =========================================================================
  // CP06: MANEJO DE ERROR DEL SERVIDOR
  // =========================================================================
  it('CP06 - Debe mostrar alerta roja si el backend falla al procesar el pago', () => {
    cy.intercept('POST', '**/pagos/efectivo', {
      statusCode: 500,
      body: { error: 'Error interno al registrar el pago en caja' },
    }).as('postPagoError');

    visitarConVenta({ conVenta: true });

    cy.get('input[type="number"]').type('120000');
    cy.contains('button', 'Confirmar pago').click();

    cy.wait('@postPagoError');
    cy.get('.alert-danger').should('be.visible');
    // Debe mantener el formulario visible para reintentar
    cy.contains('button', 'Confirmar pago').should('be.visible');
  });
});