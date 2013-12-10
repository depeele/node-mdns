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
        consts: Consts,

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
var Client      = require('./client');

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

var Update      = require('./update');

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

var Advertise   = require('./advertise');

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
