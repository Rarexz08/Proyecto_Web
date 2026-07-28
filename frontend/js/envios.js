// Módulo CRUD: Envíos

const API_ENVIOS     = '/Proyecto1/backend/api/envios.php';
const API_REVISTAS   = '/Proyecto1/backend/api/revistas.php';
const API_EJEMPLARES = '/Proyecto1/backend/api/ejemplares.php';
const API_PERSONAS   = '/Proyecto1/backend/api/personas.php';
const API_AGENCIAS   = '/Proyecto1/backend/api/agencias.php';

let registros = [];
let seleccionadoId = null;
let filtroActual = 'todos';
let textoBusqueda = '';

// Variables de Paginación
let paginaActual = 1;
const itemsPorPagina = 5;

// SEGURIDAD — Verificar sesión

function verificarSesion() {
    fetch('/Proyecto1/backend/api/auth.php?action=verificar')
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (!data.autenticado) {
                window.location.href = 'login.html';
            }
        })
        .catch(function () {
            window.location.href = 'login.html';
        });
}

// UTILIDADES

function mostrarNotificacion(mensaje, tipo) {
    var existente = document.querySelector('.notificacion-toast');
    if (existente) existente.remove();
    var toast = document.createElement('div');
    toast.className = 'notificacion-toast ' + tipo;
    toast.innerHTML = '<span>' + (tipo === 'exito' ? '✅' : '❌') + '</span> ' + mensaje;
    document.body.appendChild(toast);
    setTimeout(function () {
        toast.classList.add('saliendo');
        setTimeout(function () { toast.remove(); }, 300);
    }, 3000);
}

function cerrarSesion() {
    fetch('/Proyecto1/backend/api/auth.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' })
    }).then(function () { window.location.href = 'login.html'; })
      .catch(function () { window.location.href = 'login.html'; });
}

function formatearFecha(fechaISO) {
    if (!fechaISO) return '—';
    var opciones = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(fechaISO + 'T00:00:00').toLocaleDateString('es-MX', opciones);
}

function obtenerTextoEstado(estado) {
    var textos = { pendiente: 'Pendiente', en_transito: 'En tránsito', entregado: 'Entregado', devuelto: 'Devuelto' };
    return textos[estado] || estado;
}

function obtenerClaseEstado(estado) {
    var clases = { pendiente: 'pendiente', en_transito: 'en-transito', entregado: 'entregado', devuelto: 'devuelto' };
    return clases[estado] || '';
}

function obtenerClaseTarjeta(estado) {
    var clases = { pendiente: 'estado-pendiente', en_transito: 'estado-en-transito', entregado: 'estado-entregado', devuelto: 'estado-devuelto' };
    return clases[estado] || '';
}

// API — CARGAR DATOS

function cargarRegistros() {
    fetch(API_ENVIOS)
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (data.exito) {
                registros = data.datos;
                renderizarLista();
                if (seleccionadoId) {
                    var reg = registros.find(function (r) { return r.id_envio == seleccionadoId; });
                    if (reg) renderizarDetalle(reg);
                }
            }
        })
        .catch(function () {
            mostrarNotificacion('Error de conexión al cargar envíos.', 'error');
        });
}

// RENDERIZADO — LISTA

