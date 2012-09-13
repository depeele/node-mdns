/** @file
 *
 *  A resolution client capable of performing queries to either a traditional
 *  unicast DNS server or as an mDNS client.
 *
 */
var Util        = require('util'),
    Events      = require('events'),
    Net         = require('net'),
    Dgram       = require('dgram'),
    Utils       = require('./utils.js'),
    Consts      = require('./consts.js'),
    Message     = require('./message.js'),
    Question    = require('./question.js'),
    Pack        = require('./pack.js'),
    Mdns        = require('./mdns.js');

/** @brief  Create a new Resolve instance.
 *  @param  config  If provided, an instance configuration object:
 *                      question    A Question instance, configuration object,
 *                                  array of instances or array of
 *                                  configuration objects;
 *                      server      If this client will query a traditional
 *                                  unicast DNS server, this object specifies
 *                                  server information:
 *                                      address the IP address of the server;
 *                                      port        the port of the server
 *                                                  [ 53 ];
 *                                      proto       which IP protocol to use
 *                                                  ( 'udp' | 'tcp' )
 *                                                  [ 'udp' ];
 *                      timeout     Query timeout (in micro-seconds)
 *                                  ( 0 == no timeout ) [ 6000 ];
 *
 *
 *  @emits  response  records, rinfo, response-message, raw-data (for mDNS 0+)
 *          end
 *          timeout
 *          error     Error instance
 *          listening (for mDNS multi-cast queries)
 */
function Resolve(config)
{
    var self    = this;

    Events.EventEmitter.call(self);


    config = config || {};

    self.question = null;
    self.server   = null;
    self.timeout  = (config.timeout === undefined
                        ? 6000
                        : config.timeout);

    if (config.server)
    {
        self.server = { address: null, port: 53, proto: 'udp' };

        if (typeof config.server === 'string')
        {
            self.server.address = config.server;
        }
        else
        {
            self.server.address = config.server.address;
            self.server.port    = config.server.port  | self.server.port;
            self.server.proto   = config.server.proto | self.server.proto;

            if ((self.server.proto !== 'tcp') && (self.server.proto !== 'udp'))
            {
                self.server.proto = 'udp';
            }
        }
    }

    if (config.question)
    {
        if (! Array.isArray(config.question))
        {
            config.question = [ config.question ];
        }

        self.question = [];

        config.question.forEach(function(qConfig) {
            var question    = qConfig;
            if (! (question instanceof Question))
            {
                //question = Mdns.Question(qConfig);
                question = new Question(null, qConfig);
            }

            self.question.push(question);
        });
    }
}
Util.inherits(Resolve, Events.EventEmitter);

/** @brief  Begin a resolution.
 *
 *  @return true | Error instance;
 */
