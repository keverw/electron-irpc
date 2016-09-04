(function()
{
    //inter-process communication(IPC) and remote procedure call (RPC) combined.

    var bson = require('bson');
    var BSON = new bson.BSONPure.BSON();

    var channelPrefix = 'irpc.js';
    var mainChannel = channelPrefix + '-main';

    var toObject = function(error)
    {
        var alt = {};

        Object.getOwnPropertyNames(error).forEach(function(key) {
            if (error[key] && typeof error[key] == 'object')
            {
                alt[key] = toObject(error[key]);
            }
            else
            {
                alt[key] = error[key];
            }

        });

        return alt;
    };

    module.exports = {
        main: function()
        {
            var loadedVar = channelPrefix + 'IsLoaded';

            if (global[loadedVar])
            {
                throw new Error(channelPrefix + ' is already loaded.');
            }
            else
            {
                global[loadedVar] = true;
            }

            var ipcMain = require('electron').ipcMain;

            var mainHelper = function()
            {
                this.variables = {};

                var self = this;
                var listener = function(event, meta)
                {
                    meta = BSON.deserialize(meta); //decoded BSON

                    var doCallback = function(err, result)
                    {
                        if (err && typeof err == 'object') //not null and is a object
                        {
                            err = toObject(err);
                        }

                        try {
                            event.sender.send(meta.chanName, BSON.serialize({
                                reqID: meta.reqID,
                                err: err,
                                result: result
                            }, false, true, false));

                        } catch (err) {
                            if (err.message != 'Object has been destroyed') // Silence error if window was closed before callback was called
                            {
                                throw err;
                            }

                        }

                    };

                    //////////////////////////////////////////////////////
                    meta.name = meta.name.toLowerCase();
                    if (typeof self.variables[meta.name] == 'object')
                    {
                        var type = self.variables[meta.name].type;
                        var v = self.variables[meta.name].v;

                        if (type == 'function')
                        {
                            try {
                                v(meta.parms, doCallback);
                            }
                            catch (e) {
                                doCallback(e, null);
                            }
                        }
                        else
                        {
                            doCallback(null, v);
                        }

                    }
                    else
                    {
                        var notFoundErr = new Error('Function or Variable Not Found');
                        notFoundErr.type = 'irpc';
                        notFoundErr.code = 404; //network or device error
                        doCallback(notFoundErr);
                    }

                };

                ipcMain.on(mainChannel, listener);
            };

            mainHelper.prototype._addVorFN = function(type, name, v, namespace)
            {
                name = name.toLowerCase();

                if (typeof namespace == 'undefined')
                {
                    namespace = '';
                }

                namespace = namespace.toLowerCase();

                if (namespace.length > 0) //is a namespace
                {
                    name = namespace + '.' + name;
                }
                else if ((name.indexOf('.') != -1)) //not a namespace and has a .
                {
                    throw new Error('. are only allowed in namespaces');
                }

                //store in variables struct
                if (this.variables[name] && typeof this.variables[name] == 'object')
                {
                    throw new Error(name + ' already exists');
                }
                else
                {
                    this.variables[name] = {
                        name: name,
                        namespace: namespace,
                        type: type,
                        v: v
                    };
                }

            };

            mainHelper.prototype.addFunction = function(name, fn)
            {
                if (typeof name == 'string' && name.length > 0)
                {
                    var type = typeof fn;

                    if (type === 'function')
                    {

                        if ((name.indexOf('.') != -1)) //has .
                        {
                            throw new Error('addFunction doesn\'t support namespaces');
                        }
                        else
                        {
                            return this._addVorFN(type, name, fn);
                        }

                    }
                    else
                    {
                        throw new Error('addFunction doesn\'t support variables');
                    }

                }
                else
                {
                    throw new Error('name must be a non empty string');
                }

            };

            mainHelper.prototype.addVariable = function(name, v)
            {
                if (typeof name == 'string' && name.length > 0)
                {
                    var type = typeof v;

                    if (type === 'function')
                    {
                        throw new Error('addVariable doesn\'t support functions');
                    }
                    else
                    {

                        if ((name.indexOf('.') != -1)) //has .
                        {
                            throw new Error('addVariable doesn\'t support namespaces');
                        }
                        else
                        {
                            return this._addVorFN(type, name, v);
                        }

                    }

                }
                else
                {
                    throw new Error('name must be a non empty string');
                }

            };

            mainHelper.prototype.addModule = function(functions, namespace)
            {
                if (functions && typeof functions == 'object')
                {

                    for (var name in functions)
                    {
                        if (functions.hasOwnProperty(name))
                        {
                            var prop = functions[name];
                            this._addVorFN(typeof prop, name, prop, namespace);
                        }

                    }

                }
                else
                {
                    throw new Error('addModule must take a object or require()');
                }

            };

            return new mainHelper();
        },
        renderer: function()
        {
            var ipcRenderer = require('electron').ipcRenderer;

            var rendererHelper = function()
            {
                this.callbacks = {};
                this.rendererProcessChanID = new bson.ObjectId();
                this.rendererProcessChanName = channelPrefix + '-' + this.rendererProcessChanID;

                var self = this;
                var listener = function(event, meta)
                {
                    meta = BSON.deserialize(meta); //decoded BSON

                    if (self.callbacks[meta.reqID] && typeof self.callbacks[meta.reqID] == 'function')
                    {
                        self.callbacks[meta.reqID](meta.err, meta.result);
                        delete self.callbacks[meta.reqID];
                    }

                };

                ipcRenderer.on(this.rendererProcessChanName, listener);
            };

            rendererHelper.prototype.call = function(name, parms, cb)
            {
                var reqID = new bson.ObjectId();

                this.callbacks[reqID] = cb;

                ipcRenderer.send(mainChannel, BSON.serialize({
                    chanName: this.rendererProcessChanName,
                    reqID: reqID,
                    name: name,
                    parms: parms
                }, false, true, false));

            };

            rendererHelper.prototype.get = function(name, cb)
            {
                this.call(name, {}, cb);
            };

            return new rendererHelper();
        }

    };

}());
