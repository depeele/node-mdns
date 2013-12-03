/**
 *  @file
 *
 *  A resolution client capable of performing queries to either a traditional
 *  unicast DNS server or as an mDNS client.
 *
 *  @class  Mdns::Client
 */
var Util    = require('util'),
    Events  = require('events'),
    Net     = require('net'),
    Dgram   = require('dgram'),
    Utils   = require('./utils'),
    Pack    = require('./pack').Pack,
    Mdns    = require('./mdns'),
    _       = require('lodash');

/**
 *  Create a new Mdns Client.
 *  @constructor
 *  @param  config                      If provided, an instance configuration
 *                                      object {Object};
 *  @param  [config.server]             If this client will query a traditional
 *                                      unicast DNS server, this object
 *                                      specifies server information.  If no
 *                                      `server` is specified, this will be an
 *                                      MDNS client {Object}.
 *  @param  [config.server.address]     The IP address of the server {String};
 *  @param  [config.server.port=53]     The port of the server {Number};
 *  @param  [config.server.proto=udp]   Which IP protocol to use {String}
 *                                      ( 'udp' | 'tcp' );
 *
 *
 *  @emits  listening(address)      (for an MDNS client)
 *          connect()               (for a  DNS  client)
 *          error(err)
 *          close()
 *          timeout(request)
 *          response(message, rinfo, raw-data)
 */
function Client(config)
{
    var self    = this;

    Events.EventEmitter.call(self);


    config = config || {};

    self.server   = null;
    self.isMdns   = true;

    if (_.isObject(config.server))
    {
        self.isMdns = false;
        self.server = _.extend({ address: null, port: 53, proto: 'udp' },
                               config.server);

        if (_.isString(self.server.port))
        {
            self.server.port = parseInt(self.server.port, 10);
        }

        switch (self.server.proto)
        {
        case 'tcp':
        case 'udp':
            break;

        default:
            self.server.proto = 'udp';
        }
    }

    self.proto = (self.server && (self.server.proto === 'tcp')
                    ? 'tcp'
                    : 'udp');

    _.defer( function() {
        switch (self.proto)
        {
        case 'udp': _createUdp.call(self); break;
        case 'tcp': _createTcp.call(self); break;
        }
    });

    return self;
}
Util.inherits(Client, Events.EventEmitter);

_.extend(Client.prototype, {
    /**
     *  Close the client.
     *  @method close
     */
    close: function() {
        var self    = this,
            config  = {multicast: self.isMdns};

        if (! self.isMdns)
        {
            config.type = (self.server.proto === 'tcp'
                            ? 'tcp'
                            : 'udp4');
        }

        // Remove OUR socket bindings
        _.each(self.bindings, function(binding, name) {
            self.socket.removeListener(name, binding);
        });

        // Close our socket.
        self.socket.close();
    },

    /**
     *  Request a name resolution.
     *  @method resolve
     *  @param  question        A Question instance, configuration object,
     *                          array of instances or array of configuration
     *                          objects;
     *  @param  [timeout=6000]  Query timeout (in micro-seconds), where 0 means
     *                          no timeout {Number};
     *
     *  @return On success, the generated/sent DNS request,
     *                      with a _timer if `timeout` != 0;
     *          On error, an Error instance;
     */
    resolve: function(question, timeout) {
        var self    = this;

        if (timeout != null)    { timeout = parseInt(timeout, 10); }
        if ((timeout == null) || isNaN(timeout))
        {
            timeout = 6000;
        }

        /*********************************************************************
         * Generate a single request for the incoming question(s)
         *
         */
        var header  = (self.isMdns
                        ? {}
                        : {rd:1}),
            request = Mdns.Message({
                        header:   header,
                        question: question
                      });

        var config  = {
                multicast:  self.isMdns,
                socket:     self.socket
            };

        if (! self.isMdns)
        {
            config.addr = self.server.address;
            config.port = self.server.port;
            config.type = (self.server.proto === 'tcp'
                            ? 'tcp'
                            : 'udp4');
        }

        if (timeout > 0)
        {
            /*****************************************************************
             * If a timeout was specified as non-zero, create a request
             * timeout timer
             */
            request._timer = setTimeout(function() {
                                self.emit('timeout', request);
                             }, timeout);

            config.callback = function(err, bytes) {
                clearTimeout(request._timer);
                delete request._timer;

                if (err)
                {
                    self.emit('error', err);
                }
                else
                {
                    request.bytesSent = bytes;
                    self.emit('sent', request);
                }
            };
        }

        // Send the request
        Mdns.send(request, config);

        return request;
    },

    /**
     *  Send a service discovery message.
     *  @method discovery
     *  @param  [domain='.local.']  The query domain {String};
     *  @param  [timeout=6000]      Query timeout (in micro-seconds), where 0
     *                              means no timeout {Number};
     *
     *  @return On success, the generated/sent DNS request,
     *                      with a _timer if `timeout` != 0;
     *          On error, an Error instance;
     */
    discovery: function(domain, timeout) {
        var self    = this;

        if (timeout != null)
        {
            timeout = parseInt(timeout, 10);
            if (isNaN(timeout)) { timeout = null; }
        }
        if (timeout == null)    { timeout = 0; }

        var question    = [
                {qname: Mdns.serviceDiscovery(domain), qtype: 'PTR'}
            ];

        if (self.isReady)   { return __discovery(); }

        self.socket.once('listening', __discovery.bind(this));

        return;

        /***********************************************
         * Context-bound helpers
         *
         */
        function __discovery() {
            return self.resolve( question, timeout );
        }
    }
});

