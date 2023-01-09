const utils = require('./utils');
const crypto = require('crypto');

/**
 * @openapi
 *
 * components:
 *   securitySchemes:
 *     JWT:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *
 */

module.exports = {
  name: 'Auth',
  props: {
    jwtSecret: 'aaaaaaaa', // secret used to generate the jwt
    tokenMs: 86400000,     // milliseconds for token valid duration
  },
  events: {
    'VolanteExpress.router'(router) {
      let r = router();
      /**
       * @openapi
       *
       * /api/v1/auth/login:
       *   post:
       *     tags:
       *       - authentication
       *     summary: authenticate user
       *     description: |-
       *                 Authenticate a user and obtain a JSON Web Token (JWT).
       *
       *                 User must send username and password in a JSON body.
       *
       *                 For example:
       *                 ```
       *                 {
       *                   "username": "<username>",
       *                   "password": "<password>"
       *                 }
       *                 ```
       *                 Server will then respond with a JWT token for the user or a 401 error.
       *     requestBody:
       *       description: post body should contain username and password fields, copy the result and paste it in the Swagger Authorize modal
       *       required: true
       *       content:
       *         application/json:
       *           schema:
       *             type: object
       *             properties:
       *               username:
       *                 description: The username to use for authentication
       *                 type: string
       *                 required: true
       *               password:
       *                 description: The password to use for authentication
       *                 type: string
       *                 required: true
       *     responses:
       *       200:
       *         description: Succesful authentication
       *       400:
       *         description: Bad Request
       *       401:
       *         description: Unauthorized
       */
      r.route('/api/v1/auth/login')
      .post((req, res) => {
        // make sure body contains login
        if (req.body.username && req.body.password) {
          // call local method to authenticate
          this.authenticateUser(req.body).then((result) => {
            // check if user must change password
            // if so, reply with object to enable change
            if (result.mustChangePass) {
              return res.send({
                username: result.username,
                mustChangePass: true,
                token: result.token,
              });
            }
            // standard successful login
            res.send(result.token);
          }).catch((err) => {
            return res.status(401).send(err);
          });
        } else {
          res.status(400).send('missing username and/or password in JSON post body: { "username": "<username>", "password": "<password>" }');
        }
      });
      /**
       * @openapi
       *
       * /api/v1/auth/reset:
       *   post:
       *     tags:
       *       - authentication
       *     summary: password reset for user
       *     description: an authenticated password reset for the user, use the token previously sent with the mustChangePass flag
       *     requestBody:
       *       description: post body should contain username and password fields, copy the result and paste it in the Swagger Authorize modal
       *       required: true
       *       content:
       *         application/json:
       *           schema:
       *             type: object
       *             properties:
       *               username:
       *                 description: The username to use for authentication
       *                 type: string
       *                 required: true
       *               password:
       *                 description: The password to use for authentication
       *                 type: string
       *                 required: true
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
      r.route('/api/v1/auth/reset')
      .all(this.isAuthenticated)
      .post((req, res) => {
        // make sure the requesting user is the authenticated user
        if (req.User.username === req.body.username) {
          let newHash = utils.generatePasswordHash(req.body.password);
          this.$.VolanteMongo.updateOne('users', {
            username: req.User.username
          }, {
            $set: {
              password: newHash,
              mustChangePass: false,
            }
          }).then((result) => {
            // send succesful login
            res.send(req.User.token);
          }).catch((err) => {
            res.status(500).send('Error updating user mongo doc', err);
          });
        } else {
          res.status(401).send('Password not flagged for reset');
        }
      });
      /**
       * @openapi
       *
       * /api/v1/auth/logout:
       *   post:
       *     tags:
       *       - authentication
       *     summary: authenticate user
       *     description: Tell the server that the specified user's session is to be closed
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
      r.route('/api/v1/auth/logout')
      .all(this.isAuthenticated)
      .post((req, res) => {
        let token = utils.getTokenFromAuthorizationHeader(req.headers.authorization);
        if (token) {
          let username = utils.getUserFromTokenString(token);
          this.$log(`user ${username} issued a logout`);
          // zero out the token in mongo
          this.$.VolanteMongo.updateOne('users', { username }, {
            $set: {
              token: null
            }
          }).then(() => {
            res.send('successfully logged out');
          }).catch((err) => {
            res.status(500).send('Error deleting token', err);
          });
        }
      });
      /**
       * @openapi
       *
       * /api/v1/auth/check:
       *   get:
       *     tags:
       *       - authentication
       *     summary: check token
       *     description: Check whether a JSON Web Token (JWT) is still valid
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
      r.route('/api/v1/auth/check')
      .all(this.isAuthenticated)
      .get((req, res) => {
        res.send('ok');
      });
      /**
       * @openapi
       *
       * /api/v1/auth/permissions:
       *   get:
       *     tags:
       *       - authentication
       *     summary: get user's permissions
       *     description: Get all the permissions for the currently authenticated user
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
      r.route('/api/v1/auth/permissions')
      .all(this.isAuthenticated)
      .get((req, res) => {
        this.$.Roles.getAllRoleInfo(req.User.role_ids).then((info) => {
          res.send(info.permissions);
        });
      });
      /**
       * @openapi
       *
       * /api/v1/auth/renew:
       *   get:
       *     tags:
       *       - authentication
       *     summary: renew token
       *     description: allows an authenticated user to refresh their token and keep their session uninterrupted
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
      r.route('/api/v1/auth/renew')
      .all(this.isAuthenticated)
      .get((req, res) => {
        this.userAuthenticated(req.User).then((rslt) => {
          res.send(rslt.token);
        }).catch((err) => {
          res.status(401).send(err);
        });
      });
    },
  },
  methods: {
    //
    // Authenticate a user
    //
    authenticateUser(obj) {
      return new Promise((resolve, reject) => { // obj needs to have user and pass fields
        let user = this.$.Users.userByUsername(obj.username);
        if (!user) {
          return reject('User not found');
        }
        if (!user.enabled) {
          return reject('User disabled');
        }
        if (user && user.password) {
          // check password hash from mongo in standalone
          // salt was created with the following and is 32 chars long
          // const salt = crypto.randomBytes(16).toString("hex");
          const salt = user.password.substr(0, 32); // split out salt part
          const hash = user.password.substr(32);    // split out hash part
          let chk = crypto.scryptSync(obj.password, salt, 32).toString("hex");
          if (chk === hash) {
            // local auth: hash matches
            resolve(user);
          } else {
            reject('Wrong password');
          }
        } else {
          reject('Password error');
        }
      }).then((User) => { // final stage, all user info available
        // delete the password key for privacy
        if (User.password) {
          delete User.password;
        }
        return this.userAuthenticated(User);
      });
    },
    //
    // Process for successful authentication; currently this includes
    // updating mongo with token and lastLogin
    //
    userAuthenticated(obj) {
      return new Promise((resolve, reject) => {
        if (!obj.username) {
          return reject('No username!');
        }
        this.$log('user authenticated, building token', obj.username);
        obj.token = this.buildToken(obj);
        let updateOp = {
          $set: {
            token: obj.token,
            lastLogin: new Date(),
          },
        };
        if (!obj.firstLogin) {
          obj.firstLogin = updateOp['$set'].firstLogin = new Date();
        }
        // update mongo
        this.$.VolanteMongo.updateOne('users', { username: obj.username }, updateOp).then((result) => {
          resolve(obj);
        }).catch((err) => {
          reject('Database error', err);
        });
      });
    },
    //
    // build a C2 JWT
    //
    buildToken(userObj) {
      let header = {
       alg : "HS256",
       typ : "JWT"
      };
      let now = new Date().getTime();
      let payload = {
        iss: this.$hub.name,
        sub: userObj._id,
        aud: userObj.username,
        exp: Math.floor(new Date(now + this.tokenMs).getTime() / 1000),
        nbf: Math.floor(now / 1000),
        iat: Math.floor(now / 1000),
        jti: crypto.randomBytes(16).toString('hex'),
      };
      let hp = Buffer.from(JSON.stringify(header)).toString('base64') + '.' + Buffer.from(JSON.stringify(payload)).toString('base64');
      let signature = crypto.createHmac('sha256', this.jwtSecret).update(hp).digest('hex');
      this.$log(`built token for ${userObj.username} for ${this.tokenDays} days`);
      return `${hp}.${signature}`;
    },
    //
    // cryptographically validate a JWT
    //
    validateToken(token) {
      let splitToken = token.split('.');
      let signature = crypto.createHmac('sha256', this.jwtSecret).update(splitToken.slice(0, 2).join('.')).digest('hex');
      // see if computed signature matches what was provided
      if (signature === splitToken[2]) {
        // signature matches, now parse payload and see if time is valid
        let payload;
        try {
          payload = JSON.parse(Buffer.from(splitToken[1], 'base64').toString());
        } catch (e) {
          this.$error('error parsing json in JWT payload');
          return null;
        }
        if (payload.exp && payload.exp > new Date().getTime()/1000) {
          return payload;
        } else {
          this.$debug('expired token', payload.exp);
          return null;
        }
      }
      this.$warn('could not validate JWT signature on token, it may not be a JWT');
      return null;
    },
    //
    // express middleware function to verify valid authentication
    //
    isAuthenticated(req, res, next) {
      if (req.headers.authorization) {
        let token = utils.getTokenFromAuthorizationHeader(req.headers.authorization);
        if (token) {
          let valid = this.validateToken(token);
          if (valid) {
            // get the User from cache, or go async to get it from mongo
            let user_id = utils.getUserIdFromTokenObject(valid);
            // UsersModule should maintain a cache of users collection in mongo
            // so we start by looking there
            let user = this.$.Users.userById(user_id);
            if (!user) {
              res.status(401).send('token user invalid');
            } else if (token !== user.token) {
              res.status(409).send('token does not match the current token');
            } else if (user.mustChangePass && req.url !== '/api/v1/auth/reset') {
              res.status(409).send('you must change your password before continuing');
            } else {
              req.User = user; // save to express session
              next(); // success; let express continue
            }
          } else {
            res.status(401).send('token failed authorization validation');
          }
        } else {
          res.status(401).send('cannot get token from Authorization header');
        }
      } else {
        res.status(400).send('missing authorization header: "Authorization: Bearer <base64_token>"');
      }
    },
  },
};
