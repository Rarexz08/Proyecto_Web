<?php
// API: Gestión de Revistas (CRUD)

session_start();
require_once __DIR__ . '/../config/conexion.php';

$metodo = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? intval($_GET['id']) : null;

switch ($metodo) {
    case 'GET':
        if ($id) {
            obtenerRevista($conexion, $id);
        } else {
            listarRevistas($conexion);
        }
        break;

    case 'POST':
        crearRevista($conexion);
        break;

    case 'PUT':
        if ($id) {
            actualizarRevista($conexion, $id);
        } else {
            http_response_code(400);
            echo json_encode(['exito' => false, 'mensaje' => 'Se requiere el parámetro id.']);
        }
        break;

    case 'DELETE':
        if ($id) {
            eliminarRevista($conexion, $id);
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
 * Listar todas las revistas
 */
function listarRevistas($conexion) {
    try {
        $consulta = $conexion->query("SELECT * FROM revista ORDER BY titulo ASC");
        $revistas = $consulta->fetchAll();

        echo json_encode([
            'exito' => true,
            'datos' => $revistas,
            'total' => count($revistas)
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['exito' => false, 'mensaje' => 'Error al listar revistas.', 'error' => $e->getMessage()]);
    }
}

/**
 * Obtener una revista por ID
 */
function obtenerRevista($conexion, $id) {
    try {
        $consulta = $conexion->prepare("SELECT * FROM revista WHERE id_revista = :id");
        $consulta->execute([':id' => $id]);
        $revista = $consulta->fetch();

        if (!$revista) {
            http_response_code(404);
            echo json_encode(['exito' => false, 'mensaje' => 'Revista no encontrada.']);
            return;
        }

        echo json_encode(['exito' => true, 'datos' => $revista]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['exito' => false, 'mensaje' => 'Error al obtener la revista.', 'error' => $e->getMessage()]);
    }
}

/**
 * Crear una nueva revista
 */
function crearRevista($conexion) {
    $datos = json_decode(file_get_contents('php://input'), true);

    // Validar campos obligatorios
    $camposRequeridos = ['titulo', 'genero', 'periodicidad', 'fecha_creacion'];
    foreach ($camposRequeridos as $campo) {
        if (empty($datos[$campo])) {
            http_response_code(400);
            echo json_encode(['exito' => false, 'mensaje' => "El campo '$campo' es obligatorio."]);
            return;
        }
    }

    try {
        $consulta = $conexion->prepare(
            "INSERT INTO revista (titulo, genero, periodicidad, descripcion, fecha_creacion, activo) 
             VALUES (:titulo, :genero, :periodicidad, :descripcion, :fecha_creacion, :activo)"
        );

        $consulta->execute([
            ':titulo'         => trim($datos['titulo']),
            ':genero'         => trim($datos['genero']),
            ':periodicidad'   => trim($datos['periodicidad']),
            ':descripcion'    => isset($datos['descripcion']) ? trim($datos['descripcion']) : null,
            ':fecha_creacion' => $datos['fecha_creacion'],
            ':activo'         => isset($datos['activo']) ? intval($datos['activo']) : 1
        ]);

        $nuevoId = $conexion->lastInsertId();

        http_response_code(201);
        echo json_encode([
            'exito'   => true,
            'mensaje' => 'Revista creada exitosamente.',
            'id'      => intval($nuevoId)
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['exito' => false, 'mensaje' => 'Error al crear la revista.', 'error' => $e->getMessage()]);
    }
}

/**
 * Actualizar una revista existente
 */
function actualizarRevista($conexion, $id) {
    $datos = json_decode(file_get_contents('php://input'), true);

    if (empty($datos)) {
        http_response_code(400);
        echo json_encode(['exito' => false, 'mensaje' => 'No se enviaron datos para actualizar.']);
        return;
    }

    // Construir la consulta de actualización dinámica
    $camposPermitidos = ['titulo', 'genero', 'periodicidad', 'descripcion', 'fecha_creacion', 'activo'];
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
        $sql = "UPDATE revista SET " . implode(', ', $sets) . " WHERE id_revista = :id";
        $consulta = $conexion->prepare($sql);
        $consulta->execute($parametros);

        if ($consulta->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['exito' => false, 'mensaje' => 'Revista no encontrada o sin cambios.']);
            return;
        }

        echo json_encode(['exito' => true, 'mensaje' => 'Revista actualizada exitosamente.']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['exito' => false, 'mensaje' => 'Error al actualizar la revista.', 'error' => $e->getMessage()]);
    }
}

/**
 * Eliminar (desactivar) una revista
 */
function eliminarRevista($conexion, $id) {
    try {
        // Borrado lógico: desactivar en lugar de eliminar
        $consulta = $conexion->prepare("UPDATE revista SET activo = 0 WHERE id_revista = :id");
        $consulta->execute([':id' => $id]);

        if ($consulta->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['exito' => false, 'mensaje' => 'Revista no encontrada.']);
            return;
        }

        echo json_encode(['exito' => true, 'mensaje' => 'Revista desactivada exitosamente.']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['exito' => false, 'mensaje' => 'Error al eliminar la revista.', 'error' => $e->getMessage()]);
    }
}
