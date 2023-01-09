//
// The Users Spoke handles all aspects of user accounting except authentication
//
const utils = require('./utils');

/**
 * @openapi
 *
 * components:
 *   schemas:
 *     user:
 *       type: object
 *       properties:
 *         _id:
 *           description: the 24 character mongodb id
 *           type: string
 *           readOnly: true
 *         enabled:
 *           description: whether the user account is enabled
 *           type: boolean
 *         fullname:
 *           description: the user's full name
 *           type: string
 *         username:
 *           description: the username
 *           type: string
 *         password:
 *           description: the password hash
 *           type: string
 *         mustChangePass:
 *           description: flag to require changed password next login
 *           type: boolean
 *         token:
 *           type: string
 *           description: the last generated token for this user
 *         role_ids:
 *           type: array
 *           description: array of role _ids that this user belongs to
 *           items:
 *             type: string
 *         firstLogin:
 *           type: string
 *           description: first login date
 *         lastLogin:
 *           type: string
 *           description: last login date
 */

module.exports = {
  name: 'Users',
  props: {
    ensureAdmin: true,
  },
  events: {
    'VolanteExpress.router'(router) {
      let r = router();
      let isAuthenticated = this.$.Auth.isAuthenticated;
      let hasPermission = this.$.Roles.hasPermission;
      /**
       * @openapi
       *
       * /api/v1/users:
       *   get:
       *     tags:
       *       - users
       *     summary: get array of users
       *     description: returns a JSON array of the minimum info for all users
       *     responses:
       *       200:
       *         description: OK
       *       401:
       *         description: Unauthorized
       *       500:
       *         description: Database error
       *     security:
       *       - JWT: []
       *   post:
       *     tags:
       *       - users
       *     summary: create a new user
       *     description: |-
       *                  creates a new user
       *                  > **requires `manageUsers` permission**
       *     parameters:
       *       - name: body
       *         in: body
       *         required: true
       *         schema:
       *           $ref: '#/components/schemas/user'
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
      r.route('/api/v1/users')
      .all(isAuthenticated)
      .all(hasPermission('manageUsers'))
      .get((req, res) => {
        this.$.VolanteMongo.find('users', {}, {
          // exlude credential fields, even for admin
          projection: {
            password: 0,
            token: 0,
          },
        }).then((docs) => {
          res.send(docs);
        }).catch((err) => {
          res.status(500).send(err);
        });
      })
      .post((req, res) => {
        if (req.body &&
            req.body.fullname &&
            req.body.username &&
            req.body.email &&
            req.body.password) {
          req.body.password = utils.generatePasswordHash(req.body.password);
          req.body.mustChangePass = true;

          this.$.VolanteMongo.insertOne('users', req.body).then((rslt) => {
            res.send(rslt);
          }).catch((err) => {
            res.status(500).send(err);
          });
        } else {
          res.status(400).send('missing required fields');
        }
      });
      // add this as a separate route so hasPermission will cascade to it, this gives the
      // abbreviated info to non-manageUsers roles
      r.route('/api/v1/users')
      .all(isAuthenticated)
      .get((req, res) => {
        this.$.VolanteMongo.find('users', {}, {
          projection: {
            fullname: 1,
            avatar: 1,
          }
        }).then((docs) => {
          res.send(docs);
        }).catch((err) => {
          res.status(500).send(err);
        });
      });
      /**
       * @openapi
       *
       * /api/v1/users/me:
       *   get:
       *     tags:
       *       - users
       *     summary: get my user profile
       *     description: returns an object describing the current user
       *     responses:
       *       200:
       *         description: OK
       *         application/json:
       *           schema:
       *             type: object
       *             properties:
       *               fullname:
       *                 type: string
       *               username:
       *                 type: string
       *               token:
       *                 type: string
       *               permissions:
       *                 type: array
       *                 description: array of role permissions this user has
       *                 items:
       *                   type: string
       *       401:
       *         description: Not authorized to create user
       *       500:
       *         description: Database error
       *     security:
       *       - JWT: []
       */
      r.route('/api/v1/users/me')
      .all(isAuthenticated)
      .get((req, res) => {
        // gather user's permissions
        this.$.Roles.getAllRoleInfo(req.User.role_ids).then((info) => {
          res.send({
            _id: req.User._id,
            fullname: req.User.fullname,
            username: req.User.username,
            firstLogin: req.User.firstLogin,
            lastLogin: req.User.lastLogin,
            roles: info.roles,
            permissions: info.permissions,
            avatar: req.User.avatar,
          });
        }).catch((err) => {
          return res.status(401).send(err);
        });
      })
      .put((req, res) => {
        if (req.body.avatar !== undefined) {
          req.User.avatar = req.body.avatar;
        }
        this.$.VolanteMongo.updateOne('users', req.User._id, {
          $set: req.body.pick(['fullname', 'username', 'avatar']),
        }).then((rslt) => {
          res.send(rslt);
        }).catch((err) => {
          res.status(500).send(err);
        });
      });
      /**
       * @openapi
       *
       * /api/v1/users/count:
       *   get:
       *     tags:
       *       - users
       *     summary: get number of users
       *     description: route accessible to all authenticated users to get user count for informational/display purposes
       *     responses:
       *       200:
       *         description: OK
       *       401:
       *         description: Not authorized
       *       500:
       *         description: Database error
       *     security:
       *       - JWT: []
       */
      r.route('/api/v1/users/count')
      .all(isAuthenticated)
      .get((req, res) => {
        this.$.VolanteMongo.count('users', { enabled: true }).then((result) => {
          res.json(result);
        }).catch((err) => {
          res.status(500).send(err);
        });
      });
      /**
       * @openapi
       *
       * /api/v1/users/{id}:
       *   get:
       *     tags:
       *       - users
       *     summary: get simple profile for user by user_id
       *     description: retrieves the simplified profile (only names and avatar)
       *     produces:
       *       - application/json
       *     responses:
       *       200:
       *         description: OK
       *       401:
       *         description: Not authorized
       *       500:
       *         description: Database error
       *     security:
       *       - JWT: []
       *   put:
       *     tags:
       *       - users
       *     summary: update a user
       *     description: update the user with specified id, only by roles with manageUsers permission
       *     parameters:
       *       - name: id
       *         in: path
       *         description: the id of the user
       *         required: true
       *         type: string
       *     produces:
       *       - application/json
       *     responses:
       *       200:
       *         description: OK
       *       401:
       *         description: Not authorized to update user
       *       500:
       *         description: Database error
       *     security:
       *       - JWT: []
       *   delete:
       *     tags:
       *       - users
       *     summary: delete a user
       *     description: delete the user with specified id, only by roles with manageUsers permission
       *     parameters:
       *       - name: id
       *         in: path
       *         description: the id of the user
       *         required: true
       *         type: string
       *     produces:
       *       - application/json
       *     responses:
       *       200:
       *         description: OK
       *       401:
       *         description: Not authorized to delete user
       *       500:
       *         description: Database error
       *     security:
       *       - JWT: []
       */
      r.route('/api/v1/users/:id')
      .all(isAuthenticated)
      .get((req, res) => {
        this.$.VolanteMongo.findOne('users', req.params.id, {
          projection: {
            fullname: 1,
            avatar: 1,
          }
        }).then((user) => {
          res.send(user);
        }).catch((err) => {
          res.status(500).send(err);
        });
      })
      .all(hasPermission('manageUsers'))
      .put((req, res) => {
        // if admin set password, set it and flag it for change
        if (req.body.password && req.body.password.length > 0) {
          this.$debug(`user ${req.User.username} password reset`);
          req.body.password = utils.generatePasswordHash(req.body.password);
          req.body.mustChangePass = true;
        } else {
          // otherwise, make sure we don't set it
          delete req.body.password;
        }
        // delete _id
        delete req.body._id;
        this.$.VolanteMongo.updateOne('users', req.params.id, {
          $set: req.body
        }).then((rslt) => {
          res.send(rslt);
        }).catch((err) => {
          res.status(500).send(err);
        });
      })
      .delete((req, res) => {
        this.$.VolanteMongo.deleteOne('users', req.params.id).then((rslt) => {
          res.send(rslt);
        }).catch((err) => {
          res.status(500).send(err);
        });
      });
    },
    //
    // When Roles gets an _id for a newly created role _id,
    // it's a pretty good indication we need to add an initial admin user
    // Note that adding an admin user can be disabled for security by setting
    // the ensureAdmin prop to false
    //
    'Roles.ensureAdminRole'(adminRole_id) {
      this.ensureAdminUser(adminRole_id);
    },
    'VolanteMongo.ready'() {
      this.ensureIndex();
      this.refresh();
      // auto-refresh when users collection changes
      this.$.VolanteMongo.watch('users', [], this.refresh);
    },
  },
  data() {
    return {
      userCache: [],
    };
  },
  methods: {
    // refresh local user cache from mongo
    refresh() {
      this.$.VolanteMongo.find('users', {}).then((docs) => {
        this.userCache = docs;
      }).catch((err) => {
        this.$error('error loading users from mongo', err);
      });
    },
    userById(_id) {
      // rehydrate to objectid if string
      if (typeof(_id) === 'string') {
        _id = this.$.VolanteMongo.mongo.ObjectId(_id);
      }
      return this.userCache.find((o) => o._id.equals(_id));
    },
    userByUsername(username) {
      return this.userCache.find((o) => o.username === username);
    },
    ensureIndex() {
      this.$.VolanteMongo.createIndexes('users', [
        {
          key: { username: 1 },
          unique: true,
          name: 'usernameIndex',
        },
      ]).then((result) => {
        this.$log('user index ready to go');
      }).catch((err) => {
        this.$error('mongo.createIndexes call failed', err);
      });
    },
    //
    // if user count is zero, at least make an admin/admin user, this can be disabled for
    // security by setting ensureAdmin prop false, or add ENV var at run-time:
    // volante_Users_ensureAdmin=false
    //
    ensureAdminUser(adminRole_id) {
      if (this.ensureAdmin) {
        this.$.VolanteMongo.count('users', {}).then((count) => {
          if (count === 0) {
            this.$.VolanteMongo.insertOne('users', {
              enabled: true,
              fullname: 'Admin',
              username: 'admin',
              password: utils.generatePasswordHash('admin'),
              mustChangePass: true,
              role_ids: [ adminRole_id ],
            }).then((doc) => {
              this.$warn('ensureAdminUser successful; created admin/admin user');
            }).catch((err) => {
              this.$error('error running ensureAdminRole against mongo', err);
            });
          } else {
            this.$log('ensureAdminUser successful; admin user exists');
          }
        }).catch((err) => {
          this.$error('couldnt get initial user count', err);
        });
      }
    },
  }
 };