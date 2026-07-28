<?php
// API: Gestión de Ejemplares (CRUD)

session_start();
require_once __DIR__ . '/../config/conexion.php';

$metodo    = $_SERVER['REQUEST_METHOD'];
$id        = isset($_GET['id']) ? intval($_GET['id']) : null;
$idRevista = isset($_GET['revista']) ? intval($_GET['revista']) : null;

switch ($metodo) {
    case 'GET':
        if ($id) {
            obtenerEjemplar($conexion, $id);
        } elseif ($idRevista) {
            listarPorRevista($conexion, $idRevista);
        } else {
            listarEjemplares($conexion);
        }
        break;

    case 'POST':
        crearEjemplar($conexion);
        break;

    case 'PUT':
        if ($id) {
            actualizarEjemplar($conexion, $id);
        } else {
            http_response_code(400);
            echo json_encode(['exito' => false, 'mensaje' => 'Se requiere el parámetro id.']);
        }
        break;

    case 'DELETE':
        if ($id) {
            eliminarEjemplar($conexion, $id);
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
 * Listar todos los ejemplares con información de la revista
 */
function listarEjemplares($conexion) {
    try {
        $consulta = $conexion->query(
            "SELECT e.*, r.titulo AS revista_titulo, r.genero AS revista_genero
             FROM ejemplar e
             INNER JOIN revista r ON e.id_revista = r.id_revista
             ORDER BY e.fecha_publicacion DESC"
        );
        $ejemplares = $consulta->fetchAll();

        echo json_encode([
            'exito' => true,
            'datos' => $ejemplares,
            'total' => count($ejemplares)
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['exito' => false, 'mensaje' => 'Error al listar ejemplares.', 'error' => $e->getMessage()]);
    }
}

/**
 * Listar ejemplares de una revista específica
 */
function listarPorRevista($conexion, $idRevista) {
    try {
        $consulta = $conexion->prepare(
            "SELECT e.*, r.titulo AS revista_titulo
             FROM ejemplar e
             INNER JOIN revista r ON e.id_revista = r.id_revista
             WHERE e.id_revista = :id_revista
             ORDER BY e.numero_edicion DESC"
        );
        $consulta->execute([':id_revista' => $idRevista]);
        $ejemplares = $consulta->fetchAll();

        echo json_encode([
            'exito' => true,
            'datos' => $ejemplares,
            'total' => count($ejemplares)
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['exito' => false, 'mensaje' => 'Error al listar ejemplares de la revista.', 'error' => $e->getMessage()]);
    }
}

/**
 * Obtener un ejemplar por ID
 */
function obtenerEjemplar($conexion, $id) {
    try {
        $consulta = $conexion->prepare(
            "SELECT e.*, r.titulo AS revista_titulo, r.genero AS revista_genero, r.periodicidad AS revista_periodicidad
             FROM ejemplar e
             INNER JOIN revista r ON e.id_revista = r.id_revista
             WHERE e.id_ejemplar = :id"
        );
        $consulta->execute([':id' => $id]);
        $ejemplar = $consulta->fetch();

        if (!$ejemplar) {
            http_response_code(404);
            echo json_encode(['exito' => false, 'mensaje' => 'Ejemplar no encontrado.']);
            return;
        }

        echo json_encode(['exito' => true, 'datos' => $ejemplar]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['exito' => false, 'mensaje' => 'Error al obtener el ejemplar.', 'error' => $e->getMessage()]);
    }
}

/**
 * Crear un nuevo ejemplar
 */
function crearEjemplar($conexion) {
    $datos = json_decode(file_get_contents('php://input'), true);

    // Validar campos obligatorios
    $camposRequeridos = ['id_revista', 'numero_edicion', 'fecha_publicacion', 'precio'];
    foreach ($camposRequeridos as $campo) {
        if (!isset($datos[$campo]) || $datos[$campo] === '') {
            http_response_code(400);
            echo json_encode(['exito' => false, 'mensaje' => "El campo '$campo' es obligatorio."]);
            return;
        }
    }

    // Validar que la revista exista
    $verificar = $conexion->prepare("SELECT id_revista FROM revista WHERE id_revista = :id");
    $verificar->execute([':id' => intval($datos['id_revista'])]);
    if (!$verificar->fetch()) {
        http_response_code(400);
        echo json_encode(['exito' => false, 'mensaje' => 'La revista especificada no existe.']);
        return;
    }

    // Validar que el precio sea positivo
    if (floatval($datos['precio']) <= 0) {
        http_response_code(400);
        echo json_encode(['exito' => false, 'mensaje' => 'El precio debe ser mayor a cero.']);
        return;
    }

    try {
        $consulta = $conexion->prepare(
            "INSERT INTO ejemplar (id_revista, numero_edicion, fecha_publicacion, stock, precio)
             VALUES (:id_revista, :numero_edicion, :fecha_publicacion, :stock, :precio)"
        );

        $consulta->execute([
            ':id_revista'       => intval($datos['id_revista']),
            ':numero_edicion'   => intval($datos['numero_edicion']),
            ':fecha_publicacion'=> $datos['fecha_publicacion'],
            ':stock'            => isset($datos['stock']) ? intval($datos['stock']) : 0,
            ':precio'           => floatval($datos['precio'])
        ]);

        $nuevoId = $conexion->lastInsertId();

        http_response_code(201);
        echo json_encode([
            'exito'   => true,
            'mensaje' => 'Ejemplar creado exitosamente.',
            'id'      => intval($nuevoId)
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['exito' => false, 'mensaje' => 'Error al crear el ejemplar.', 'error' => $e->getMessage()]);
    }
}

/**
 * Actualizar un ejemplar existente
 */
function actualizarEjemplar($conexion, $id) {
    $datos = json_decode(file_get_contents('php://input'), true);

    if (empty($datos)) {
        http_response_code(400);
        echo json_encode(['exito' => false, 'mensaje' => 'No se enviaron datos para actualizar.']);
        return;
    }

    $camposPermitidos = ['id_revista', 'numero_edicion', 'fecha_publicacion', 'stock', 'precio'];
    $sets = [];
    $parametros = [':id' => $id];

    foreach ($camposPermitidos as $campo) {
        if (array_key_exists($campo, $datos)) {
            $sets[] = "$campo = :$campo";
            if (in_array($campo, ['id_revista', 'numero_edicion', 'stock'])) {
                $parametros[":$campo"] = intval($datos[$campo]);
            } elseif ($campo === 'precio') {
                $parametros[":$campo"] = floatval($datos[$campo]);
            } else {
                $parametros[":$campo"] = trim($datos[$campo]);
            }
        }
    }

    if (empty($sets)) {
        http_response_code(400);
        echo json_encode(['exito' => false, 'mensaje' => 'No se proporcionaron campos válidos para actualizar.']);
        return;
    }

    try {
        $sql = "UPDATE ejemplar SET " . implode(', ', $sets) . " WHERE id_ejemplar = :id";
        $consulta = $conexion->prepare($sql);
        $consulta->execute($parametros);

        if ($consulta->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['exito' => false, 'mensaje' => 'Ejemplar no encontrado o sin cambios.']);
            return;
        }

        echo json_encode(['exito' => true, 'mensaje' => 'Ejemplar actualizado exitosamente.']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['exito' => false, 'mensaje' => 'Error al actualizar el ejemplar.', 'error' => $e->getMessage()]);
    }
}

/**
 * Eliminar un ejemplar
 */
function eliminarEjemplar($conexion, $id) {
    try {
        // Verificar que no tenga envíos asociados
        $verificar = $conexion->prepare("SELECT COUNT(*) as total FROM envio WHERE id_ejemplar = :id");
        $verificar->execute([':id' => $id]);
        $resultado = $verificar->fetch();

        if ($resultado['total'] > 0) {
            http_response_code(409);
            echo json_encode([
                'exito'   => false,
                'mensaje' => 'No se puede eliminar: este ejemplar tiene envíos asociados.'
            ]);
            return;
        }

        $consulta = $conexion->prepare("DELETE FROM ejemplar WHERE id_ejemplar = :id");
        $consulta->execute([':id' => $id]);

        if ($consulta->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['exito' => false, 'mensaje' => 'Ejemplar no encontrado.']);
            return;
        }

        echo json_encode(['exito' => true, 'mensaje' => 'Ejemplar eliminado exitosamente.']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['exito' => false, 'mensaje' => 'Error al eliminar el ejemplar.', 'error' => $e->getMessage()]);
    }
}
