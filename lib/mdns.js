/**
 *
 *  Front-end for MDNS as well as DNS protocol handlers.
 *
 */
var Dgram       = require('dgram'),
    _           = require('lodash'),
    Consts      = require('./consts'),
    Message     = require('./message'),
    Header      = require('./header'),
    Question    = require('./question'),
    RR          = require('./rr'),
    RData       = require('./rdata'),
    Pack        = require('./pack').Pack,
    Mdns        =   {
        config: {
            mac:    "01:00:5E:00:00:FB",
            ipv4:   "224.0.0.251",
            ipv6:   "FF02::FB",
            port:   5353,

            ttl:    255,
            domain: "local.",

            /* The "magic" service discovery serviceType -- without the
             * 'domain' since that can vary depending upon the context.
             */
            dnsSd:  "_services._dns-sd._udp",

            bufSize:    {
                'udp':  512,
                'tcp':  4096
            },

            // Socket cache
            socket: {
                'udp4': null,
                'udp6': null
            }
        },

        consts: Consts,

        /**
         *  Return the service discovery service type
         *  @method serviceDiscovery
         *  @param  [domain]    If provided, use this domain, otherwise, use
         *                      the configured domain {String};
         *
         *  @return The service discovery service type {String};
         */
        serviceDiscovery: function(domain) {
            var self        = this;

            domain = domain || self.config.domain;

            return self.config.dnsSd +'.'+ domain;
        },

        /**
         *  Create a new DNS Message.
         *  @method Message
         *  @param  config              The configuration object {Object};
         *  @param  config.header       A Header instance or configuration data
         *                              for a new instance;
         *  @param  config.question     An array of Question instances or
         *                              configuration data for new instances;
         *  @param  config.answer       An array of RR instances or
         *                              configuration data for new instances;
         *  @param  config.authority    An array of RR instances or
         *                              configuration data for new instances;
         *  @param  config.additional   An array of RR instances or
         *                              configuration data for new instances;
         *
         *  @return A new DNS Message instance {Mdns::Message}
         */
        Message:    function(config) {
            return new Message(config);
        },
        isMessage: function(obj) {
            return (obj instanceof Message);
        },

        /**
         *  Create a new DNS Message Header.
         *  @method Header
         *  @param  config              The configuration object {Object};
         *  @param  [config.id=0]       header id;
         *  @param  [config.qr=0]       query/response flag;
         *  @param  [config.opcode=0]   opcode (consts.OPCODE_STR.*);
         *  @param  [config.aa=0]       authoritative answer flag;
         *  @param  [config.tc=0]       truncation flag;
         *  @param  [config.rd=0]       recursion desired flag;
         *  @param  [config.ra=0]       recursion available flag;
         *  @param  [config.z=0]        reserved;
         *  @param  [config.ad=0]       authentic data flag;
         *  @param  [config.cd=0]       checking disabled flag;
         *  @param  [config.rcode=0]    response code (consts.RCODE_STR.*);
         *  @param  [config.qdcount=0]  the number of question records;
         *  @param  [config.ancount=0]  the number of answer records;
         *  @param  [config.nscount=0]  the number of authority records;
         *  @param  [config.arcount=0]  the number of additional records;
         *
         *  @return A new DNS Header instance {Mdns::Header}
         */
        Header: function(config) {
            return new Header(null, config);
        },
        isHeader: function(obj) {
            return (obj instanceof Header);
        },

        /**
         *  Create a new DNS Question.
         *  @method Question
         *  @param  config                  The configuration object {Object};
         *  @param  config.qname            the Question name {String};
         *  @param  config.qtype            the request type {String}
         *                                      ( consts.TYPE_STR.* );
         *  @param  [config.qclass='in']    the request class {String};
         *
         *  @return A new DNS Question instance {Mdns::Question}
         */
        Question:   function(config) {
            return new Question(null, config);
        },
        isQuestion: function(obj) {
            return (obj instanceof Question);
        },

        /**
         *  Create a new Resource Record.
         *  @method RR
         *  @param  config              The configuration object {Object};
         *  @param  config.name         the Record name {String};
         *  @param  config.type         the request type
         *                                      ( consts.TYPE_STR.* );
         *  @param  [config.class='in'] the request class
         *                                      ( consts.CLASS_STR.* );
         *  @param  config.ttl          the time-to-live for this record;
         *  @param  config.rdata        An RData instance or configuration data
         *                              for a new RData instance;
         *
         *  @return A new DNS Resource Record instance {Mdns::RR}
         */
        RR: function(config) {
            return new RR(null, config);
        },
        isRR: function(obj) {
            return (obj instanceof RR);
        },

        /**
         *  Create a new Resource Record RData instance.
         *  @method RData
         *  @param  config      The configuration object {Object}
         *                          rr.type-specific key/value pairs;
         *
         *  @return A new DNS Resource Record RData instance {Mdns::RData}
         */
        RData: function(config) {
            return new RData(null, config);
        },
        isRData: function(obj) {
            return (obj instanceof RData);
        },

        /**
         *  Retrieve any shared mDNS socket.
         *  @method getSocket
         *  @param  config                  A configuration object {Object};
         *  @param  [config.type=udp4]      The type of datagram socket to
         *                                  create ( 'udp4', 'udp6' ) {String};
         *  @param  [config.multicast=true] If true, set the new socket to
         *                                  multicast (i.e. MDNS) {Boolean};
         *
         *  @return The socket;
         */
        getSocket: function(config) {
            var self        = this,
                newSocket   = false;

            config = _.extend({type:'udp4', multicast:true}, config || {});

            var sockId      = config.type + (config.multicast === true
                                                ? '.multicast'
                                                : '.unicast');

            return self.config.socket[ sockId ];
        },

        /**
         *  Create a new mDNS socket for the given protocol, or return a
         *  pre-existing mDNS socket for that protocol.
         *  @method socket
         *  @param  config                  A configuration object {Object};
         *  @param  [config.type=udp4]      The type of datagram socket to
         *                                  create ( 'udp4', 'udp6' ) {String};
         *  @param  [config.multicast=true] If true, set the new socket to
         *                                  multicast (i.e. MDNS) {Boolean};
         *  @param  [config.bindings]       If provided, an object containing
         *                                  name/handler pairs identifying
         *                                  events and event handlers to be
         *                                  bound {Object};
         *
         *  @return The (new) socket;
         */
        socket: function(config) {
            var self        = this,
                newSocket   = false;

            config = _.extend({type:'udp4', multicast:true}, config || {});

            var sockId      = config.type + (config.multicast === true
                                                ? '.multicast'
                                                : '.unicast'),
                socket      = self.config.socket[ sockId ];

            if (! socket)
            {
                newSocket = true;
                socket    = self.config.socket[ sockId ]
                            = Dgram.createSocket( config.type );

                self._sharedSocket = 1;

                /* Replace socket.close() with a method that takes into account
                 * the shared semantics we've added to this socket.
                 */
                socket.close = function() {
                    if (--(self._sharedSocket) === 0)
                    {
                        socket.removeAllListeners();
                        Dgram.Socket.prototype.close.call(socket);

                        delete self.config.socket[ sockId ];
                    }
                };
            }
            else
            {
                self._sharedSocket++;
            }

            if (config.bindings)
            {
                for (var name in config.bindings)
                {
                    var binding = config.bindings[name];

                    socket.on(name, binding);
                }
            }

            if (newSocket && (config.multicast !== false))
            {
                /* Wait for the next tick before completing setup to allow this
                 * method to return the new socket to the caller, solidifying
                 * the context of any bound function.
                 */
                process.nextTick(function() {
                    socket.bind( self.config.port, null, function() {

                        // Set to multi-cast
                        socket.setMulticastTTL( self.config.ttl );

                        socket.addMembership( (config.type === 'udp6'
                                                ? self.config.ipv6
                                                : self.config.ipv4) );
                    });
                });
            }

            return socket;
        },

        /**
         *  Send the given mDNS message over the shared mDNS socket.
         *  @method send
         *  @param  msg                     The mDNS message to send
         *                                  {Mdns::Message};
         *  @param  [config]                A configuration object {Object};
         *  @param  [config.socket]         If provided, the socket to use to
         *                                  send;
         *  @param  [config.type=udp4]      The type of datagram socket to
         *                                  create ( 'udp4', 'udp6' ) {String};
         *  @param  [config.multicast=true] If true, set the new socket to
         *                                  multicast (i.e. MDNS) {Boolean};
         *  @param  [config.addr]           If provided, the explicit address
         *                                  to which we should send {String};
         *  @param  [config.port]           If provided, the explicit port
         *                                  to which we should send {Number};
         *
         *  @return The final pack instance on success, false on error
         */
        send: function(msg, config) {
            config = _.extend({type:'udp4', multicast:true}, config || {});

            var self    = this,
                addr    = (config.addr || (config.type === 'udp6'
                                            ? self.config.ipv6
                                            : self.config.ipv4)),
                port    = (config.port || self.config.port),
                socket  = (config.socket || self.socket( config )),
                pack    = new Pack(
                            new Buffer(
                                self.config.bufSize[ config.type.slice(0,3) ]));

            //socket.setTTL( self.config.ttl );
            if (! msg.pack( pack ))
            {
                // :XXX: Packing error...
                return false;
            }

            /*
            console.log("Mdns.send(): %s:%s:\n%s\n%s",
                        addr, port,
                        msg,
                        Utils.buf2hex(pack.buf, {
                            offset:     pack.offset,
                            length:     pack.length,
                            octetsPer:  16,
                            ascii:      true}));
            // */

            socket.send( pack.buf, pack.begin, pack.offset - pack.begin,
                         port, addr, config.callback );

            return pack;
        }
    };
