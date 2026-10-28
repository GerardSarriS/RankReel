# RankReel Studio

Editor web para crear vídeos de rankings verticales (Top 5, Top 10…) listos para TikTok, Reels y Shorts. Todo se procesa en el navegador: los vídeos no se suben a ningún servidor.

## Qué hace (MVP)

- **Clips:** subes vídeos (o los arrastras a la vista previa). Cada clip recibe un puesto (#1, #2…) y una etiqueta.
- **Timeline:** reordenas arrastrando, recortas el inicio y el fin, divides en el cabezal, borras y haces zoom.
- **Ranking:**
  - lista de cuenta atrás: todos los números desde el principio y los nombres aparecen cuando se reproduce su clip;
  - insignia `#N`;
  - etiqueta grande del clip;
  - botones para barajar el orden u ordenar en cuenta atrás (cada puesto se queda con su clip).
- **Lienzo y título:**
  - 1080×1920, con el clip rellenando o ajustado al lienzo y color de fondo;
  - título gancho con palabras resaltadas;
  - fuentes Archivo, Rubik, Anton y Bebas Neue, con tamaño y colores.
- **Renderizar:** graba el lienzo con el audio en tiempo real y descarga el vídeo. Sale en MP4 si el navegador lo admite (Chrome y Edge recientes, Safari) y en WebM si no.

## Desarrollo

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # comprobación de tipos y build de producción en dist/
npm run lint
```

## Cómo está hecho

- `src/engine/Player.ts`: motor de reproducción fuera de React. Usa un `<video>` oculto por archivo, dibuja en un `<canvas>` en cada fotograma y enruta el audio por Web Audio para poder grabarlo con `MediaRecorder`.
- `src/engine/draw.ts`: dibujado del vídeo y de los textos (título, lista, insignia y etiqueta).
- `src/timeline.ts`: cálculo de tiempos de los clips y utilidades.
- `src/components/`: paneles, vista previa, timeline e inspector del clip.

## Próximos pasos

- Guion y voz en off (texto a voz) y «Ajustar a la voz en off».
- Subtítulos automáticos.
- Exportación más rápida que el tiempo real con WebCodecs.
- Guardar y abrir proyectos.
