'use strict';

require('mocha');
var assert = require('assert');
var App = require('..');
var app;

describe('.task', function() {
  beforeEach(function() {
    app = new App({silent: true});
  });

  it('should register a task', function() {
    var fn = function(cb) {
      cb();
    };
    app.task('default', fn);
    assert.equal(typeof app.tasks.default, 'object');
    assert.equal(app.tasks.default.fn, fn);
  });

  it('should register a task with an array of dependencies', function(cb) {
    var count = 0;
    app.task('foo', function(next) {
      count++;
      next();
    });
    app.task('bar', function(next) {
      count++;
      next();
    });
    app.task('default', ['foo', 'bar'], function(next) {
      count++;
      next();
    });
    assert.equal(typeof app.tasks.default, 'object');
    assert.deepEqual(app.tasks.default.deps, ['foo', 'bar']);
    app.build('default', function(err) {
      if (err) return cb(err);
      assert.equal(count, 3);
      cb();
    });
  });

  it('should run a glob of tasks', function(cb) {
    var count = 0;
    app.task('foo', function(next) {
      count++;
      next();
    });
    app.task('bar', function(next) {
      count++;
      next();
    });
    app.task('baz', function(next) {
      count++;
      next();
    });
    app.task('qux', function(next) {
      count++;
      next();
    });
    app.task('default', ['b*']);
    assert.equal(typeof app.tasks.default, 'object');
    app.build('default', function(err) {
      if (err) return cb(err);
      assert.equal(count, 2);
      cb();
    });
  });

  it('should register a task with a list of strings as dependencies', function() {
    app.task('default', 'foo', 'bar', function(cb) {
      cb();
    });
    assert.equal(typeof app.tasks.default, 'object');
    assert.deepEqual(app.tasks.default.deps, ['foo', 'bar']);
  });

  it('should run a task', function(cb) {
    var count = 0;
    app.task('default', function(cb) {
      count++;
      cb();
    });

    app.build('default', function(err) {
      if (err) return cb(err);
      assert.equal(count, 1);
      cb();
    });
  });

  it('should throw an error when a task with unregistered dependencies is run', function(cb) {
    app.task('default', ['foo', 'bar']);
    app.build('default', function(err) {
      assert(err);
      cb();
    });
  });

  it('should throw an error when `.build` is called without a callback function.', function() {
    try {
      app.build('default');
      throw new Error('Expected an error to be thrown.');
    } catch (err) {
    }
  });

  it('should emit task events', function(cb) {
    var events = [];
    app.on('task:starting', function(task) {
      events.push('starting.' + task.name);
    });
    app.on('task:finished', function(task) {
      events.push('finished.' + task.name);
    });
    app.on('task:error', function(e, task) {
      events.push('error.' + task.name);
    });
    app.task('foo', function(cb) {
      cb();
    });
    app.task('bar', ['foo'], function(cb) {
      cb();
    });
    app.task('default', ['bar']);
    app.build('default', function(err) {
      if (err) return cb(err);
      assert.deepEqual(events, [
        'starting.default',
        'starting.bar',
        'starting.foo',
        'finished.foo',
        'finished.bar',
        'finished.default'
      ]);
      cb();
    });
  });

  it('should emit an error event when an error is passed back in a task', function(cb) {
    app.on('error', function(err) {
      assert(err);
      assert.equal(err.message, 'This is an error');
    });
    app.task('default', function(cb) {
      return cb(new Error('This is an error'));
    });
    app.build('default', function(err) {
      if (err) return cb();
      cb(new Error('Expected an error'));
    });
  });

  it('should emit an error event when an error is thrown in a task', function(cb) {
    app.on('error', function(err) {
      assert(err);
      assert.equal(err.message, 'This is an error');
    });
    app.task('default', function(cb) {
      cb(new Error('This is an error'));
    });
    app.build('default', function(err) {
      assert(err);
      cb();
    });
  });

  it('should run dependencies before running the dependent task.', function(cb) {
    var seq = [];
    app.task('foo', function(cb) {
      seq.push('foo');
      cb();
    });
    app.task('bar', function(cb) {
      seq.push('bar');
      cb();
    });
    app.task('default', ['foo', 'bar'], function(cb) {
      seq.push('default');
      cb();
    });

    app.build('default', function(err) {
      if (err) return cb(err);
      assert.deepEqual(seq, ['foo', 'bar', 'default']);
      cb();
    });
  });
});
