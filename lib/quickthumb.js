var qt = {},
  fs = require('fs'),
  path = require('path'),
  mkdirp = require('mkdirp'),
  im = require('imagemagick');

// Take an image from src, and write it to dst
qt.convert = function(options, callback) {
  var src = options.src,
    dst = options.dst,
    width = options.width,
    height = options.height,
    quality = options.quality,
    type = options.type || 'crop';

  mkdirp(path.dirname(dst));

  var im_options = {
    srcPath : src,
    dstPath : dst
  };

  if (options.width) im_options.width = width;
  if (options.height) im_options.height = height;
  if (options.quality) im_options.quality = quality;

  try {
    im[type](im_options, function(err, stdout, stderr) {
      if (err) {
        return callback(err);
      }
      callback(null, dst);
    });
  }
  catch(err) {
    return callback('qt.convert() ERROR: ' + err.message);
  }
};


qt.static = function(root, options) {
  return function (request, reply, next) {
    var file = request.url.pathname,
        dim = request.query.dim || "",
        orig = path.normalize(root + file),
        dst = path.join(options.cacheDir, options.type, dim, file);

    function send_if_exists(file, callback) {
      fs.exists(file, function(exists) {
        if (!exists) {
          return callback();
        }

        fs.stat(file, function(err, stats) {
          if (err) {
            console.error(err);
          }
          else if (stats.isFile()) {
            return reply.file(file);
          }
        callback();
        });
      });
    }

    if (!dim) {
      return send_if_exists(orig, next);
    }

    send_if_exists(dst, function() {
      var dims = dim.split(/x/g),
      opts = {
        src : orig,
        dst : dst,
        width : dims[0],
        height : dims[1],
        type : options.type
      };

      qt.convert(opts, function(err, dst) {
        if (err) {
          console.error(err);
          return next();
        }
        reply.file(dst);
      });
    });
  };
};

var quickThumb = function(plugin, options, next) {
  var root = options.root;
  root = path.normalize(root);
  var route = options.path;
  options          || ( options = {} );
  options.type     || ( options.type = 'crop' );
  options.cacheDir || ( options.cacheDir = path.join(root, '.cache') );

  plugin.route({
    method: 'GET',
    path: route,
    config: {
      handler: qt.static(root, options)
    }
  });
  next();
};

module.exports = quickThumb;