function renderizarLista() {
    var contenedor = document.getElementById('lista-envios');
    var contador = document.getElementById('contador-envios');
    var paginacionContenedor = document.getElementById('paginacion');

    var filtrados = registros;

    if (filtroActual !== 'todos') {
        filtrados = filtrados.filter(function (e) { return e.estado === filtroActual; });
    }

    if (textoBusqueda.trim() !== '') {
        var t = textoBusqueda.toLowerCase();
        filtrados = filtrados.filter(function (e) {
            return e.revista_titulo.toLowerCase().includes(t) ||
                   (e.persona_nombre + ' ' + e.persona_apellido).toLowerCase().includes(t) ||
                   e.agencia_nombre.toLowerCase().includes(t) ||
                   e.direccion_envio.toLowerCase().includes(t);
        });
    }

    contador.textContent = filtrados.length === 1 ? '1 envío' : filtrados.length + ' envíos';

    if (filtrados.length === 0) {
        contenedor.innerHTML = '<div class="sin-resultados"><span class="sin-resultados-icono">🔍</span><p class="sin-resultados-titulo">Sin resultados</p><p class="sin-resultados-texto">No se encontraron envíos con los filtros aplicados.</p></div>';
        if (paginacionContenedor) paginacionContenedor.style.display = 'none';
        return;
    }

    // Paginación
    var totalPaginas = Math.ceil(filtrados.length / itemsPorPagina);
    if (paginaActual > totalPaginas) paginaActual = totalPaginas || 1;
    
    var inicio = (paginaActual - 1) * itemsPorPagina;
    var fin = inicio + itemsPorPagina;
    var itemsPagina = filtrados.slice(inicio, fin);

    contenedor.innerHTML = itemsPagina.map(function (e) {
        var sel = e.id_envio == seleccionadoId ? 'seleccionada' : '';
        var claseT = obtenerClaseTarjeta(e.estado);
        var claseB = obtenerClaseEstado(e.estado);

        return '<div class="tarjeta-envio ' + claseT + ' ' + sel + '" onclick="seleccionar(' + e.id_envio + ')">' +
            '<div class="tarjeta-encabezado">' +
                '<span class="tarjeta-id">ENV-' + String(e.id_envio).padStart(4, '0') + '</span>' +
                '<span class="etiqueta-estado ' + claseB + '"><span class="punto-estado ' + claseB + '"></span>' + obtenerTextoEstado(e.estado) + '</span>' +
            '</div>' +
            '<div class="tarjeta-revista">' + e.revista_titulo + '</div>' +
            '<div class="tarjeta-info">' +
                '<div class="tarjeta-detalle"><span class="tarjeta-detalle-icono">👤</span>' + e.persona_nombre + ' ' + e.persona_apellido + '</div>' +
                '<div class="tarjeta-detalle"><span class="tarjeta-detalle-icono">🚚</span>' + e.agencia_nombre + '</div>' +
            '</div>' +
            '<div class="tarjeta-fecha">📅 Enviado: ' + formatearFecha(e.fecha_envio) + '</div>' +
        '</div>';
    }).join('');

    if (paginacionContenedor) renderizarControlesPaginacion(paginacionContenedor, totalPaginas);
}

function renderizarControlesPaginacion(contenedor, totalPaginas) {
    if (totalPaginas <= 1) {
        contenedor.style.display = 'none';
        return;
    }
    contenedor.style.display = 'flex';
    var html = '<button class="btn-pagina" ' + (paginaActual === 1 ? 'disabled' : '') + ' onclick="cambiarPagina(' + (paginaActual - 1) + ')">Anterior</button>';
    html += '<span class="paginacion-info">Pág ' + paginaActual + ' de ' + totalPaginas + '</span>';
    html += '<button class="btn-pagina" ' + (paginaActual === totalPaginas ? 'disabled' : '') + ' onclick="cambiarPagina(' + (paginaActual + 1) + ')">Siguiente</button>';
    contenedor.innerHTML = html;
}

window.cambiarPagina = function(nuevaPagina) {
    paginaActual = nuevaPagina;
    renderizarLista();
};

// RENDERIZADO — DETALLE

function seleccionar(id) {
    seleccionadoId = id;
    var reg = registros.find(function (r) { return r.id_envio == id; });
    if (reg) {
        renderizarDetalle(reg);
        renderizarLista();
    }
}

