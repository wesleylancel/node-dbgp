'use strict';

var util = require('util'),
    DbgpDebugger = require('./index');

var debug = new DbgpDebugger();

debug.on('started', function(info) {
    console.log('Debugger started from file ', info.file);
});

debug.on('stopped', function () {
    console.log('Debugger stopped');
});

debug.on('breakpoint', function (breakpoint) {
    console.log('Breakpoint in', breakpoint.file, 'at line', breakpoint.line);

    // Full breakpoint including context
    console.log(util.inspect(breakpoint, false, null));

    this.run();
});

debug.start();
