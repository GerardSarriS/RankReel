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
- **Desde TikTok:** pegas el enlace de un TikTok y se añade como clip o se descarga en MP4 sin marca de agua (función `api/tiktok.ts`).
- **Guion y voz:** voz en off generada en el navegador (Piper), subida o grabada; «Ajustar a la voz» corta los clips contra ella.
- **Subtítulos:** sincronizados con la voz, estimados desde el guion o transcritos con Whisper.
- **Sonidos:** biblioteca de 21 efectos sintetizados en el navegador (transiciones, impactos, ranking, juego y humor, interfaz), tus propios sonidos, una pista de efectos en el timeline y un efecto automático en cada cambio de puesto.
- **Renderizar:** graba el lienzo con el audio en tiempo real y descarga el vídeo. Sale en MP4 si el navegador lo admite (Chrome y Edge recientes, Safari) y en WebM si no.

## Desarrollo

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # comprobación de tipos y build de producción en dist/
npm run lint
```

La función `api/tiktok.ts` funciona en `npm run dev` y `npm run preview` (Vite la sirve) y en Vercel como Vercel Function. En un hosting solo estático, la importación desde TikTok no está disponible.

## Cómo está hecho

- `src/engine/Player.ts`: motor de reproducción fuera de React. Usa un `<video>` oculto por archivo, dibuja en un `<canvas>` en cada fotograma y enruta el audio por Web Audio para poder grabarlo con `MediaRecorder`.
- `src/engine/draw.ts`: dibujado del vídeo y de los textos (título, lista, insignia y etiqueta).
- `src/timeline.ts`: cálculo de tiempos de los clips y utilidades.
- `src/components/`: paneles, vista previa, timeline e inspector del clip.

## Próximos pasos

- Exportación más rápida que el tiempo real con WebCodecs.
- Guardar y abrir proyectos.