function generarBotonesAccion(e) {
    var botones = {
        pendiente:
            '<button class="boton-accion boton-primario" onclick="cambiarEstado(' + e.id_envio + ',\'en_transito\')"><span class="boton-accion-icono">🚀</span> Marcar en Tránsito</button>' +
            '<button class="boton-accion boton-peligro" onclick="cambiarEstado(' + e.id_envio + ',\'devuelto\')"><span class="boton-accion-icono">✖</span> Cancelar</button>',
        en_transito:
            '<button class="boton-accion boton-exito" onclick="cambiarEstado(' + e.id_envio + ',\'entregado\')"><span class="boton-accion-icono">✅</span> Confirmar Entrega</button>' +
            '<button class="boton-accion boton-advertencia" onclick="cambiarEstado(' + e.id_envio + ',\'devuelto\')"><span class="boton-accion-icono">↩️</span> Devolver</button>',
        entregado:
            '<button class="boton-accion boton-secundario" onclick="abrirComprobante(' + e.id_envio + ')"><span class="boton-accion-icono">📄</span> Comprobante</button>',
        devuelto:
            '<button class="boton-accion boton-primario" onclick="cambiarEstado(' + e.id_envio + ',\'pendiente\')"><span class="boton-accion-icono">🔄</span> Reenviar</button>'
    };
    return botones[e.estado] || '';
}

function renderizarDetalle(e) {
    document.getElementById('estado-vacio').style.display = 'none';
    var panel = document.getElementById('contenido-detalle');
    panel.style.display = 'flex';
    var claseE = obtenerClaseEstado(e.estado);

    panel.innerHTML =
        '<div class="detalle-cabecera">' +
            '<div class="detalle-titulo-grupo">' +
                '<span class="detalle-id">ENVÍO ENV-' + String(e.id_envio).padStart(4, '0') + '</span>' +
                '<h1 class="detalle-titulo">' + e.revista_titulo + '</h1>' +
            '</div>' +
            '<span class="detalle-estado ' + claseE + '"><span class="punto-estado ' + claseE + '"></span>' + obtenerTextoEstado(e.estado) + '</span>' +
        '</div>' +
        '<div class="detalle-cuerpo">' +
            '<div class="seccion-detalle">' +
                '<h3 class="seccion-titulo"><span class="seccion-titulo-icono">📦</span> Información del Envío</h3>' +
                (e.codigo_rastreo ? '<div class="campo-detalle"><span class="campo-etiqueta">Código Rastreo</span><span class="campo-valor" style="font-weight:bold; color:var(--primario);">' + e.codigo_rastreo + '</span></div>' : '') +
                '<div class="campo-detalle"><span class="campo-etiqueta">Fecha de Envío</span><span class="campo-valor">' + formatearFecha(e.fecha_envio) + '</span></div>' +
                '<div class="campo-detalle"><span class="campo-etiqueta">Entrega Estimada</span><span class="campo-valor">' + formatearFecha(e.fecha_entrega_estimada) + '</span></div>' +
                '<div class="campo-detalle"><span class="campo-etiqueta">Dirección de Envío</span><span class="campo-valor">' + e.direccion_envio + '</span></div>' +
            '</div>' +
            '<div class="seccion-detalle">' +
                '<h3 class="seccion-titulo"><span class="seccion-titulo-icono">👤</span> Destinatario</h3>' +
                '<div class="campo-detalle"><span class="campo-etiqueta">Nombre Completo</span><span class="campo-valor">' + e.persona_nombre + ' ' + e.persona_apellido + '</span></div>' +
                '<div class="campo-detalle"><span class="campo-etiqueta">Correo Electrónico</span><span class="campo-valor">' + e.persona_email + '</span></div>' +
                '<div class="campo-detalle"><span class="campo-etiqueta">Teléfono</span><span class="campo-valor">' + (e.persona_telefono || '—') + '</span></div>' +
            '</div>' +
            '<div class="seccion-detalle">' +
                '<h3 class="seccion-titulo"><span class="seccion-titulo-icono">📖</span> Revista / Ejemplar</h3>' +
                '<div class="campo-detalle"><span class="campo-etiqueta">Revista</span><span class="campo-valor">' + e.revista_titulo + '</span></div>' +
                '<div class="campo-detalle"><span class="campo-etiqueta">Edición</span><span class="campo-valor">#' + e.numero_edicion + '</span></div>' +
                '<div class="campo-detalle"><span class="campo-etiqueta">Precio</span><span class="campo-valor">$' + parseFloat(e.precio).toFixed(2) + '</span></div>' +
            '</div>' +
            '<div class="seccion-detalle">' +
                '<h3 class="seccion-titulo"><span class="seccion-titulo-icono">🚚</span> Agencia de Transporte</h3>' +
                '<div class="campo-detalle"><span class="campo-etiqueta">Agencia</span><span class="campo-valor">' + e.agencia_nombre + '</span></div>' +
                '<div class="campo-detalle"><span class="campo-etiqueta">Teléfono</span><span class="campo-valor">' + (e.agencia_telefono || '—') + '</span></div>' +
            '</div>' +
            (e.observaciones ? '<div class="seccion-detalle ancho-completo"><h3 class="seccion-titulo"><span class="seccion-titulo-icono">📝</span> Observaciones</h3><p class="campo-observaciones">' + e.observaciones + '</p></div>' : '') +
        '</div>' +
        '<div class="barra-acciones">' +
            (e.codigo_rastreo ? '<button class="boton-accion boton-secundario" onclick="copiarRastreo(\'' + e.codigo_rastreo + '\')"><span class="boton-accion-icono">🔗</span> Copiar Rastreo</button>' : '') +
            generarBotonesAccion(e) +
            '<button class="boton-accion boton-primario" onclick="abrirModalEditar(' + e.id_envio + ')"><span class="boton-accion-icono">✏️</span> Editar</button>' +
            '<button class="boton-accion boton-secundario" onclick="eliminarRegistro(' + e.id_envio + ')"><span class="boton-accion-icono">🗑️</span> Eliminar</button>' +
        '</div>';

    panel.style.animation = 'none';
    panel.offsetHeight;
    panel.style.animation = '';
}

