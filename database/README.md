# Database - ERS

## Estructura

```
database/
├── 01_schema.sql      # Schema completo (tablas, indices, triggers)
├── 02_seed_data.sql   # Datos de prueba
└── README.md          # Este archivo
```

## Tablas Principales

| Tabla | Descripcion | Registros seed |
|-------|-------------|----------------|
| `users` | Usuarios (admin, sellers, buyers) | 10 |
| `products` | Productos nuevos y usados | 15 |
| `orders` | Ordenes de compra | 8 |
| `verifications` | Verificaciones de productos usados | 10 |
| `reviews` | Resenas y quejas | 6 |

## Tablas Secundarias

| Tabla | Descripcion | Registros seed |
|-------|-------------|----------------|
| `categories` | Categorias de productos | 10 |
| `product_images` | Imagenes de productos | 8 |
| `addresses` | Direcciones de usuarios | 5 |
| `favorites` | Favoritos de usuarios | 5 |
| `messages` | Mensajes entre usuarios | 6 |
| `notifications` | Notificaciones | 5 |
| `verification_checklist` | Checklist por categoria | 15 |
| `verification_items` | Items verificados | 0 |

## Ejecutar

### Con Docker

```bash
# Crear contenedor PostgreSQL
docker run --name ers-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=ers_components -p 5432:5432 -d postgres:15

# Ejecutar schema
docker exec -i ers-db psql -U postgres -d ers_components < database/01_schema.sql

# Ejecutar seed data
docker exec -i ers-db psql -U postgres -d ers_components < database/02_seed_data.sql
```

### Local

```bash
# Ejecutar schema
psql -U postgres -d ers_components -f database/01_schema.sql

# Ejecutar seed data
psql -U postgres -d ers_components -f database/02_seed_data.sql
```

## Datos de Prueba

### Usuarios

| Email | Password | Rol |
|-------|----------|-----|
| admin@ers.com | password123 | admin |
| carlos@tech.com | password123 | seller |
| maria@hardware.com | password123 | seller |
| juan@components.com | password123 | seller |
| ana@digital.com | password123 | seller |
| pedro@gamer.com | password123 | buyer |
| laura@pc.com | password123 | buyer |
| diego@tech.com | password123 | buyer |
| sofia@hardware.com | password123 | buyer |
| martin@pc.com | password123 | buyer |

### Productos

- 10 productos usados (verificados)
- 5 productos nuevos
- Categorias: GPU, CPU, RAM, Storage, Phone, Monitor, Keyboard, Mouse

### Ordenes

- 4 entregadas
- 1 en custodia
- 1 pagada
- 1 pendiente
- 1 cancelada

### Reviews

- 4 positivas
- 1 neutral
- 1 queja pendiente
