# Bitácora Estelar

App web instalable (PWA) para archivar fotos de planetas y lunas en álbumes.

## Correr en tu computadora

```bash
npm install
npm run dev
```

Abre la URL que muestre la terminal (normalmente http://localhost:5173).

## Generar la versión de producción

```bash
npm run build
npm run preview
```

Esto crea la carpeta `dist/` lista para publicar.

## Publicarla en internet (para instalarla como app)

La forma más simple es subir la carpeta a un hosting gratuito:

- **Vercel**: `npx vercel` (sigue las instrucciones) o arrastra la carpeta del proyecto a vercel.com
- **Netlify**: arrastra la carpeta `dist/` a app.netlify.com/drop
- **GitHub Pages**: sube el proyecto a un repositorio y activa Pages apuntando a `dist/`

Una vez publicada con HTTPS, al abrirla desde el celular o la computadora el navegador
ofrecerá la opción "Instalar app" / "Agregar a pantalla de inicio", y funcionará como
una app normal, incluso sin conexión.

## Notas técnicas

- Los datos (álbumes, fotos, notas) se guardan en el propio navegador con IndexedDB —
  no hay servidor ni base de datos externa. Si el usuario borra los datos del navegador,
  se pierde el contenido.
- Las fotos se redimensionan automáticamente antes de guardarse para no ocupar
  demasiado espacio.
- Construida con React + Vite + Tailwind CSS + vite-plugin-pwa.
