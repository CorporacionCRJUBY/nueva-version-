# ACADEMIX 2.0 — Demo Accounts

> Actualizado tras la auditoría completa de base de datos (ver
> `AUDITORIA_COMPLETA_BASE_DATOS_Y_FUNCIONES.md`). Las cuentas listadas
> abajo son las que **realmente existen** en `database/seeds/03_users.seed.js`
> y funcionan contra una base de datos recién sembrada (`npm run db:fresh`).
> El documento anterior listaba cuentas (`superadmin@nda.edu`,
> `admin.kissimmee@nda.edu`, `john.smith@nda.edu`, `sarah.jenkins@nda.edu`)
> que nunca existieron en los seeds — ninguna de ellas podía iniciar sesión.

| Role | Email | Password | Access Scope |
|---|---|---|---|
| **Super Admin** | `admin@academix.com` | `Academix2026!` | Acceso global: consola, configuración, logs del sistema |
| **Administrator** | `admin2@academix.com` | `Academix2026!` | Gestión académica y administrativa general |
| **Teacher** | `maria.gonzalez@academix.com` | `Academix2026!` | Rol TEACHER — vinculada a la fila `teachers` "María González" (Matemáticas) |

## Notas

- Las tres cuentas quedan disponibles automáticamente tras correr
  `npm run db:fresh` o `npm run migrate && npm run seed`.
- Antes de esta auditoría, **ningún profesor sembrado tenía usuario
  vinculado** (`teachers.user_id` era `null` en las 3 filas de
  `04_teachers.seed.js`), por lo que era imposible probar el sistema como
  docente con datos de demo. Se vinculó `maria.gonzalez@academix.com` a la
  primera fila de `teachers` para cubrir ese caso; los otros dos profesores
  del seed (Carlos Rodríguez, Ana Martínez) siguen sin usuario porque no
  hay evidencia de que la app los necesite con login propio — se puede
  replicar el mismo patrón si se requiere más adelante.
- La contraseña de las tres cuentas es la misma (`Academix2026!`) solo por
  simplicidad del entorno de demo; cumple la política de contraseñas
  (mínimo 10 caracteres, mayúscula, minúscula, dígito y símbolo). En
  producción cada usuario debe tener su propia contraseña.