/**********************************************************************
 * Private helpers and utilities
 *
 */

/**
 *  Create a UDP socket.
 *  @method _createUdp
 *
 *  `this` is the controlling Client instance;
 *
 *  @return The new socket;
 */
function _createUdp()
{
    var self        = this,
        config      = {
            type:       'udp4',
            multicast:  (self.isMdns ? true : false),
            bindings:   {
                'listening':    __onListening,
                'error':        __onError,
                'close':        __onClose,
                'message':      __onMessage
            }
        },
        addr, port;

    self.bindings = config.bindings;
    self.isReady  = false;

    // Create a new socket
    self.socket = Mdns.socket( config );

    if (! self.isMdns)
    {
        self.isReady = true;

        _.defer(function() { self.emit('ready');});
    }

    return self.socket;

    /*********************************************************
     * Context-bound helpers
     *
     */
    function __onListening() {
        var ainfo   = self.socket.address();

        self.isReady = true;
        self.emit('listening', ainfo);

        if (self.isMdns)
        {
            self.emit('ready');
        }
    }

    function __onError(e) {
        self.emit('error', e);
    }

    function __onClose() {
        self.emit('close');
    }

    function __onMessage(msg, rinfo) {
        /* If this response is an error, _processResponse() will emit
         * an 'error' event.  Regardless, the parsed response will be
         * returned.
         */
        var response    = _processResponse.call(self, msg);

        self.emit('response', response, rinfo, msg);
    }
}

/**
 *  Create a TCP socket.
 *  @method _createTcp
 *
 *  `this` is the controlling Client instance;
 *
 *  @return The new socket;
 */
function _createTcp()
{
    var self        = this,
        bindings    = {
            'connect':      __onConnect,
            'timeout':      __onTimeout,
            'error':        __onError,
            'close':        __onClose,
            'data':         __onData
        };

    self.isReady = false;
    self.socket  = Net.connect(self.server.port, self.server.address);

    _.each(bindings, function(cb, name) {
        self.socket.on(name, cb);
    });

    return self.socket;

    /*********************************************************
     * Context-bound helpers
     *
     */
    function __onConnect() {
        self.rinfo  = { port:       self.socket.remotePort,
                        address:    self.socket.remoteAddress };

        self.isReady = true;
        self.emit('connect');
        self.emit('ready');
    }

    function __onTimeout() {
        self.emit('timeout');
    }

    function __onError(e) {
        self.emit('error', e);
    }

    function __onClose() {
        self.emit('close');
    }

    function __onData(data) {
        /* If this response is an error, _processResponse() will emit
         * an 'error' event.  Regardless, the parsed response will be
         * returned.
         */
        var response    = _processResponse.call(self, msg);

        self.emit('response', response, self.rinfo, data);
    }
}

/**
 *  Process a DNS response packet.
 *  @param  data    The raw DNS packet data (Buffer);
 *
 *  This routine will emit any 'response' events.
 *
 *  `this` is the controlling Client instance;
 *
 *  @return The DNS resonse message.
 */
function _processResponse(data)
{
    var self        = this,
        response    = Mdns.Message(data);

    if (response.header.rcode !== Mdns.consts.RCODE_STR.NOERROR)
    {
        // DNS error
        self.emit('error', new Error('DNS error: '
                                     + Mdns.consts.rcode2str(
                                         response.header.rcode )) );
        return response;
    }

    /* :TODO: If there were multiple requests, match this response with a
     *        particular request via id and mark that request as completed.
     *
     *  Generate an array of JUST processed records with no unparsed rdata
    var records = [];
    response.answer.forEach(function(rec) {
        var pruned  = _prune(rec.rdata);
        pruned.type = Mdns.consts.type2str( rec.type );

        records.push( pruned );
    });
    response.authority.forEach(function(rec) {
        var pruned  = _prune(rec.rdata);
        pruned.type = Mdns.consts.type2str( rec.type );

        records.push( pruned );
    });
    response.additional.forEach(function(rec) {
        var pruned  = _prune(rec.rdata);
        pruned.type = Mdns.consts.type2str( rec.type );

        records.push( pruned );
    });
    // */

    return response;
}

/** @brief  Generate a shallow clone of the given object, excluding 'consumed'.
 *  @param  src     The object to clone;
 *
 *  @return A new, cloned/pruned object.
 */
function _prune(src)
{
    var dst = _.clone(src);
    
    delete dst.consumed;

    return dst;
}

/******************************************************************************
 * Public exports
 *
 */
module.exports = Client;
