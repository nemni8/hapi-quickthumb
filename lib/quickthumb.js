var qt = {},
  fs = require('fs'),
  path = require('path'),
  mkdirp = require('mkdirp'),
	Caman = require('caman').Caman,
	_ = require('underscore'),
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
  if (options.filter) im_options.quality = quality;

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
		re = /(?:\.([^.]+))?$/,
		ext = re.exec(file)[1]
      dim = request.query.dim || "",
      filter = request.query.filter || "",
      orig = path.normalize(root + file),
      dst = path.join(options.cacheDir, options.type, dim, file),
		  filterValid = false,
		  filters = [
			  "vintage",
			  "lomo",
			  "clarity",
			  "sinCity",
			  "sunrise",
			  "crossProcess",
			  "orangePeel",
			  "love",
			  "grungy",
			  "jarques",
			  "pinhole",
			  "oldBoot",
			  "glowingSun",
			  "hazyDays",
			  "herMajesty",
			  "nostalgia",
			  "hemingway",
			  "concentrate"
		  ];
	  _.each(filters, function(v){
		  if (filter === v) {
			  filterValid = true;
		  }
	  });


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
          type : options.type
		};

        qt.convert(opts, function(err, dst) {
          if (err) {
            console.error(err);
            return reply(err).code(404);
          }
			if(filterValid) {
				var dst_filter = path.join(
					options.cacheDir,
					options.type, dim,
					file.substr(0, file.lastIndexOf('.'))) + "-" + filter + "." + ext;

				var c = Caman(opts.dst, function () {
					this[filter]();
					this.render(function () {
						var image = this.toBase64();
						this.save(dst_filter, true, function(){
							reply.file(dst_filter);
						});

					});
				});
			}
			else {
				reply.file(dst);
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

  if ("string" === typeof paths) {
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
