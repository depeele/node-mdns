/** @file
 *
 *  Front-end for MDNS as well as DNS protocol handlers.
 *
 */
var Dgram       = require('dgram'),
    Consts      = require('./consts.js'),
    Message     = require('./message.js'),
    Header      = require('./header.js'),
    Question    = require('./question.js'),
    RR          = require('./rr.js'),
    RData       = require('./rdata.js'),
    Pack        = require('./pack.js').Pack,
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

        /** @brief  Create a new DNS Message.
         *  @param  config      The configuration object:
         *                          header      A Header instance or
         *                                      configuration data for a new
         *                                      instance;
         *                          question    An array of Question instances
         *                                      or configuration data for new
         *                                      instances;
         *                          answer      An array of RR instances or
         *                                      configuration data for new
         *                                      instances;
         *                          authority   An array of RR instances or
         *                                      configuration data for new
         *                                      instances;
         *                          additional  An array of RR instances or
         *                                      configuration data for new
         *                                      instances;
         *
         *  @return A new DNS Message instance.
         */
        Message:    function(config) {
            return new Message(config);
        },
        isMessage: function(obj) {
            return (obj instanceof Message);
        },

        /** @brief  Create a new DNS Message Header.
         *  @param  config      The configuration object:
         *                          id          header id [ 0 ];
         *                          qr          query/response flag [ 0 ];
         *                          opcode      opcode [ 0 ];
         *                                      (consts.OPCODE_STR.*);
         *                          aa          authoritative answer flag [ 0 ];
         *                          tc          truncation flag [ 0 ];
         *                          rd          recursion desired flag [ 0 ];
         *                          ra          recursion available flag [ 0 ];
         *                          z           reserved [ 0 ];
         *                          ad          authentic data flag [ 0 ];
         *                          cd          checking disabled flag [ 0 ];
         *                          rcode       response code [ 0 ];
         *                                      (consts.RCODE_STR.*);
         *                          qdcount     the number of question records
         *                                      [ 0 ];
         *                          ancount     the number of answer records
         *                                      [ 0 ];
         *                          nscount     the number of authority records
         *                                      [ 0 ];
         *                          arcount     the number of additional
         *                                      records [ 0 ];
         *
         *  @return A new DNS Header instance.
         */
        Header: function(config) {
            return new Header(null, config);
        },
        isHeader: function(obj) {
            return (obj instanceof Header);
        },

        /** @brief  Create a new DNS Question.
         *  @param  config      The configuration object:
         *                          qname       the Question name (string);
         *                          qtype       the request type
         *                                      ( consts.TYPE_STR.* );
         *                          qclass      the request class
         *                                      [ consts.CLASS_STR.IN ];
         *
         *  @return A new DNS Question instance.
         */
        Question:   function(config) {
            return new Question(null, config);
        },
        isQuestion: function(obj) {
            return (obj instanceof Question);
        },

        /** @brief  Create a new Resource Record.
         *  @param  config      The configuration object:
         *                          name        the Record name (string);
         *                          type        the request type
         *                                      ( consts.TYPE_STR.* );
         *                          class       the request class
         *                                      [ consts.CLASS_STR.IN ];
         *                          ttl         the time-to-live for this
         *                                      record;
         *                          rdata       An RData instance or
         *                                      configuration data for a new
         *                                      RData instance;
         *
         *  @return A new DNS Resource Record instance.
         */
        RR: function(config) {
            return new RR(null, config);
        },
        isRR: function(obj) {
            return (obj instanceof RR);
        },

        /** @brief  Create a new Resource Record RData instance.
         *  @param  config      The configuration object:
         *                          rr.type-specific key/value pairs;
         *
         *  @return A new DNS Resource Record RData instance.
         */
        RData: function(config) {
            return new RData(null, config);
        },
        isRData: function(obj) {
            return (obj instanceof RData);
        },

        /** @brief  Create a new mDNS socket for the given protocol, or return
         *          a pre-existing mDNS socket for that protocol.
         *  @param  type        The type of datagram socket to create
         *                      ( 'udp4', 'udp6' )
         *  @param  bindings    If provided, an object containing name/handler
         *                      pairs identifying events and event handlers to
         *                      be bound;
         */
        socket: function(type, bindings) {
            var self        = this,
                newSocket   = false;
                socket      = self.config.socket[type];

            if (! socket)
            {
                newSocket = true;
                socket    = self.config.socket[type]
                            = Dgram.createSocket( type );

                self._sharedSocket = 1;

                /* Replace socket.close() with a method that takes into account
                 * the shared semantics we've added to this socket.
                 */
                socket.close = function() {
                    if (--(self._sharedSocket) === 0)
                    {
                        socket.removeAllListeners();
                        Dgram.Socket.prototype.close.call(socket);

                        delete self.config.socket[type];
                    }
                };
            }
            else
            {
                self._sharedSocket++;
            }

            if (bindings)
            {
                for (var name in bindings)
                {
                    var binding = bindings[name];

                    socket.on(name, binding);
                }
            }

            if (newSocket)
            {
                /* Wait for the next tick before completing setup to allow this
                 * method to return the new socket to the caller, solidifying
                 * the context of any bound function.
                 */
                process.nextTick(function() {
                    // Set to multi-cast
                    socket.bind( self.config.port );
                    socket.setMulticastTTL( self.config.ttl );

                    socket.addMembership( (type === 'udp6'
                                            ? self.config.ipv6
                                            : self.config.ipv4) );
                });
            }

            return socket;
        },

        /** @brief  Send the given mDNS message over the shared mDNS socket.
         *  @param  msg     The mDNS message to send;
         *  @param  type    The type of UDP socket ( ['udp4'], 'udp6' );
         *
         *  @return The final pack instance on success, false on error
         */
        send: function(msg, type) {
            var self    = this,
                socket  = self.socket(type || 'udp4'),
                pack    = new Pack( new Buffer( self.config.bufSize['udp'] ) );

            //socket.setTTL( self.config.ttl );
            if (! msg.pack( pack ))
            {
                // :XXX: Packing error...
                return false;
            }

            socket.send( pack.buf, pack.begin, pack.offset - pack.begin,
                         self.config.port,
                         (type === 'udp6'
                            ? self.config.ipv6
                            : self.config.ipv4) );

            socket.close();

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
var Resolve     = require('./resolve.js'),
    Update      = require('./update.js'),
    Advertise   = require('./advertise.js');

/** @brief  Create a new Resolve instance.
 *  @param  config  If provided, an instance configuration object:
 *                      question    A Question instance, configuration
 *                                  object, array of instances or array
 *                                  of configuration objects;
 *                      server      If this client will query a
 *                                  traditional unicast DNS server,
 *                                  this object specifies server
 *                                  information:
 *                                      address the IP address of the
 *                                              server;
 *                                      port    the port of the server
 *                                              [ 53 ];
 *                                      proto   which IP protocol to
 *                                              use ( 'udp' | 'tcp' )
 *                                              [ 'udp' ];
 *                      timeout     Query timeout (in micro-seconds);
 *
 */
Mdns.Resolve = function(config) {
    return new Resolve(config);
};

/** @brief  Create a new Update instance.
 *  @param  config  If provided, an instance configuration object:
 *                      server      The server to update:
 *                                      address the IP address of the server;
 *                                      port        the port of the server
 *                                                  [ 53 ];
 *                                      proto       which IP protocol to use
 *                                                  ( 'udp' | 'tcp' )
 *                                                  [ 'udp' ];
 *                      zone        A Zone/Question instance, configuration
 *                                  object, array of instances or array of
 *                                  configuration objects;
 *                      preReq      A RR instance, configuration object, array
 *                                  of instances or array of configuration
 *                                  objects representing Prerequisite Resource
 *                                  Records;
 *                      add         An RR instance, configuration object, array
 *                                  of instances or array of configuration
 *                                  objects representing Resource Records to
 *                                  add to the zone;
 *                      del         An RR instance, configuration object, array
 *                                  of instances or array of configuration
 *                                  objects representing Resource Records to
 *                                  delete from the zone;
 *                      timeout     Query timeout (in micro-seconds)
 *                                  ( 0 == no timeout ) [ 6000 ];
 *
 *
 *  @emits  response  records, rinfo, response-message, raw-data (for mDNS 0+)
 *          end
 *          timeout
 *          error     Error instance
 */
Mdns.Update = function(config) {
    return new Update(config);
};

/** @brief  Create a new Advertise instance.
 *  @param  serviceType     The service type to advertise;
 *  @param  config          If provided, an instance configuration object:
 *                              name            The service/instance name
 *                                              [ system hostname ];
 *                              domain          The service domain [ .local. ];
 *
 *                              host            The hostname of the service
 *                                              provider [ system hostname ];
 *                              port            The port of the service
 *                                              provider [ 0 == placeholder ];
 *
 *                              txtRecords      If provides, a Resource Record
 *                                              instance, array of RR
 *                                              instances, RR configuration
 *                                              object, or array of RR
 *                                              configuration objects;
 *
 *
 *  @emits  response  records, rinfo, response-message, raw-data (for mDNS 0+)
 *          end
 *          timeout
 *          error     Error instance
 */
Mdns.Advertise = function(serviceType, config) {
    return new Advertise(serviceType, config);
};
