/**
 * @swagger
 *
 * components:
 *   schemas:
 *     setting:
 *       type: object
 *       properties:
 *         _id:
 *           description: the 24 character mongodb id
 *           type: string
 *           readOnly: true
 *         key:
 *           type: string
 *           description: the setting key
 *         value:
 *           type: string
 *           description: the value
 *         user_id:
 *           type: string
 *           description: _id of user this setting belongs to, or "global"
 *         created:
 *           description: ISO8601 date setting created
 *           type: string
 *           readOnly: true
 *         updated:
 *           description: ISO8601 date setting updated
 *           type: string
 *           readOnly: true
 */

module.exports = {
  name: 'Settings',
  events: {
    'VolanteExpress.router'(router) {
      let r = router();
      /**
       * @openapi
       *
       * /api/v1/settings/{key}:
       *   get:
       *     tags:
       *       - settings
       *     summary: retrieve a settings object by key
       *     description: Gets the value for specified setting by key
       *     parameters:
       *       - name: key
       *         in: path
       *         description: The key of the setting
       *         required: true
       *         type: string
       *     responses:
       *       200:
       *         description: OK
       *       400:
       *         description: Bad Request
       *       401:
       *         description: Unauthorized
       *       500:
       *         description: Internal Server Error
       *     security:
       *       - JWT: []
       *   post:
       *     tags:
       *       - settings
       *     summary: store a settings object by key
       *     description: Store the HTTP body as the value for specified setting and will overwrite existing value
       *     parameters:
       *       - name: key
       *         in: path
       *         description: The key of the setting
       *         required: true
       *         type: string
       *     requestBody:
       *       required: true
       *       content:
       *         application/json:
       *           schema:
       *             type: object
       *     responses:
       *       200:
       *         description: OK
       *       400:
       *         description: Bad Request
       *       401:
       *         description: Unauthorized
       *       500:
       *         description: Internal Server Error
       *     security:
       *       - JWT: []
       *   delete:
       *     tags:
       *       - settings
       *     summary: delete the setting with the given key
       *     description: Delete will remove a specified setting and its value
       *     parameters:
       *       - name: key
       *         in: path
       *         description: The key of the setting
       *         required: true
       *         type: string
       *     responses:
       *       200:
       *         description: OK
       *       400:
       *         description: Bad Request
       *       401:
       *         description: Unauthorized
       *       500:
       *         description: Internal Server Error
       *     security:
       *       - JWT: []
       */
      r.route('/api/v1/settings/:key')
      .all(this.$.Auth.isAuthenticated)
      .get((req, res) => {
        // look up setting by user_id and key
        this.loadSetting(req.params.key, req.User._id).then((rslt) => {
          res.send(rslt);
        }).catch((err) => {
          res.status(500).send(err);
        });
      })
      .post((req, res) => {
        this.saveSetting(req.params.key, req.body, req.User._id).then((rslt) => {
          res.send(rslt);
        }).catch((err) => {
          res.status(500).send(err);
        });
      })
      .delete((req, res) => {
        this.deleteSetting(req.params.key, req.User._id).then((rslt) => {
          res.send(rslt);
        }).catch((err) => {
          res.status(500).send(err);
        });
      });
    },
    'VolanteMongo.ready'() {
      this.ensureIndex();
      this.$.VolanteMongo.watch('settings', [], (err, docs) => {
        if (err) {
          this.$error('error watching settings collection');
        }
        if (docs && docs.fullDocument && docs.fullDocument.user_id) {
          this.$debug('settings changed for user', docs.fullDocument.user_id);
        }
        // emit an event here which can be federated to the client-side
        // example: this.$emit('settings.changed', docs.fullDocument.username);
      });
    }
  },
  methods: {
    ensureIndex() {
      this.$.VolanteMongo.createIndexes('settings', [
        {
          key: { key: 1, user_id: 1 },
          unique: true,
          name: 'keyUserIdIndex',
        },
      ]).then((result) => {
        this.$log('settings index ready to go');
      }).catch((err) => {
        this.$error('mongo.createIndexes call failed', err);
      });
    },
    loadSetting(key, user_id='system') {
      return this.$.VolanteMongo.findOne('settings', {
        key,
        user_id,
      }).then((doc) => {
        if (doc && doc.value !== undefined) {
          return doc.value;
        } else {
          return {};
        }
      });
    },
    saveSetting(key, value, user_id='system') {
      let now = new Date().toISOString();
      return this.$.VolanteMongo.updateOne('settings', {
        key,
        user_id,
      }, {
        $set: {
          value,
          updated: now,
        },
        $setOnInsert: {
          created: now,
        },
      }, {
        upsert: true,
      });
    },
    deleteSetting(key, user_id='system') {
      return this.$.VolanteMongo.deleteOne('settings', {
        key,
        user_id,
      });
    },
  },
};