const API_ENVIOS = '../../backend/api/envios.php';

document.addEventListener('DOMContentLoaded', function() {
    const parametrosUrl = new URLSearchParams(window.location.search);
    const idEnvio = parametrosUrl.get('id');

    if (!idEnvio) {
        mostrarError('ID de envío no proporcionado.');
        return;
    }

    fetch(API_ENVIOS + '?id=' + idEnvio)
        .then(response => response.json())
        .then(data => {
            if (data.exito && data.datos) {
                renderizarComprobante(data.datos);
                // Llamar a imprimir automáticamente después de un pequeño retraso
                setTimeout(() => window.print(), 500);
            } else {
                mostrarError(data.mensaje || 'No se encontró el envío.');
            }
        })
        .catch(error => {
            mostrarError('Error de conexión con el servidor.');
        });
});

function renderizarComprobante(e) {
    const contenedor = document.getElementById('recibo-contenedor');
    
    // Validar estado
    let badgeEstado = '';
    if (e.estado === 'entregado') {
        badgeEstado = `<div class="estado-entregado">✓ ENTREGADO SATISFACTORIAMENTE</div>`;
    } else {
        badgeEstado = `<div class="estado-entregado" style="background-color: #fef9ec; color: #d97706; border-color: #f59e0b;">ESTADO ACTUAL: ${e.estado.toUpperCase().replace('_', ' ')}</div>`;
    }

    const html = `
        <button class="boton-imprimir" onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>

        <div class="cabecera">
            <h2 class="marca">RevistaExpress</h2>
            <div class="titulo-doc">
                <h1>Comprobante de Entrega</h1>
                <p>Guía: ${e.codigo_rastreo || 'ENV-' + String(e.id_envio).padStart(4, '0')}</p>
                <p style="font-size: 0.9rem; color: #525252; margin-top: 5px;">Fecha: ${formatearFechaLarga(new Date())}</p>
            </div>
        </div>

        ${badgeEstado}

        <div class="seccion">
            <h3 class="seccion-titulo">Información del Destinatario</h3>
            <div class="fila-datos">
                <div class="grupo-dato">
                    <div class="etiqueta">Nombre Completo</div>
                    <div class="valor">${e.persona_nombre} ${e.persona_apellido}</div>
                </div>
                <div class="grupo-dato">
                    <div class="etiqueta">Dirección de Entrega</div>
                    <div class="valor">${e.direccion_envio}</div>
                </div>
                <div class="grupo-dato">
                    <div class="etiqueta">Ciudad</div>
                    <div class="valor">${e.persona_ciudad}</div>
                </div>
                <div class="grupo-dato">
                    <div class="etiqueta">Teléfono</div>
                    <div class="valor">${e.persona_telefono || 'N/A'}</div>
                </div>
            </div>
        </div>

        <div class="seccion">
            <h3 class="seccion-titulo">Detalles del Despacho</h3>
            <div class="fila-datos">
                <div class="grupo-dato">
                    <div class="etiqueta">Agencia de Transporte</div>
                    <div class="valor">${e.agencia_nombre}</div>
                </div>
                <div class="grupo-dato">
                    <div class="etiqueta">Fecha de Envío</div>
                    <div class="valor">${formatearFechaLarga(e.fecha_envio)}</div>
                </div>
            </div>
        </div>

        <table class="tabla-articulos">
            <thead>
                <tr>
                    <th>Descripción del Artículo</th>
                    <th class="precio">Valor Unitario</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>
                        <strong>${e.revista_titulo}</strong><br>
                        <span style="color: #525252; font-size: 0.95rem;">Edición #${e.numero_edicion} - Género: ${e.revista_genero}</span>
                    </td>
                    <td class="precio">$${parseFloat(e.precio).toFixed(2)}</td>
                </tr>
            </tbody>
        </table>

        ${e.observaciones ? `
        <div class="seccion" style="background-color: #fafafa; padding: 1rem; border: 1px dashed #ccc;">
            <div class="etiqueta">Observaciones del Envío:</div>
            <div style="font-size: 0.95rem;">${e.observaciones}</div>
        </div>
        ` : ''}

        <div class="firmas">
            <div class="caja-firma">
                <div class="linea-firma"></div>
                <strong>${e.agencia_nombre}</strong>
                <p>Firma y Sello de Entrega</p>
            </div>
            <div class="caja-firma">
                <div class="linea-firma"></div>
                <strong>${e.persona_nombre} ${e.persona_apellido}</strong>
                <p>Firma de Conformidad (Recibí Conforme)</p>
            </div>
        </div>

        <div class="footer-recibo">
            Este documento certifica la entrega del artículo detallado en la dirección proporcionada. <br>
            RevistaExpress - Sistema de Gestión de Envíos
        </div>
    `;

    contenedor.innerHTML = html;
}

function mostrarError(mensaje) {
    document.getElementById('recibo-contenedor').innerHTML = `<div class="alerta-error"><h3>Error</h3><p>${mensaje}</p></div>`;
}

function formatearFechaLarga(fechaIn) {
    if (!fechaIn) return '';
    let d;
    if (fechaIn instanceof Date) {
        d = fechaIn;
    } else {
        const partes = fechaIn.split('-');
        if (partes.length === 3) {
            d = new Date(partes[0], partes[1] - 1, partes[2]);
        } else {
            return fechaIn;
        }
    }
    const opciones = { day: '2-digit', month: 'long', year: 'numeric' };
    return d.toLocaleDateString('es-ES', opciones);
}
