/** @file
 *
 *  A dynamic DNS update client.
 *
 */
var Util        = require('util'),
    Events      = require('events'),
    Net         = require('net'),
    Dgram       = require('dgram'),
    Utils       = require('./utils.js'),
    Pack        = require('./pack.js').Pack,
    Mdns        = require('./mdns.js');

/** @brief  Create a new Update instance.
 *  @param  config  If provided, an instance configuration object:
 *                      server          Acceptable for server(obj);
 *                      zone            Acceptable for zone(obj);
 *                      prerequisites   Acceptable for prerequisites(obj);
 *                      add             Acceptable for add(obj);
 *                      del             Acceptable for del(obj);
 *                      timeout         Query timeout (in micro-seconds)
 *                                      ( 0 == no timeout ) [ 6000 ];
 *
 *
 *  @emits  response  records, rinfo, response-message, raw-data (for mDNS 0+)
 *          end
 *          timeout
 *          error     Error instance
 */
function Update(config)
{
    var self    = this;

    Events.EventEmitter.call(self);


    config = config || {};

    self._server    = null;

    self._current   = null; // A cache of the current _updates message
    self._updates   = [];

    self.timeout  = (config.timeout === undefined
                        ? 6000
                        : config.timeout);

    if (config.server)
    {
        self.server(config.server);
    }

    if (config.zone)            { self.zone(config.zone); }
    if (config.prerequisites)   { self.prerequisites(config.prerequisites); }
    if (config.add)             { self.add(config.add); }
    if (config.del)             { self.del(config.del); }
}
Util.inherits(Update, Events.EventEmitter);

/** @brief  Get/(Re)Set the server information for an update.
 *  @param  config      If not provided, return the current server information,
 *                      otherwise, a configuration object with:
 *                          address     the IP address of the server;
 *                          port        the port of the server [ 53 ];
 *                          proto       which IP protocol to use
 *                                      ( 'udp' | 'tcp' ) [ 'udp' ];
 *
 *  @return the current server information.
 */
Update.prototype.server = function(config) {
    var self    = this;

    if (! config)   { return self._server; }

    self._server = { address: null, port: 53, proto: 'udp' };

    if (typeof config === 'string')
    {
        var parts   = config.split(':');

        self._server.address = parts[0];
        self._server.port    = (parts[1] | self._server.port);
    }
    else
    {
        self._server.address = config.address;
        self._server.port    = (config.port  || self._server.port);
        self._server.proto   = (config.proto || self._server.proto);

        if ((self._server.proto !== 'tcp') && (self._server.proto !== 'udp'))
        {
            self._server.proto = 'udp';
        }
    }
    
    return self._server;
};

/** @brief  Get/Set (a new) update zone for any following
 *          add/prerequisite/delete records.
 *  @param  zone        If not provided, return the most recent Zone.
 *                      Otherwise, a Zone/Question instance, configuration
 *                      object, array of instances or array of configuration
 *                      objects;
 *
 *  @return the most recent Zone.
 */
Update.prototype.zone = function(zone) {
    var self    = this;

    if (! zone) { return self._current.question[0]; }

    // The Target Zone is communicated in the Question section
    if (! Mdns.isQuestion(zone))
    {
        if (! zone.qname)   { zone.qname  = zone.name; }
        if (! zone.qclass)  { zone.qclass = (zone.class || 'IN'); }

        zone = Mdns.Question(zone);
    }

    zone.qtype = Mdns.consts.TYPE_STR.SOA;

    self._current = Mdns.Message({
        header:     {
            id:     self._updates.length,
            opcode: Mdns.consts.OPCODE_STR.UPDATE,
            qr:     0
        },
        question:   [ zone ],   // Zone
        answer:     null,       // Prerequesites
        authority:  null        // Updates
    });

    self._updates.push( self._current );

    return zone;
};

/** @brief  Add prerequisites for the current update.
 *  @param  config      A properly configured RR instance, array of properly
 *                      configured RR instances, configuration object or array
 *                      of configuration objects.
 *
 *                      A configuration object should have the form:
 *                          type    ('exists' | 'notExists' |
 *                                    'inUse' | 'notInUse')
 *
 *                           for 'exists':
 *                              name    The domain-name to match;
 *                              type    The RR type to match;
 *                              class   If provided, the RR class to match
 *                                      [ 'ANY' ];
 *
 *                           for 'notExists':
 *                              name    The domain-name to match;
 *                              type    The Resource Record type to match;
 *
 *                           for 'inUse' / 'notInUse':
 *                              name    The domain-name to match;
 *
 *  NOTE: MUST be preceeded by a call to zone().
 *
 *  @return this for a fluent interface.
 */
