// cypress/e2e/Compra-bodega/consultarProveedores.cy.js
// Cambia esta constante si la ruta real del componente es otra
const RUTA = '/consultar-proveedores';

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

// Datos únicos y CORTOS a propósito: algunas columnas de MySQL tienen límite
// de longitud y un valor más largo se corta en silencio (nos pasó con el comprobante).
// - NIT: solo dígitos (el input borra todo lo demás) -> 9 dígitos
// - Razón social: letras, números, espacios y & . -
const sufijo = () => String(Date.now()).slice(-6);
const nitUnico = () => String(Date.now()).slice(-9);
const razonUnica = () => `Cy Prov ${sufijo()}`;

describe('Pruebas de Caja Negra - Proveedores (UI)', () => {

    const FILAS = 'table tbody tr';

    // Crea un proveedor completo desde la interfaz
    const crearProveedor = (razon, nit) => {
        cy.contains('button', 'Agregar Proveedor').click();
        cy.contains('h4', 'Nuevo Proveedor').should('be.visible');

        cy.get('input[name="nit"]').type(nit);
        cy.get('input[name="razon_social"]').type(razon);
        cy.get('input[name="contacto"]').type('Contacto Cypress');
        cy.get('input[name="telefono"]').type('3001234567');
        cy.get('input[name="correo"]').type('cypress@test.com');
        cy.get('select[name="tipo"]').select('Distribuidor');

        cy.contains('button', 'Registrar Proveedor').click();
    };

    // Elimina un proveedor por su razón social usando el modal de confirmación
    const eliminarProveedor = (razon) => {
        cy.contains('tr', razon).contains('button', '🗑️').click();
        cy.contains('h6', 'Confirmar eliminación').should('be.visible');
        cy.contains('button', 'Sí, eliminar').click();
    };

    beforeEach(() => {
        cy.on('window:alert', () => true);
        cy.intercept('GET', '**/api/proveedores*').as('getProveedores');
        visitarConSesion(RUTA);
        cy.wait('@getProveedores'); // esperamos a que lleguen los datos reales
    });

    // ============================================
    // CASOS BÁSICOS
    // ============================================
    it('CP-PROV-01: Debe cargar la página y mostrar el título', () => {
        cy.url().should('include', RUTA);
        cy.contains('h2', 'Gestión de Proveedores').should('be.visible');
    });

    it('CP-PROV-02: Debe cargar los proveedores desde el backend', () => {
        cy.get('@getProveedores').its('response.statusCode').should('eq', 200);
        cy.get(FILAS).should('have.length.greaterThan', 0);
    });

    it('CP-PROV-03: Debe mostrar las columnas y las tarjetas de estadísticas', () => {
        ['ID', 'NIT', 'Razón Social', 'Contacto', 'Tipo', 'Estado', 'Acciones'].forEach((col) => {
            cy.contains('th', col).should('be.visible');
        });

        ['Total Proveedores', 'Activos', 'Inactivos'].forEach((label) => {
            cy.contains(label).should('be.visible');
        });
    });

    // ============================================
    // BÚSQUEDA
    // ============================================
    it('CP-PROV-04: Debe filtrar proveedores por razón social', () => {
        // La razón social está en la 3ª columna
        cy.get(FILAS).first().find('td').eq(2).invoke('text').then((razon) => {
            cy.get('input[placeholder^="Buscar"]').type(razon.trim());

            cy.get(FILAS).should('have.length.greaterThan', 0);
            cy.get(FILAS).each(($fila) => {
                expect($fila.text().toLowerCase()).to.include(razon.trim().toLowerCase());
            });
        });
    });

    it('CP-PROV-05: Debe mostrar mensaje si la búsqueda no coincide', () => {
        cy.get('input[placeholder^="Buscar"]').type('zzzzqqqqxxxx');
        cy.contains('No se encontraron proveedores registrados.').should('be.visible');
    });

    // ============================================
    // FORMULARIO: ALTERNAR VISTAS
    // ============================================
    it('CP-PROV-06: Debe alternar entre la tabla y el formulario', () => {
        cy.contains('button', 'Agregar Proveedor').click();

        cy.contains('h4', 'Nuevo Proveedor').should('be.visible');
        cy.contains('button', 'Ver Tabla').should('be.visible');
        // Las estadísticas solo se ven en la vista de tabla
        cy.contains('Total Proveedores').should('not.exist');

        cy.contains('button', 'Ver Tabla').click();
        cy.contains('h4', 'Nuevo Proveedor').should('not.exist');
        cy.contains('Total Proveedores').should('be.visible');
    });

    it('CP-PROV-07: Debe cancelar el formulario y volver a la tabla', () => {
        cy.contains('button', 'Agregar Proveedor').click();
        cy.contains('button', 'Cancelar').click();

        cy.contains('h4', 'Nuevo Proveedor').should('not.exist');
        cy.get(FILAS).should('have.length.greaterThan', 0);
    });

    // ============================================
    // FORMULARIO: FILTROS DE CAMPOS
    // ============================================
    it('CP-PROV-08: NIT y teléfono solo deben aceptar números', () => {
        cy.contains('button', 'Agregar Proveedor').click();

        cy.get('input[name="nit"]').type('abc123def');
        cy.get('input[name="nit"]').should('have.value', '123');

        cy.get('input[name="telefono"]').type('30a0b1');
        cy.get('input[name="telefono"]').should('have.value', '3001');
    });

    it('CP-PROV-09: Contacto solo debe aceptar letras', () => {
        cy.contains('button', 'Agregar Proveedor').click();

        cy.get('input[name="contacto"]').type('Juan123!');
        cy.get('input[name="contacto"]').should('have.value', 'Juan');
    });

    it('CP-PROV-10: Razón social debe filtrar símbolos no permitidos', () => {
        cy.contains('button', 'Agregar Proveedor').click();

        cy.get('input[name="razon_social"]').type('Opti@Vision#2 & Co.');
        cy.get('input[name="razon_social"]').should('have.value', 'OptiVision2 & Co.');
    });

    // ============================================
    // FORMULARIO: VALIDACIONES
    // ============================================
    it('CP-PROV-11: NO debe enviar el formulario con NIT y razón social vacíos', () => {
        cy.intercept('POST', '**/api/proveedores').as('crearProveedor');

        cy.contains('button', 'Agregar Proveedor').click();
        cy.contains('button', 'Registrar Proveedor').click();

        // Los campos tienen "required": el navegador bloquea el envío
        cy.get('input[name="nit"]').then(($input) => {
            expect($input[0].checkValidity()).to.be.false;
        });
        cy.get('@crearProveedor.all').should('have.length', 0);
        cy.contains('h4', 'Nuevo Proveedor').should('be.visible');
    });

    it('CP-PROV-12: Debe mostrar un aviso si la razón social son solo espacios', () => {
        cy.intercept('POST', '**/api/proveedores').as('crearProveedor');

        cy.contains('button', 'Agregar Proveedor').click();
        cy.get('input[name="nit"]').type('123456');
        cy.get('input[name="razon_social"]').type('   '); // pasa "required", pero no el trim()
        cy.contains('button', 'Registrar Proveedor').click();

        cy.contains('El NIT y la Razón Social son obligatorios.').should('be.visible');
        cy.get('@crearProveedor.all').should('have.length', 0);
    });

    // ============================================
    // CREACIÓN
    // ============================================
    it('CP-PROV-13: Debe registrar un proveedor nuevo correctamente', () => {
        const razon = razonUnica();

        cy.intercept('POST', '**/api/proveedores').as('crearProveedor');
        cy.intercept('DELETE', '**/api/proveedores/*').as('borrarProveedor');

        crearProveedor(razon, nitUnico());

        cy.wait('@crearProveedor').its('response.statusCode').should('be.oneOf', [200, 201]);
        cy.contains('Proveedor registrado con éxito.').should('be.visible');
        cy.contains('tr', razon).should('be.visible');

        // Limpieza: se elimina el proveedor creado por la prueba
        eliminarProveedor(razon);
        cy.wait('@borrarProveedor');
    });

    // ============================================
    // EDICIÓN
    // ============================================
    it('CP-PROV-14: Debe abrir el formulario de edición con los datos cargados', () => {
        cy.get(FILAS).first().contains('button', '✏️').click();

        cy.contains('h4', 'Modificar Proveedor').should('be.visible');
        cy.get('input[name="nit"]').should('not.have.value', '');
        cy.get('input[name="razon_social"]').should('not.have.value', '');
        cy.contains('button', 'Guardar Cambios').should('be.visible');
    });

    it('CP-PROV-15: Debe actualizar un proveedor (PUT)', () => {
        const razon = razonUnica();

        cy.intercept('POST', '**/api/proveedores').as('crearProveedor');
        cy.intercept('PUT', '**/api/proveedores/*').as('editarProveedor');
        cy.intercept('DELETE', '**/api/proveedores/*').as('borrarProveedor');

        // Se crea un proveedor propio para no modificar datos existentes
        crearProveedor(razon, nitUnico());
        cy.wait('@crearProveedor');
        cy.contains('tr', razon).should('be.visible');

        // Se edita el contacto
        cy.contains('tr', razon).contains('button', '✏️').click();
        cy.contains('h4', 'Modificar Proveedor').should('be.visible');
        cy.get('input[name="contacto"]').clear().type('Editado Cy');
        cy.contains('button', 'Guardar Cambios').click();

        cy.wait('@editarProveedor').its('response.statusCode').should('eq', 200);
        cy.contains('Proveedor actualizado con éxito.').should('be.visible');
        cy.contains('tr', razon).should('contain.text', 'Editado Cy');

        // Limpieza
        eliminarProveedor(razon);
        cy.wait('@borrarProveedor');
    });

    // ============================================
    // ELIMINACIÓN
    // ============================================
    it('CP-PROV-16: Debe cancelar la eliminación sin borrar el proveedor', () => {
        cy.get(FILAS).then(($antes) => {
            const cantidadAntes = $antes.length;

            cy.get(FILAS).first().contains('button', '🗑️').click();
            cy.contains('h6', 'Confirmar eliminación').should('be.visible');

            // Se busca "Cancelar" dentro del modal
            cy.contains('h6', 'Confirmar eliminación')
                .closest('.position-fixed')
                .contains('button', 'Cancelar')
                .click();

            cy.contains('h6', 'Confirmar eliminación').should('not.exist');
            cy.get(FILAS).should('have.length', cantidadAntes);
        });
    });

    it('CP-PROV-17: Debe eliminar un proveedor existente', () => {
        const razon = razonUnica();

        cy.intercept('POST', '**/api/proveedores').as('crearProveedor');
        cy.intercept('DELETE', '**/api/proveedores/*').as('borrarProveedor');

        // Se crea un proveedor propio para borrarlo
        crearProveedor(razon, nitUnico());
        cy.wait('@crearProveedor');
        cy.contains('tr', razon).should('be.visible');

        eliminarProveedor(razon);

        cy.wait('@borrarProveedor').its('response.statusCode').should('be.oneOf', [200, 204]);
        cy.contains('Proveedor eliminado correctamente.').should('be.visible');
        cy.contains('tr', razon).should('not.exist');
    });

});