# Imágenes de producto (locales)

Colocá acá los archivos y el backend los sirve en:

```
http://<host>:3000/static/products/<archivo>
```

El seed del backend (`products.seed.ts` → `PRODUCT_IMAGES`) mapea cada producto a
un archivo. Si el archivo no existe, la app muestra el ícono genérico (no rompe).

## Mapeo actual

| Archivo | Producto(s) |
|---|---|
| `ryzen7-7800x3d.webp` | AMD Ryzen 7 7800X3D |
| `ryzen9-7950x.webp` | AMD Ryzen 9 7950X Sellado |
| `ryzen5-7600x.webp` | AMD Ryzen 5 7600X verificado · Ryzen 5 5600X |
| `intel-i5-14600k.webp` | Intel Core i5-14600K (y Sellado) · i5-13600K |
| `rtx-4090.webp` | RTX 4090 sin factura |
| `rtx-4070-super.webp` | NVIDIA RTX 4070 Super verificada |
| `rtx-4060.webp` | NVIDIA RTX 4060 OC Nueva |
| `rtx-3070ti.webp` | RTX 3070 Ti Founder Edition |
| `rtx-3060.webp` | RTX 3060 12GB |
| `galaxy-s24-ultra.webp` | Samsung Galaxy S24 Ultra Sellado |
| `galaxy-s23-ultra.webp` | Samsung Galaxy S23 Ultra |
| `galaxy-s21.webp` | Samsung Galaxy S21 · Galaxy S21 128GB |
| `iphone13.webp` | iPhone 13 con detalles en pantalla |
| `kingston-fury-ddr4.webp` | Kingston Fury Beast 16GB DDR4 3200MHz |
| `ddr5-corsair.webp` | DDR5 Corsair 32GB 6000MHz |
| `macbook-air-m3.webp` | MacBook Air M3 13 Sellada |
| `notebook-legion-5.webp` | Notebook Gamer Lenovo Legion 5 |

> Fuente: imágenes de referencia tomadas de Mercado Libre para los productos ficticios.
