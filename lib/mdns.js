/** @file
 *
 *  Front-end for MDNS as well as DNS protocol handlers.
 *
 */

module.exports  = {
    config: {
        mac:    "01:00:5E:00:00:FB",
        ipv4:   "224.0.0.251",
        ipv6:   "FF02::FB",
        port:   5353,

        ttl:    255,
        domain: "local."
    },

    Dns:    {
        Message:    require('./message.js'),

        Header:     require('./header.js'),
        Question:   require('./question.js'),
        RR:         require('./rr.js'),
        RDATA:      require('./rdata.js')
    }
};