window.copiarRastreo = function(codigo) {
    var url = window.location.origin + '/Proyecto1/frontend/views/rastreo.html?guia=' + codigo;
    navigator.clipboard.writeText(url).then(function() {
        mostrarNotificacion('Enlace de rastreo copiado al portapapeles', 'exito');
    }).catch(function() {
        mostrarNotificacion('No se pudo copiar el enlace', 'error');
    });
};

window.abrirComprobante = function(id) {
    window.open('comprobante.html?id=' + id, '_blank');
};

// CAMBIAR ESTADO

function cambiarEstado(id, nuevoEstado) {
    fetch(API_ENVIOS + '?id=' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado })
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
        if (data.exito) {
            mostrarNotificacion('Estado actualizado a: ' + obtenerTextoEstado(nuevoEstado), 'exito');
            seleccionadoId = id;
            cargarRegistros();
        } else {
            mostrarNotificacion(data.mensaje, 'error');
        }
    });
}

// MODAL — CREAR / EDITAR

function abrirModalCrear() {
    mostrarModalEnvio('Nuevo Envío', null);
}

function abrirModalEditar(id) {
    var reg = registros.find(function (r) { return r.id_envio == id; });
    if (reg) mostrarModalEnvio('Editar Envío', reg);
}

function mostrarModalEnvio(titulo, datos) {
    var esEdicion = datos !== null;
    var contenedor = document.getElementById('contenedor-modal');
    var hoyStr = new Date().toISOString().split('T')[0];

    contenedor.innerHTML =
        '<div class="modal-overlay" onclick="cerrarModal(event)">' +
            '<div class="modal-contenido" onclick="event.stopPropagation()">' +
                '<div class="modal-cabecera">' +
                    '<h2 class="modal-titulo">' + titulo + '</h2>' +
                    '<button class="modal-cerrar" onclick="cerrarModal()">✕</button>' +
                '</div>' +
                '<div class="modal-cuerpo">' +
                    '<div class="formulario-fila">' +
                        '<div class="formulario-grupo">' +
                            '<label class="formulario-etiqueta">Revista *</label>' +
                            '<select class="formulario-select" id="form-revista" onchange="cargarEjemplaresSelect()">' +
                                '<option value="">Cargando...</option>' +
                            '</select>' +
                        '</div>' +
                        '<div class="formulario-grupo">' +
                            '<label class="formulario-etiqueta">Ejemplar (Edición) *</label>' +
                            '<select class="formulario-select" id="form-ejemplar">' +
                                '<option value="">Selecciona una revista primero</option>' +
                            '</select>' +
                        '</div>' +
                    '</div>' +
                    '<div class="formulario-fila">' +
                        '<div class="formulario-grupo">' +
                            '<label class="formulario-etiqueta">Persona (Destinatario) *</label>' +
                            '<select class="formulario-select" id="form-persona" onchange="autoRellenarDireccion()">' +
                                '<option value="">Cargando...</option>' +
                            '</select>' +
                        '</div>' +
                        '<div class="formulario-grupo">' +
                            '<label class="formulario-etiqueta">Agencia de Transporte *</label>' +
                            '<select class="formulario-select" id="form-agencia">' +
                                '<option value="">Cargando...</option>' +
                            '</select>' +
                        '</div>' +
                    '</div>' +
                    '<div class="formulario-fila">' +
                        '<div class="formulario-grupo">' +
                            '<label class="formulario-etiqueta">Fecha de Envío *</label>' +
                            '<input type="date" class="formulario-campo" id="form-fecha-envio" value="' + (esEdicion ? datos.fecha_envio : hoyStr) + '" min="' + hoyStr + '" onchange="actualizarMinEntrega()">' +
                        '</div>' +
                        '<div class="formulario-grupo">' +
                            '<label class="formulario-etiqueta">Entrega Estimada</label>' +
                            '<input type="date" class="formulario-campo" id="form-fecha-estimada" value="' + (esEdicion && datos.fecha_entrega_estimada ? datos.fecha_entrega_estimada : '') + '">' +
                        '</div>' +
                    '</div>' +
                    '<div class="formulario-grupo">' +
                        '<label class="formulario-etiqueta">Dirección de Envío *</label>' +
                        '<input type="text" class="formulario-campo" id="form-direccion" placeholder="Dirección completa" value="' + (esEdicion ? datos.direccion_envio : '') + '">' +
                    '</div>' +
                    '<div class="formulario-grupo">' +
                        '<label class="formulario-etiqueta">Observaciones</label>' +
                        '<textarea class="formulario-textarea" id="form-observaciones" placeholder="Notas adicionales...">' + (esEdicion && datos.observaciones ? datos.observaciones : '') + '</textarea>' +
                    '</div>' +
                '</div>' +
                '<div class="modal-acciones">' +
                    '<button class="boton-accion boton-secundario" onclick="cerrarModal()">Cancelar</button>' +
                    '<button class="boton-accion boton-primario" onclick="guardarRegistro(' + (esEdicion ? datos.id_envio : 'null') + ')">' +
                        '<span class="boton-accion-icono">💾</span> ' + (esEdicion ? 'Guardar Cambios' : 'Crear Envío') +
                    '</button>' +
                '</div>' +
            '</div>' +
        '</div>';

    // Cargar datos para los selects
    cargarDatosFormulario(datos);

    // Inicializar min de entrega estimada si hay fecha de envío
    setTimeout(actualizarMinEntrega, 50);
}

