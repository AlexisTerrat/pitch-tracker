var circular = (function Circular() {
  var app = {};
  var factories = {};

  // use('ModuleName', function Factory() {})
  // use('ModuleName', ['DepModule0', 'DepModule1'], function Factory(DepModule0, DepModule1) {})
  function use(name) {
    if (factories[name]) {
      throw new Error('ModuleName ' + name + ' already used');
    }
    var subArgs = Array.prototype.slice.call(arguments, 1);
    var dependencies = [];
    var constructor;
    if (subArgs.length == 1) {
      constructor = subArgs[0];
    } else {
      dependencies = subArgs[0];
      constructor = subArgs[1];
    }
    factories[name] = {
      name: name,
      dependencies: dependencies,
      _constructor: constructor
    };
    return app;
  };
  app.use = use;

  function load() {
    // Kahn's toposort
    var buildSeq = [];
    var noDepFactories = [];
    var factory, pivotFactory, deps, name, i;
    for (name in factories) {
      factory = factories[name];
      deps = factory.dependencies;
      factory._deps = deps.slice();
      if (deps.length == 0) {
        noDepFactories.push(factory);
      }
    }
    if (noDepFactories.length == 0) {
      throw new Error('Invalid dependency tree');
    }
    while (noDepFactories.length > 0) {
      pivotFactory = noDepFactories.pop();
      buildSeq.push(pivotFactory);
      for (name in factories) {
        factory = factories[name];
        deps = factory._deps;
        i = deps.indexOf(pivotFactory.name);
        if (i >= 0) {
          deps.splice(i, 1);
          if (deps.length == 0) {
            noDepFactories.push(factory);
          }
        }
      }
    }
    for (name in factories) {
      if (factories[name]._deps.length > 0) {
        throw new Error('Circular dependency found including module ' + name + ' !');
      }
      delete factories[name]._deps;
    }

    // instanciate modules
    var modules = {};
    var constructorArgs; // aka dependency instances
    var j, depName;
    for (i in buildSeq) {
      factory = buildSeq[i];
      deps = factory.dependencies;
      constructorArgs = [];
      for (j in deps) {
        depName = deps[j];
        constructorArgs.push(modules[depName]);
      }
      modules[factory.name] = factory._constructor.apply(null, constructorArgs);
    }
  }

  window.onload = load;

  return app;
})();
