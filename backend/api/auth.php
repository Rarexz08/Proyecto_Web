<?php
// API: Autenticación (Login / Logout / Verificar sesión)

session_start();

require_once __DIR__ . '/../config/conexion.php';

// Obtener la acción solicitada
$accion = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $entrada = json_decode(file_get_contents('php://input'), true);
    $accion  = isset($entrada['action']) ? $entrada['action'] : '';
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $accion = isset($_GET['action']) ? $_GET['action'] : '';
}

// Enrutamiento por acción
switch ($accion) {

    // INICIAR SESIÓN
    case 'login':
        iniciarSesion($conexion, $entrada);
        break;

    // CERRAR SESIÓN
    case 'logout':
        cerrarSesion();
        break;

    // VERIFICAR SESIÓN ACTIVA
    case 'verificar':
        verificarSesion();
        break;

    default:
        http_response_code(400);
        echo json_encode([
            'exito'   => false,
            'mensaje' => 'Acción no válida. Usa: login, logout o verificar.'
        ]);
        break;
}

// FUNCIONES

/**
 * Procesa el inicio de sesión
 */
function iniciarSesion($conexion, $datos) {
    // Validar campos requeridos
    $email = isset($datos['email']) ? trim($datos['email']) : '';
    $clave = isset($datos['clave']) ? $datos['clave'] : '';

    if (empty($email) || empty($clave)) {
        http_response_code(400);
        echo json_encode([
            'exito'   => false,
            'mensaje' => 'El correo electrónico y la contraseña son obligatorios.'
        ]);
        return;
    }

    // Validar formato de email
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode([
            'exito'   => false,
            'mensaje' => 'El formato del correo electrónico no es válido.'
        ]);
        return;
    }

    try {
        // Buscar usuario por email
        $consulta = $conexion->prepare(
            "SELECT id_usuario, nombre, email, clave_hash, rol, activo 
             FROM usuarios 
             WHERE email = :email 
             LIMIT 1"
        );
        $consulta->execute([':email' => $email]);
        $usuario = $consulta->fetch();

        // Verificar que el usuario existe
        if (!$usuario) {
            http_response_code(401);
            echo json_encode([
                'exito'   => false,
                'mensaje' => 'Credenciales incorrectas.'
            ]);
            return;
        }

        // Verificar que la cuenta esté activa
        if ($usuario['activo'] != 1) {
            http_response_code(403);
            echo json_encode([
                'exito'   => false,
                'mensaje' => 'Esta cuenta se encuentra desactivada. Contacta al administrador.'
            ]);
            return;
        }

        // Verificar la contraseña contra el hash
        if (!password_verify($clave, $usuario['clave_hash'])) {
            http_response_code(401);
            echo json_encode([
                'exito'   => false,
                'mensaje' => 'Credenciales incorrectas.'
            ]);
            return;
        }

        // Regenerar ID de sesión para prevenir fixation
        session_regenerate_id(true);

        // Almacenar datos en sesión
        $_SESSION['usuario_id']     = $usuario['id_usuario'];
        $_SESSION['usuario_nombre'] = $usuario['nombre'];
        $_SESSION['usuario_email']  = $usuario['email'];
        $_SESSION['usuario_rol']    = $usuario['rol'];
        $_SESSION['sesion_inicio']  = time();

        // Respuesta exitosa
        echo json_encode([
            'exito'   => true,
            'mensaje' => 'Inicio de sesión exitoso.',
            'usuario' => [
                'id'     => $usuario['id_usuario'],
                'nombre' => $usuario['nombre'],
                'email'  => $usuario['email'],
                'rol'    => $usuario['rol']
            ]
        ]);

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'exito'   => false,
            'mensaje' => 'Error interno del servidor.',
            'error'   => $e->getMessage()
        ]);
    }
}

/**
 * Cierra la sesión del usuario
 */
function cerrarSesion() {
    // Limpiar todas las variables de sesión
    $_SESSION = [];

    // Destruir la cookie de sesión
    if (ini_get('session.use_cookies')) {
        $parametros = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            time() - 42000,
            $parametros['path'],
            $parametros['domain'],
            $parametros['secure'],
            $parametros['httponly']
        );
    }

    // Destruir la sesión
    session_destroy();

    echo json_encode([
        'exito'   => true,
        'mensaje' => 'Sesión cerrada correctamente.'
    ]);
}

/**
 * Verifica si existe una sesión activa
 */
function verificarSesion() {
    if (isset($_SESSION['usuario_id'])) {
        echo json_encode([
            'exito'      => true,
            'autenticado' => true,
            'usuario'    => [
                'id'     => $_SESSION['usuario_id'],
                'nombre' => $_SESSION['usuario_nombre'],
                'email'  => $_SESSION['usuario_email'],
                'rol'    => $_SESSION['usuario_rol']
            ]
        ]);
    } else {
        echo json_encode([
            'exito'       => true,
            'autenticado' => false,
            'mensaje'     => 'No hay sesión activa.'
        ]);
    }
}
