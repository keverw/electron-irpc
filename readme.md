# electron-irpc v0.0.1
[![npm version](https://badge.fury.io/js/electron-irpc.svg)](https://badge.fury.io/js/electron-irpc) &nbsp; [![Build Status](https://travis-ci.org/keverw/electron-irpc.svg?branch=master)](https://travis-ci.org/keverw/electron-irpc)

inter-process communication(IPC) and remote procedure call (RPC) combined. Makes Electron IPC work more like callbacks.

So instead of calling the main thread, it is replying back, etc. and manually keeping track of everything. This module abstracts it away where you can call functions added to IRPC in the main thread and get a callback as if it was a local function even though it's running in the main thread.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Install](#install)
- [main.js](#mainjs)
- [renderer.js](#rendererjs)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Install

To set up geoipfind on your Node.js server use npm.

`npm install electron-irpc`

## main.js

Initially this in the main thread. Only one allowed per app, so if you want to access it outside of main.js, set it as a global or pass it to other modules in main.

```js
var irpc = require('electron-irpc');

var irpcMain = irpc.main();

// Then within the process, you can add in functions, variables or functions/variables in the same format as modules
// Also note function names, variable names and namespaces are automatically lowercased when added and called

irpcMain.addFunction('hello', function(parameters, cb)
{
    cb(null, {
        msg: 'Hello, World...'
    });
});

irpcMain.addVariable('version', 'V9000');

irpcMain.addModule({
    ping: function(parameters, cb)
    {
        //callback - error, result
        cb(null, '2ms');
    },
    version: '9.0'
}, 'testModule'); //testModule is the namespace

```

## renderer.js

```js
var irpc = require('electron-irpc');

var irpcRenderer = irpc.renderer();

irpcRenderer.call('hello', {}, function(err, result)
{
    console.log(err, result);
});

irpcRenderer.get('version', function(err, result)
{
    console.log(err, result);
});

irpcRenderer.call('testModule.ping', {}, function(err, result)
{
    console.log(err, result);
});

irpcRenderer.get('testModule.version', function(err, result)
{
    console.log(err, result);
});
```
