<?php
// API: Gestión de Agencias de Transporte (CRUD)

session_start();
require_once __DIR__ . '/../config/conexion.php';

$metodo = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? intval($_GET['id']) : null;

switch ($metodo) {
    case 'GET':
        if ($id) {
            obtenerAgencia($conexion, $id);
        } else {
            listarAgencias($conexion);
        }
        break;

    case 'POST':
        crearAgencia($conexion);
        break;

    case 'PUT':
        if ($id) {
            actualizarAgencia($conexion, $id);
        } else {
            http_response_code(400);
            echo json_encode(['exito' => false, 'mensaje' => 'Se requiere el parámetro id.']);
        }
        break;

    case 'DELETE':
        if ($id) {
            eliminarAgencia($conexion, $id);
        } else {
            http_response_code(400);
            echo json_encode(['exito' => false, 'mensaje' => 'Se requiere el parámetro id.']);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['exito' => false, 'mensaje' => 'Método no permitido.']);
        break;
}

// FUNCIONES

/**
 * Listar todas las agencias
 */
function listarAgencias($conexion) {
    try {
        $consulta = $conexion->query("SELECT * FROM agencia_transporte ORDER BY nombre ASC");
        $agencias = $consulta->fetchAll();

        echo json_encode([
            'exito' => true,
            'datos' => $agencias,
            'total' => count($agencias)
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['exito' => false, 'mensaje' => 'Error al listar agencias.', 'error' => $e->getMessage()]);
    }
}

/**
 * Obtener una agencia por ID
 */
function obtenerAgencia($conexion, $id) {
    try {
        $consulta = $conexion->prepare("SELECT * FROM agencia_transporte WHERE id_agencia = :id");
        $consulta->execute([':id' => $id]);
        $agencia = $consulta->fetch();

        if (!$agencia) {
            http_response_code(404);
            echo json_encode(['exito' => false, 'mensaje' => 'Agencia no encontrada.']);
            return;
        }

        echo json_encode(['exito' => true, 'datos' => $agencia]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['exito' => false, 'mensaje' => 'Error al obtener la agencia.', 'error' => $e->getMessage()]);
    }
}

/**
 * Crear una nueva agencia
 */
function crearAgencia($conexion) {
    $datos = json_decode(file_get_contents('php://input'), true);

    // Validar campo obligatorio
    if (empty($datos['nombre'])) {
        http_response_code(400);
        echo json_encode(['exito' => false, 'mensaje' => "El campo 'nombre' es obligatorio."]);
        return;
    }

    // Validar email si se proporciona
    if (!empty($datos['email']) && !filter_var($datos['email'], FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['exito' => false, 'mensaje' => 'El formato del correo electrónico no es válido.']);
        return;
    }

    try {
        $consulta = $conexion->prepare(
            "INSERT INTO agencia_transporte (nombre, telefono, email, direccion, sitio_web, activo)
             VALUES (:nombre, :telefono, :email, :direccion, :sitio_web, :activo)"
        );

        $consulta->execute([
            ':nombre'    => trim($datos['nombre']),
            ':telefono'  => isset($datos['telefono']) ? trim($datos['telefono']) : null,
            ':email'     => isset($datos['email']) ? trim($datos['email']) : null,
            ':direccion' => isset($datos['direccion']) ? trim($datos['direccion']) : null,
            ':sitio_web' => isset($datos['sitio_web']) ? trim($datos['sitio_web']) : null,
            ':activo'    => isset($datos['activo']) ? intval($datos['activo']) : 1
        ]);

        $nuevoId = $conexion->lastInsertId();

        http_response_code(201);
        echo json_encode([
            'exito'   => true,
            'mensaje' => 'Agencia creada exitosamente.',
            'id'      => intval($nuevoId)
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['exito' => false, 'mensaje' => 'Error al crear la agencia.', 'error' => $e->getMessage()]);
    }
}

/**
 * Actualizar una agencia existente
 */
function actualizarAgencia($conexion, $id) {
    $datos = json_decode(file_get_contents('php://input'), true);

    if (empty($datos)) {
        http_response_code(400);
        echo json_encode(['exito' => false, 'mensaje' => 'No se enviaron datos para actualizar.']);
        return;
    }

    // Validar email si se actualiza
    if (isset($datos['email']) && !empty($datos['email'])) {
        if (!filter_var($datos['email'], FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(['exito' => false, 'mensaje' => 'El formato del correo electrónico no es válido.']);
            return;
        }
    }

    $camposPermitidos = ['nombre', 'telefono', 'email', 'direccion', 'sitio_web', 'activo'];
    $sets = [];
    $parametros = [':id' => $id];

    foreach ($camposPermitidos as $campo) {
        if (array_key_exists($campo, $datos)) {
            $sets[] = "$campo = :$campo";
            $parametros[":$campo"] = ($campo === 'activo') ? intval($datos[$campo]) : trim($datos[$campo]);
        }
    }

    if (empty($sets)) {
        http_response_code(400);
        echo json_encode(['exito' => false, 'mensaje' => 'No se proporcionaron campos válidos para actualizar.']);
        return;
    }

    try {
        $sql = "UPDATE agencia_transporte SET " . implode(', ', $sets) . " WHERE id_agencia = :id";
        $consulta = $conexion->prepare($sql);
        $consulta->execute($parametros);

        if ($consulta->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['exito' => false, 'mensaje' => 'Agencia no encontrada o sin cambios.']);
            return;
        }

        echo json_encode(['exito' => true, 'mensaje' => 'Agencia actualizada exitosamente.']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['exito' => false, 'mensaje' => 'Error al actualizar la agencia.', 'error' => $e->getMessage()]);
    }
}

/**
 * Eliminar (desactivar) una agencia
 */
function eliminarAgencia($conexion, $id) {
    try {
        // Borrado lógico: desactivar en lugar de eliminar
        $consulta = $conexion->prepare("UPDATE agencia_transporte SET activo = 0 WHERE id_agencia = :id");
        $consulta->execute([':id' => $id]);

        if ($consulta->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['exito' => false, 'mensaje' => 'Agencia no encontrada.']);
            return;
        }

        echo json_encode(['exito' => true, 'mensaje' => 'Agencia desactivada exitosamente.']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['exito' => false, 'mensaje' => 'Error al eliminar la agencia.', 'error' => $e->getMessage()]);
    }
}
