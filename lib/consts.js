/** @file
 *
 *  DNS constants
 *
 *  See the DNS RFC (http://tools.ietf.org/html/rfc1035)
 */

    // Type string > integer map
var TYPE_STR    = {
        'A':            1,      // RFC 1035 (IPv4)
        'NS':           2,      // RFC 1035 (Authoritative Name Server)
        'MD':           3,      // RFC 1035 (Mail destination: obsolete)
        'MF':           4,      // RFC 1035 (Mail forwarder:   obsolete)
        'CNAME':        5,      // RFC 1035 (Canonical name)
        'SOA':          6,      // RFC 1035 (Start Of zone Authority)
        'MB':           7,      // RFC 1035 (Mailbox domain name)
        'MG':           8,      // RFC 1035 (Mail group member)
        'MR':           9,      // RFC 1035 (Mail rename domain name)
        'NULL':         10,     // RFC 1035
        'WKS':          11,     // RFC 1035 (Well know service description)
        'PTR':          12,     // RFC 1035 (Domain name pointer)
        'HINFO':        13,     // RFC 1035 (Host information)
        'MINFO':        14,     // RFC 1035 (Mailbox/list info)
        'MX':           15,     // RFC 1035 (Mail exchange)
        'TXT':          16,     // RFC 1035 (Text strings)

        'AXFR':         252,    // RFC 1035
        'MAILB':        253,    // RFC 1035
        'MAILA':        254,    // RFC 1035
        'ANY':          255,    // RFC 1035

        // Post RFC 1035 {
        'RP':           17,     // RFC 1183 (Responsible Person)
        'AFSDB':        18,     // RFC 1183/5864 (AFS database location)
        'X25':          19,     // RFC 1183 (X25 PSDN address)
        'ISDN':         20,     // RFC 1183 (ISDN address)
        'RT':           21,     // RFC 1183 (Route through)

        'NSAP':         22,     // RFC 1706 (NSAP address)
        'NSAP-PTR':     23,     // RFC 1348

        'SIG':          24,     // RFC 2931/4034 (Security signature)
        'KEY':          25,     // RFC 3445/4034 (Security key)

        'PX':           26,     // RFC 2163 (X.400 mail mapping info)
        'GPOS':         27,     // RFC 1712 (Geographical position)

        'AAAA':         28,     // RFC 3596 (IPv6 address)

        'LOC':          29,
        'NXT':          30,     // RFC 3755 (obsoletes)
        'EID':          31,
        'NIMLOC':       32,
        'SRV':          33,     // RFC 2782
        'ATMA':         34,
        'NAPTR':        35,
        'KX':           36,
        'CERT':         37,
        'A6':           38,
        'DNAME':        39,
        'SINK':         40,
        'OPT':          41,     /* RFC 2671: EDNS0 (16-bit code & length
                                 *                  followed by length bytes of
                                 *                  code-specific data)
                                 */
        'APL':          42,
        'DS':           43,     // RFC 3768/4034: DNSSec
        'SSHFP':        44,
        'IPSECKEY':     45,

        'RRSIG':        46,     // RFC 3755/4034: DNSSec
        'NSEC':         47,     // RFC 3755/4034: DNSSec
        'DNSKEY':       48,     // RFC 3755/4034: DNSSec (public zone key)

        'DHCID':        49,
        'NSEC3':        50,
        'NSEC3PARAM':   51,

        'HIP':          55,
        'NINFO':        56,
        'RKEY':         57,
        'TALINK':       58,
        'CDS':          59,

        'SPF':          99,
        'UINFO':        100,
        'UID':          101,
        'GID':          102,
        'UNSPEC':       103,

        'TKEY':         249,
        'TSIG':         250,    // RFC 2845: TSIG
        'IXFR':         251,

        'IXFR':         251,

        'URI':          256,
        'CAA':          257,

        'TA':           32768,
        'DLV':          32769

        // Post RFC 1035 }
    },

    // Type integer > string map (construct)
    TYPE_INT    = reverseMap(TYPE_STR),

    // Class string > integer map
    CLASS_STR   = {
        'IN':   1,          // RFC 1035
        'CS':   2,          // RFC 1035
        'CH':   3,          // RFC 1035
        'HS':   4,          // RFC 1035

        'NONE': 254,        // RFC 2136: DDNS
        'ANY':  255         // RFC 1035
    },

    // Class integer > string map (construct)
    CLASS_INT   = reverseMap(CLASS_STR),

    // Opcode string > integer map
    OPCODE_STR  = {
        'QUERY':    0,      // RFC 1035
        'IQUERY':   1,      // RFC 1035/3425
        'STATUS':   2,      // RFC 1035

        'NOTIFY':   4,      // RFC 1996

        'UPDATE':   5       // RFC 2136: DDNS
    },

    // Opcode integer > string map (construct)
    OPCODE_INT  = reverseMap(OPCODE_STR),

    // RCode string > integer map
    RCODE_STR   = {
        'NOERROR':  0,      // RFC 1035
        'FORMERR':  1,      // RFC 1035
        'SERVFAIL': 2,      // RFC 1035
        'NOTFOUND': 3,      // RFC 1035
        'NOTIMP':   4,      // RFC 1035
        'REFUSED':  5,      // RFC 1035

        'YXDOMAIN': 6,      // RFC 2136: DDNS name exists but should not
        'YXRRSET':  7,      // RFC 2136: DDNS RR set exists but should not
        'NXRRSET':  8,      // RFC 2136: DDNS RR set does not exist but should
        'NOTAUTH':  9,      // RFC 2136: DDNS
        'NOTZONE':  10,     // RFC 2136: DDNS

        'BADSIG':   16,     // RFC 2845: TSIG (and 2671 for BADVERS)
        'BADKEY':   17,     // RFC 2845: TSIG
        'BADTIME':  18,     // RFC 2845: TSIG

        'BADMODE':  19,     // RFC 2930
        'BADNAME':  20,     // RFC 2930
        'BADALG':   21,     // RFC 2930
        'BADTRUNC': 22      // RFC 4635

        // 3841 - 4095, 65535: RFC 6195: Private use
    },

    // RCode integer > string map (construct)
    RCODE_INT   = reverseMap(RCODE_STR),

    // LabelType mask string > integer map -- DomainName label length octet
    LTYPE_STR   = {
        'LEN':      0x00,   // RFC 1035
        'PTR':      0xc0,   // RFC 1035

        'EXT':      0x40,   // RFC 2671: EDNS0
        'BIT':      0x41,   // LabelType extension: bitstring
        'RSV':      0x7f    // RFC 2671: EDNS0 (reserved)
    },

    // LabelType mask integer > string map (construct)
    LTYPE_INT   = reverseMap(LTYPE_STR),

    consts      = {
        TYPE_STR:   TYPE_STR,
        TYPE_INT:   TYPE_INT,
        CLASS_STR:  CLASS_STR,
        CLASS_INT:  CLASS_INT,
        OPCODE_STR: OPCODE_STR,
        OPCODE_INT: OPCODE_INT,
        RCODE_STR:  RCODE_STR,
        RCODE_INT:  RCODE_INT,
        LTYPE_STR:  LTYPE_STR,
        LTYPE_INT:  LTYPE_INT,

        MDNS: {
            ADDR:   {
                MAC:    '01:00:5E:00:00:FB',
                IPv4:   '224.0.0.251',
                IPv6:   'FF02::FB'
            },
            TTL:    255,
            PORT:   5353,

            DOMAIN: 'local.',

            /* The "magic" service discovery serviceType -- without the
             * 'domain' since that can vary depending upon the context.
             */
            SD:     '_services._dns-sd._udp'
        },

        DNS: {
            PORT:   53
        },

        /** @brief  Given a Resource Record/Question type, return the
         *          equivilent string.
         *
         *  @param  typeInt The type (integer);
         *
         *  @return The matching string (undefined if no match).
         */
        type2str:   function(typeInt) {
            return consts.TYPE_INT[ typeInt ];
        },

        /** @brief  Given a Resource Record/Question type string, return the
         *          equivilent integer value.
         *  @param  str     The type string;
         *
         *  @return The matching integer value (undefined if no match).
         */
        str2type: function(str) {
            return consts.TYPE_STR[ str.toUpperCase() ];
        },

        /** @brief  Given a Resource Record/Question class, return the
         *          equivilent string.
         *  @param  classInt    The class (integer);
         *
         *  @return The matching string (undefined if no match).
         */
        class2str: function(classInt) {
            return consts.CLASS_INT[ classInt ];
        },

        /** @brief  Given a Resource Record/Question class string, return the
         *          equivilent integer value.
         *  @param  str     The class (string);
         *
         *  @return The matching integer value (undefined if no match).
         */
        str2class: function(str) {
            return consts.CLASS_STR[ str.toUpperCase() ];
        },

        /** @brief  Given a Header opcode, return the equivilent string.
         *  @param  opcodeInt   The opcode (integer);
         *
         *  @return The matching string (undefined if no match).
         */
        opcode2str: function(opcodeInt) {
            return consts.OPCODE_INT[ opcodeInt ];
        },

        /** @brief  Given a Header opcode string, return the equivilent integer
         *          value.
         *  @param  str     The class (string);
         *
         *  @return The matching integer value (undefined if no match).
         */
        str2opcode: function(str) {
            return consts.OPCODE_STR[ str.toUpperCase() ];
        },

        /** @brief  Given a Header rcode, return the equivilent string.
         *  @param  rcodeInt    The rcode (integer);
         *
         *  @return The matching string (undefined if no match).
         */
        rcode2str: function(rcodeInt) {
            return consts.RCODE_INT[ rcodeInt ];
        },

        /** @brief  Given a Header rcode string, return the equivilent integer
         *          value.
         *  @param  str     The class (string);
         *
         *  @return The matching integer value (undefined if no match).
         */
        str2rcode: function(str) {
            return consts.RCODE_STR[ str.toUpperCase() ];
        }
    };

module.exports = consts;


/** @brief  Given an Object with key/value pairs, reverse the mapping to
 *          value/key.
 *  @param  obj     The object to reverse;
 *
 *  @return A new object with value/key pairs.
 */
function reverseMap(obj)
{
    var res = {},
        key, val;

    for (key in obj)
    {
        val = obj[key];

        if (obj.hasOwnProperty( key ))
        {
            res[ val ] = key;
        }
    }

    return res;
}
