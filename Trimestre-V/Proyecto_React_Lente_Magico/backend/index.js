import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pool from "./db.js";

import loginRoutes from './routes/login.js';
import recuperarRoutes from './routes/recuperar.js';
import autorizacionesRoutes from './routes/Administrador/autorizaciones.js';
import LogErroresRoutes from './routes/Administrador/logErrores.js';
import usuariosRoutes from './routes/Administrador/usuarios.js';
import tiposDocumentoRoutes from './routes/tiposDocumento.js';
// Modulo Optometra Rutas
import ConsultaRoutes from "./routes/Optometra/Consulta.js";
import historiaClinicaRoutes from "./routes/Optometra/historiaClinica.js";
import antecedentesRoutes from './routes/Optometra/antecedentes.js';
import generarFormulaRoutes from './routes/Optometra/generarFormula.js';
// ============================================================================== //

// Modulo Caja Rutas

import AgendarConsultaRoutes from './routes/Caja/AgendarConsulta.js';
import AgregarProductosRoutes from './routes/Caja/AgregarProductos.js';
import CantidadProductosVendidosRoutes from './routes/Caja/CantidadProductosVendidos.js';
import ConfirmacionBancoRoutes from './routes/Caja/ConfirmacionBanco.js';
import ConfirmarVentaRoutes from './routes/Caja/ConfirmarVenta.js';
import ConsultarClienteRoutes from './routes/Caja/ConsultarCliente.js';
import EfectivoRoutes from './routes/Caja/Efectivo.js';
import FormasPagoRoutes from './routes/Caja/FormasPago.js';
import PlataformasRoutes from './routes/Caja/Plataformas.js';
import PrecioCadaProductoRoutes from './routes/Caja/PrecioCadaProducto.js';
import RegistrarDatosClienteRoutes from './routes/Caja/RegistrarDatosCliente.js';
import RegistrarServicioRoutes from './routes/Caja/RegistrarServicio.js';
import TarjetaCreditoRoutes from './routes/Caja/TarjetaCredito.js';
import TarjetaDebitoRoutes from './routes/Caja/TarjetaDebito.js';
import VisualizarProductoVendidoRoutes from './routes/Caja/VisualizarProductoVendido.js';
import VisualizarVentaRoutes from './routes/Caja/VisualizarVenta.js';
// ============================================================================== //

// modulo compras-Bodega Rutas

import categoriasRoutes from './routes/Compras/categorias.js';
import comprasRoutes from './routes/Compras/compras.js';
import proveedoresRoutes from './routes/Compras/proveedores.js';
import productosCRoutes from './routes/Compras/productosC.js';

import productosRoutes from './routes/Bodega/productos.js';
const app = express();//Permite inicilizar las aplicaciones y configurar las urls
const PORT = process.env.PORT || 5000; // configuracion del puerto del backend 

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
// app.use(cors()); // Permite las solicitudes desde cualquier origen
app.use(express.json()); //Por si tiene que leer algun formato JSON

app.get('/', (req, res) => {
  res.send('Hola, estoy en el backend de Lente Mágico');
});
/*
app.get('/api/mensaje', ( req, res) => {
   res.json({ mensaje: '¡ Conexion Existosa ! el backend responde correctamente' });
});
*/
//app.get('api/clientes', ( req, res ) => res.send('prueba'));
app.use('/api/login', loginRoutes);
app.use('/api/recuperar', recuperarRoutes);
app.use('/api/administrador/autorizaciones', autorizacionesRoutes);
app.use('/api/administrador/logErrores', LogErroresRoutes);
app.use('/api/administrador/usuarios', usuariosRoutes);
app.use('/api/administrador/tipos-documento', tiposDocumentoRoutes);

app.use('/api/optometra', ConsultaRoutes);
app.use('/api/optometra', antecedentesRoutes);
app.use('/api/optometra', generarFormulaRoutes);
app.use('/api/optometra', historiaClinicaRoutes);


// ============================================================================== //
app.use('/api/agendar-consulta', AgendarConsultaRoutes);
app.use('/api/productos', AgregarProductosRoutes);
app.use('/api/cantidad-productos-vendidos', CantidadProductosVendidosRoutes);
app.use('/api/confirmacion-banco', ConfirmacionBancoRoutes);
app.use('/api/confirmar-venta', ConfirmarVentaRoutes);
app.use('/api/clientes', ConsultarClienteRoutes);
app.use('/api/pagos/efectivo', EfectivoRoutes);
app.use('/api/formas-pago', FormasPagoRoutes);
app.use('/api/pagos/plataformas', PlataformasRoutes);
app.use('/api/precio-producto', PrecioCadaProductoRoutes);
app.use('/api/registrar-cliente', RegistrarDatosClienteRoutes);
app.use('/api/servicios', RegistrarServicioRoutes);
app.use('/api/pagos/tarjeta-credito', TarjetaCreditoRoutes);
app.use('/api/pagos/tarjeta-debito', TarjetaDebitoRoutes);
app.use('/api/productos-vendidos', VisualizarProductoVendidoRoutes);
app.use('/api/ventas', VisualizarVentaRoutes);
// ============================================================================== //

app.use('/api/categorias', categoriasRoutes);
app.use('/api/compras', comprasRoutes);
app.use('/api/proveedores', proveedoresRoutes);
app.use('/api/productos', productosRoutes); 
app.use('/api/productosC', productosCRoutes);

app.listen(PORT, () => {
  console.log(`Servidor del backend escuchado en http://localhost:${PORT}`);
});