Resolve.prototype.begin = function() {
    var self    = this,
        isMdns  = (! self.server ),
        proto   = (self.server && (self.server.proto === 'tcp')
                    ? 'tcp'
                    : 'udp');

    if ( (! isMdns) && ((! self.question) ||
                        (self.question && (self.question.length < 1))) )
    {
        return new Error("Missing 'question'");
    }

    if (self.question && (self.question.length > 0))
    {
        self._size    = (proto === 'tcp' ? 4096 : 512);

        /* :TODO: If there are multiple questions and this is unicast DNS,
         *        create/perform one request per question and adjust
         *        the 'response' handler to wait for all requests to complete.
         */

        //self._request = Mdns.Message({question:self.question});
        self._request = new Message({header:{rd:1},question:self.question});

        self._buffer  = new Buffer(self._size);
        self._pack    = new Pack.Pack( self._buffer );

        if (! self._request.pack( self._pack ))
        {
            // :XXX: Packing error...
            self.emit('error', new Error('Internal packing error: '
                                         + self._pack.error));
            return self.end();
        }

        //console.log("request:\n%s", self._request);
    }

    if (self.timeout > 0)
    {
        self._timer  = setTimeout(function() {
                            self.emit('timeout');
                            self.end();
                       }, self.timeout);
    }

    switch (proto)
    {
    case 'udp':
        self._socket = Dgram.createSocket('udp4');

        self._socket.on('error', function(e) {
            self.emit('error', e);
        });
        self._socket.on('close', function() {
            self.end();
        });

        self._socket.on('message', function(msg, rinfo) {
            /*
            console.log("message:\n%s",
                        Utils.buf2hex(msg, {octetsPer:16, ascii:true}));
            // */

            //var response    = Mdns.Message(msg);
            var response    = new Message(msg);

            if (response.header.rcode !== Consts.RCODE_STR.NOERROR)
            {
                // DNS error
                self.emit('error', new Error('DNS error: '
                                             + Consts.rcode2str(
                                                 response.header.rcode )) );
                return self.end();
            }

            /* If this is not a response OR, we're in mDNS multi-case mode and
             * there is no answer, authority, or additional, ignore this
             * message.
             *
            if ( ((! isMdns) && (response.header.qr !== 1)) ||
                 (isMdns     && (response.header.anCount < 1) &&
                                (response.header.nsCount < 1) &&
                                (response.header.arCount < 1)) )
             */
            if ((response.header.qr !== 1) ||
                (self._request &&
                    (response.header.id !== self._request.header.id)))
            {
                // Ignore this message
                return;
            }


            var records = [];

            response.answer.forEach(function(rec) {
                var pruned  = _prune(rec.rdata);
                pruned.type = Consts.type2str( rec.type );

                records.push( pruned );
            });
            response.authority.forEach(function(rec) {
                var pruned  = _prune(rec.rdata);
                pruned.type = Consts.type2str( rec.type );

                records.push( pruned );
            });
            response.additional.forEach(function(rec) {
                var pruned  = _prune(rec.rdata);
                pruned.type = Consts.type2str( rec.type );

                records.push( pruned );
            });

            self.emit('response', records, rinfo, response, msg);

            if (! isMdns)
            {
                // Uni-cast queery expects a SINGLE response
                return self.end();
            }
        });

        var addr, port;

        if (isMdns)
        {
            // mDNS multi-cast query
            self._socket.on('listening', function() {
                var ainfo   = self._socket.address();

                self.emit('listening', ainfo);
            });

            self._socket.bind( Mdns.config.port, Mdns.config.ipv4 );
            self._socket.setMulticastTTL( Mdns.config.ttl );
            self._socket.addMembership( Mdns.config.ipv4 );

            addr = Mdns.config.ipv4;
            port = Mdns.config.port;
        }
        else
        {
            // normal, DNS uni-cast query
            addr = self.server.address;
            port = self.server.port;
        }

        if (self._request)
        {
            // Send the request
            var buf     = self._pack.buf,
                offset  = self._pack.begin,
                length  = self._pack.offset - offset;

            /*
            console.log("request:\n%s\n%s",
                        self._request,
                        Utils.buf2hex(buf, {
                            offset:     offset,
                            length:     length,
                            octetsPer:  16,
                            ascii:      true}));
            // */
            self._socket.send( buf, offset, length, port, addr );
        }
        break;

    case 'tcp':
        self._socket = Net.connect(server.port, server.address);

        self._socket.on('connect', function() {
        });

        self._socket.on('timeout', function() {
            self.end();
        });

        self._socket.on('error', function(e) {
            self.emit('error', e);
        });

        self._socket.on('close', function() {
            self.end();
        });

        self._socket.on('data', function(data) {
        });

        // :XXX: Send the question
        break;
    }

    return true;
};

/** @brief  End a resolution.
 */
Resolve.prototype.end   = function() {
    var self    = this,
        sock    = self._socket;

    self._socket.removeAllListeners();

    if (self._timer)    { clearTimeout(self._timer); }
    delete self._timer;
    delete self._socket;

    if (sock)           { sock.close(); }

    delete self._size;
    delete self._pack;
    delete self._msg;

    self.emit('end');
};

module.exports = Resolve;



/**********************************************************************
 * Private helpers and utilities
 *
 */

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
        if ((! src.hasOwnProperty(key)) || (key === 'consumed'))
        {
            continue;
        }

        dst[key] = src[key];
    }

    return dst;
}