window.actualizarMinEntrega = function() {
    var fEnvio = document.getElementById('form-fecha-envio').value;
    var inputEntrega = document.getElementById('form-fecha-estimada');
    if (fEnvio && inputEntrega) {
        var minDate = new Date(fEnvio + 'T00:00:00');
        minDate.setDate(minDate.getDate() + 1);
        var minStr = minDate.toISOString().split('T')[0];
        inputEntrega.min = minStr;
        
        if (inputEntrega.value && inputEntrega.value <= fEnvio) {
            inputEntrega.value = ''; // Limpiar si es inválida
        }
    }
};

// Datos auxiliares para el formulario
var datosPersonas = [];

function cargarDatosFormulario(datosEdicion) {
    var esEdicion = datosEdicion !== null;

    // Cargar revistas
    fetch(API_REVISTAS)
        .then(function (r) { return r.json(); })
        .then(function (data) {
            var select = document.getElementById('form-revista');
            if (!select) return;
            var opciones = '<option value="">Seleccionar revista...</option>';
            data.datos.forEach(function (r) {
                if (r.activo == 1) {
                    var sel = (esEdicion && r.id_revista == datosEdicion.id_revista) ? ' selected' : '';
                    opciones += '<option value="' + r.id_revista + '"' + sel + '>' + r.titulo + '</option>';
                }
            });
            select.innerHTML = opciones;
            // Si es edición, cargar ejemplares de esa revista
            if (esEdicion) cargarEjemplaresSelect(datosEdicion.id_ejemplar);
        });

    // Cargar personas
    fetch(API_PERSONAS)
        .then(function (r) { return r.json(); })
        .then(function (data) {
            datosPersonas = data.datos;
            var select = document.getElementById('form-persona');
            if (!select) return;
            var opciones = '<option value="">Seleccionar persona...</option>';
            data.datos.forEach(function (p) {
                var sel = (esEdicion && p.id_persona == datosEdicion.id_persona) ? ' selected' : '';
                opciones += '<option value="' + p.id_persona + '"' + sel + '>' + p.nombre + ' ' + p.apellido + ' — ' + p.ciudad + '</option>';
            });
            select.innerHTML = opciones;
        });

    // Cargar agencias
    fetch(API_AGENCIAS)
        .then(function (r) { return r.json(); })
        .then(function (data) {
            var select = document.getElementById('form-agencia');
            if (!select) return;
            var opciones = '<option value="">Seleccionar agencia...</option>';
            data.datos.forEach(function (a) {
                if (a.activo == 1) {
                    var sel = (esEdicion && a.id_agencia == datosEdicion.id_agencia) ? ' selected' : '';
                    opciones += '<option value="' + a.id_agencia + '"' + sel + '>' + a.nombre + '</option>';
                }
            });
            select.innerHTML = opciones;
        });
}

