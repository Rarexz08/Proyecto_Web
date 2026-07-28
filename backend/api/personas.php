<?php
// API: Gestión de Personas (CRUD)

session_start();
require_once __DIR__ . '/../config/conexion.php';

$metodo = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? intval($_GET['id']) : null;

switch ($metodo) {
    case 'GET':
        if ($id) {
            obtenerPersona($conexion, $id);
        } else {
            listarPersonas($conexion);
        }
        break;

    case 'POST':
        crearPersona($conexion);
        break;

    case 'PUT':
        if ($id) {
            actualizarPersona($conexion, $id);
        } else {
            http_response_code(400);
            echo json_encode(['exito' => false, 'mensaje' => 'Se requiere el parámetro id.']);
        }
        break;

    case 'DELETE':
        if ($id) {
            eliminarPersona($conexion, $id);
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
 * Listar todas las personas
 */
function listarPersonas($conexion) {
    try {
        $consulta = $conexion->query(
            "SELECT * FROM persona ORDER BY apellido ASC, nombre ASC"
        );
        $personas = $consulta->fetchAll();

        echo json_encode([
            'exito' => true,
            'datos' => $personas,
            'total' => count($personas)
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['exito' => false, 'mensaje' => 'Error al listar personas.', 'error' => $e->getMessage()]);
    }
}

/**
 * Obtener una persona por ID
 */
function obtenerPersona($conexion, $id) {
    try {
        $consulta = $conexion->prepare("SELECT * FROM persona WHERE id_persona = :id");
        $consulta->execute([':id' => $id]);
        $persona = $consulta->fetch();

        if (!$persona) {
            http_response_code(404);
            echo json_encode(['exito' => false, 'mensaje' => 'Persona no encontrada.']);
            return;
        }

        echo json_encode(['exito' => true, 'datos' => $persona]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['exito' => false, 'mensaje' => 'Error al obtener la persona.', 'error' => $e->getMessage()]);
    }
}

/**
 * Crear una nueva persona
 */
function crearPersona($conexion) {
    $datos = json_decode(file_get_contents('php://input'), true);

    // Validar campos obligatorios
    $camposRequeridos = ['nombre', 'apellido', 'email', 'direccion', 'ciudad'];
    foreach ($camposRequeridos as $campo) {
        if (empty($datos[$campo])) {
            http_response_code(400);
            echo json_encode(['exito' => false, 'mensaje' => "El campo '$campo' es obligatorio."]);
            return;
        }
    }

    // Validar formato de email
    if (!filter_var($datos['email'], FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['exito' => false, 'mensaje' => 'El formato del correo electrónico no es válido.']);
        return;
    }

    // Verificar email duplicado
    $verificar = $conexion->prepare("SELECT id_persona FROM persona WHERE email = :email");
    $verificar->execute([':email' => trim($datos['email'])]);
    if ($verificar->fetch()) {
        http_response_code(409);
        echo json_encode(['exito' => false, 'mensaje' => 'Ya existe una persona registrada con ese correo electrónico.']);
        return;
    }

    try {
        $consulta = $conexion->prepare(
            "INSERT INTO persona (nombre, apellido, email, telefono, direccion, ciudad, codigo_postal)
             VALUES (:nombre, :apellido, :email, :telefono, :direccion, :ciudad, :codigo_postal)"
        );

        $consulta->execute([
            ':nombre'        => trim($datos['nombre']),
            ':apellido'      => trim($datos['apellido']),
            ':email'         => trim($datos['email']),
            ':telefono'      => isset($datos['telefono']) ? trim($datos['telefono']) : null,
            ':direccion'     => trim($datos['direccion']),
            ':ciudad'        => trim($datos['ciudad']),
            ':codigo_postal' => isset($datos['codigo_postal']) ? trim($datos['codigo_postal']) : null
        ]);

        $nuevoId = $conexion->lastInsertId();

        http_response_code(201);
        echo json_encode([
            'exito'   => true,
            'mensaje' => 'Persona creada exitosamente.',
            'id'      => intval($nuevoId)
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['exito' => false, 'mensaje' => 'Error al crear la persona.', 'error' => $e->getMessage()]);
    }
}

/**
 * Actualizar una persona existente
 */
function actualizarPersona($conexion, $id) {
    $datos = json_decode(file_get_contents('php://input'), true);

    if (empty($datos)) {
        http_response_code(400);
        echo json_encode(['exito' => false, 'mensaje' => 'No se enviaron datos para actualizar.']);
        return;
    }

    // Si se actualiza el email, verificar que no esté duplicado
    if (isset($datos['email'])) {
        if (!filter_var($datos['email'], FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(['exito' => false, 'mensaje' => 'El formato del correo electrónico no es válido.']);
            return;
        }

        $verificar = $conexion->prepare("SELECT id_persona FROM persona WHERE email = :email AND id_persona != :id");
        $verificar->execute([':email' => trim($datos['email']), ':id' => $id]);
        if ($verificar->fetch()) {
            http_response_code(409);
            echo json_encode(['exito' => false, 'mensaje' => 'Ese correo electrónico ya está registrado por otra persona.']);
            return;
        }
    }

    $camposPermitidos = ['nombre', 'apellido', 'email', 'telefono', 'direccion', 'ciudad', 'codigo_postal'];
    $sets = [];
    $parametros = [':id' => $id];

    foreach ($camposPermitidos as $campo) {
        if (array_key_exists($campo, $datos)) {
            $sets[] = "$campo = :$campo";
            $parametros[":$campo"] = trim($datos[$campo]);
        }
    }

    if (empty($sets)) {
        http_response_code(400);
        echo json_encode(['exito' => false, 'mensaje' => 'No se proporcionaron campos válidos para actualizar.']);
        return;
    }

    try {
        $sql = "UPDATE persona SET " . implode(', ', $sets) . " WHERE id_persona = :id";
        $consulta = $conexion->prepare($sql);
        $consulta->execute($parametros);

        if ($consulta->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['exito' => false, 'mensaje' => 'Persona no encontrada o sin cambios.']);
            return;
        }

        echo json_encode(['exito' => true, 'mensaje' => 'Persona actualizada exitosamente.']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['exito' => false, 'mensaje' => 'Error al actualizar la persona.', 'error' => $e->getMessage()]);
    }
}

/**
 * Eliminar una persona
 */
function eliminarPersona($conexion, $id) {
    try {
        // Verificar que no tenga envíos asociados
        $verificar = $conexion->prepare("SELECT COUNT(*) as total FROM envio WHERE id_persona = :id");
        $verificar->execute([':id' => $id]);
        $resultado = $verificar->fetch();

        if ($resultado['total'] > 0) {
            http_response_code(409);
            echo json_encode([
                'exito'   => false,
                'mensaje' => 'No se puede eliminar: esta persona tiene envíos asociados.'
            ]);
            return;
        }

        $consulta = $conexion->prepare("DELETE FROM persona WHERE id_persona = :id");
        $consulta->execute([':id' => $id]);

        if ($consulta->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['exito' => false, 'mensaje' => 'Persona no encontrada.']);
            return;
        }

        echo json_encode(['exito' => true, 'mensaje' => 'Persona eliminada exitosamente.']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['exito' => false, 'mensaje' => 'Error al eliminar la persona.', 'error' => $e->getMessage()]);
    }
}
