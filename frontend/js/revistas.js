// Módulo CRUD: Revistas y Ejemplares

const BASE_PATH = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? '/Proyecto1' : '';
const API_REVISTAS   = BASE_PATH + '/backend/api/revistas.php';
const API_EJEMPLARES = BASE_PATH + '/backend/api/ejemplares.php';

let registros = [];
let seleccionadoId = null;
let textoBusqueda = '';

// Variables de Paginación
let paginaActual = 1;
const itemsPorPagina = 5;

// SEGURIDAD — Verificar sesión

function verificarSesion() {
    fetch(BASE_PATH + '/backend/api/auth.php?action=verificar')
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (!data.autenticado) window.location.href = 'login.html';
        })
        .catch(function () { window.location.href = 'login.html'; });
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
    fetch(BASE_PATH + '/backend/api/auth.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' })
    }).then(function () { window.location.href = 'login.html'; })
      .catch(function () { window.location.href = 'login.html'; });
}

// API — OBTENER DATOS

function cargarRegistros() {
    fetch(API_REVISTAS)
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (data.exito) {
                registros = data.datos;
                renderizarLista();
                if (seleccionadoId) {
                    var reg = registros.find(function (r) { return r.id_revista === seleccionadoId; });
                    if (reg) renderizarDetalle(reg);
                }
            }
        })
        .catch(function () {
            mostrarNotificacion('Error de conexión al cargar revistas.', 'error');
        });
}

// RENDERIZADO — LISTA

