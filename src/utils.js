const crypto = require('crypto');

//
// checks the given http header value for the necessary Bearer prefix and returns the
// token suffix
//
exports.getTokenFromAuthorizationHeader = function(hdr) {
  if (hdr && typeof(hdr) === 'string' && hdr.startsWith('Bearer')) {
    let sp = hdr.split('Bearer ');
    if (sp.length === 2) {
      return sp[1];
    }
  }
  return null;
};
//
// parse the JWT payload and return as an Object
//
exports.parseTokenPayload = function(token) {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
};

//
// parse the JWT payload and return only the username ('aud') part
//
exports.getUserFromTokenString = function(token) {
  return exports.getUserFromTokenObject(exports.parseTokenPayload(token));
};
//
// parse the JWT payload and return only the _id ('sub') part
//
exports.getUserIdFromTokenString = function(token) {
  return exports.getUserIdFromTokenObject(exports.parseTokenPayload(token));
};
//
// Return the username field of the given token object
//
exports.getUserFromTokenObject = function(tokenObj) {
  return tokenObj.aud;
};
//
// Return the user _id field of the given token object
//
exports.getUserIdFromTokenObject = function(tokenObj) {
  return tokenObj.sub;
};
//
// use node.js crypto lib to hash the given password
//
exports.generatePasswordHash = function(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 32).toString("hex");
  return `${salt}${hash}`;
};
//
// simple pick function uses an array of keys and returns a new object composed
// of those keys IF they exist
//
exports.pick = function(obj, keys) {
  return keys.reduce(function (ret, key) {
    ret[key] = obj[key];
    return ret;
  }, {});
};