Update.prototype.prerquisites = function(config) {
    var self    = this;

    if (! config)           { throw new Error("missing config"); }
    if (! self._current)    { throw new Error("zone() must be called first"); }

    if (! Array.isArray( config))
    {
        config = [ config ];
    }

    if (! Array.isArray( self._current.answer ))
    {
        self._current.answer = [];
    }

    // Prerequesites are in the Answer section of an Update request
    var msg = self._current;
    config.forEach(function(aConfig) {
        var rr  = aConfig;
        if (Mdns.isRR(rr))
        {
            msg.addAnswer(rr);
        }
        else
        {
            switch (aConfig.type.toLowerCase())
            {
            case 'exists':
                rr = msg.addAnswer(aConfig.name, aConfig.type,
                                   (aConfig.class || 'ANY'), 0, null);
                break;

            case 'notexists':
            case '!exists':
                rr = msg.addAnswer(qConfig.name, aConfig.type,
                                   'NONE', 0, null);
                break;

            case 'inuse':
                rr = msg.addAnswer(qConfig.name, 'ANY', 'ANY', 0, null);
                break;

            case 'notinuse':
            case '!inuse':
                rr = msg.addAnswer(qConfig.name, 'ANY', 'NONE', 0, null);
                break;

            default:
                throw new Error("Invalid prerequisite type "
                                +"[ "+ qConfig.type +" ]");
            }
        }
    });

    return self;
};

/** @brief  Include record addition(s) in the update.
 *  @param  config      An RR instance, array of RR instances, RR configuration
 *                      object, or array of RR configuration objects;
 *
 *  @return this for a fluent interface;
 */
Update.prototype.add = function(config) {
    var self    = this;

    if (! config)           { throw new Error("missing config"); }
    if (! self._current)    { throw new Error("zone() must be called first"); }

    if (! Array.isArray( config ))
    {
        config = [ config ];
    }

    // Adds are in the Authority section of an Update request
    var msg = self._current;
    config.forEach(function(rr) {
        if (! Mdns.isRR(rr))
        {
            rr = Mdns.RR( rr );
        }

        msg.addAuthority( rr );
    });

    return self;
};

/** @brief  Include record deletion(s) in the update.
 *  @param  config      A properly configured RR instance
 *                          (class:'ANY', ttl:0, rdata:null)
 *                      array of properly configured RR instances, RR
 *                      configuration object, or array of RR configuration
 *                      objects;
 *
 *  @return this for a fluent interface;
 */
Update.prototype.del = function(config) {
    var self    = this;

    if (! config)           { throw new Error("missing config"); }
    if (! self._current)    { throw new Error("zone() must be called first"); }

    if (! Array.isArray( config ))
    {
        config = [ config ];
    }

    // Adds are in the Authority section of an Update request
    var msg = self._current;
    config.forEach(function(rr) {
        if (! Mdns.isRR(rr))
        {
            msg.addAuthority( rr.name, rr.type, 'ANY', 0, null );
        }
        else
        {
            msg.addAuthority( rr );
        }
    });

    return self;
};

/** @brief  Begin an update.
 *
 *  @return true | Error instance;
 */
Update.prototype.begin = function() {
    var self    = this;

    if (self._updates.length < 1)   { self.end(); }

    var proto   = (self._server.proto === 'tcp'
                    ? 'tcp'
                    : 'udp'),
        bufSize = (proto === 'tcp' ? 4096 : 512);

    self._requests = [];

    if (self.timeout > 0)
    {
        /*********************************************************************
         * If a timeout was specified as non-zero, create a timeout timer
         *
         */
        self._timer  = setTimeout(function() {
                            self.emit('timeout');
                            self.end();
                       }, self.timeout);
    }

    self._updates.forEach(function(update, idex) {
        var request = {
                id:     idex,
                msg:    update,
                pack:   new Pack( new Buffer( bufSize ) ),

                // Related response information
                response:   {
                    records:    [],
                    data:       null,
                    rinfo:      null,
                    msg:        null
                }
            };

        if (! request.msg.pack( request.pack ))
        {
            // :XXX: Packing error...
            self.emit('error', new Error('Internal packing error: '
                                        + request.pack.error));
            return;
        }

        self._requests.push( request );

        switch (proto)
        {
        case 'udp':
            _udp(self, request);
            break;

        case 'tcp':
            _tcp(self, request);
            break;
        }

    });

    return true;
};

/** @brief  End an update.
 *  @param  request     The triggering request (if any).
 */
Update.prototype.end   = function(request) {
    var self    = this;

    if (request)
    {
        var sock    = request.socket;
        if (sock)
        {
            try {
                sock.removeAllListeners();
                sock.close();
            } catch(e) {}

            delete request.sock;
        }

        self._requests[ request.id ] = null;

        self.emit('response', request.response.records,
                              request.response.rinfo,
                              request.response.msg,
                              request.response.data);

        delete request.pack;
        delete request.msg;

        // Are there any active requests remaining?
        var finished    = true;
        self._requests.forEach(function(req) {
            if (req !== null)   { finished = false; }
        });

        if (finished !== true)  { return; }
    }

    // All requests have completed
    if (self._timer)    { clearTimeout(self._timer); }
    delete self._timer;

    self.emit('end');
};

module.exports = Update;

/**********************************************************************
 * Private helpers and utilities
 *
 */

