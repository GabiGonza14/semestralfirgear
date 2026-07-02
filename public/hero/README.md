# Imagenes del HeroCarousel

Coloca aqui las 3 fotos definitivas del carrusel del landing:

| Archivo       | Slide | Titulo                          |
| ------------- | ----- | -------------------------------- |
| `slide-1.jpg` | 1     | Equipo para tu mejor version     |
| `slide-2.jpg` | 2     | Fuerza, cardio y recuperacion    |
| `slide-3.jpg` | 3     | Rendimiento real                 |

Recomendaciones:

- Formato horizontal, minimo 1920x1080 (el carrusel llega hasta ~88vh de alto).
- `.jpg` o `.webp` comprimido (idealmente < 400kb) para no penalizar la carga.
- Fotos con suficiente contraste en la mitad inferior/izquierda: ahi va el
  titulo en blanco sobre una capa oscura.

Una vez agregadas las imagenes, edita
`src/components/HeroCarousel.tsx` y cambia el campo `image` de cada slide en
el array `SLIDES`, por ejemplo:

```ts
{
  id: 'slide-1',
  image: '/hero/slide-1.jpg', // antes: PLACEHOLDER_IMAGE
  title: 'Equipo para tu mejor version',
  subtitle: 'Entrena con accesorios resistentes y de alto rendimiento.',
},
```

Los archivos en `public/` se sirven desde la raiz del sitio, por lo que
`public/hero/slide-1.jpg` queda disponible en `/hero/slide-1.jpg` sin
necesidad de import ni build adicional.
