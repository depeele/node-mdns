/** @file
 *
 *  Front-end for MDNS as well as DNS protocol handlers.
 *
 */
var Consts      = require('./consts.js'),
    Message     = require('./message.js'),
    Header      = require('./header.js'),
    Question    = require('./question.js'),
    RR          = require('./rr.js'),
    RData       = require('./rdata.js'),
    Mdns        =   {
        config: {
            mac:    "01:00:5E:00:00:FB",
            ipv4:   "224.0.0.251",
            ipv6:   "FF02::FB",
            port:   5353,

            ttl:    255,
            domain: "local."
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
var Resolve     = require('./resolve.js');

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