module.exports = Mdns;


// Mix-in to Mdns generators for all valid types
Object.keys(Consts.TYPE_STR).forEach(function(type) {

    Mdns[type] = function(config) {
        return new RR(null, config);
    };
});

/************************************************************************
 * Additional methods that rely on the existance/export of Mdns
 *
 */
var Client      = require('./client'),
    Resolve     = require('./resolve'),
    Update      = require('./update'),
    Advertise   = require('./advertise');

/**
 *  Create a new Client
 *  @method Client
 *  @param  config                      If provided, an instance
 *                                      configuration object {Object};
 *  @param  [config.server]             If this client will query a
 *                                      traditional unicast DNS server,
 *                                      this object specifies server
 *                                      information.  If no `server` is
 *                                      specified, this will be an MDNS
 *                                      client {Object}.
 *  @param  [config.server.address]     The IP address of the server
 *                                      {String};
 *  @param  [config.server.port=53]     The port of the server
 *                                      {Number};
 *  @param  [config.server.proto=udp]   Which IP protocol to use
 *                                      {String} ( 'udp' | 'tcp' );
 *
 *  @return A new DNS Client instance {Mdns::Client}
 */
Mdns.Client = function(config) {
    return new Client(config);
}

/**
 *  Create a new Resolve instance.
 *  @method Resolve
 *  @param  config                      If provided, an instance configuration
 *                                      object {Object};
 *  @param  config.question             A Question instance, configuration
 *                                      object, array of instances or array of
 *                                      configuration objects;
 *  @param  config.server               If this client will query a traditional
 *                                      unicast DNS server, this object
 *                                      specifies server information {Object};
 *  @param  config.server.address       the IP address of the server {String};
 *  @param  [config.server.port=53]     the port of the server {Number};
 *  @param  [config.server.proto='udp'] which IP protocol to use {String}
 *                                      ( 'udp' | 'tcp' );
 *  @param  [config.timeout=6000]       Query timeout (in micro-seconds)
 *                                      {Number}, ( 0 == no timeout );
 *
 *  @return A new Resolve instance {Mdns::Resolve};
 */
