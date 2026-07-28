<?php
// Configuración: Conexión a la base de datos (PDO)

// --- Configuración de la base de datos ---
// Usa variables de entorno si existen (producción), de lo contrario usa los valores de XAMPP (desarrollo local)
define('DB_HOST',    getenv('DB_HOST') ?: 'localhost');
define('DB_NOMBRE',  getenv('DB_NAME') ?: 'envio_revistas');
define('DB_USUARIO', getenv('DB_USER') ?: 'root');
define('DB_CLAVE',   getenv('DB_PASS') !== false ? getenv('DB_PASS') : ''); // En XAMPP la contraseña por defecto es vacía
define('DB_CHARSET', 'utf8mb4');

// --- Cabeceras para respuestas JSON (APIs) ---
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Manejar solicitudes OPTIONS (preflight CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// --- Establecer conexión PDO ---
try {
    $dsn = "mysql:host=" . DB_HOST 
         . ";dbname=" . DB_NOMBRE 
         . ";charset=" . DB_CHARSET;

    $opciones = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,      // Lanzar excepciones en caso de error
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,            // Devolver resultados como arrays asociativos
        PDO::ATTR_EMULATE_PREPARES   => false,                       // Usar prepared statements nativos del motor
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES " . DB_CHARSET,   // Asegurar charset en la sesión
    ];

    $conexion = new PDO($dsn, DB_USUARIO, DB_CLAVE, $opciones);

} catch (PDOException $e) {
    // En producción, NO exponer detalles del error al cliente
    http_response_code(500);
    echo json_encode([
        'exito'   => false,
        'mensaje' => 'Error al conectar con la base de datos.',
        'error'   => $e->getMessage()   // Quitar esta línea en producción
    ]);
    exit();
}
