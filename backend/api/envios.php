<?php
// API: Gestión de Envíos (CRUD)

session_start();
require_once __DIR__ . '/../config/conexion.php';

$metodo = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? intval($_GET['id']) : null;
$estado = isset($_GET['estado']) ? trim($_GET['estado']) : null;

switch ($metodo) {
    case 'GET':
        if ($id) {
            obtenerEnvio($conexion, $id);
        } else {
            listarEnvios($conexion, $estado);
        }
        break;

    case 'POST':
        crearEnvio($conexion);
        break;

    case 'PUT':
        if ($id) {
            actualizarEnvio($conexion, $id);
        } else {
            http_response_code(400);
            echo json_encode(['exito' => false, 'mensaje' => 'Se requiere el parámetro id.']);
        }
        break;

    case 'DELETE':
        if ($id) {
            eliminarEnvio($conexion, $id);
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

// CONSULTA BASE CON JOINS

/**
 * Devuelve la consulta SQL base con todos los JOINs necesarios
 */
function consultaBase() {
    return "SELECT 
                env.id_envio,
                env.codigo_rastreo,
                env.fecha_envio,
                env.fecha_entrega_estimada,
                env.estado,
                env.direccion_envio,
                env.observaciones,
                
                -- Ejemplar
                ej.id_ejemplar,
                ej.numero_edicion,
                ej.fecha_publicacion,
                ej.precio,

                -- Revista (a través del ejemplar)
                r.id_revista,
                r.titulo       AS revista_titulo,
                r.genero       AS revista_genero,

                -- Persona
                p.id_persona,
                p.nombre       AS persona_nombre,
                p.apellido     AS persona_apellido,
                p.email        AS persona_email,
                p.telefono     AS persona_telefono,
                p.direccion    AS persona_direccion,
                p.ciudad       AS persona_ciudad,

                -- Agencia
                a.id_agencia,
                a.nombre       AS agencia_nombre,
                a.telefono     AS agencia_telefono,
                a.email        AS agencia_email

            FROM envio env
            INNER JOIN ejemplar ej          ON env.id_ejemplar = ej.id_ejemplar
            INNER JOIN revista r            ON ej.id_revista   = r.id_revista
            INNER JOIN persona p            ON env.id_persona  = p.id_persona
            INNER JOIN agencia_transporte a ON env.id_agencia  = a.id_agencia";
}

// FUNCIONES

/**
 * Listar todos los envíos con datos relacionados
 */
function listarEnvios($conexion, $estado = null) {
    try {
        $sql = consultaBase();
        $parametros = [];

        // Filtrar por estado si se proporciona
        if ($estado) {
            $estadosValidos = ['pendiente', 'en_transito', 'entregado', 'devuelto'];
            if (!in_array($estado, $estadosValidos)) {
                http_response_code(400);
                echo json_encode([
                    'exito'   => false,
                    'mensaje' => 'Estado no válido. Valores permitidos: ' . implode(', ', $estadosValidos)
                ]);
                return;
            }
            $sql .= " WHERE env.estado = :estado";
            $parametros[':estado'] = $estado;
        }

        $sql .= " ORDER BY env.fecha_envio DESC";

        $consulta = $conexion->prepare($sql);
        $consulta->execute($parametros);
        $envios = $consulta->fetchAll();

        echo json_encode([
            'exito' => true,
            'datos' => $envios,
            'total' => count($envios)
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['exito' => false, 'mensaje' => 'Error al listar envíos.', 'error' => $e->getMessage()]);
    }
}

/**
 * Obtener un envío por ID con detalle completo
 */
function obtenerEnvio($conexion, $id) {
    try {
        $sql = consultaBase() . " WHERE env.id_envio = :id";
        $consulta = $conexion->prepare($sql);
        $consulta->execute([':id' => $id]);
        $envio = $consulta->fetch();

        if (!$envio) {
            http_response_code(404);
            echo json_encode(['exito' => false, 'mensaje' => 'Envío no encontrado.']);
            return;
        }

        echo json_encode(['exito' => true, 'datos' => $envio]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['exito' => false, 'mensaje' => 'Error al obtener el envío.', 'error' => $e->getMessage()]);
    }
}

/**
 * Crear un nuevo envío
 */
function crearEnvio($conexion) {
    $datos = json_decode(file_get_contents('php://input'), true);

    // Validar campos obligatorios
    $camposRequeridos = ['id_ejemplar', 'id_persona', 'id_agencia', 'fecha_envio', 'direccion_envio'];
    foreach ($camposRequeridos as $campo) {
        if (!isset($datos[$campo]) || $datos[$campo] === '') {
            http_response_code(400);
            echo json_encode(['exito' => false, 'mensaje' => "El campo '$campo' es obligatorio."]);
            return;
        }
    }

    // Validar que el ejemplar exista
    $verificar = $conexion->prepare("SELECT id_ejemplar FROM ejemplar WHERE id_ejemplar = :id");
    $verificar->execute([':id' => intval($datos['id_ejemplar'])]);
    if (!$verificar->fetch()) {
        http_response_code(400);
        echo json_encode(['exito' => false, 'mensaje' => 'El ejemplar especificado no existe.']);
        return;
    }

    // Validar que la persona exista
    $verificar = $conexion->prepare("SELECT id_persona FROM persona WHERE id_persona = :id");
    $verificar->execute([':id' => intval($datos['id_persona'])]);
    if (!$verificar->fetch()) {
        http_response_code(400);
        echo json_encode(['exito' => false, 'mensaje' => 'La persona especificada no existe.']);
        return;
    }

    // Validar que la agencia exista y esté activa
    $verificar = $conexion->prepare("SELECT id_agencia, activo FROM agencia_transporte WHERE id_agencia = :id");
    $verificar->execute([':id' => intval($datos['id_agencia'])]);
    $agencia = $verificar->fetch();
    if (!$agencia) {
        http_response_code(400);
        echo json_encode(['exito' => false, 'mensaje' => 'La agencia especificada no existe.']);
        return;
    }
    if ($agencia['activo'] != 1) {
        http_response_code(400);
        echo json_encode(['exito' => false, 'mensaje' => 'La agencia seleccionada está inactiva.']);
        return;
    }

    // Validar estado si se proporciona
    $estadosValidos = ['pendiente', 'en_transito', 'entregado', 'devuelto'];
    $estado = isset($datos['estado']) ? $datos['estado'] : 'pendiente';
    if (!in_array($estado, $estadosValidos)) {
        http_response_code(400);
        echo json_encode(['exito' => false, 'mensaje' => 'Estado no válido.']);
        return;
    }

    try {
        $codigo_rastreo = 'REV-' . strtoupper(substr(md5(uniqid(rand(), true)), 0, 8));

        $consulta = $conexion->prepare(
            "INSERT INTO envio (id_ejemplar, id_persona, id_agencia, fecha_envio, fecha_entrega_estimada, estado, direccion_envio, observaciones, codigo_rastreo)
             VALUES (:id_ejemplar, :id_persona, :id_agencia, :fecha_envio, :fecha_entrega_estimada, :estado, :direccion_envio, :observaciones, :codigo_rastreo)"
        );

        $consulta->execute([
            ':id_ejemplar'           => intval($datos['id_ejemplar']),
            ':id_persona'            => intval($datos['id_persona']),
            ':id_agencia'            => intval($datos['id_agencia']),
            ':fecha_envio'           => $datos['fecha_envio'],
            ':fecha_entrega_estimada'=> isset($datos['fecha_entrega_estimada']) ? $datos['fecha_entrega_estimada'] : null,
            ':estado'                => $estado,
            ':direccion_envio'       => trim($datos['direccion_envio']),
            ':observaciones'         => isset($datos['observaciones']) ? trim($datos['observaciones']) : null,
            ':codigo_rastreo'        => $codigo_rastreo
        ]);

        $nuevoId = $conexion->lastInsertId();

        http_response_code(201);
        echo json_encode([
            'exito'   => true,
            'mensaje' => 'Envío creado exitosamente.',
            'id'      => intval($nuevoId),
            'codigo_rastreo' => $codigo_rastreo
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['exito' => false, 'mensaje' => 'Error al crear el envío.', 'error' => $e->getMessage()]);
    }
}

/**
 * Actualizar un envío existente
 */
function actualizarEnvio($conexion, $id) {
    $datos = json_decode(file_get_contents('php://input'), true);

    if (empty($datos)) {
        http_response_code(400);
        echo json_encode(['exito' => false, 'mensaje' => 'No se enviaron datos para actualizar.']);
        return;
    }

    // Validar estado si se actualiza
    if (isset($datos['estado'])) {
        $estadosValidos = ['pendiente', 'en_transito', 'entregado', 'devuelto'];
        if (!in_array($datos['estado'], $estadosValidos)) {
            http_response_code(400);
            echo json_encode(['exito' => false, 'mensaje' => 'Estado no válido.']);
            return;
        }
    }

    $camposPermitidos = ['id_ejemplar', 'id_persona', 'id_agencia', 'fecha_envio', 'fecha_entrega_estimada', 'estado', 'direccion_envio', 'observaciones'];
    $sets = [];
    $parametros = [':id' => $id];

    foreach ($camposPermitidos as $campo) {
        if (array_key_exists($campo, $datos)) {
            $sets[] = "$campo = :$campo";
            if (in_array($campo, ['id_ejemplar', 'id_persona', 'id_agencia'])) {
                $parametros[":$campo"] = intval($datos[$campo]);
            } else {
                $parametros[":$campo"] = is_null($datos[$campo]) ? null : trim($datos[$campo]);
            }
        }
    }

    if (empty($sets)) {
        http_response_code(400);
        echo json_encode(['exito' => false, 'mensaje' => 'No se proporcionaron campos válidos para actualizar.']);
        return;
    }

    try {
        $sql = "UPDATE envio SET " . implode(', ', $sets) . " WHERE id_envio = :id";
        $consulta = $conexion->prepare($sql);
        $consulta->execute($parametros);

        if ($consulta->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['exito' => false, 'mensaje' => 'Envío no encontrado o sin cambios.']);
            return;
        }

        echo json_encode(['exito' => true, 'mensaje' => 'Envío actualizado exitosamente.']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['exito' => false, 'mensaje' => 'Error al actualizar el envío.', 'error' => $e->getMessage()]);
    }
}

/**
 * Eliminar un envío
 */
function eliminarEnvio($conexion, $id) {
    try {
        $consulta = $conexion->prepare("DELETE FROM envio WHERE id_envio = :id");
        $consulta->execute([':id' => $id]);

        if ($consulta->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['exito' => false, 'mensaje' => 'Envío no encontrado.']);
            return;
        }

        echo json_encode(['exito' => true, 'mensaje' => 'Envío eliminado exitosamente.']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['exito' => false, 'mensaje' => 'Error al eliminar el envío.', 'error' => $e->getMessage()]);
    }
}
