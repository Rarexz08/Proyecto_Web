// Módulo CRUD: Agencias de Transporte

const API_AGENCIAS = '/Proyecto1/backend/api/agencias.php';

let registros = [];

// SEGURIDAD — Verificar sesión

function verificarSesion() {
    fetch('/Proyecto1/backend/api/auth.php?action=verificar')
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (!data.autenticado) window.location.href = 'login.html';
        })
        .catch(function () { window.location.href = 'login.html'; });
}
let seleccionadoId = null;
let textoBusqueda = '';

// Variables de Paginación
let paginaActual = 1;
const itemsPorPagina = 5;

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

// API — OBTENER DATOS

function cargarRegistros() {
    fetch(API_AGENCIAS)
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (data.exito) {
                registros = data.datos;
                renderizarLista();
                if (seleccionadoId) {
                    var reg = registros.find(function (r) { return r.id_agencia === seleccionadoId; });
                    if (reg) renderizarDetalle(reg);
                }
            }
        })
        .catch(function () {
            mostrarNotificacion('Error de conexión al cargar agencias.', 'error');
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
            return r.nombre.toLowerCase().includes(t) ||
                   (r.telefono && r.telefono.includes(t)) ||
                   (r.email && r.email.toLowerCase().includes(t));
        });
    }

    contador.textContent = filtrados.length === 1 ? '1 agencia' : filtrados.length + ' agencias';

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
        var sel = r.id_agencia === seleccionadoId ? 'seleccionada' : '';
        var estadoClase = r.activo == 1 ? 'estado-entregado' : 'estado-devuelto';
        var estadoTexto = r.activo == 1 ? '<span class="etiqueta-activo">Activa</span>' : '<span class="etiqueta-inactivo">Inactiva</span>';

        return '<div class="tarjeta-envio ' + estadoClase + ' ' + sel + '" onclick="seleccionar(' + r.id_agencia + ')">' +
            '<div class="tarjeta-encabezado">' +
                '<span class="tarjeta-id">AGE-' + String(r.id_agencia).padStart(3, '0') + '</span>' +
                estadoTexto +
            '</div>' +
            '<div class="tarjeta-revista">' + r.nombre + '</div>' +
            '<div class="tarjeta-info">' +
                (r.telefono ? '<div class="tarjeta-detalle"><span class="tarjeta-detalle-icono">📞</span>' + r.telefono + '</div>' : '') +
                (r.email ? '<div class="tarjeta-detalle"><span class="tarjeta-detalle-icono">✉️</span>' + r.email + '</div>' : '') +
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
    var registro = registros.find(function (r) { return r.id_agencia === id; });
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
                '<span class="detalle-id">AGENCIA AGE-' + String(r.id_agencia).padStart(3, '0') + '</span>' +
                '<h1 class="detalle-titulo">' + r.nombre + '</h1>' +
            '</div>' +
            estadoBadge +
        '</div>' +
        '<div class="detalle-cuerpo">' +
            '<div class="seccion-detalle">' +
                '<h3 class="seccion-titulo"><span class="seccion-titulo-icono">🚚</span> Datos de la Agencia</h3>' +
                '<div class="campo-detalle"><span class="campo-etiqueta">Nombre</span><span class="campo-valor">' + r.nombre + '</span></div>' +
                '<div class="campo-detalle"><span class="campo-etiqueta">Teléfono</span><span class="campo-valor">' + (r.telefono || '—') + '</span></div>' +
                '<div class="campo-detalle"><span class="campo-etiqueta">Correo Electrónico</span><span class="campo-valor">' + (r.email || '—') + '</span></div>' +
            '</div>' +
            '<div class="seccion-detalle">' +
                '<h3 class="seccion-titulo"><span class="seccion-titulo-icono">📍</span> Ubicación y Web</h3>' +
                '<div class="campo-detalle"><span class="campo-etiqueta">Dirección</span><span class="campo-valor">' + (r.direccion || '—') + '</span></div>' +
                '<div class="campo-detalle"><span class="campo-etiqueta">Sitio Web</span><span class="campo-valor">' +
                    (r.sitio_web ? '<a href="' + r.sitio_web + '" target="_blank" style="color: var(--color-primario-hover); text-decoration: none;">' + r.sitio_web + '</a>' : '—') +
                '</span></div>' +
            '</div>' +
        '</div>' +
        '<div class="barra-acciones">' +
            '<button class="boton-accion boton-primario" onclick="abrirModalEditar(' + r.id_agencia + ')"><span class="boton-accion-icono">✏️</span> Editar</button>' +
            (r.activo == 1
                ? '<button class="boton-accion boton-peligro" onclick="eliminarRegistro(' + r.id_agencia + ')"><span class="boton-accion-icono">🗑️</span> Desactivar</button>'
                : '<button class="boton-accion boton-exito" onclick="reactivar(' + r.id_agencia + ')"><span class="boton-accion-icono">✅</span> Reactivar</button>') +
        '</div>';

    panel.style.animation = 'none';
    panel.offsetHeight;
    panel.style.animation = '';
}

// MODAL — CREAR / EDITAR

function abrirModalCrear() {
    mostrarModal('Nueva Agencia', null);
}