function cargarEjemplaresSelect(seleccionarId) {
    var revistaId = document.getElementById('form-revista').value;
    var select = document.getElementById('form-ejemplar');
    if (!revistaId) {
        select.innerHTML = '<option value="">Selecciona una revista primero</option>';
        return;
    }

    select.innerHTML = '<option value="">Cargando...</option>';

    fetch(API_EJEMPLARES + '?revista=' + revistaId)
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (!data.exito || data.datos.length === 0) {
                select.innerHTML = '<option value="">No hay ejemplares disponibles</option>';
                return;
            }
            var opciones = '<option value="">Seleccionar edición...</option>';
            data.datos.forEach(function (e) {
                var sel = (seleccionarId && e.id_ejemplar == seleccionarId) ? ' selected' : '';
                opciones += '<option value="' + e.id_ejemplar + '"' + sel + '>Edición #' + e.numero_edicion + ' — ' + e.fecha_publicacion + ' ($' + parseFloat(e.precio).toFixed(2) + ')</option>';
            });
            select.innerHTML = opciones;
        });
}

function autoRellenarDireccion() {
    var personaId = document.getElementById('form-persona').value;
    if (!personaId) return;

    var persona = datosPersonas.find(function (p) { return p.id_persona == personaId; });
    if (persona) {
        var campo = document.getElementById('form-direccion');
        if (campo && campo.value === '') {
            campo.value = persona.direccion + ', ' + persona.ciudad + (persona.codigo_postal ? ', CP ' + persona.codigo_postal : '');
        }
    }
}

function cerrarModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('contenedor-modal').innerHTML = '';
}

// CRUD — GUARDAR / ELIMINAR

