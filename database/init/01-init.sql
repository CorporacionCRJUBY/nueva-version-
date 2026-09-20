-- FILE: database/init/01-init.sql
-- Inicialización de la base de datos ACADEMIX sobre un MySQL/MariaDB NATIVO.
--
-- ⚠️ El proyecto NO despliega la base de datos en un contenedor: se conecta al
--    servidor MySQL/MariaDB instalado en la máquina anfitriona. Este script se
--    ejecuta UNA VEZ, como usuario administrador de ese servidor:
--
--        sudo mysql < database/init/01-init.sql
--        # o:  mysql -u root -p < database/init/01-init.sql
--
--    Si desplegaras con Docker, el contenedor del backend llega a este mismo
--    servidor a través de `host.docker.internal`; por eso se crea el usuario
--    tanto para 'localhost' como para '%'.
--
-- Idempotente: puede ejecutarse varias veces sin efectos secundarios.

-- 1) Base de datos con UTF-8 completo (emojis, acentos, alfabetos no latinos).
CREATE DATABASE IF NOT EXISTS `academix_v2`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- 2) Usuario de la aplicación.
--    ⚠️ CAMBIA la contraseña y usa LA MISMA en `backend/.env` (DB_PASSWORD).
CREATE USER IF NOT EXISTS 'ADMIN'@'localhost' IDENTIFIED BY 'CAMBIA_ESTA_CLAVE';
CREATE USER IF NOT EXISTS 'ADMIN'@'%'         IDENTIFIED BY 'CAMBIA_ESTA_CLAVE';

-- 3) Privilegios LIMITADOS a la base de datos de la aplicación.
GRANT ALL PRIVILEGES ON `academix_v2`.* TO 'ADMIN'@'localhost';
GRANT ALL PRIVILEGES ON `academix_v2`.* TO 'ADMIN'@'%';
FLUSH PRIVILEGES;

-- 4) Comprobación.
SELECT SCHEMA_NAME AS base_de_datos, DEFAULT_CHARACTER_SET_NAME AS charset
FROM information_schema.SCHEMATA
WHERE SCHEMA_NAME = 'academix_v2';
