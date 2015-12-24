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

function isExist(file, callback) {
  fs.exists(file, function(exists) {
    if (!exists) { return callback(new Error('not found')); }

    fs.stat(file, function(err, stats) {
      if (err) { console.error(err); }
      else if (stats && stats.isFile()) { return callback(null); }
      callback(new Error('not found'));
    });
  });
}

qt.static = function(root, options) {
  return function (request, reply) {
    var file = request.url.pathname,
      dim = request.query.dim || "",
	  filter  = request.query.filter || "",
      orig = path.normalize(root + file),
      dst = path.join(options.cacheDir, options.type, dim, file);


    var callback;
    if (!dim) {
      callback = function(notExist) {
        if (notExist) { return reply('File not found!').code(404); }
        reply.file(orig);
      };
    } else {
      callback = function(notExist) {
        if (notExist) { return reply('File not found!').code(404); }
        var dims = dim.split(/x/g),
        opts = {
          src : orig,
          dst : dst,
          width : dims[0],
          height : dims[1],
          type : options.type,
		  filter:filter
        };

        qt.convert(opts, function(err, dst) {
          if (err) {
            console.error(err);
            return reply(err).code(404);
          }
			if(filter === "") {
				reply.file(dst);
			}
			else {
				var url = "/caman/" + file.replace("/images/", "") + "?dim=" + dim + "&filter=" + filter;
				reply().redirect(url);
			}
        });
      };
    }
    isExist(orig, callback);
  };
};

var makeRoute = function(path, handler) {
  return {
    method: 'GET',
    path: path,
    config: {
      handler: handler,
      auth: false
    }
  };
};

var quickThumb = function(plugin, options, next) {
  var root = options.root;
  root = path.normalize(root);
  var paths = options.paths;
  options          || ( options = {} );
  options.type     || ( options.type = 'crop' );
  options.cacheDir || ( options.cacheDir = path.join(root, '.cache') );
  var routes = [];

  if ("string" === typeof options) {
    routes.push(makeRoute(paths, qt.static(root, options)));
  } else {
    paths.forEach(function(path) {
      routes.push(makeRoute(path, qt.static(root, options)));
    });
  }

  plugin.route(routes);
  next();
};

module.exports = quickThumb;