function abrirModalEditar(id) {
    var registro = registros.find(function (r) { return r.id_agencia === id; });
    if (registro) mostrarModal('Editar Agencia', registro);
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
                        '<label class="formulario-etiqueta">Nombre de la Agencia *</label>' +
                        '<input type="text" class="formulario-campo" id="form-nombre" placeholder="Nombre de la empresa" value="' + (esEdicion ? datos.nombre : '') + '">' +
                    '</div>' +
                    '<div class="formulario-fila">' +
                        '<div class="formulario-grupo">' +
                            '<label class="formulario-etiqueta">Teléfono</label>' +
                            '<input type="text" class="formulario-campo" id="form-telefono" placeholder="+52 800 000 0000" value="' + (esEdicion && datos.telefono ? datos.telefono : '') + '">' +
                        '</div>' +
                        '<div class="formulario-grupo">' +
                            '<label class="formulario-etiqueta">Correo Electrónico</label>' +
                            '<input type="email" class="formulario-campo" id="form-email" placeholder="contacto@empresa.com" value="' + (esEdicion && datos.email ? datos.email : '') + '">' +
                        '</div>' +
                    '</div>' +
                    '<div class="formulario-grupo">' +
                        '<label class="formulario-etiqueta">Dirección</label>' +
                        '<input type="text" class="formulario-campo" id="form-direccion" placeholder="Dirección de la agencia" value="' + (esEdicion && datos.direccion ? datos.direccion : '') + '">' +
                    '</div>' +
                    '<div class="formulario-grupo">' +
                        '<label class="formulario-etiqueta">Sitio Web</label>' +
                        '<input type="url" class="formulario-campo" id="form-web" placeholder="https://www.ejemplo.com" value="' + (esEdicion && datos.sitio_web ? datos.sitio_web : '') + '">' +
                    '</div>' +
                '</div>' +
                '<div class="modal-acciones">' +
                    '<button class="boton-accion boton-secundario" onclick="cerrarModal()">Cancelar</button>' +
                    '<button class="boton-accion boton-primario" onclick="guardarRegistro(' + (esEdicion ? datos.id_agencia : 'null') + ')">' +
                        '<span class="boton-accion-icono">💾</span> ' + (esEdicion ? 'Guardar Cambios' : 'Crear Agencia') +
                    '</button>' +
                '</div>' +
            '</div>' +
        '</div>';
}

function cerrarModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('contenedor-modal').innerHTML = '';
}

// CRUD — GUARDAR / ELIMINAR

function guardarRegistro(id) {
    Validar.limpiarErrores();

    var nombre   = document.getElementById('form-nombre').value.trim();
    var telefono = document.getElementById('form-telefono').value.trim();
    var email    = document.getElementById('form-email').value.trim();
    var direccion = document.getElementById('form-direccion').value.trim();
    var web      = document.getElementById('form-web').value.trim();

    // Nombre: obligatorio, mínimo 2 caracteres
    if (!nombre || nombre.length < 2) {
        Validar.marcarError('form-nombre', 'El nombre de la agencia es obligatorio (mín. 2 caracteres).');
        mostrarNotificacion('El nombre de la agencia es obligatorio (mín. 2 caracteres).', 'error');
        return;
    }

    // Teléfono: opcional, pero si se ingresa debe ser válido
    if (telefono) {
        var vTel = Validar.telefonoEcuatoriano(telefono);
        if (!vTel.valido) {
            Validar.marcarError('form-telefono', vTel.mensaje);
            mostrarNotificacion(vTel.mensaje, 'error');
            return;
        }
    }

    // Email: opcional, pero si se ingresa debe ser válido
    if (email) {
        var vEmail = Validar.email(email);
        if (!vEmail.valido) {
            Validar.marcarError('form-email', vEmail.mensaje);
            mostrarNotificacion(vEmail.mensaje, 'error');
            return;
        }
    }

    // Sitio web: si se ingresa, debe tener formato básico de URL
    if (web && !/^(https?:\/\/)?[\w\-]+(\.[\w\-]+)+/.test(web)) {
        Validar.marcarError('form-web', 'El sitio web no tiene un formato de URL válido (ej: www.empresa.com).');
        mostrarNotificacion('El sitio web no tiene un formato de URL válido.', 'error');
        return;
    }

    var datos = {
        nombre:    nombre,
        telefono:  telefono || null,
        email:     email || null,
        direccion: direccion || null,
        sitio_web: web || null
    };

    var esEdicion = id !== null;
    var url    = esEdicion ? API_AGENCIAS + '?id=' + id : API_AGENCIAS;
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
    if (!confirm('¿Estás seguro de que deseas desactivar esta agencia?')) return;

    fetch(API_AGENCIAS + '?id=' + id, { method: 'DELETE' })
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (data.exito) {
                mostrarNotificacion(data.mensaje, 'exito');
                seleccionadoId = id;
                cargarRegistros();
            } else {
                mostrarNotificacion(data.mensaje, 'error');
            }
        });
}

function reactivar(id) {
    fetch(API_AGENCIAS + '?id=' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: 1 })
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
        if (data.exito) {
            mostrarNotificacion('Agencia reactivada exitosamente.', 'exito');
            seleccionadoId = id;
            cargarRegistros();
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
