/**
 * @swagger
 *  components:
 *    schemas:
 *      example:
 *        type: "object"
 *        properties:
 *          _id:
 *            description: the 24 character mongodb id
 *            type: "string"
 *            readOnly: true
 *          name:
 *            type: "string"
 *            description: a test name string
 *          description:
 *            type: "string"
 *            description: a test description string
 *          age:
 *            type: "number"
 *            description: a test number
 *          subscribed:
 *            type: "boolean"
 *            description: a test boolean
 */

module.exports = {
  name: 'ExampleModule',
  init() {
    this.router = require('express').Router();

    /**
     * @openapi
     *
     *  /api/v1/example:
     *    get:
     *      tags:
     *        - example
     *      summary: get example
     *      description: this is an example get endpoint
     *      responses:
     *        200:
     *          description: OK
     *        500:
     *          description: Database error
     *    post:
     *      tags:
     *        - example
     *      summary: post example
     *      description: this is an example post endpoint
     *      requestBody:
     *        description: example JSON data post
     *        required: true
     *        content:
     *          application/json:
     *            schema:
     *              $ref: '#/components/schemas/example'
     *      responses:
     *        200:
     *          description: OK
     *        500:
     *          description: Database error
     */
    this.router.route('/api/v1/example')
    .get((req, res) => {
      this.$emit('mongo.find', 'example', {}, (err, docs) => {
        if (err) {
          return res.status(500).send(err);
        }
        res.send(docs);
      });
    })
    .post((req, res) => {
      this.$emit('mongo.insertOne', 'example', req.body, (err, rslt) => {
        if (err) {
          return res.status(500).send(err);
        }
        res.send(rslt);
      });
    });
    /**
     * @openapi
     *
     *  /api/v1/example/{id}:
     *    put:
     *      tags:
     *        - example
     *      summary: put example
     *      description: this is an exmaple put endpoint
     *      parameters:
     *        - name: id
     *          in: path
     *          required: true
     *      requestBody:
     *        description: example JSON mongo change
     *        required: true
     *        content:
     *          application/json:
     *            schema:
     *              type: "object"
     *              properties:
     *                $set:
     *                  $ref: '#/components/schemas/example'
     *      responses:
     *        200:
     *          description: OK
     *        500:
     *          description: Database error
     *    delete:
     *      tags:
     *        - example
     *      summary: delete example
     *      description: this is an example delete endpoint
     *      parameters:
     *        - name: id
     *          in: path
     *          required: true
     *      responses:
     *        200:
     *          description: OK
     *        500:
     *          description: Database error
     */
    this.router.route('/api/v1/example/:id')
    .put((req, res) => {
      this.$emit('mongo.updateById', 'example', req.params.id, req.body, (err, rslt) => {
        if (err) {
          return res.status(500).send(err);
        }
        res.send(rslt);
      });
    })
    .delete((req, res) => {
      this.$emit('mongo.deleteById', 'example', req.params.id, (err, rslt) => {
        if (err) {
          return res.status(500).send(err);
        }
        res.send(rslt);
      });
    });
  },
  events: {
    'VolanteExpress.pre-start'(app) {
      this.$log('adding router to VolanteExpress');
      app.use(this.router);
    },
  },
  methods: {
    asyncMethod() {
      return new Promise((resolve, reject) => {
        resolve('hello');
      });
    }
  },
};