/** @brief  Handle a UDP DNS update.
 *  @param  self    The Update instance;
 *  @param  request The request object:
 *                      { id:, msg:, pack: }
 *
 */
function _udp(self, request)
{
    request.socket = Dgram.createSocket('udp4');

    request.socket.on('error', function(e) {
        self.emit('error', e);
    });
    request.socket.on('close', function() {
        self.end( request );
    });

    request.socket.on('message', function(msg, rinfo) {
        _processResponse(self, request, msg, rinfo);

        return self.end( request );
    });

    if (request.pack)
    {
        // Send the request
        var buf     = request.pack.buf,
            offset  = request.pack.begin,
            length  = request.pack.offset - offset;

        /*
        console.log("update request to %s:%s\n%s\n%s",
                    self._server.address, self._server.port,
                    request.msg,
                    Utils.buf2hex(buf, {
                        offset:     offset,
                        length:     length,
                        octetsPer:  16,
                        ascii:      true}));
        // */
        request.socket.send( buf, offset, length,
                             self._server.port, self._server.address );
    }
}

/** @brief  Handle a TCP DNS resolution.
 *  @param  self    The Update instance;
 *  @param  request The request object:
 *                      { id:, msg:, pack: }
 *
 */
function _tcp(self, request)
{
    request.socket = Net.connect(self._server.port, self._server.address);

    request.socket.on('connect', function() {
    });

    request.socket.on('timeout', function() {
        self.end( request );
    });

    request.socket.on('error', function(e) {
        self.emit('error', e);
    });

    request.socket.on('close', function() {
        self.end( request );
    });

    request.socket.on('data', function(data) {
    });

    // :XXX: Send the question
}

/** @brief  Process a DNS response packet.
 *  @param  self    The Update instance;
 *  @param  request The request object:
 *                      { id:, isMdns:, msg:, pack: }
 *  @param  data    The raw DNS packet data (Buffer);
 *  @param  rinfo   The remote address/port information;
 *
 *  This routine will emit any 'response' events.
 */
function _processResponse(self, request, data, rinfo)
{
    /*
    console.log("message:\n%s",
                Utils.buf2hex(msg, {octetsPer:16, ascii:true}));
    // */

    //var response    = Mdns.Message(data);
    var response    = Mdns.Message(data);

    /*
    console.log("update response from %s:%s:\n%s\n%s",
                rinfo.address, rinfo.port,
                response,
                Utils.buf2hex(data, {
                    octetsPer:  16,
                    ascii:      true}));
    // */

    request.response.data  = data;
    request.response.rinfo = rinfo;
    request.response.msg   = response;

    if (response.header.rcode !== Mdns.consts.RCODE_STR.NOERROR)
    {
        // DNS error
        self.emit('error', new Error('DNS error: '
                                     + Mdns.consts.rcode2str(
                                         response.header.rcode )) );
        return self.end( request );
    }


    // Include the original request(s)
    request.msg.question.forEach(function(rec) {
        var pruned  = {
                name: rec.qname,
                type: Mdns.consts.type2str( rec.qtype ),
                class:Mdns.consts.class2str( rec.qclass )
            };

        request.response.records.push( pruned );
    });

    request.msg.authority.forEach(function(rec) {
        var pruned  = _prune(rec.rdata);

        pruned.name  = rec.name;
        pruned.type  = Mdns.consts.type2str( rec.type );
        pruned.class = Mdns.consts.class2str( rec.class );
        pruned.ttl   = rec.ttl;

        request.response.records.push( pruned );
    });

    // Include any response records
    response.answer.forEach(function(rec) {
        var pruned  = _prune(rec.rdata);

        pruned.name  = rec.name;
        pruned.type  = Mdns.consts.type2str( rec.type );
        pruned.class = Mdns.consts.class2str( rec.class );
        pruned.ttl   = rec.ttl;

        request.response.records.push( pruned );
    });
    response.authority.forEach(function(rec) {
        var pruned  = _prune(rec.rdata);

        pruned.name  = rec.name;
        pruned.type  = Mdns.consts.type2str( rec.type );
        pruned.class = Mdns.consts.class2str( rec.class );
        pruned.ttl   = rec.ttl;

        request.response.records.push( pruned );
    });
    response.additional.forEach(function(rec) {
        var pruned  = _prune(rec.rdata);

        pruned.name  = rec.name;
        pruned.type  = Mdns.consts.type2str( rec.type );
        pruned.class = Mdns.consts.class2str( rec.class );
        pruned.ttl   = rec.ttl;

        request.response.records.push( pruned );
    });
}

/** @brief  Generate a shallow clone of the given object, excluding 'consumed'.
 *  @param  src     The object to clone;
 *
 *  @return A new, cloned/pruned object.
 */
function _prune(src)
{
    var dst = {};

    for (key in src)
    {
        if ((! src.hasOwnProperty(key)) ||
            (key[0] === '_')            ||
            (key    === 'produced')     ||
            (key    === 'consumed'))
        {
            continue;
        }

        dst[key] = src[key];
    }

    return dst;
}

