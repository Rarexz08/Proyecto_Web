<?php
// API: Endpoint de Rastreo Público (No requiere sesión)

require_once __DIR__ . '/../config/conexion.php';

$metodo = $_SERVER['REQUEST_METHOD'];

if ($metodo !== 'GET') {
    http_response_code(405);
    echo json_encode(['exito' => false, 'mensaje' => 'Método no permitido.']);
    exit;
}

$codigo = isset($_GET['codigo']) ? trim($_GET['codigo']) : null;

if (empty($codigo)) {
    http_response_code(400);
    echo json_encode(['exito' => false, 'mensaje' => 'Se requiere el código de rastreo.']);
    exit;
}

try {
    // Consulta restringida: solo extraemos lo necesario para el rastreo
    $sql = "SELECT 
                env.codigo_rastreo,
                env.fecha_envio,
                env.fecha_entrega_estimada,
                env.estado,
                p.nombre AS destinatario_nombre,
                p.ciudad AS destino_ciudad,
                r.titulo AS revista_titulo,
                ej.numero_edicion,
                a.nombre AS agencia_nombre
            FROM envio env
            INNER JOIN persona p ON env.id_persona = p.id_persona
            INNER JOIN ejemplar ej ON env.id_ejemplar = ej.id_ejemplar
            INNER JOIN revista r ON ej.id_revista = r.id_revista
            INNER JOIN agencia_transporte a ON env.id_agencia = a.id_agencia
            WHERE env.codigo_rastreo = :codigo";

    $consulta = $conexion->prepare($sql);
    $consulta->execute([':codigo' => $codigo]);
    $resultado = $consulta->fetch(PDO::FETCH_ASSOC);

    if (!$resultado) {
        http_response_code(404);
        echo json_encode(['exito' => false, 'mensaje' => 'Código de rastreo no encontrado.']);
        exit;
    }

    echo json_encode([
        'exito' => true,
        'datos' => $resultado
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['exito' => false, 'mensaje' => 'Error al buscar el código de rastreo.']);
}