Mdns.Resolve = function(config) {
    return new Resolve(config);
};

/**
 *  Create a new Update instance.
 *  @param  config                      If provided, an instance configuration
 *                                      object {Object};
 *  @param  config.server               The server to update {Object};
 *  @param  config.server.address       the IP address of the server {String};
 *  @param  [config.server.port=53]     the port of the server {Number};
 *  @param  [config.server.proto='udp'] which IP protocol to use {String}
 *                                      ( 'udp' | 'tcp' );
 *  @param  config.zone                 A Zone/Question instance, configuration
 *                                      object, array of instances or array of
 *                                      configuration objects;
 *  @param  config.preReq               A RR instance, configuration object,
 *                                      array of instances or array of
 *                                      configuration objects representing
 *                                      Prerequisite Resource Records;
 *  @param  config.add                  An RR instance, configuration object,
 *                                      array of instances or array of
 *                                      configuration objects representing
 *                                      Resource Records to add to the zone;
 *  @param  config.del                  An RR instance, configuration object,
 *                                      array of instances or array of
 *                                      configuration objects representing
 *                                      Resource Records to delete from the
 *                                      zone;
 *  @param  [config.timeout=6000]       Query timeout (in micro-seconds)
 *                                      {Number}, ( 0 == no timeout );
 *
 *
 *  @return A new Update instance {Mdns::Update};
 */
Mdns.Update = function(config) {
    return new Update(config);
};

/**
 *  Create a new Advertise instance.
 *  @method Advertise
 *  @param  serviceType                 The service type to advertise {String};
 *  @param  config                      If provided, an instance configuration
 *                                      object {Object};
 *  @param  [config.name=hostname]      The service/instance name {String};
 *  @param  [config.domain='.local.']   The service domain {String};
 *  @param  [config.host=hostname]      The hostname of the service provider
 *                                      {String};
 *  @param  [config.port=0]             The port of the service provider
 *                                      {Number};
 *  @param  [config.txtRecords]         If provided, a Resource Record
 *                                      instance, array of RR instances, RR
 *                                      configuration object, or array of RR
 *                                      configuration objects;
 *
 *
 *  @return A new Advertise instance {Mdns::Advertise}
 */
Mdns.Advertise = function(serviceType, config) {
    return new Advertise(serviceType, config);
};
