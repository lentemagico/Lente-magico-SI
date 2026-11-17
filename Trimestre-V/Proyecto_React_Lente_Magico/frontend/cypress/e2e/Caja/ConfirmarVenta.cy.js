describe('Pruebas de Caja Negra (E2E) - Módulo Confirmar Venta', () => {
  const RUTA_FRONTEND = '/caja/confirmar-venta';

  const MOCK_USUARIO = {
    id: 1,
    nombre: 'Nicol Cajera',
    correo: 'nicol@lentemagico.com',
    rol: 'Caja',
  };

  const MOCK_CLIENTE = {
    id_cliente: 15,
    primer_nombre: 'Karol',
    primer_apellido: 'Sanchez',
    numero_documento: '1010202030',
    correo: 'karol@correo.com',
  };

  const MOCK_PRODUCTOS = [
    {
      id_producto: 101,
      nombre: 'Montura Oakley Sport',
      precio_venta: 300000,
      stock_actual: 2,
    },
    {
      id_producto: 102,
      nombre: 'Líquido Limpiador 60ml',
      precio_venta: 25000,
      stock_actual: 0, // Sin stock para validar bloqueo
    },
  ];

  // Helper para visitar con sesión de cajero y cliente seleccionado
  const visitarConSesionYCliente = ({ conCliente = true } = {}) => {
    cy.visit(RUTA_FRONTEND, {
      onBeforeLoad(win) {
        win.localStorage.setItem('usuario_logueado', JSON.stringify(MOCK_USUARIO));
        if (conCliente) {
          win.sessionStorage.setItem('clienteSeleccionado', JSON.stringify(MOCK_CLIENTE));
        } else {
          win.sessionStorage.removeItem('clienteSeleccionado');
        }
      },
    });
  };

  // =========================================================================
  // CP01: SEGURIDAD / PROTECCIÓN DE RUTA
  // =========================================================================
  it('CP01 - Debe redirigir a /login si no hay usuario logueado', () => {
    cy.clearLocalStorage();
    cy.visit(RUTA_FRONTEND);
    cy.url().should('include', '/login');
  });

  // =========================================================================
  // CP02: RENDERIZADO DE CAJERO, CLIENTE Y VALIDACIÓN DE BOTÓN DESHABILITADO
  // =========================================================================
  it('CP02 - Debe mostrar cajero y cliente cargados, pero mantener deshabilitado confirmar si el carrito está vacío', () => {
    visitarConSesionYCliente({ conCliente: true });

    cy.contains('h3', 'Confirmar Venta').should('be.visible');
    cy.contains('Nicol Cajera').should('be.visible');
    cy.contains('Karol Sanchez').should('be.visible');
    cy.contains('1010202030').should('be.visible');
    cy.contains('El carrito está vacío').should('be.visible');

    cy.contains('button', 'Confirmar venta y continuar al pago').should('be.disabled');
  });

  // =========================================================================
  // CP03: VALIDACIÓN SIN CLIENTE SELECCIONADO
  // =========================================================================
  it('CP03 - Debe mostrar mensaje cuando no hay cliente seleccionado y permitir navegar a buscarlo', () => {
    visitarConSesionYCliente({ conCliente: false });

    cy.contains('Ningún cliente seleccionado').should('be.visible');
    cy.contains('button', 'Confirmar venta y continuar al pago').should('be.disabled');

    cy.contains('button', 'Seleccionar cliente').click();
    cy.url().should('include', '/caja/consultar-cliente');
  });

  // =========================================================================
  // CP04: BÚSQUEDA DE PRODUCTOS, CONTROL DE STOCK Y CÁLCULO DE TOTALES
  // =========================================================================
  it('CP04 - Debe buscar productos, impedir agregar sin stock o superar stock máximo, y calcular totales', () => {
    cy.intercept('GET', '**/productos?search=*', {
      statusCode: 200,
      body: MOCK_PRODUCTOS,
    }).as('buscarProductos');

    visitarConSesionYCliente({ conCliente: true });

    cy.get('input[placeholder="Buscar por nombre o código..."]').type('Oakley');
    cy.contains('button', 'Buscar').click();
    cy.wait('@buscarProductos');

    // 1. El producto con stock 0 debe tener el botón "Agregar" deshabilitado
    cy.contains('.bg-light', 'Líquido Limpiador 60ml')
      .find('button')
      .should('be.disabled');

    // 2. Agregar el producto con stock 2
    const filaOakley = () => cy.contains('.bg-light', 'Montura Oakley Sport');
    filaOakley().find('button').click();
    filaOakley().find('button').click();

    // 3. Intentar agregar una 3ra unidad (supera stock_actual: 2)
    filaOakley().find('button').click();
    cy.contains('.alert-danger', 'No puedes agregar más unidades de "Montura Oakley Sport". Stock disponible: 2.').should('be.visible');

    // 4. Verificar tabla del carrito y total ($300,000 * 2 = $600,000)
    cy.get('table tbody tr').should('have.length', 1);
    cy.get('table tbody input[type="number"]').should('have.value', '2');
    cy.contains('strong.text-success', '600').should('be.visible');

    // 5. Probar botón "Quitar" del carrito
    cy.contains('table tbody button', 'Quitar').click();
    cy.contains('El carrito está vacío').should('be.visible');
  });

  // =========================================================================
  // CP05: CONFIRMACIÓN EXITOSA DE VENTA Y NAVEGACIÓN A MÉTODOS DE PAGO
  // =========================================================================
  it('CP05 - Debe confirmar la venta, guardar ventaActiva en sessionStorage y mostrar los métodos de pago', () => {
    cy.intercept('GET', '**/productos?search=*', {
      statusCode: 200,
      body: MOCK_PRODUCTOS,
    }).as('buscarProductos');

    cy.intercept('POST', '**/confirmar-venta', {
      statusCode: 201,
      body: { id_venta: 88, mensaje: 'Venta confirmada' },
    }).as('postConfirmarVenta');

    visitarConSesionYCliente({ conCliente: true });

    // Buscar y agregar producto al carrito
    cy.get('input[placeholder="Buscar por nombre o código..."]').type('Oakley');
    cy.contains('button', 'Buscar').click();
    cy.wait('@buscarProductos');

    cy.contains('.bg-light', 'Montura Oakley Sport').find('button').click();

    // Confirmar la venta
    cy.contains('button', 'Confirmar venta y continuar al pago').should('not.be.disabled').click();

    // Verificar payload exacto enviado al backend
    cy.wait('@postConfirmarVenta').then(({ request }) => {
      expect(request.body).to.deep.equal({
        id_cliente: 15,
        id_usuario: 1,
        estado: 'Confirmada',
        productos: [
          {
            id_producto: 101,
            cantidad: 1,
            precio_unitario: 300000,
          },
        ],
      });
    });

    // Esperar primero a que React renderice la confirmación (garantiza que ya terminó el await apiFetch)
    cy.contains('#88').should('be.visible');
    cy.contains('button', 'Efectivo').should('be.visible');
    cy.contains('button', 'Tarjeta crédito').should('be.visible');
    cy.contains('button', 'Tarjeta débito').should('be.visible');
    cy.contains('button', 'Plataformas').should('be.visible');

    // Ahora sí validar que ventaActiva quedó guardada en sessionStorage
    cy.window().then((win) => {
      const ventaActiva = JSON.parse(win.sessionStorage.getItem('ventaActiva'));
      expect(ventaActiva).to.deep.equal({ id_venta: 88, total: 300000 });
    });

    // Probar redirección al elegir un método de pago
    cy.contains('button', 'Transferencia / Banco').click();
    cy.url().should('include', '/caja/confirmacion-banco');
  });

  // =========================================================================
  // CP06: MANEJO DE ERROR DEL BACKEND AL CONFIRMAR VENTA
  // =========================================================================
  it('CP06 - Debe mostrar alerta roja si el servidor falla al confirmar la venta', () => {
    cy.intercept('GET', '**/productos?search=*', {
      statusCode: 200,
      body: MOCK_PRODUCTOS,
    }).as('buscarProductos');

    cy.intercept('POST', '**/confirmar-venta', {
      statusCode: 400,
      body: { error: 'Error de inventario al procesar la venta' },
    }).as('postErrorVenta');

    visitarConSesionYCliente({ conCliente: true });

    cy.get('input[placeholder="Buscar por nombre o código..."]').type('Oakley');
    cy.contains('button', 'Buscar').click();
    cy.wait('@buscarProductos');

    cy.contains('.bg-light', 'Montura Oakley Sport').find('button').click();
    cy.contains('button', 'Confirmar venta y continuar al pago').click();

    cy.wait('@postErrorVenta');
    cy.get('.alert-danger').should('be.visible');
    // El botón de confirmar debe seguir visible y no pasar a métodos de pago
    cy.contains('button', 'Confirmar venta y continuar al pago').should('be.visible');
  });
});