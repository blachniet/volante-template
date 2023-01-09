/**
 * @swagger
 *
 * components:
 *   schemas:
 *     example:
 *       type: "object"
 *       properties:
 *         _id:
 *           description: the 24 character mongodb id
 *           type: "string"
 *           readOnly: true
 *         name:
 *           type: "string"
 *           description: a test name string
 *         description:
 *           type: "string"
 *           description: a test description string
 *         age:
 *           type: "number"
 *           description: a test number
 *         subscribed:
 *           type: "boolean"
 *           description: a test boolean
 */

module.exports = {
  name: 'Example',
  events: {
    'VolanteExpress.router'(router) {
      let r = router();
      /**
       * @openapi
       *
       * /api/v1/example:
       *   get:
       *     tags:
       *       - example
       *     summary: get example
       *     description: this is an example get endpoint
       *     responses:
       *       200:
       *         description: OK
       *       500:
       *         description: Database error
       *     security:
       *       - JWT: []
       *   post:
       *     tags:
       *       - example
       *     summary: post example
       *     description: this is an example post endpoint
       *     requestBody:
       *       description: example JSON data post
       *       required: true
       *       content:
       *         application/json:
       *           schema:
       *             $ref: '#/components/schemas/example'
       *     responses:
       *       200:
       *         description: OK
       *       500:
       *         description: Database error
       *     security:
       *       - JWT: []
       * /api/v1/example/{id}:
       *   put:
       *     tags:
       *       - example
       *     summary: put example
       *     description: this is an exmaple put endpoint
       *     parameters:
       *       - name: id
       *         in: path
       *         required: true
       *     requestBody:
       *       description: example JSON mongo change
       *       required: true
       *       content:
       *         application/json:
       *           schema:
       *             type: "object"
       *             properties:
       *               $set:
       *                 $ref: '#/components/schemas/example'
       *     responses:
       *       200:
       *         description: OK
       *       500:
       *         description: Database error
       *     security:
       *       - JWT: []
       *   delete:
       *     tags:
       *       - example
       *     summary: delete example
       *     description: this is an example delete endpoint
       *     parameters:
       *       - name: id
       *         in: path
       *         required: true
       *     responses:
       *       200:
       *         description: OK
       *       500:
       *         description: Database error
       *     security:
       *       - JWT: []
       */
      r.route('/api/v1/example/:id?')
      .all(this.$.Auth.isAuthenticated)
      .get((req, res) => {
        this.$.VolanteMongo.find('example', {}).then((docs) => {
          res.send(docs);
        }).catch((err) => {
          res.status(500).send(err);
        });
      })
      .post((req, res) => {
        this.$.VolanteMongo.insertOne('example', req.body).then((rslt) => {
          res.send(rslt);
        }).catch((err) => {
          res.status(500).send(err);
        });
      })
      .put((req, res) => {
        this.$.VolanteMongo.updateOne('example', req.params.id, req.body).then((rslt) => {
          res.send(rslt);
        }).catch((err) => {
          res.status(500).send(err);
        });
      })
      .delete((req, res) => {
        this.$.VolanteMongo.deleteOne('example', req.params.id).then((rslt) => {
          res.send(rslt);
        }).catch((err) => {
          res.status(500).send(err);
        });
      });
    }
  },
};