function renderizarLista() {
    var contenedor = document.getElementById('lista-registros');
    var contador = document.getElementById('contador-registros');
    var paginacionContenedor = document.getElementById('paginacion');

    var filtrados = registros;
    if (textoBusqueda.trim() !== '') {
        var t = textoBusqueda.toLowerCase();
        filtrados = filtrados.filter(function (r) {
            return r.titulo.toLowerCase().includes(t) ||
                   r.genero.toLowerCase().includes(t) ||
                   r.periodicidad.toLowerCase().includes(t);
        });
    }

    contador.textContent = filtrados.length === 1 ? '1 revista' : filtrados.length + ' revistas';

    if (filtrados.length === 0) {
        contenedor.innerHTML = '<div class="sin-resultados"><span class="sin-resultados-icono">🔍</span><p class="sin-resultados-titulo">Sin resultados</p></div>';
        if (paginacionContenedor) paginacionContenedor.style.display = 'none';
        return;
    }

    // Paginación
    var totalPaginas = Math.ceil(filtrados.length / itemsPorPagina);
    if (paginaActual > totalPaginas) paginaActual = totalPaginas || 1;
    
    var inicio = (paginaActual - 1) * itemsPorPagina;
    var fin = inicio + itemsPorPagina;
    var itemsPagina = filtrados.slice(inicio, fin);

    contenedor.innerHTML = itemsPagina.map(function (r) {
        var sel = r.id_revista === seleccionadoId ? 'seleccionada' : '';
        var estadoClase = r.activo == 1 ? 'estado-entregado' : 'estado-devuelto';
        var estadoTexto = r.activo == 1 ? '<span class="etiqueta-activo">Activa</span>' : '<span class="etiqueta-inactivo">Inactiva</span>';

        return '<div class="tarjeta-envio ' + estadoClase + ' ' + sel + '" onclick="seleccionar(' + r.id_revista + ')">' +
            '<div class="tarjeta-encabezado">' +
                '<span class="tarjeta-id">REV-' + String(r.id_revista).padStart(3, '0') + '</span>' +
                estadoTexto +
            '</div>' +
            '<div class="tarjeta-revista">' + r.titulo + '</div>' +
            '<div class="tarjeta-info">' +
                '<div class="tarjeta-detalle"><span class="tarjeta-detalle-icono">🏷️</span>' + r.genero + '</div>' +
                '<div class="tarjeta-detalle"><span class="tarjeta-detalle-icono">📅</span>' + r.periodicidad + '</div>' +
            '</div>' +
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
    var registro = registros.find(function (r) { return r.id_revista === id; });
    if (registro) {
        renderizarDetalle(registro);
        renderizarLista();
    }
}

function renderizarDetalle(r) {
    document.getElementById('estado-vacio').style.display = 'none';
    var panel = document.getElementById('contenido-detalle');
    panel.style.display = 'flex';

    var estadoBadge = r.activo == 1
        ? '<span class="detalle-estado entregado">● Activa</span>'
        : '<span class="detalle-estado devuelto">● Inactiva</span>';

    panel.innerHTML =
        '<div class="detalle-cabecera">' +
            '<div class="detalle-titulo-grupo">' +
                '<span class="detalle-id">REVISTA REV-' + String(r.id_revista).padStart(3, '0') + '</span>' +
                '<h1 class="detalle-titulo">' + r.titulo + '</h1>' +
            '</div>' +
            estadoBadge +
        '</div>' +
        '<div class="detalle-cuerpo">' +
            '<div class="seccion-detalle">' +
                '<h3 class="seccion-titulo"><span class="seccion-titulo-icono">📖</span> Información General</h3>' +
                '<div class="campo-detalle"><span class="campo-etiqueta">Título</span><span class="campo-valor">' + r.titulo + '</span></div>' +
                '<div class="campo-detalle"><span class="campo-etiqueta">Género</span><span class="campo-valor">' + r.genero + '</span></div>' +
                '<div class="campo-detalle"><span class="campo-etiqueta">Periodicidad</span><span class="campo-valor">' + r.periodicidad + '</span></div>' +
                '<div class="campo-detalle"><span class="campo-etiqueta">Fecha de Creación</span><span class="campo-valor">' + r.fecha_creacion + '</span></div>' +
            '</div>' +
            '<div class="seccion-detalle">' +
                '<h3 class="seccion-titulo"><span class="seccion-titulo-icono">📝</span> Descripción</h3>' +
                '<p class="campo-observaciones">' + (r.descripcion || 'Sin descripción registrada.') + '</p>' +
            '</div>' +
            '<div class="seccion-detalle ancho-completo" id="seccion-ejemplares">' +
                '<h3 class="seccion-titulo"><span class="seccion-titulo-icono">📚</span> Ejemplares</h3>' +
                '<p class="campo-observaciones">Cargando ejemplares...</p>' +
            '</div>' +
        '</div>' +
        '<div class="barra-acciones">' +
            '<button class="boton-accion boton-primario" onclick="abrirModalEditar(' + r.id_revista + ')"><span class="boton-accion-icono">✏️</span> Editar</button>' +
            (r.activo == 1
                ? '<button class="boton-accion boton-peligro" onclick="eliminarRegistro(' + r.id_revista + ')"><span class="boton-accion-icono">🗑️</span> Desactivar</button>'
                : '<button class="boton-accion boton-exito" onclick="reactivar(' + r.id_revista + ')"><span class="boton-accion-icono">✅</span> Reactivar</button>') +
        '</div>';

    panel.style.animation = 'none';
    panel.offsetHeight;
    panel.style.animation = '';

    cargarEjemplares(r.id_revista);
}

function cargarEjemplares(idRevista) {
    fetch(API_EJEMPLARES + '?revista=' + idRevista)
        .then(function (r) { return r.json(); })
        .then(function (data) {
            var seccion = document.getElementById('seccion-ejemplares');
            if (!seccion) return;

            var botonNuevo = '<button class="boton-accion boton-primario" onclick="abrirModalEjemplar(null, ' + idRevista + ')" style="margin-top: 12px; font-size: 0.8rem; padding: 8px 14px;"><span class="boton-accion-icono">＋</span> Nuevo Ejemplar</button>';

            if (!data.exito || data.datos.length === 0) {
                seccion.innerHTML = '<h3 class="seccion-titulo"><span class="seccion-titulo-icono">📚</span> Ejemplares</h3><p class="campo-observaciones">No hay ejemplares registrados.</p>' + botonNuevo;
                return;
            }

            var filas = data.datos.map(function (e) {
                return '<tr>' +
                    '<td>#' + e.numero_edicion + '</td>' +
                    '<td>' + e.fecha_publicacion + '</td>' +
                    '<td>' + e.stock + '</td>' +
                    '<td>$' + parseFloat(e.precio).toFixed(2) + '</td>' +
                    '<td>' +
                        '<button onclick="abrirModalEjemplar(' + e.id_ejemplar + ', ' + idRevista + ')" style="background:none;border:none;cursor:pointer;font-size:0.85rem;" title="Editar">✏️</button>' +
                        '<button onclick="eliminarEjemplar(' + e.id_ejemplar + ', ' + idRevista + ')" style="background:none;border:none;cursor:pointer;font-size:0.85rem;margin-left:6px;" title="Eliminar">🗑️</button>' +
                    '</td>' +
                '</tr>';
            }).join('');

            seccion.innerHTML =
                '<h3 class="seccion-titulo"><span class="seccion-titulo-icono">📚</span> Ejemplares (' + data.datos.length + ')</h3>' +
                '<table class="tabla-detalle"><thead><tr><th>Edición</th><th>Publicación</th><th>Stock</th><th>Precio</th><th>Acciones</th></tr></thead><tbody>' + filas + '</tbody></table>' +
                botonNuevo;
        });
}

// MODAL — CREAR / EDITAR REVISTA

function abrirModalCrear() {
    mostrarModal('Nueva Revista', null);
}

function abrirModalEditar(id) {
    var registro = registros.find(function (r) { return r.id_revista === id; });
    if (registro) mostrarModal('Editar Revista', registro);
}

function mostrarModal(titulo, datos) {
    var esEdicion = datos !== null;
    var contenedor = document.getElementById('contenedor-modal');

    contenedor.innerHTML =
        '<div class="modal-overlay" onclick="cerrarModal(event)">' +
            '<div class="modal-contenido" onclick="event.stopPropagation()">' +
                '<div class="modal-cabecera">' +
                    '<h2 class="modal-titulo">' + titulo + '</h2>' +
                    '<button class="modal-cerrar" onclick="cerrarModal()">✕</button>' +
                '</div>' +
                '<div class="modal-cuerpo">' +
                    '<div class="formulario-grupo">' +
                        '<label class="formulario-etiqueta">Título *</label>' +
                        '<input type="text" class="formulario-campo" id="form-titulo" placeholder="Nombre de la revista" value="' + (esEdicion ? datos.titulo : '') + '">' +
                    '</div>' +
                    '<div class="formulario-fila">' +
                        '<div class="formulario-grupo">' +
                            '<label class="formulario-etiqueta">Género *</label>' +
                            '<input type="text" class="formulario-campo" id="form-genero" placeholder="Ej: Ciencia, Negocios" value="' + (esEdicion ? datos.genero : '') + '">' +
                        '</div>' +
                        '<div class="formulario-grupo">' +
                            '<label class="formulario-etiqueta">Periodicidad *</label>' +
                            '<select class="formulario-select" id="form-periodicidad">' +
                                '<option value="">Seleccionar...</option>' +
                                '<option value="Semanal"' + (esEdicion && datos.periodicidad === 'Semanal' ? ' selected' : '') + '>Semanal</option>' +
                                '<option value="Quincenal"' + (esEdicion && datos.periodicidad === 'Quincenal' ? ' selected' : '') + '>Quincenal</option>' +
                                '<option value="Mensual"' + (esEdicion && datos.periodicidad === 'Mensual' ? ' selected' : '') + '>Mensual</option>' +
                                '<option value="Bimestral"' + (esEdicion && datos.periodicidad === 'Bimestral' ? ' selected' : '') + '>Bimestral</option>' +
                            '</select>' +
                        '</div>' +
                    '</div>' +
                    '<div class="formulario-grupo">' +
                        '<label class="formulario-etiqueta">Fecha de Creación *</label>' +
                        '<input type="date" class="formulario-campo" id="form-fecha" value="' + (esEdicion ? datos.fecha_creacion : '') + '">' +
                    '</div>' +
                    '<div class="formulario-grupo">' +
                        '<label class="formulario-etiqueta">Descripción</label>' +
                        '<textarea class="formulario-textarea" id="form-descripcion" placeholder="Descripción breve de la revista...">' + (esEdicion && datos.descripcion ? datos.descripcion : '') + '</textarea>' +
                    '</div>' +
                '</div>' +
                '<div class="modal-acciones">' +
                    '<button class="boton-accion boton-secundario" onclick="cerrarModal()">Cancelar</button>' +
                    '<button class="boton-accion boton-primario" onclick="guardarRegistro(' + (esEdicion ? datos.id_revista : 'null') + ')">' +
                        '<span class="boton-accion-icono">💾</span> ' + (esEdicion ? 'Guardar Cambios' : 'Crear Revista') +
                    '</button>' +
                '</div>' +
            '</div>' +
        '</div>';
}

function cerrarModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('contenedor-modal').innerHTML = '';
}

// MODAL — CREAR / EDITAR EJEMPLAR

function abrirModalEjemplar(idEjemplar, idRevista) {
    if (idEjemplar) {
        // Editar — cargar datos del ejemplar
        fetch(API_EJEMPLARES + '?id=' + idEjemplar)
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.exito) mostrarModalEjemplar('Editar Ejemplar', data.datos, idRevista);
            });
    } else {
        mostrarModalEjemplar('Nuevo Ejemplar', null, idRevista);
    }
}

