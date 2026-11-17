describe('Pruebas de Caja Negra (E2E) - Módulo Cantidad de Productos Vendidos', () => {
  const RUTA_FRONTEND = '/caja/cantidad-productos-vendidos';
  const API_URL = '**/api/cantidad-productos-vendidos*';

  // Datos simulados (Mocks)
  const mockProductosIniciales = {
    productos: [
      {
        id: 1,
        idVenta: 101,
        idProducto: 5,
        nombreProducto: 'Montura Ray-Ban Clásica',
        cantidadProducto: 3,
        precioUnitario: 250000,
      },
    ],
    totalVendidos: 3,
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 1,
      limit: 10,
      hasNextPage: false,
      hasPrevPage: false,
    },
  };

  beforeEach(() => {
    // 1. Interceptar carga inicial de productos vendidos
    cy.intercept('GET', API_URL, {
      statusCode: 200,
      body: mockProductosIniciales,
    }).as('getProductos');

    // 2. Visitar la ruta con la sesión activa en localStorage
    cy.visit(RUTA_FRONTEND, {
      onBeforeLoad(win) {
        win.localStorage.setItem(
          'usuario_logueado',
          JSON.stringify({ id: 1, nombre: 'Cajero Prueba', rol: 'Caja' })
        );
      },
    });

    cy.wait('@getProductos');
  });

  // =========================================================================
  // CP01: SEGURIDAD / PROTECCIÓN DE RUTA
  // =========================================================================
  it('CP01 - Debe redirigir a /login si no existe sesión activa', () => {
    cy.clearLocalStorage();
    cy.visit(RUTA_FRONTEND);
    cy.url().should('include', '/login');
  });

  // =========================================================================
  // CP02: CARGA DE TABLA Y TARJETA DE TOTAL
  // =========================================================================
  it('CP02 - Debe renderizar los productos vendidos en la tabla y el total acumulado', () => {
    cy.contains('h2', 'Cantidad de Productos Vendidos').should('be.visible');
    cy.get('table tbody tr').should('have.length', 1);
    cy.contains('td', '1').should('be.visible');
    cy.contains('td', 'Montura Ray-Ban Clásica').should('be.visible');
    cy.contains('td span.badge', '3 un.').should('be.visible');

    // Verificar tarjeta verde de resumen total
    cy.contains('.card', 'Total de Productos Vendidos').should('contain', '3');
  });

  // =========================================================================
  // CP03: BÚSQUEDA CON DEBOUNCE
  // =========================================================================
  it('CP03 - Debe filtrar los registros al escribir en el buscador (debounce 500ms)', () => {
    cy.intercept('GET', '*search=Lentes*', {
      statusCode: 200,
      body: {
        productos: [],
        totalVendidos: 0,
        pagination: { currentPage: 1, totalPages: 1, totalItems: 0, limit: 10 },
      },
    }).as('buscarProducto');

    cy.get('input[placeholder="Buscar producto vendido..."]').type('Lentes');

    cy.wait('@buscarProducto');
    cy.contains('td', 'No se encontraron productos vendidos').should('be.visible');
  });

  // =========================================================================
  // CP04: VALIDACIÓN DE CAMPOS OBLIGATORIOS Y VALORES LÍMITE
  // =========================================================================
  it('CP04 - No debe enviar POST si los campos obligatorios están vacíos o son inválidos', () => {
    cy.intercept('POST', '**/api/cantidad-productos-vendidos').as('postProducto');

    cy.contains('button', 'Nuevo Producto Vendido').click();
    cy.get('.modal-content').should('be.visible');

    // Intentar guardar vacío
    cy.get('.modal-footer button[type="submit"]').click();

    cy.contains('El ID de la venta es requerido.').should('be.visible');
    cy.contains('El ID del producto es requerido.').should('be.visible');
    cy.contains('La cantidad debe ser mayor a 0.').should('be.visible');

    // Probar valor límite inválido (cantidad = 0, el mínimo es 1)
    cy.get('input[name="idVenta"]').type('102');
    cy.get('input[name="idProducto"]').type('8');
    cy.get('input[name="cantidadProducto"]').type('0');
    cy.get('.modal-footer button[type="submit"]').click();

    cy.contains('La cantidad debe ser mayor a 0.').should('be.visible');
    cy.get('@postProducto.all').should('have.length', 0);
  });

  // =========================================================================
  // CP05: REGISTRO DE PRODUCTO VENDIDO EXITOSO (CAMINO FELIZ)
  // =========================================================================
  it('CP05 - Debe registrar un producto vendido con precio unitario opcional vacío (envía 0)', () => {
    cy.intercept('POST', '**/api/cantidad-productos-vendidos', {
      statusCode: 201,
      body: { mensaje: 'Producto vendido registrado exitosamente' },
    }).as('crearProducto');

    cy.contains('button', 'Nuevo Producto Vendido').click();

    cy.get('input[name="idVenta"]').type('105');
    cy.get('input[name="idProducto"]').type('12');
    cy.get('input[name="cantidadProducto"]').type('4');
    // Se deja precioUnitario vacío para validar que el componente lo envíe como 0

    cy.get('.modal-footer button[type="submit"]').click();

    cy.wait('@crearProducto').then((interception) => {
      expect(interception.request.body).to.deep.equal({
        idVenta: 105,
        idProducto: 12,
        cantidadProducto: 4,
        precioUnitario: 0,
      });
    });

    cy.get('.modal-content').should('not.exist');
    cy.contains('.alert-success', 'Producto vendido registrado exitosamente').should('be.visible');
  });

  // =========================================================================
  // CP06: MANEJO DE ERROR DEL SERVIDOR AL GUARDAR
  // =========================================================================
  it('CP06 - Debe mostrar alerta roja si el servidor rechaza el registro', () => {
    cy.intercept('POST', '**/api/cantidad-productos-vendidos', {
      statusCode: 400,
      body: { error: 'La venta o el producto especificado no existe' },
    }).as('errorCrear');

    cy.contains('button', 'Nuevo Producto Vendido').click();

    cy.get('input[name="idVenta"]').type('999');
    cy.get('input[name="idProducto"]').type('888');
    cy.get('input[name="cantidadProducto"]').type('2');
    cy.get('input[name="precioUnitario"]').type('45000');

    cy.get('.modal-footer button[type="submit"]').click();

    cy.wait('@errorCrear');
    cy.contains('.alert-danger', 'La venta o el producto especificado no existe').should('be.visible');
  });

  // =========================================================================
  // CP07: EDICIÓN DE REGISTRO EXISTENTE
  // =========================================================================
  it('CP07 - Debe permitir editar la cantidad y precio unitario de un registro existente', () => {
    cy.intercept('PUT', '**/api/cantidad-productos-vendidos/1', {
      statusCode: 200,
      body: { mensaje: 'Producto vendido actualizado exitosamente' },
    }).as('actualizarProducto');

    cy.get('table tbody tr').first().contains('button', 'Editar').click();

    cy.contains('.modal-title', 'Editar Producto Vendido').should('be.visible');
    cy.get('input[name="cantidadProducto"]').clear().type('6');
    cy.get('input[name="precioUnitario"]').clear().type('260000');

    cy.get('.modal-footer button[type="submit"]').click();

    cy.wait('@actualizarProducto').its('request.body').should('deep.equal', {
      idVenta: 101,
      idProducto: 5,
      cantidadProducto: 6,
      precioUnitario: 260000,
    });

    cy.contains('.alert-success', 'Producto vendido actualizado exitosamente').should('be.visible');
  });

  // =========================================================================
  // CP08: ELIMINACIÓN DE REGISTRO CON REFRESCO DE TABLA
  // =========================================================================
  it('CP08 - Debe eliminar un producto vendido al confirmar el diálogo del navegador', () => {
    cy.intercept('DELETE', '**/api/cantidad-productos-vendidos/1', {
      statusCode: 200,
      body: { mensaje: 'Producto vendido eliminado exitosamente' },
    }).as('eliminarProducto');

    // Sobrescribir el GET que se ejecuta al refrescar la tabla tras borrar
    cy.intercept('GET', API_URL, {
      statusCode: 200,
      body: {
        productos: [],
        totalVendidos: 0,
        pagination: { currentPage: 1, totalPages: 1, totalItems: 0, limit: 10 },
      },
    }).as('getProductosVacio');

    cy.on('window:confirm', (texto) => {
      expect(texto).to.equal('¿Está seguro de eliminar este registro de producto vendido?');
      return true;
    });

    cy.get('table tbody tr').first().contains('button', 'Eliminar').click();

    cy.wait(['@eliminarProducto', '@getProductosVacio']);
    cy.contains('.alert-success', 'Producto vendido eliminado exitosamente').should('be.visible');
    cy.contains('td', 'No se encontraron productos vendidos').should('be.visible');
    cy.contains('.card', 'Total de Productos Vendidos').should('contain', '0');
  });
});