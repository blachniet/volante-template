//
// The Roles Spoke handles all aspects of role management in an RBAC sense.
// This module implements the concept of Role and provides a method to help
// other modules enforce permissions
//

/**
 * @openapi
 *
 * components:
 *   schemas:
 *     role:
 *       type: object
 *       properties:
 *         _id:
 *           description: the 24 character mongodb id, automatically generated
 *           type: string
 *           readOnly: true
 *         name:
 *           description: the role name
 *           type: string
 *         description:
 *           description: description of the role
 *           type: string
 *         permissions:
 *           description: object with boolean members describing permissions or role
 *           type: object
 *           properties:
 */

module.exports = {
  name: 'Roles',
  data() {
    return {
      // all possible permissions in an RBAC sense, the admin role will be given all of these
      permissions: [
        {
          category: 'General',
          children: [
            {
              title: 'Example Permission',
              description: 'just an example',
              value: 'examplePermission',
            }
          ],
        },
        {
          category: 'Administrative',
          children: [
            {
              title: 'Manage Roles',
              description: 'Allow the user to manage roles',
              value: 'manageRoles',
            },
            {
              title: 'Manage Users',
              description: 'Allow the user to manage user accounts',
              value: 'manageUsers',
            },
            {
              title: 'Developer',
              description: 'Mark a user as a developer, which enables some dev/debug extras',
              value: 'dev',
            },
          ],
        },
      ],
      //
      // The built-in admin role, should not be able to be deleted and will be added at
      // server startup if it doesn't exist, with all the permissions in the permissions array
      //
      adminRole: {
        name: 'Administrator',
        description: 'Full access',
      },
    };
  },
  events: {
    'VolanteExpress.router'(router) {
      let r = router();
      let isAuthenticated = this.$.Auth.isAuthenticated;
      /**
       * @openapi
       *
       * /api/v1/roles/permissions:
       *   get:
       *     tags:
       *       - roles
       *     summary: get the permissions definitions
       *     description: |-
       *                  returns the full listing of all possible permission
       *                  with their titles, descriptions, and values
       *                  > **requires `manageRoles` permission**
       *     produces:
       *       - application/json
       *     responses:
       *       200:
       *         description: OK
       *       401:
       *         description: Not Authorized
       *     security:
       *       - JWT: []
       */
      r.route('/api/v1/roles/permissions')
      .all(isAuthenticated)
      .all(this.hasPermission('manageRoles'))
      .get((req, res) => {
        res.send(this.permissions);
      });
      /**
       * @openapi
       *
       * /api/v1/roles:
       *   get:
       *     tags:
       *       - roles
       *     summary: get role listing
       *     description: |-
       *                  get full listing or roles stored in db
       *                  > **requires `manageRoles` permission**
       *     produces:
       *       - application/json
       *     responses:
       *       200:
       *         description: OK
       *       401:
       *         description: Not Authorized
       *       500:
       *         description: Database error
       *     security:
       *       - JWT: []
       *   post:
       *     tags:
       *       - roles
       *     summary: create a new role
       *     description: |-
       *                  creates a new role document in the database
       *                  > **requires `manageRoles` permission**
       *     produces:
       *       - application/json
       *     parameters:
       *       - name: body
       *         in: body
       *         required: true
       *         schema:
       *           $ref: '#/components/schemas/role'
       *     responses:
       *       200:
       *         description: OK
       *       400:
       *         description: Missing required fields
       *       401:
       *         description: Not Authorized
       *       500:
       *         description: Database error
       *     security:
       *       - JWT: []
       */
      r.route('/api/v1/roles')
      .all(isAuthenticated)
      .all(this.hasPermission('manageRoles'))
      .get((req, res) => {
        this.$.VolanteMongo.find('roles', {}).then((docs) => {
          res.send(docs);
        }).catch((err) => {
          res.status(500).send(err);
        });
      })
      .post((req, res) => {
        if (req.body &&
            req.body.name &&
            req.body.description) {
          this.$.VolanteMongo.insertOne('roles', req.body).then((rslt) => {
            res.send(rslt);
          }).catch((err) => {
            res.status(500).send(err);
          });
        } else {
          res.status(400).send('missing required fields');
        }
      });
      /**
       * @openapi
       *
       * /api/v1/roles/{id}:
       *   put:
       *     tags:
       *       - roles
       *     summary: update a role
       *     description: |-
       *                  update the role with specified id; changes to the built-in Administrator
       *                  role are not allowed
       *                  > **requires `manageRoles` permission**
       *     parameters:
       *       - name: id
       *         in: path
       *         description: the id of the role
       *         required: true
       *         type: string
       *     produces:
       *       - application/json
       *     responses:
       *       200:
       *         description: OK
       *       401:
       *         description: Not Authorized
       *       500:
       *         description: Database error
       *     security:
       *       - JWT: []
       *   delete:
       *     tags:
       *       - roles
       *     summary: delete a role
       *     description: |-
       *                  delete the role with specified id
       *                  > **requires `manageRoles` permission**
       *     parameters:
       *       - name: id
       *         in: path
       *         description: the id of the role
       *         required: true
       *         type: string
       *     produces:
       *       - application/json
       *     responses:
       *       200:
       *         description: OK
       *       401:
       *         description: Not Authorized
       *       500:
       *         description: Database error
       *     security:
       *       - JWT: []
       */
      r.route('/api/v1/roles/:id')
      .all(isAuthenticated)
      .all(this.refuseChangesToAdmin) // safeguard
      .all(this.hasPermission('manageRoles'))
      .put((req, res) => {
        this.$.VolanteMongo.updateOne('roles', req.params.id, {
          $set: req.body,
        }).then((rslt) => {
          res.send(rslt);
        }).catch((err) => {
          res.status(500).send(err);
        });
      })
      .delete((req, res) => {
        this.$.VolanteMongo.deleteOne('roles', req.params.id).then((rslt) => {
          res.send(rslt);
        }).catch((err) => {
          res.status(500).send(err);
        });
      });
    },
    'VolanteMongo.ready'() {
      this.ensureAdminRole();
      // watch the roles collection
      this.$.VolanteMongo.watch('roles', [], (err, docs) => {
        if (err) {
          this.$error('error watching roles collection');
        }
        if (docs.operationType === 'update' || docs.operationType === 'insert') {
          this.$debug('roles changed');
          this.$emit('SocketManager.broadcast', 'global.changed.roles');
        }
      });
    },
  },
  methods: {
    //
    // Ensure the database contains the admin role
    //
    ensureAdminRole() {
      // collect permissions up as permissions.<key>
      // so we can update the admin role permissions non-destructively to allow
      // adding new permissions
      let perms = {};
      for (let p of this.permissions) {
        for (let c of p.children) {
          perms[`permissions.${c.value}`] = true;
        }
      }
      this.$.VolanteMongo.findOneAndUpdate('roles', {
        name: this.adminRole.name,
      }, {
        $set: {
          name: this.adminRole.name,
          description: this.adminRole.description,
          ...perms,
        }
      }, {
        upsert: true,
        returnDocument: 'after',
      }).then((rslt) => {
        if (rslt.lastErrorObject && rslt.lastErrorObject.updatedExisting === false) {
          this.$warn('ensureAdminRole successful; created Admin role');
        } else {
          this.$log('ensureAdminRole successful; role exists');
        }
        let id = rslt.value._id;
        if (id) {
          this.$emit('Roles.ensureAdminRole', id);
        }
      }).catch((err) => {
        this.$error('error running ensureAdminRole against mongo', err);
      });
    },
    getAllRoleInfo(role_ids) {
      return new Promise((resolve, reject) => {
        // rehydrade _ids
        let ids = [];
        for (let i of role_ids) {
          ids.push(this.$.VolanteMongo.mongo.ObjectId(i));
        }
        // we retrieve the role permissions every time in case they change;
        // roles could also be cached from mongo in this module if this has
        // a negative performance impact
        this.$.VolanteMongo.find('roles', {
          _id: { $in: ids }
        }).then((roles) => {
          let roleInfo = [];
          let perms = [];
          // collect permissions
          for (let r of roles) {
            for (let [k, v] of Object.entries(r.permissions)) {
              if (v && perms.indexOf(k) < 0) {
                perms.push(k);
              }
            }
            roleInfo.push({
              name: r.name,
            });
          }
          resolve({
            roles: roleInfo,
            permissions: perms,
          });
        }).catch((err) => {
          this.$warn('error getting matching roles in mongo', role_ids, err);
          reject('error getting role permissions');
        });
      });
    },
    //
    // express middleware function to verify role
    //
    hasPermission(perm) {
      return (req, res, next) => {
        if (!req.User || !req.User.role_ids || req.User.role_ids.length === 0) {
          this.$error('server error checking role permissions');
          return res.status(500).send('server error checking role permissions');
        }
        this.getAllRoleInfo(req.User.role_ids).then((info) => {
          this.$debug('matching permissions', info.permissions);
          // find the first role that has permStr=true
          if (info.permissions.indexOf(perm) > -1) {
            return next();
          }
          // reject this route, and let router try the next route
          // this allows skipping this route and trying the next one,
          // which the user may be authorized for
          return next('route');
        }).catch(() => {
          let msg = `check permission for ${perm} failed for ${req.User.username}`;
          this.$warn(msg);
          res.status(401).send(msg);
        });
      };
    },
    //
    // middleware to refuse changes to admin role
    //
    refuseChangesToAdmin(req, res, next) {
      this.$.VolanteMongo.findOne('roles', req.params.id).then((doc) => {
        if (doc.name === 'Administrator') {
          return res.status(401).send('Cannot edit Administrator role!');
        }
        next();
      }).catch((err) => {
        res.status(500).send(err);
      });
    },
  },
};