function mostrarModalEjemplar(titulo, datos, idRevista) {
    var esEdicion = datos !== null;
    var contenedor = document.getElementById('contenedor-modal');

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
                            '<label class="formulario-etiqueta">Número de Edición *</label>' +
                            '<input type="number" class="formulario-campo" id="form-ej-edicion" placeholder="Ej: 245" min="1" value="' + (esEdicion ? datos.numero_edicion : '') + '">' +
                        '</div>' +
                        '<div class="formulario-grupo">' +
                            '<label class="formulario-etiqueta">Fecha de Publicación *</label>' +
                            '<input type="date" class="formulario-campo" id="form-ej-fecha" value="' + (esEdicion ? datos.fecha_publicacion : '') + '">' +
                        '</div>' +
                    '</div>' +
                    '<div class="formulario-fila">' +
                        '<div class="formulario-grupo">' +
                            '<label class="formulario-etiqueta">Stock</label>' +
                            '<input type="number" class="formulario-campo" id="form-ej-stock" placeholder="0" min="0" value="' + (esEdicion ? datos.stock : '0') + '">' +
                        '</div>' +
                        '<div class="formulario-grupo">' +
                            '<label class="formulario-etiqueta">Precio *</label>' +
                            '<input type="number" class="formulario-campo" id="form-ej-precio" placeholder="0.00" min="0.01" step="0.01" value="' + (esEdicion ? datos.precio : '') + '">' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="modal-acciones">' +
                    '<button class="boton-accion boton-secundario" onclick="cerrarModal()">Cancelar</button>' +
                    '<button class="boton-accion boton-primario" onclick="guardarEjemplar(' + (esEdicion ? datos.id_ejemplar : 'null') + ', ' + idRevista + ')">' +
                        '<span class="boton-accion-icono">💾</span> ' + (esEdicion ? 'Guardar Cambios' : 'Crear Ejemplar') +
                    '</button>' +
                '</div>' +
            '</div>' +
        '</div>';
}

