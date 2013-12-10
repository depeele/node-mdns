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
 *  @param  [config.server.proto=udp4]  Which IP protocol to use {String}
 *                                      ( 'udp' | 'udp4' | 'udp6' | 'tcp' );
 *  @param  [config.bindings]           If provided, an object containing
 *                                      alternative socket event bindings
 *                                      {Object};
 *  @param  [config.bindings.listening] A binding for the UDP socket
 *                                      `listening` event {Function};
 *  @param  [config.bindings.error]     A binding for the UDP/TCP socket
 *                                      `error` event {Function};
 *  @param  [config.bindings.close]     A binding for the UDP/TCP socket
 *                                      `close` event {Function};
 *  @param  [config.bindings.message]   A binding for the UDP socket
 *                                      `message` event {Function};
 *  @param  [config.bindings.connect]   A binding for the TCP socket
 *                                      `connect` event {Function};
 *  @param  [config.bindings.timeout]   A binding for the TCP socket
 *                                      `timeout` event {Function};
 *  @param  [config.bindings.data]      A binding for the TCP socket
 *                                      `data` event {Function};
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


    _.merge(self, Client.defaults, config || {});

    if (_.isObject(self.server))
    {
        self.isMdns = false;

        self.server = _.extend({
            address:null,
            port:   Mdns.consts.DNS.PORT,
            proto: 'udp4'
        }, self.server);

        if (_.isString(self.server.port))
        {
            self.server.port = parseInt(self.server.port, 10);
        }

        switch (self.server.proto)
        {
        case 'tcp':
        case 'udp4':
        case 'udp6':
            break;

        default:
            self.server.proto = 'udp4';
        }
    }

    self.proto = (self.server != null
                    ? self.server.proto
                    : 'udp4');

    _.defer( function() {
        if (self.proto === 'tcp')   { _createTcp.call(self); }
        else                        { _createUdp.call(self); }
    });

    return self;
}
Util.inherits(Client, Events.EventEmitter);

Client.defaults = {
    server:     null,
    proto:      'udp4',
    socket:     null,

    isMdns:     true,
    isReady:    false,

    port:       null,
    address:    null,
    ttl:        Mdns.consts.MDNS.TTL,

    bufSize:    {
        'udp4': 512,
        'udp6': 512,
        'tcp':  4096
    },

    bindings:   {}
};

_.extend(Client.prototype, {
    // :Note: `Client.defaults` are mixed directly in

    /**
     *  Close the client.
     *  @method close
     */
    close: function() {
        var self    = this;

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

        if  (timeout != null)   { timeout = parseInt(timeout, 10); }
        if ((timeout == null) || isNaN(timeout))
        {
            timeout = 6000;
        }

        /*********************************************************************
         * Generate a single request for the incoming question(s)
         *
         */
        var header      = (self.isMdns
                            ? {}
                            : {rd:1}),
            request     = Mdns.Message({
                            header:   header,
                            question: question
                        }),
            callback    = null;

        if (timeout > 0)
        {
            /*****************************************************************
             * If a timeout was specified as non-zero, create a request
             * timeout timer
             */
            request._timer = setTimeout(function() {
                                self.emit('timeout', request);
                             }, timeout);

            callback = function(err, bytes) {
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
        self.send(request, callback);

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

        domain = domain || Mdns.consts.MDNS.DOMAIN;
        if (timeout != null)
        {
            timeout = parseInt(timeout, 10);
            if (isNaN(timeout)) { timeout = null; }
        }
        if (timeout == null)    { timeout = 0; }

        if (self.isReady)   { return __discovery(); }

        self.socket.once('listening', __discovery.bind(this));

        return;

        /***********************************************
         * Context-bound helpers
         *
         */
        function __discovery() {
            var question    = [
                    {qname: Mdns.consts.MDNS.SD +'.'+ domain, qtype: 'PTR'}
                ];

            return self.resolve( question, timeout );
        }
    },

    /**
     *  Send the given mDNS message over the shared mDNS socket.
     *  @method send
     *  @param  msg             The mDNS message to send {Mdns::Message};
     *  @param  [callback]      If provided, the callback to invoke upon
     *                          completion of the send {Function}:
     *                              callback(err, data);
     *
     *  @return The final pack instance, possibly with an error;
     */
    send: function(msg, callback) {
        var self    = this,
            pack    = new Pack( new Buffer( self.bufSize[ self.proto ] ) );

        if (! _.isFunction(callback))   { callback = function(){}; };

        if (! msg.pack( pack ))
        {
            // :XXX: Packing error...
            callback(pack.error, null);
            return pack;
        }

        /*
        console.log("Client.send(): %s:%s:\n%s\n%s",
                    self.address, self.port,
                    msg,
                    Utils.buf2hex(pack.buf, {
                        offset:     pack.offset,
                        length:     pack.length,
                        octetsPer:  16,
                        ascii:      true}));
        // */

        if (self.proto === 'tcp')
        {
            self.socket.write( pack.buf, callback );
        }
        else
        {
            self.socket.send( pack.buf, pack.begin, pack.offset - pack.begin,
                              self.port, self.address, callback );
        }

        return pack;
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
    var self        = this;


    self.isReady  = false;

    // Include bindings for unhandled events
    if (! _.isFunction(self.bindings.listening))
    {
        self.bindings.listening = _.bind(__onListening, self);
    }
    if (! _.isFunction(self.bindings.error))
    {
        self.bindings.error     = _.bind(__onError, self);
    }
    if (! _.isFunction(self.bindings.close))
    {
        self.bindings.close     = _.bind(__onClose, self);
    }
    if (! _.isFunction(self.bindings.message))
    {
        self.bindings.message   = _.bind(__onMessage, self);
    }

    // Set the target port and address
    if (self.port == null)
    {
        self.port     = (self.isMdns ||
                         (! self.server) || (! self.server.port)
                            ? Mdns.consts.MDNS.PORT
                            : self.server.port);
    }
    if (self.address == null)
    {
        self.address  = (self.isMdns ||
                         (! self.server) || (! self.server.address)
                            ? (self.proto === 'udp6'
                                    ? Mdns.consts.MDNS.ADDR.IPv6
                                    : Mdns.consts.MDNS.ADDR.IPv4)
                            : self.server.address);
    }


    // Create a new socket
    self.socket = Dgram.createSocket( self.proto );

    _.each(self.bindings, function(cb, name) {
        self.socket.on(name, cb);
    });

    /* Defer the next action, regardless of protocol, to to allow this method
     * to return the new socket to the caller, solidifying the context of any
     * bound function.
     */
    _.defer(function() {
        if (self.isMdns)
        {
            // Bind and set to multi-cast
            self.socket.bind( self.port, null, function() {

                // Set to multi-cast
                self.socket.setMulticastTTL( self.ttl );

                self.socket.addMembership( self.address );
            });
        }
        else
        {
            self.isReady = true;

            self.emit('ready');
        }
    });

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
        self.socket.removeAllListeners();

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
            'data':         __onData
        };

    // Include bindings for unhandled events
    if (! _.isFunction(self.bindings.connect))
    {
        self.bindings.connect = _.bind(__onConnect, self);
    }
    if (! _.isFunction(self.bindings.timeout))
    {
        self.bindings.timeout = _.bind(__onTimeout, self);
    }
    if (! _.isFunction(self.bindings.error))
    {
        self.bindings.error     = _.bind(__onError, self);
    }
    if (! _.isFunction(self.bindings.close))
    {
        self.bindings.close     = _.bind(__onClose, self);
    }
    if (! _.isFunction(self.bindings.data))
    {
        self.bindings.data      = _.bind(__onData, self);
    }

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
