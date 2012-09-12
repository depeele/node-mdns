/** @file
 *
 *  DNS constants
 *
 *  See the DNS RFC (http://tools.ietf.org/html/rfc1035)
 */

    // Type string > integer map
var TYPE_STR    = {
        'A':            1,
        'NS':           2,
        'MD':           3,
        'MF':           4,
        'CNAME':        5,
        'SOA':          6,
        'MB':           7,
        'MG':           8,
        'MR':           9,
        'NULL':         10,
        'WKS':          11,
        'PTR':          12,
        'HINFO':        13,
        'MINFO':        14,
        'MX':           15,
        'TXT':          16,

        'AXFR':         252,
        'MAILB':        253,
        'MAILA':        254,
        'ANY':          255,

        // Post RFC 1035 {
        'RP':           17,
        'AFSDB':        18,
        'X25':          19,
        'ISDN':         20,
        'RT':           21,
        'NSAP':         22,
        'NSAP-PTR':     23,
        'SIG':          24,
        'KEY':          25,
        'PX':           26,
        'GPOS':         27,

        'AAAA':         28,

        'LOC':          29,
        'NXT':          30,
        'EID':          31,
        'NIMLOC':       32,
        'SRV':          33,
        'ATMA':         34,
        'NAPTR':        35,
        'KX':           36,
        'CERT':         37,
        'A6':           38,
        'DNAME':        39,
        'SINK':         40,
        'OPT':          41,
        'APL':          42,
        'DS':           43,
        'SSHFP':        44,
        'IPSECKEY':     45,
        'RRSIG':        46,

        'NSEC':         47,
        'DNSKEY':       48,
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
        'TSIG':         250,
        'IXFR':         251,

        'IXFR':         251,

        'URI':          256,
        'CAA':          257,

        'TA':           32768,
        'DLV':          32769

        // RFC: xxx }
    },

    // Type integer > string map (construct)
    TYPE_INT    = reverseMap(TYPE_STR),

    // Class string > integer map
    CLASS_STR   = {
        'IN':  1,
        'CS':  2,
        'CH':  3,
        'HS':  4,

        'ANY': 255,

        // mDNS class
        'ETH': 0x8001
    },

    // Class integer > string map (construct)
    CLASS_INT   = reverseMap(CLASS_STR),

    // Opcode string > integer map
    OPCODE_STR  = {
        'QUERY':    0,
        'IQUERY':   1,
        'STATUS':   2,

        'NOTIFY':   3,
        'UPDATE':   4,
    },

    // Opcode integer > string map (construct)
    OPCODE_INT  = reverseMap(OPCODE_STR),

    // RCode string > integer map
    RCODE_STR   = {
        'NOERROR':  0,
        'FORMERR':  1,
        'SERVFAIL': 2,
        'NOTFOUND': 3,
        'NOTIMP':   4,
        'REFUSED':  5,
        'YXDOMAIN': 6,  // name exists when it should not
        'YXRRSET':  7,  // RR set exists when it should not
        'NXRRSET':  8,  // RR set does not exist when it should
        'NOTAUTH':  9,
        'NOTZONE':  10,

        'BADVERS':  16, // Also BADSIG??
        'BADKEY':   17,
        'BADTIME':  18,
        'BADMODE':  19,
        'BADNAME':  20,
        'BADALG':   21,
        'BADTRUNC': 22
    },

    // RCode integer > string map (construct)
    RCODE_INT   = reverseMap(RCODE_STR),

    consts      = {
        TYPE_STR:   TYPE_STR,
        TYPE_INT:   TYPE_INT,
        CLASS_STR:  CLASS_STR,
        CLASS_INT:  CLASS_INT,
        OPCODE_STR: OPCODE_STR,
        OPCODE_INT: OPCODE_INT,
        RCODE_STR:  RCODE_STR,
        RCODE_INT:  RCODE_INT,

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
