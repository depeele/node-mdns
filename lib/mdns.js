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
        }
    };


// Mix-in to Mdns generators for all valid types
Object.keys(Consts.TYPE_STR).forEach(function(type) {

    Mdns[type] = function(config) {
        return new RR(null, config);
    };
});


module.exports = Mdns;
