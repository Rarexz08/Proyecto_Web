/*
   LOGIN — Lógica de autenticación (JavaScript Vanilla)
*/

const BASE_PATH = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? '/Proyecto1' : '';

document.addEventListener("DOMContentLoaded", function () {

    // Si ya hay sesión activa, redirigir al panel principal
    fetch(BASE_PATH + "/backend/api/auth.php?action=verificar")
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (data.autenticado) window.location.href = "envios.html";
        })
        .catch(function () { /* Sin sesión, mostrar login normalmente */ });

    const formulario       = document.getElementById("formulario-login");
    const campoEmail       = document.getElementById("campo-email");
    const campoClave       = document.getElementById("campo-clave");
    const botonEntrar      = document.getElementById("boton-entrar");
    const mensajeError     = document.getElementById("mensaje-error");
    const textoError       = document.getElementById("texto-error");
    const toggleClave      = document.getElementById("toggle-clave");

    const svgOjoAbierto = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
    const svgOjoCerrado = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';

    // MOSTRAR / OCULTAR CONTRASEÑA
    toggleClave.addEventListener("click", function () {
        const tipo = campoClave.type === "password" ? "text" : "password";
        campoClave.type = tipo;
        this.innerHTML = tipo === "password" ? svgOjoAbierto : svgOjoCerrado;
    });

    // OCULTAR ERROR AL ESCRIBIR
    campoEmail.addEventListener("input", ocultarError);
    campoClave.addEventListener("input", ocultarError);

    function ocultarError() {
        mensajeError.classList.remove("visible");
    }

    function mostrarError(mensaje) {
        textoError.textContent = mensaje;
        mensajeError.classList.add("visible");
    }

    // ENVIAR FORMULARIO
    formulario.addEventListener("submit", function (e) {
        e.preventDefault();

        const email = campoEmail.value.trim();
        const clave = campoClave.value;

        // Validaciones del lado del cliente
        if (email === "" || clave === "") {
            mostrarError("Por favor, completa todos los campos.");
            return;
        }

        if (!validarEmail(email)) {
            mostrarError("El formato del correo electrónico no es válido.");
            return;
        }

        if (clave.length < 4) {
            mostrarError("La contraseña debe tener al menos 4 caracteres.");
            return;
        }

        // Deshabilitar botón mientras se procesa
        botonEntrar.disabled = true;
        botonEntrar.textContent = "Ingresando...";

        // Llamada a la API de autenticación
        fetch(BASE_PATH + "/backend/api/auth.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                action: "login",
                email: email,
                clave: clave
            })
        })
        .then(function (respuesta) {
            return respuesta.json();
        })
        .then(function (datos) {
            if (datos.exito) {
                // Login exitoso — redirigir al panel principal
                formulario.classList.add("login-exitoso");
                setTimeout(function () {
                    window.location.href = "envios.html";
                }, 600);
            } else {
                // Error de autenticación
                mostrarError(datos.mensaje || "Credenciales incorrectas.");
                botonEntrar.disabled = false;
                botonEntrar.textContent = "Ingresar";
            }
        })
        .catch(function (error) {
            mostrarError("Error de conexión con el servidor. Verifica que Apache esté activo.");
            botonEntrar.disabled = false;
            botonEntrar.textContent = "Ingresar";
            console.error("Error de conexión:", error);
        });
    });

    // UTILIDADES
    function validarEmail(email) {
        var patron = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return patron.test(email);
    }
});
