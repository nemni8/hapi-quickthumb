var quickthumb =  require('./lib/quickthumb');
exports.register = quickthumb;
exports.register.attributes = {
  pkg: require('./package.json')
};
