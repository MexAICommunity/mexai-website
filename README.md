# Astro Starter Kit: Minimal

```sh
npm create astro@latest -- --template minimal
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## Agenda y archivo de encuentros

La portada y el archivo en `/encuentros/` leen la colección de Astro en
`src/content/encuentros/`. Cada archivo contiene los datos públicos de un evento.
Puedes editar `title` y `summary` arriba del bloque de Eventbrite y escribir la
reseña, las fotos y los enlaces a recursos debajo del frontmatter. El script
actualiza el bloque entre los comentarios de Eventbrite y conserva el resto
del archivo. Mantén los comentarios y el ID al editar.

Para un encuentro histórico, usa `historical.date` (`AAAA-MM-DD` o `AAAA-MM`)
y un `title`. Puedes añadir `historical.venue`, `hero` y `gallery`. Cada foto
lleva `src` (archivo bajo `/encuentros/fotos/` o portada de Eventbrite) y `alt`
(descripción breve).
Con `historical.matchEventbrite: true`, la primera sincronización añade el
registro de Eventbrite si hay una coincidencia única por fecha local. Las
reseñas históricas siguen en el archivo aunque se retire el registro de Eventbrite.

Configura la integración en **Settings → Secrets and variables → Actions**:

1. Agrega `EVENTBRITE_TOKEN` como secreto del repositorio, con un token privado
   de una cuenta con acceso a los eventos de MexAI.
2. Agrega `EVENTBRITE_ORGANIZATION_ID` como variable del repositorio. Consulta
   `GET https://www.eventbriteapi.com/v3/users/me/organizations/` con ese token
   para encontrar el ID de la organización. El perfil de organizador
   `106303535081` ya está configurado en el script.
3. Comprueba que la rama predeterminada permita al workflow publicar los
   cambios y que el hosting haga un deploy al recibir ese push.

**Sync Eventbrite** corre todos los días a las 7:17 a. m. (hora de Guadalajara).
También puedes ejecutarlo en **Actions → Sync Eventbrite → Run workflow**.
Si cambia un evento o termina uno, se actualiza su Markdown y se crea un
commit después de verificar el build. Los eventos cancelados, retirados,
privados o con fecha de inicio oculta dejan de mostrarse. Una falla de la
API detiene la sincronización antes de modificar los archivos.