// CRUD — REVISTAS

function guardarRegistro(id) {
    Validar.limpiarErrores();

    var titulo       = document.getElementById('form-titulo').value.trim();
    var genero       = document.getElementById('form-genero').value.trim();
    var periodicidad = document.getElementById('form-periodicidad').value;
    var fecha        = document.getElementById('form-fecha').value;
    var descripcion  = document.getElementById('form-descripcion').value.trim();

    if (!titulo || titulo.length < 2) {
        Validar.marcarError('form-titulo', 'El título es obligatorio y debe tener al menos 2 caracteres.');
        mostrarNotificacion('El título es obligatorio y debe tener al menos 2 caracteres.', 'error');
        return;
    }
    if (!genero || genero.length < 2) {
        Validar.marcarError('form-genero', 'El género es obligatorio.');
        mostrarNotificacion('El género es obligatorio.', 'error');
        return;
    }
    if (!periodicidad) {
        mostrarNotificacion('Debes seleccionar la periodicidad.', 'error');
        return;
    }
    if (!fecha) {
        Validar.marcarError('form-fecha', 'La fecha de creación es obligatoria.');
        mostrarNotificacion('La fecha de creación es obligatoria.', 'error');
        return;
    }

    var datos = { titulo: titulo, genero: genero, periodicidad: periodicidad, fecha_creacion: fecha, descripcion: descripcion };
    var esEdicion = id !== null;
    var url = esEdicion ? API_REVISTAS + '?id=' + id : API_REVISTAS;

    fetch(url, {
        method: esEdicion ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
        if (data.exito) {
            mostrarNotificacion(data.mensaje, 'exito');
            cerrarModal();
            if (esEdicion) seleccionadoId = id;
            cargarRegistros();
        } else {
            mostrarNotificacion(data.mensaje, 'error');
        }
    })
    .catch(function () { mostrarNotificacion('Error de conexión con el servidor.', 'error'); });
}

