const fs = require('fs');
const path = require('path');
const express = require('express');
const swaggerJSDoc = require('swagger-jsdoc');
const version = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'))).version;

module.exports = {
  name: 'SwaggerModule',
  data() {
    return {
      router: null,
      // swagger-jsdoc options
      options: {
        definition: {
          openapi: '3.0.1',
          info: {
            title: this.$hub.config.swagger.title,
            version,
            description: this.$hub.config.swagger.description,
          },
          securityDefinitions: {
            JWT: {
              type: 'apiKey',
              name: 'Authorization',
              in: 'header',
            },
            SignInAuth: {
              type: 'basic',
            },
          },
          responses: {
            InternalServerError: {
              description: "Internal Server Error"
            },
            OK: {
              description: "OK"
            },
            Unauthorized: {
              description: "Unauthorized"
            }
          },
          basePath: '/',
        },
        apis: [path.join(__dirname, '**/*.js')],
      },
      swaggerUiDistPath: '../node_modules/swagger-ui-dist',
      swaggerUiUrl:'/api/swagger',
      swaggerJsonUrl: '/api/swagger.json',
      newHtml: '',
    };
  },
  init() {
    // set up the routes
    this.router = express.Router();

    this.newHtml = this.hackSwaggerHtmlFile();

    // expose the json
    this.router.all(this.swaggerJsonUrl, (req, res) => res.json(swaggerJSDoc(this.options)));
    // everything else is handled by serveSwaggerUi
    this.router.all(`${this.swaggerUiUrl}*`, this.serveSwaggerUi);

    this.$log('adding router to VolanteExpress');
  },
  events: {
    'VolanteExpress.pre-start'(app) {
      app.use(this.router);
    },
  },
  methods: {
    // hack the swagger html file
    hackSwaggerHtmlFile() {
      return fs.readFileSync(path.join(__dirname, this.swaggerUiDistPath, 'index.html'), { encoding:'utf-8' })
               .replace('https://petstore.swagger.io/v2/swagger.json', this.swaggerJsonUrl)
               .replace('</title>', `</title><base href="${this.swaggerUiUrl}/">`);
    },
    // express middleware function to send swagger ui
    serveSwaggerUi(req, res) {
      let p = req.path.split(/\/swagger\/?/);
      if (p[1].length === 0) {
        res.send(this.newHtml);
      } else {
        res.sendFile(p[1], {root: path.join(__dirname, this.swaggerUiDistPath)});
      }
    },
  }
};