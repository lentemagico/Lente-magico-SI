// cypress/e2e/Compra-bodega/consultarProducto.cy.js
// Cambia esta constante si la ruta real del componente es otra
const RUTA = '/consultarProducto';

// Visita la ruta con una sesión simulada en localStorage
function visitarConSesion(ruta) {
    cy.visit(ruta, {
        onBeforeLoad(win) {
            win.localStorage.setItem(
                'usuario_logueado',
                JSON.stringify({
                    id: 1,
                    nombre: 'Admin Cypress',
                    login: 'admin',
                    rol: 'Administrador',
                })
            );
        },
    });
}

describe('Pruebas de Caja Negra - Productos (UI)', () => {

    // Filas de la tabla principal (el modal de inventario tiene otra tabla igual,
    // por eso esta se acota con la clase y el tbody)
    const FILAS = 'table.tabla-productos tbody tr';

    // Abre el modal de edición del primer producto de la lista
    const abrirEdicionPrimero = () => {
        cy.get(FILAS).first().find('button[title="Editar"]').click();
        cy.contains('h5', 'Editar Producto').should('be.visible');
    };

    // Abre el modal de confirmación de eliminación del primer producto
    const abrirEliminarPrimero = () => {
        cy.get(FILAS).first().find('button[title="Eliminar"]').click();
        cy.contains('h5', 'Confirmar Eliminación').should('be.visible');
    };

    beforeEach(() => {
        cy.on('window:alert', () => true); // el componente usa alert() cuando falla algo
        cy.intercept({ method: 'GET', pathname: '/api/productos' }).as('getProductos');
        visitarConSesion(RUTA);
        cy.wait('@getProductos'); // esperamos a que lleguen los datos reales
    });

    // ============================================
    // CASOS BÁSICOS
    // ============================================
    it('CP-PROD-01: Debe cargar la página y mostrar el título', () => {
        cy.url().should('include', RUTA);
        cy.contains('h2', 'Consultar Productos').should('be.visible');
    });

    it('CP-PROD-02: Debe cargar los productos desde el backend', () => {
        cy.get('@getProductos').its('response.statusCode').should('eq', 200);
        cy.get(FILAS).should('have.length.greaterThan', 0);
    });

    it('CP-PROD-03: Debe mostrar las columnas de la tabla', () => {
        ['Código', 'Producto', 'Categoría', 'Precio', 'Stock', 'Acciones'].forEach((columna) => {
            cy.contains('th', columna).should('be.visible');
        });
    });

    // ============================================
    // BÚSQUEDA
    // ============================================
    it('CP-PROD-04: Debe filtrar productos por nombre', () => {
        cy.get(FILAS).first().find('strong').invoke('text').then((nombre) => {
            cy.get('input[placeholder="Buscar..."]').type(nombre.trim());

            cy.get(FILAS).should('have.length.greaterThan', 0);
            cy.get(FILAS).each(($fila) => {
                expect($fila.text().toLowerCase()).to.include(nombre.trim().toLowerCase());
            });
        });
    });

    it('CP-PROD-05: No debe mostrar filas si la búsqueda no coincide', () => {
        cy.get('input[placeholder="Buscar..."]').type('zzzzqqqqxxxx');
        cy.get(FILAS).should('have.length', 0);
    });

    it('CP-PROD-06: Debe volver a mostrar todos los productos al borrar la búsqueda', () => {
        cy.get(FILAS).then(($antes) => {
            const cantidadAntes = $antes.length;

            cy.get('input[placeholder="Buscar..."]').type('zzzzqqqqxxxx');
            cy.get(FILAS).should('have.length', 0);

            cy.get('input[placeholder="Buscar..."]').clear();
            cy.get(FILAS).should('have.length', cantidadAntes);
        });
    });

    // ============================================
    // EDICIÓN
    // (el PUT se simula con una respuesta falsa: no se modifica ningún producto real)
    // ============================================
    it('CP-PROD-07: Debe abrir el formulario de edición con los datos cargados', () => {
        abrirEdicionPrimero();

        cy.get('input[name="nombre"]').should('not.have.value', '');
        cy.get('select[name="id_categoria"]').should('be.visible');
        cy.get('input[name="stock_actual"]').should('be.visible');
        cy.get('input[name="stock_minimo"]').should('be.visible');
        cy.get('input[name="precio_venta"]').should('be.visible');
    });

    it('CP-PROD-08: El nombre no debe aceptar números ni símbolos', () => {
        abrirEdicionPrimero();

        cy.get('input[name="nombre"]').clear().type('Marco123!@# Nuevo');
        cy.get('input[name="nombre"]').should('have.value', 'Marco Nuevo');
    });

    it('CP-PROD-09: NO debe guardar cambios si se cancela la edición', () => {
        cy.intercept('PUT', '**/api/productos/*').as('editarProducto');

        abrirEdicionPrimero();
        cy.get('input[name="nombre"]').clear().type('Nombre Descartado');
        cy.contains('button', 'Cancelar').click();

        cy.contains('h5', 'Editar Producto').should('not.exist');
        cy.get('@editarProducto.all').should('have.length', 0);
        cy.contains('td', 'Nombre Descartado').should('not.exist');
    });

    it('CP-PROD-10: Debe actualizar un producto (PUT)', () => {
        cy.intercept('PUT', '**/api/productos/*', {
            statusCode: 200,
            body: { mensaje: 'Producto actualizado' },
        }).as('editarProducto');

        abrirEdicionPrimero();
        cy.get('input[name="nombre"]').clear().type('Producto Editado');
        cy.get('input[name="precio_venta"]').clear().type('2000');
        cy.contains('button', 'Guardar Cambios').click();

        cy.wait('@editarProducto').then(({ request }) => {
            expect(request.method).to.eq('PUT');
            expect(request.body.nombre).to.eq('Producto Editado');
            expect(request.body.precio_venta).to.eq(2000);
        });

        // El modal se cierra al guardar
        cy.contains('h5', 'Editar Producto').should('not.exist');
    });

    it('CP-PROD-11: Debe mostrar el mensaje del backend si falla la actualización', () => {
    const mensaje = /La categoría indicada no existe/;

    let alerta;
    cy.window().then((win) => {
        alerta = cy.stub(win, 'alert').as('alerta');
    });

    cy.intercept('PUT', '**/api/productos/*', {
        statusCode: 400,
        body: { mensaje: 'La categoría indicada no existe' },
    }).as('editarProducto');

    abrirEdicionPrimero();
    cy.contains('button', 'Guardar Cambios').click();
    cy.wait('@editarProducto');

    // El mensaje debe llegar al usuario, ya sea por alert() o visible en pantalla
    cy.document().should((doc) => {
        const enAlerta = alerta.args.some((args) => mensaje.test(String(args[0])));
        const enPantalla = mensaje.test(doc.body.innerText);
        expect(enAlerta || enPantalla, 'mensaje del backend en alert o en pantalla').to.be.true;
    });

    // El modal sigue abierto para que el usuario corrija
    cy.contains('h5', 'Editar Producto').should('be.visible');
});

    // ============================================
    // ELIMINACIÓN
    // (el DELETE se simula con una respuesta falsa: no se borra ningún producto real)
    // ============================================
    it('CP-PROD-12: Debe pedir confirmación mostrando el nombre del producto', () => {
        cy.get(FILAS).first().find('strong').invoke('text').then((nombre) => {
            abrirEliminarPrimero();

            cy.contains('Esta acción no se puede deshacer').should('be.visible');
            cy.contains('.modal-overlay strong', nombre.trim()).should('be.visible');
        });
    });

    it('CP-PROD-13: NO debe eliminar el producto si se cancela la confirmación', () => {
        cy.intercept('DELETE', '**/api/productos/*').as('borrarProducto');

        cy.get(FILAS).then(($antes) => {
            const cantidadAntes = $antes.length;

            abrirEliminarPrimero();
            cy.contains('button', 'Cancelar').click();

            cy.contains('h5', 'Confirmar Eliminación').should('not.exist');
            cy.get('@borrarProducto.all').should('have.length', 0);
            cy.get(FILAS).should('have.length', cantidadAntes);
        });
    });

    it('CP-PROD-14: Debe eliminar un producto al confirmar (DELETE)', () => {
        cy.intercept('DELETE', '**/api/productos/*', {
            statusCode: 200,
            body: { mensaje: 'Producto eliminado correctamente' },
        }).as('borrarProducto');

        abrirEliminarPrimero();
        cy.contains('button', 'Eliminar Producto').click();

        cy.wait('@borrarProducto').its('request.method').should('eq', 'DELETE');

        // El modal se cierra al eliminar
        cy.contains('h5', 'Confirmar Eliminación').should('not.exist');
    });

    it('CP-PROD-15: Debe avisar si el producto tiene movimientos asociados', () => {
    const mensaje = /movimientos asociados/;

    let alerta;
    cy.window().then((win) => {
        alerta = cy.stub(win, 'alert').as('alerta');
    });

    cy.intercept('DELETE', '**/api/productos/*', {
        statusCode: 409,
        body: { mensaje: 'No se puede eliminar el producto porque tiene movimientos asociados (compras, ventas, etc.)' },
    }).as('borrarProducto');

    abrirEliminarPrimero();
    cy.contains('button', 'Eliminar Producto').click();
    cy.wait('@borrarProducto');

    // El aviso debe llegar al usuario, ya sea por alert() o visible en pantalla
    cy.document().should((doc) => {
        const enAlerta = alerta.args.some((args) => mensaje.test(String(args[0])));
        const enPantalla = mensaje.test(doc.body.innerText);
        expect(enAlerta || enPantalla, 'aviso en alert o en pantalla').to.be.true;
    });

    // El producto no se borró: sigue en la lista
    cy.get(FILAS).should('have.length.greaterThan', 0);
});

    // ============================================
    // INVENTARIO
    // ============================================
    it('CP-PROD-16: Debe abrir y cerrar el estado del inventario', () => {
        cy.contains('button', 'Inventario').click();
        cy.contains('h5', 'Estado del Inventario').should('be.visible');

        // Se acota al overlay que contiene el título del inventario, así no se
        // confunde con otro overlay o con otro botón "Cerrar" del DOM
        cy.contains('h5', 'Estado del Inventario')
            .closest('.modal-overlay')
            .within(() => {
                ['Producto', 'Categoría', 'Stock Actual', 'Stock Mínimo', 'Estado'].forEach((columna) => {
                    cy.contains('th', columna).should('be.visible');
                });

                // Cada producto debe indicar "Stock Bajo" o "Suficiente"
                cy.get('tbody tr').first().invoke('text').should('match', /Stock Bajo|Suficiente/);

                // Si el modal es largo, el botón puede quedar fuera de vista
                cy.contains('button', 'Cerrar')
                    .scrollIntoView()
                    .should('be.visible')
                    .click();
            });

        cy.contains('h5', 'Estado del Inventario').should('not.exist');
        cy.get('.modal-overlay').should('not.exist');
    });

});