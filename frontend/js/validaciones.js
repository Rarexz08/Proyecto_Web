/*
   VALIDACIONES GLOBALES — RevistaExpress
   Incluido en todos los módulos vía <script src="../js/validaciones.js">
*/

var Validar = (function () {

    // CÉDULA ECUATORIANA (10 dígitos + algoritmo módulo 10)
    // Fuente: Registro Civil Ecuador
    function cedulaEcuatoriana(cedula) {
        cedula = String(cedula).trim();

        // 1. Debe tener exactamente 10 dígitos numéricos
        if (!/^\d{10}$/.test(cedula)) {
            return { valido: false, mensaje: 'La cédula debe tener exactamente 10 dígitos numéricos.' };
        }

        // 2. Los dos primeros dígitos = código de provincia (01-24, o 30 para extranjeros)
        var provincia = parseInt(cedula.substring(0, 2), 10);
        if (provincia < 1 || (provincia > 24 && provincia !== 30)) {
            return { valido: false, mensaje: 'El código de provincia de la cédula no es válido (01-24 o 30).' };
        }

        // 3. Tercer dígito < 6 (personas naturales)
        var tercerDigito = parseInt(cedula[2], 10);
        if (tercerDigito >= 6) {
            return { valido: false, mensaje: 'El tercer dígito de la cédula no es válido para persona natural (debe ser 0-5).' };
        }

        // 4. Algoritmo de verificación módulo 10
        var coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
        var suma = 0;
        for (var i = 0; i < 9; i++) {
            var valor = parseInt(cedula[i], 10) * coeficientes[i];
            if (valor >= 10) valor -= 9;
            suma += valor;
        }
        var digitoVerificador = parseInt(cedula[9], 10);
        var residuo = suma % 10;
        var verificacion = residuo === 0 ? 0 : 10 - residuo;

        if (verificacion !== digitoVerificador) {
            return { valido: false, mensaje: 'La cédula ecuatoriana no es válida (dígito verificador incorrecto).' };
        }

        return { valido: true, mensaje: 'Cédula válida.' };
    }

    // RUC ECUATORIANO (13 dígitos)
    function rucEcuatoriano(ruc) {
        ruc = String(ruc).trim();

        if (!/^\d{13}$/.test(ruc)) {
            return { valido: false, mensaje: 'El RUC debe tener exactamente 13 dígitos.' };
        }

        // RUC de persona natural: los 10 primeros = cédula válida + "001"
        var tercerDigito = parseInt(ruc[2], 10);

        if (tercerDigito < 6) {
            // Persona natural
            var resultadoCedula = cedulaEcuatoriana(ruc.substring(0, 10));
            if (!resultadoCedula.valido) {
                return { valido: false, mensaje: 'Los 10 primeros dígitos del RUC no corresponden a una cédula válida.' };
            }
            var establecimiento = ruc.substring(10);
            if (establecimiento !== '001') {
                return { valido: false, mensaje: 'Para persona natural el RUC debe terminar en "001".' };
            }
            return { valido: true, mensaje: 'RUC persona natural válido.' };
        }

        if (tercerDigito === 6) {
            // Entidad pública — validación simplificada
            var provincia2 = parseInt(ruc.substring(0, 2), 10);
            if (provincia2 < 1 || (provincia2 > 24 && provincia2 !== 30)) {
                return { valido: false, mensaje: 'Código de provincia del RUC no válido.' };
            }
            return { valido: true, mensaje: 'RUC entidad pública válido.' };
        }

        if (tercerDigito === 9) {
            // Sociedad privada / extranjero
            var coefs = [4, 3, 2, 7, 6, 5, 4, 3, 2];
            var suma2 = 0;
            for (var j = 0; j < 9; j++) {
                suma2 += parseInt(ruc[j], 10) * coefs[j];
            }
            var residuo2 = suma2 % 11;
            var verificacion2 = residuo2 === 0 ? 0 : 11 - residuo2;
            if (verificacion2 !== parseInt(ruc[9], 10)) {
                return { valido: false, mensaje: 'El RUC de sociedad privada no es válido (dígito verificador incorrecto).' };
            }
            return { valido: true, mensaje: 'RUC sociedad privada válido.' };
        }

        return { valido: false, mensaje: 'El tercer dígito del RUC no es reconocido (debe ser 0-6 ó 9).' };
    }

    // EMAIL
    function email(valor) {
        valor = String(valor).trim();
        if (!valor) return { valido: false, mensaje: 'El correo electrónico es obligatorio.' };
        var patron = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
        if (!patron.test(valor)) {
            return { valido: false, mensaje: 'El formato del correo electrónico no es válido.' };
        }
        return { valido: true };
    }

    // TELÉFONO ECUATORIANO
    // Celular: 09XXXXXXXX (10 dígitos, inicia en 09)
    // Convencional: 02-07 XXXXXXX (7 dígitos con código)
    function telefonoEcuatoriano(valor) {
        valor = String(valor).trim().replace(/[\s\-\(\)]/g, '');
        if (!valor) return { valido: true }; // campo opcional

        // Celular: empieza por 09 y tiene 10 dígitos
        if (/^09\d{8}$/.test(valor)) {
            return { valido: true };
        }
        // Fijo: empieza por 0 y tiene 9 dígitos (ej: 023456789)
        if (/^0[2-7]\d{7}$/.test(valor)) {
            return { valido: true };
        }
        // Con código país +593
        if (/^\+593\d{9}$/.test(valor)) {
            return { valido: true };
        }

        return {
            valido: false,
            mensaje: 'Teléfono inválido. Use formato celular (09XXXXXXXX), fijo (0XYYYYYYY) o +593XXXXXXXXX.'
        };
    }

    // CÓDIGO POSTAL ECUADOR (6 dígitos numéricos)
    function codigoPostalEcuador(valor) {
        valor = String(valor).trim();
        if (!valor) return { valido: true }; // opcional
        if (!/^\d{6}$/.test(valor)) {
            return { valido: false, mensaje: 'El código postal de Ecuador debe tener 6 dígitos numéricos (ej: 170901).' };
        }
        return { valido: true };
    }

    // TEXTO SOLO LETRAS (nombres, ciudades)
    function soloLetras(valor, campo) {
        valor = String(valor).trim();
        if (!valor) return { valido: false, mensaje: (campo || 'Este campo') + ' es obligatorio.' };
        if (valor.length < 2) return { valido: false, mensaje: (campo || 'Este campo') + ' debe tener al menos 2 caracteres.' };
        if (!/^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s\'\-\.]+$/.test(valor)) {
            return { valido: false, mensaje: (campo || 'Este campo') + ' solo puede contener letras, espacios, guiones o apostrofes.' };
        }
        return { valido: true };
    }

    // FECHA: no puede ser pasada (para fecha de envío)
    function fechaNoAnteriorAHoy(valor, campo) {
        if (!valor) return { valido: false, mensaje: (campo || 'La fecha') + ' es obligatoria.' };
        var fecha = new Date(valor + 'T00:00:00');
        var hoy   = new Date();
        hoy.setHours(0, 0, 0, 0);
        if (isNaN(fecha.getTime())) {
            return { valido: false, mensaje: (campo || 'La fecha') + ' no tiene un formato válido.' };
        }
        if (fecha < hoy) {
            return { valido: false, mensaje: (campo || 'La fecha') + ' no puede ser una fecha pasada.' };
        }
        return { valido: true };
    }

    // FECHA ENTREGA > FECHA ENVÍO
    function fechaEntregaPosterior(fechaEnvio, fechaEntrega) {
        if (!fechaEntrega) return { valido: true }; // opcional
        var dEnvio   = new Date(fechaEnvio + 'T00:00:00');
        var dEntrega = new Date(fechaEntrega + 'T00:00:00');
        if (dEntrega <= dEnvio) {
            return { valido: false, mensaje: 'La fecha de entrega estimada debe ser posterior a la fecha de envío.' };
        }
        return { valido: true };
    }

    // NÚMERO POSITIVO (precios, año revista)
    function numeroPositivo(valor, campo, decimales) {
        var num = parseFloat(valor);
        if (isNaN(num) || num <= 0) {
            return { valido: false, mensaje: (campo || 'El valor') + ' debe ser un número positivo mayor a 0.' };
        }
        if (!decimales && Math.floor(num) !== num) {
            return { valido: false, mensaje: (campo || 'El valor') + ' debe ser un número entero positivo.' };
        }
        return { valido: true };
    }

    // AÑO DE REVISTA (entre 1900 y año actual + 1)
    function anioRevista(valor) {
        var anio = parseInt(valor, 10);
        var actual = new Date().getFullYear();
        if (isNaN(anio) || anio < 1900 || anio > actual + 1) {
            return { valido: false, mensaje: 'El año debe estar entre 1900 y ' + (actual + 1) + '.' };
        }
        return { valido: true };
    }

    // HELPER: marcar campo visualmente como error
    function marcarError(idCampo, mensaje) {
        var campo = document.getElementById(idCampo);
        if (!campo) return;
        campo.style.borderColor = '#c0392b';
        campo.style.boxShadow = '0 0 0 3px rgba(192,57,43,0.12)';

        // Quitar error al escribir
        campo.addEventListener('input', function limpiarError() {
            campo.style.borderColor = '';
            campo.style.boxShadow = '';
            campo.removeEventListener('input', limpiarError);
        });
    }

    function limpiarErrores() {
        document.querySelectorAll('.formulario-campo, .formulario-select, .formulario-textarea, .login-campo').forEach(function (el) {
            el.style.borderColor = '';
            el.style.boxShadow = '';
        });
    }

    // API pública
    return {
        cedulaEcuatoriana:    cedulaEcuatoriana,
        rucEcuatoriano:       rucEcuatoriano,
        email:                email,
        telefonoEcuatoriano:  telefonoEcuatoriano,
        codigoPostalEcuador:  codigoPostalEcuador,
        soloLetras:           soloLetras,
        fechaNoAnteriorAHoy:  fechaNoAnteriorAHoy,
        fechaEntregaPosterior: fechaEntregaPosterior,
        numeroPositivo:       numeroPositivo,
        anioRevista:          anioRevista,
        marcarError:          marcarError,
        limpiarErrores:       limpiarErrores
    };

})();
