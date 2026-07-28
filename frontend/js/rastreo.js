// URL base de la API
const API_RASTREO = '../../backend/api/rastreo.php';

document.addEventListener('DOMContentLoaded', function() {
    const inputGuia = document.getElementById('input-guia');
    const btnRastrear = document.getElementById('btn-rastrear');
    
    // Leer parámetro de la URL por si viene con el enlace compartido
    const parametrosUrl = new URLSearchParams(window.location.search);
    const guiaUrl = parametrosUrl.get('guia');
    
    if (guiaUrl) {
        inputGuia.value = guiaUrl;
        buscarGuia(guiaUrl);
    }

    // Evento click del botón
    btnRastrear.addEventListener('click', function() {
        const guia = inputGuia.value.trim();
        if (guia) {
            buscarGuia(guia);
        } else {
            mostrarError('Por favor ingresa un código de guía válido.');
        }
    });

    // Evento enter en el input
    inputGuia.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const guia = inputGuia.value.trim();
            if (guia) buscarGuia(guia);
        }
    });
});

function buscarGuia(codigo) {
    const btnRastrear = document.getElementById('btn-rastrear');
    const resultado = document.getElementById('resultado-rastreo');
    
    // UI Estado de carga
    btnRastrear.disabled = true;
    btnRastrear.textContent = 'Buscando...';
    ocultarError();
    resultado.style.display = 'none';

    fetch(API_RASTREO + '?codigo=' + encodeURIComponent(codigo))
        .then(response => response.json())
        .then(data => {
            if (data.exito) {
                renderizarRastreo(data.datos);
            } else {
                mostrarError(data.mensaje || 'Guía no encontrada. Verifica el código.');
            }
        })
        .catch(error => {
            mostrarError('Error de conexión al buscar la guía.');
        })
        .finally(() => {
            btnRastrear.disabled = false;
            btnRastrear.textContent = 'Buscar';
        });
}

function renderizarRastreo(datos) {
    const resultado = document.getElementById('resultado-rastreo');
    const lineaTiempo = document.getElementById('linea-tiempo');
    const resumen = document.getElementById('resumen-paquete');

    // Mapeo de estados y su lógica en la línea de tiempo
    const estadosTimeline = [
        { key: 'pendiente', titulo: 'Despacho Creado', icono: '📦', baseMsg: 'El envío ha sido registrado en el sistema.' },
        { key: 'en_transito', titulo: 'En Tránsito', icono: '🚀', baseMsg: 'El paquete está en camino a su destino con la agencia.' },
        { key: 'entregado', titulo: 'Entregado', icono: '✅', baseMsg: 'El paquete fue entregado exitosamente al destinatario.' }
    ];

    let htmlTimeline = '';
    
    if (datos.estado === 'devuelto') {
        htmlTimeline = `
            <li class="timeline-item completado">
                <div class="timeline-icono">📦</div>
                <div class="timeline-contenido">
                    <h4>Despacho Creado</h4>
                    <p>El envío fue registrado el ${formatearFecha(datos.fecha_envio)}</p>
                </div>
            </li>
            <li class="timeline-item cancelado">
                <div class="timeline-icono">✖</div>
                <div class="timeline-contenido">
                    <h4>Cancelado / Devuelto</h4>
                    <p>El envío fue cancelado o devuelto por la agencia.</p>
                </div>
            </li>
        `;
    } else {
        // Encontrar índice del estado actual para saber qué pintar
        const indexActual = estadosTimeline.findIndex(e => e.key === datos.estado);
        const indexSeguro = indexActual === -1 ? 0 : indexActual;

        estadosTimeline.forEach((etapa, idx) => {
            let claseEstatus = '';
            let fechaTexto = '';

            if (idx < indexSeguro) {
                claseEstatus = 'completado';
                fechaTexto = idx === 0 ? ' el ' + formatearFecha(datos.fecha_envio) : '';
            } else if (idx === indexSeguro) {
                claseEstatus = 'activo';
                fechaTexto = ' (Actual)';
            }

            htmlTimeline += `
                <li class="timeline-item ${claseEstatus}">
                    <div class="timeline-icono">${etapa.icono}</div>
                    <div class="timeline-contenido">
                        <h4>${etapa.titulo}</h4>
                        <p>${etapa.baseMsg}${fechaTexto}</p>
                    </div>
                </li>
            `;
        });
    }

    lineaTiempo.innerHTML = htmlTimeline;

    // Llenar resumen
    resumen.innerHTML = `
        <div class="resumen-fila">
            <span class="resumen-etiqueta">Destinatario</span>
            <span class="resumen-valor">${datos.destinatario_nombre}</span>
        </div>
        <div class="resumen-fila">
            <span class="resumen-etiqueta">Ciudad Destino</span>
            <span class="resumen-valor">${datos.destino_ciudad}</span>
        </div>
        <div class="resumen-fila">
            <span class="resumen-etiqueta">Agencia</span>
            <span class="resumen-valor">${datos.agencia_nombre}</span>
        </div>
        <div class="resumen-fila">
            <span class="resumen-etiqueta">Artículo</span>
            <span class="resumen-valor">${datos.revista_titulo} (Ed. ${datos.numero_edicion})</span>
        </div>
        <div class="resumen-fila">
            <span class="resumen-etiqueta">Entrega Estimada</span>
            <span class="resumen-valor">${datos.fecha_entrega_estimada ? formatearFecha(datos.fecha_entrega_estimada) : 'Por confirmar'}</span>
        </div>
    `;

    resultado.style.display = 'block';
}

function mostrarError(mensaje) {
    const div = document.getElementById('mensaje-error');
    div.textContent = mensaje;
    div.style.display = 'block';
    document.getElementById('resultado-rastreo').style.display = 'none';
}

function ocultarError() {
    const div = document.getElementById('mensaje-error');
    div.style.display = 'none';
}

// Función auxiliar para formatear fechas
function formatearFecha(fechaStr) {
    if (!fechaStr) return '';
    const partes = fechaStr.split('-');
    if (partes.length !== 3) return fechaStr;
    const date = new Date(partes[0], partes[1] - 1, partes[2]);
    const opciones = { day: '2-digit', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('es-ES', opciones);
}
