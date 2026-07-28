// Módulo CRUD: Personas

const API_PERSONAS = '/Proyecto1/backend/api/personas.php';

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
    fetch(API_PERSONAS)
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (data.exito) {
                registros = data.datos;
                renderizarLista();
                // Re-renderizar detalle si hay uno seleccionado
                if (seleccionadoId) {
                    var reg = registros.find(function (r) { return r.id_persona === seleccionadoId; });
                    if (reg) renderizarDetalle(reg);
                }
            }
        })
        .catch(function () {
            mostrarNotificacion('Error de conexión al cargar personas.', 'error');
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
                   r.apellido.toLowerCase().includes(t) ||
                   r.email.toLowerCase().includes(t) ||
                   r.ciudad.toLowerCase().includes(t);
        });
    }

    contador.textContent = filtrados.length === 1 ? '1 persona' : filtrados.length + ' personas';

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
        var sel = r.id_persona === seleccionadoId ? 'seleccionada' : '';
        var iniciales = (r.nombre.charAt(0) + r.apellido.charAt(0)).toUpperCase();

        return '<div class="tarjeta-envio ' + sel + '" onclick="seleccionar(' + r.id_persona + ')">' +
            '<div class="tarjeta-encabezado">' +
                '<span class="tarjeta-id">PER-' + String(r.id_persona).padStart(3, '0') + '</span>' +
                '<span class="etiqueta-activo">' + r.ciudad + '</span>' +
            '</div>' +
            '<div class="tarjeta-revista">' + r.nombre + ' ' + r.apellido + '</div>' +
            '<div class="tarjeta-info">' +
                '<div class="tarjeta-detalle"><span class="tarjeta-detalle-icono">✉️</span>' + r.email + '</div>' +
                (r.telefono ? '<div class="tarjeta-detalle"><span class="tarjeta-detalle-icono">📞</span>' + r.telefono + '</div>' : '') +
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
    var registro = registros.find(function (r) { return r.id_persona === id; });
    if (registro) {
        renderizarDetalle(registro);
        renderizarLista();
    }
}

function renderizarDetalle(r) {
    document.getElementById('estado-vacio').style.display = 'none';
    var panel = document.getElementById('contenido-detalle');
    panel.style.display = 'flex';

    panel.innerHTML =
        '<div class="detalle-cabecera">' +
            '<div class="detalle-titulo-grupo">' +
                '<span class="detalle-id">PERSONA PER-' + String(r.id_persona).padStart(3, '0') + '</span>' +
                '<h1 class="detalle-titulo">' + r.nombre + ' ' + r.apellido + '</h1>' +
            '</div>' +
            '<span class="detalle-estado entregado">● ' + r.ciudad + '</span>' +
        '</div>' +
        '<div class="detalle-cuerpo">' +
            '<div class="seccion-detalle">' +
                '<h3 class="seccion-titulo"><span class="seccion-titulo-icono">👤</span> Datos Personales</h3>' +
                '<div class="campo-detalle"><span class="campo-etiqueta">Nombre</span><span class="campo-valor">' + r.nombre + '</span></div>' +
                '<div class="campo-detalle"><span class="campo-etiqueta">Apellido</span><span class="campo-valor">' + r.apellido + '</span></div>' +
                '<div class="campo-detalle"><span class="campo-etiqueta">Correo Electrónico</span><span class="campo-valor">' + r.email + '</span></div>' +
                '<div class="campo-detalle"><span class="campo-etiqueta">Teléfono</span><span class="campo-valor">' + (r.telefono || '—') + '</span></div>' +
            '</div>' +
            '<div class="seccion-detalle">' +
                '<h3 class="seccion-titulo"><span class="seccion-titulo-icono">📍</span> Dirección</h3>' +
                '<div class="campo-detalle"><span class="campo-etiqueta">Dirección</span><span class="campo-valor">' + r.direccion + '</span></div>' +
                '<div class="campo-detalle"><span class="campo-etiqueta">Ciudad</span><span class="campo-valor">' + r.ciudad + '</span></div>' +
                '<div class="campo-detalle"><span class="campo-etiqueta">Código Postal</span><span class="campo-valor">' + (r.codigo_postal || '—') + '</span></div>' +
            '</div>' +
        '</div>' +
        '<div class="barra-acciones">' +
            '<button class="boton-accion boton-primario" onclick="abrirModalEditar(' + r.id_persona + ')"><span class="boton-accion-icono">✏️</span> Editar</button>' +
            '<button class="boton-accion boton-peligro" onclick="eliminarRegistro(' + r.id_persona + ')"><span class="boton-accion-icono">🗑️</span> Eliminar</button>' +
        '</div>';

    panel.style.animation = 'none';
    panel.offsetHeight;
    panel.style.animation = '';
}

// MODAL — CREAR / EDITAR

function abrirModalCrear() {
    mostrarModal('Nueva Persona', null);
}