function eliminarRegistro(id) {
    if (!confirm('¿Estás seguro de que deseas desactivar esta revista?')) return;
    fetch(API_REVISTAS + '?id=' + id, { method: 'DELETE' })
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (data.exito) { mostrarNotificacion(data.mensaje, 'exito'); seleccionadoId = id; cargarRegistros(); }
            else { mostrarNotificacion(data.mensaje, 'error'); }
        });
}

function reactivar(id) {
    fetch(API_REVISTAS + '?id=' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: 1 })
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
        if (data.exito) { mostrarNotificacion('Revista reactivada exitosamente.', 'exito'); seleccionadoId = id; cargarRegistros(); }
    });
}

// CRUD — EJEMPLARES

function guardarEjemplar(idEjemplar, idRevista) {
    Validar.limpiarErrores();

    var edicion = document.getElementById('form-ej-edicion').value;
    var fecha   = document.getElementById('form-ej-fecha').value;
    var stock   = document.getElementById('form-ej-stock').value;
    var precio  = document.getElementById('form-ej-precio').value;

    // Número de edición: entero positivo
    var vEdicion = Validar.numeroPositivo(edicion, 'El número de edición', false);
    if (!vEdicion.valido) {
        Validar.marcarError('form-ej-edicion', vEdicion.mensaje);
        mostrarNotificacion(vEdicion.mensaje, 'error');
        return;
    }

    // Fecha obligatoria
    if (!fecha) {
        Validar.marcarError('form-ej-fecha', 'La fecha de publicación es obligatoria.');
        mostrarNotificacion('La fecha de publicación es obligatoria.', 'error');
        return;
    }

    // Stock: entero no negativo
    var stockNum = parseInt(stock) || 0;
    if (stockNum < 0) {
        Validar.marcarError('form-ej-stock', 'El stock no puede ser negativo.');
        mostrarNotificacion('El stock no puede ser negativo.', 'error');
        return;
    }

    // Precio: número positivo con decimales
    var vPrecio = Validar.numeroPositivo(precio, 'El precio', true);
    if (!vPrecio.valido) {
        Validar.marcarError('form-ej-precio', vPrecio.mensaje);
        mostrarNotificacion(vPrecio.mensaje, 'error');
        return;
    }

    var datos = {
        id_revista:       idRevista,
        numero_edicion:   parseInt(edicion),
        fecha_publicacion: fecha,
        stock:            stockNum,
        precio:           parseFloat(precio)
    };

    var esEdicion = idEjemplar !== null;
    var url = esEdicion ? API_EJEMPLARES + '?id=' + idEjemplar : API_EJEMPLARES;

    fetch(url, {
        method: esEdicion ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
        if (data.exito) {
            mostrarNotificacion(data.mensaje, 'exito');
            cerrarModal();
            cargarEjemplares(idRevista);
        } else {
            mostrarNotificacion(data.mensaje, 'error');
        }
    })
    .catch(function () { mostrarNotificacion('Error de conexión.', 'error'); });
}

function eliminarEjemplar(idEjemplar, idRevista) {
    if (!confirm('¿Eliminar este ejemplar? Esta acción no se puede deshacer.')) return;

    fetch(API_EJEMPLARES + '?id=' + idEjemplar, { method: 'DELETE' })
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (data.exito) {
                mostrarNotificacion(data.mensaje, 'exito');
                cargarEjemplares(idRevista);
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
        paginaActual = 1;
        renderizarLista();
    });

    document.getElementById('boton-nuevo').addEventListener('click', abrirModalCrear);

    document.getElementById('boton-salir').addEventListener('click', function (e) {
        e.preventDefault();
        cerrarSesion();
    });
});
