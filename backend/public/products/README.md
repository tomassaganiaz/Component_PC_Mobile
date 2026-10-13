# Imágenes de producto (locales)

Colocá acá los archivos de imagen y el backend los sirve en:

```
http://<host>:3000/static/products/<archivo>
```

El seed del backend (`products.seed.ts` → `PRODUCT_IMAGES`) mapea cada producto
ficticio a un archivo. Si el archivo no existe, la app muestra el ícono genérico
(no se rompe).

## Procesadores (nombres exactos esperados)

| Producto | Archivo |
|---|---|
| AMD Ryzen 7 7800X3D | `ryzen7-7800x3d.png` |
| AMD Ryzen 9 7950X Sellado | `ryzen9-7950x.png` |
| AMD Ryzen 5 7600X verificado | `ryzen5-7600x.png` |
| Ryzen 5 5600X | `ryzen5-5600x.png` |
| Intel Core i5-14600K | `intel-i5-14600k.png` |
| Intel Core i5-14600K Sellado | `intel-i5-14600k.png` |
| Intel Core i5-13600K | `intel-i5-13600k.png` |

> Podés usar `.png`, `.jpg` o `.webp`; si cambiás la extensión, actualizá el
> archivo correspondiente en `PRODUCT_IMAGES` (backend) y este README.