function abrirModalEditar(id) {
    var registro = registros.find(function (r) { return r.id_persona === id; });
    if (registro) mostrarModal('Editar Persona', registro);
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
                    '<div class="formulario-fila">' +
                        '<div class="formulario-grupo">' +
                            '<label class="formulario-etiqueta">Nombre *</label>' +
                            '<input type="text" class="formulario-campo" id="form-nombre" placeholder="Nombre" value="' + (esEdicion ? datos.nombre : '') + '">' +
                        '</div>' +
                        '<div class="formulario-grupo">' +
                            '<label class="formulario-etiqueta">Apellido *</label>' +
                            '<input type="text" class="formulario-campo" id="form-apellido" placeholder="Apellido" value="' + (esEdicion ? datos.apellido : '') + '">' +
                        '</div>' +
                    '</div>' +
                    '<div class="formulario-grupo">' +
                        '<label class="formulario-etiqueta">Correo Electrónico *</label>' +
                        '<input type="email" class="formulario-campo" id="form-email" placeholder="correo@ejemplo.com" value="' + (esEdicion ? datos.email : '') + '">' +
                    '</div>' +
                    '<div class="formulario-grupo">' +
                        '<label class="formulario-etiqueta">Teléfono</label>' +
                        '<input type="text" class="formulario-campo" id="form-telefono" placeholder="+52 555 123 4567" value="' + (esEdicion && datos.telefono ? datos.telefono : '') + '">' +
                    '</div>' +
                    '<div class="formulario-grupo">' +
                        '<label class="formulario-etiqueta">Dirección *</label>' +
                        '<input type="text" class="formulario-campo" id="form-direccion" placeholder="Calle, número, colonia" value="' + (esEdicion ? datos.direccion : '') + '">' +
                    '</div>' +
                    '<div class="formulario-fila">' +
                        '<div class="formulario-grupo">' +
                            '<label class="formulario-etiqueta">Ciudad *</label>' +
                            '<input type="text" class="formulario-campo" id="form-ciudad" placeholder="Ciudad" value="' + (esEdicion ? datos.ciudad : '') + '">' +
                        '</div>' +
                        '<div class="formulario-grupo">' +
                            '<label class="formulario-etiqueta" for="form-cp">Código Postal *</label>' +
                            '<input type="text" class="formulario-campo" id="form-cp" placeholder="Ej: 170501" value="' + (esEdicion && datos.codigo_postal ? datos.codigo_postal : '') + '">' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="modal-acciones">' +
                    '<button class="boton-accion boton-secundario" onclick="cerrarModal()">Cancelar</button>' +
                    '<button class="boton-accion boton-primario" onclick="guardarRegistro(' + (esEdicion ? datos.id_persona : 'null') + ')">' +
                        '<span class="boton-accion-icono">💾</span> ' + (esEdicion ? 'Guardar Cambios' : 'Crear Persona') +
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

    var nombre    = document.getElementById('form-nombre').value.trim();
    var apellido  = document.getElementById('form-apellido').value.trim();
    var email     = document.getElementById('form-email').value.trim();
    var telefono  = document.getElementById('form-telefono').value.trim();
    var direccion = document.getElementById('form-direccion').value.trim();
    var ciudad    = document.getElementById('form-ciudad').value.trim();
    var cp        = document.getElementById('form-cp').value.trim();

    // 1. Nombre
    var vNombre = Validar.soloLetras(nombre, 'El nombre');
    if (!vNombre.valido) { Validar.marcarError('form-nombre', vNombre.mensaje); mostrarNotificacion(vNombre.mensaje, 'error'); return; }

    // 2. Apellido
    var vApellido = Validar.soloLetras(apellido, 'El apellido');
    if (!vApellido.valido) { Validar.marcarError('form-apellido', vApellido.mensaje); mostrarNotificacion(vApellido.mensaje, 'error'); return; }

    // 3. Email
    var vEmail = Validar.email(email);
    if (!vEmail.valido) { Validar.marcarError('form-email', vEmail.mensaje); mostrarNotificacion(vEmail.mensaje, 'error'); return; }

    // 4. Teléfono (opcional pero si se ingresa debe ser válido)
    if (telefono) {
        var vTel = Validar.telefonoEcuatoriano(telefono);
        if (!vTel.valido) { Validar.marcarError('form-telefono', vTel.mensaje); mostrarNotificacion(vTel.mensaje, 'error'); return; }
    }

    // 5. Dirección obligatoria
    if (!direccion) { Validar.marcarError('form-direccion', 'La dirección es obligatoria.'); mostrarNotificacion('La dirección es obligatoria.', 'error'); return; }

    // 6. Ciudad
    var vCiudad = Validar.soloLetras(ciudad, 'La ciudad');
    if (!vCiudad.valido) { Validar.marcarError('form-ciudad', vCiudad.mensaje); mostrarNotificacion(vCiudad.mensaje, 'error'); return; }

    // 7. Código postal (obligatorio)
    if (!cp) { Validar.marcarError('form-cp', 'El código postal es obligatorio.'); mostrarNotificacion('El código postal es obligatorio.', 'error'); return; }
    var vCP = Validar.codigoPostalEcuador(cp);
    if (!vCP.valido) { Validar.marcarError('form-cp', vCP.mensaje); mostrarNotificacion(vCP.mensaje, 'error'); return; }

    var datos = {
        nombre: nombre,
        apellido: apellido,
        email: email,
        telefono: telefono || null,
        direccion: direccion,
        ciudad: ciudad,
        codigo_postal: cp || null
    };

    var esEdicion = id !== null;
    var url    = esEdicion ? API_PERSONAS + '?id=' + id : API_PERSONAS;
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
    if (!confirm('¿Estás seguro de que deseas eliminar esta persona?\nEsta acción no se puede deshacer.')) return;

    fetch(API_PERSONAS + '?id=' + id, { method: 'DELETE' })
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
        paginaActual = 1;
        renderizarLista();
    });

    document.getElementById('boton-nuevo').addEventListener('click', abrirModalCrear);

    document.getElementById('boton-salir').addEventListener('click', function (e) {
        e.preventDefault();
        cerrarSesion();
    });
});
