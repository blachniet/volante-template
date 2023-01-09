# Volante Template

This is a template for a Volante-powered Node.js project that is set up as an example backend for the [vuestro-template](https://github.com/msmiley/vuestro-template) project.

See the vuestro-template README for info on how to set up the frontend.

The following documentation will describe how to get an end-to-end demo working.

## End-to-End Setup

1. Follow Development (npm run dev) instructions for vuestro-template
1. `docker run -d --name mongo -p 27017:27017 msmiley/mongo-alpine` (or install mongo locally)
1. `git clone git@github.com:msmiley/volante-template`
1. `cd volante-template`
1. `npm i`
1. `npm run dev`

## Swagger UI

This template is set up to parse all Swagger/OpenAPI compatible docs and renders them in a Swagger UI for testing and exploration. The UI is served up by default at:

http://localhost:3000/api/swagger

The Swagger UI page can be disabled (e.g. for production) by setting the `VolanteSwagger.enabled` prop to false in `config.json`.

## Release (npm run build)

This template's release script uses the included Dockerfile to build a Docker image based on Alpine Linux.

## License

ISC