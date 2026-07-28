FROM php:8.2-apache

# Habilitamos extensiones de base de datos que tu proyecto probablemente use
RUN docker-php-ext-install pdo pdo_mysql mysqli

# Copiamos todo tu proyecto a la carpeta que expone el servidor Apache
COPY . /var/www/html/

# Damos permisos correctos a los archivos
RUN chown -R www-data:www-data /var/www/html

# Exponemos el puerto 80
EXPOSE 80