function guardarRegistro(id) {
    Validar.limpiarErrores();

    var ejemplar      = document.getElementById('form-ejemplar').value;
    var persona       = document.getElementById('form-persona').value;
    var agencia       = document.getElementById('form-agencia').value;
    var fechaEnvio    = document.getElementById('form-fecha-envio').value;
    var fechaEstimada = document.getElementById('form-fecha-estimada').value;
    var direccion     = document.getElementById('form-direccion').value.trim();
    var observaciones = document.getElementById('form-observaciones').value.trim();

    // Campos de selección obligatorios
    if (!ejemplar) { mostrarNotificacion('Debes seleccionar un ejemplar.', 'error'); return; }
    if (!persona)  { mostrarNotificacion('Debes seleccionar un destinatario.', 'error'); return; }
    if (!agencia)  { mostrarNotificacion('Debes seleccionar una agencia de transporte.', 'error'); return; }

    // Fecha de envío: obligatoria y no anterior a hoy
    var vFechaEnvio = Validar.fechaNoAnteriorAHoy(fechaEnvio, 'La fecha de envío');
    if (!vFechaEnvio.valido) {
        Validar.marcarError('form-fecha-envio', vFechaEnvio.mensaje);
        mostrarNotificacion(vFechaEnvio.mensaje, 'error');
        return;
    }

    // Fecha estimada: si se ingresa, debe ser posterior a la de envío
    if (fechaEstimada) {
        var vFechaEst = Validar.fechaEntregaPosterior(fechaEnvio, fechaEstimada);
        if (!vFechaEst.valido) {
            Validar.marcarError('form-fecha-estimada', vFechaEst.mensaje);
            mostrarNotificacion(vFechaEst.mensaje, 'error');
            return;
        }
    }

    // Dirección obligatoria
    if (!direccion) {
        Validar.marcarError('form-direccion', 'La dirección de envío es obligatoria.');
        mostrarNotificacion('La dirección de envío es obligatoria.', 'error');
        return;
    }

    var datos = {
        id_ejemplar:            parseInt(ejemplar),
        id_persona:             parseInt(persona),
        id_agencia:             parseInt(agencia),
        fecha_envio:            fechaEnvio,
        fecha_entrega_estimada: fechaEstimada || null,
        direccion_envio:        direccion,
        observaciones:          observaciones || null
    };

    var esEdicion = id !== null;
    var url    = esEdicion ? API_ENVIOS + '?id=' + id : API_ENVIOS;
    var metodo = esEdicion ? 'PUT' : 'POST';

    fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
        if (data.exito) {
            mostrarNotificacion(data.mensaje, 'exito');
            cerrarModal();
            if (esEdicion) seleccionadoId = id;
            else seleccionadoId = data.id || null;
            cargarRegistros();
        } else {
            mostrarNotificacion(data.mensaje, 'error');
        }
    })
    .catch(function () {
        mostrarNotificacion('Error de conexión con el servidor.', 'error');
    });
}

function eliminarRegistro(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar este envío?\nEsta acción no se puede deshacer.')) return;

    fetch(API_ENVIOS + '?id=' + id, { method: 'DELETE' })
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (data.exito) {
                mostrarNotificacion(data.mensaje, 'exito');
                seleccionadoId = null;
                document.getElementById('estado-vacio').style.display = 'flex';
                document.getElementById('contenido-detalle').style.display = 'none';
                cargarRegistros();
            } else {
                mostrarNotificacion(data.mensaje, 'error');
            }
        });
}

// INICIALIZACIÓN

document.addEventListener('DOMContentLoaded', function () {
    verificarSesion();
    cargarRegistros();

    document.getElementById('campo-busqueda').addEventListener('input', function () {
        textoBusqueda = this.value;
        paginaActual = 1; // Volver a página 1 al buscar
        renderizarLista();
    });

    var botonesFiltro = document.querySelectorAll('.filtro-estado');
    botonesFiltro.forEach(function (boton) {
        boton.addEventListener('click', function () {
            botonesFiltro.forEach(function (b) { b.classList.remove('activo'); });
            this.classList.add('activo');
            filtroActual = this.getAttribute('data-filtro');
            renderizarLista();
        });
    });

    document.getElementById('boton-nuevo-envio').addEventListener('click', abrirModalCrear);

    document.getElementById('boton-salir').addEventListener('click', function (e) {
        e.preventDefault();
        cerrarSesion();
    });
});
