<?php
// API: Script para crear usuario administrador por defecto

require_once __DIR__ . '/../config/conexion.php';

try {
    // Verificar si la tabla usuarios existe y tiene la estructura correcta
    $columnas = $conexion->query("SHOW COLUMNS FROM usuarios")->fetchAll();
    $nombresColumnas = array_map(function($col) { return $col['Field']; }, $columnas);

    // Si falta alguna columna esencial, recrear la tabla
    if (!in_array('activo', $nombresColumnas) || !in_array('fecha_creacion', $nombresColumnas)) {
        $conexion->exec("DROP TABLE IF EXISTS usuarios");
        $conexion->exec("
            CREATE TABLE usuarios (
                id_usuario      INT AUTO_INCREMENT PRIMARY KEY,
                nombre          VARCHAR(100)    NOT NULL,
                email           VARCHAR(150)    NOT NULL,
                clave_hash      VARCHAR(255)    NOT NULL,
                rol             VARCHAR(30)     NOT NULL DEFAULT 'administrador',
                activo          TINYINT(1)      NOT NULL DEFAULT 1,
                fecha_creacion  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_usuario_email UNIQUE (email)
            ) ENGINE=InnoDB
        ");
    }

    // Verificar si ya existe un administrador
    $consulta = $conexion->prepare("SELECT COUNT(*) as total FROM usuarios WHERE email = :email");
    $consulta->execute([':email' => 'admin@revistaexpress.com']);
    $resultado = $consulta->fetch();

    if ($resultado['total'] > 0) {
        echo json_encode([
            'exito'   => false,
            'mensaje' => 'El usuario administrador ya existe. No es necesario crearlo de nuevo.'
        ]);
        exit();
    }

    // Crear el hash seguro de la contraseña
    $claveHash = password_hash('admin123', PASSWORD_BCRYPT);

    // Insertar el usuario administrador
    $insertar = $conexion->prepare(
        "INSERT INTO usuarios (nombre, email, clave_hash, rol, activo) 
         VALUES (:nombre, :email, :clave_hash, :rol, 1)"
    );

    $insertar->execute([
        ':nombre'     => 'Administrador',
        ':email'      => 'admin@revistaexpress.com',
        ':clave_hash' => $claveHash,
        ':rol'        => 'administrador'
    ]);

    echo json_encode([
        'exito'   => true,
        'mensaje' => 'Usuario administrador creado exitosamente.',
        'datos'   => [
            'email'      => 'admin@revistaexpress.com',
            'contraseña' => 'admin123',
            'nota'       => 'Cambia esta contraseña en producción.'
        ]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'exito'   => false,
        'mensaje' => 'Error al crear el usuario.',
        'error'   => $e->getMessage()
    ]);
}
