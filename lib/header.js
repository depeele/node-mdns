/** @file
 *  
 *  DNS Header (http://tools.ietf.org/html/rfc1035#section-4.1.1)
 *
 *                                      1  1  1  1  1  1
 *        0  1  2  3  4  5  6  7  8  9  0  1  2  3  4  5
 *      +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
 *      |                      ID                       |
 *      +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
 *      |QR|   Opcode  |AA|TC|RD|RA|   Z    |   RCODE   |
 *      +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
 *      |                    QDCOUNT                    |
 *      +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
 *      |                    ANCOUNT                    |
 *      +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
 *      |                    NSCOUNT                    |
 *      +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
 *      |                    ARCOUNT                    |
 *      +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
 *  
 *  ID              A 16 bit identifier assigned by the program that
 *                  generates any kind of query.  This identifier is copied
 *                  the corresponding reply and can be used by the requester
 *                  to match up replies to outstanding queries.
 *  
 *  QR              A one bit field that specifies whether this message is a
 *                  query (0), or a response (1).
 *  
 *  OPCODE          A four bit field that specifies kind of query in this
 *                  message.  This value is set by the originator of a query
 *                  and copied into the response.  The values are:
 *  
 *                  0               a standard query            (QUERY)
 *                  1               an inverse query            (IQUERY)
 *                  2               a server status request     (STATUS)
 *                  3-15            reserved for future use
 *                   3               Zone change notification   (NOTIFY)
 *                   4               Dynamic Update             (UPDATE)
 *  
 *  AA              Authoritative Answer - this bit is valid in responses,
 *                  and specifies that the responding name server is an
 *                  authority for the domain name in question section.
 *  
 *                  Note that the contents of the answer section may have
 *                  multiple owner names because of aliases.  The AA bit
 *                  corresponds to the name which matches the query name, or
 *                  the first owner name in the answer section.
 *  
 *  TC              TrunCation - specifies that this message was truncated
 *                  due to length greater than that permitted on the
 *                  transmission channel.
 *  
 *  RD              Recursion Desired - this bit may be set in a query and
 *                  is copied into the response.  If RD is set, it directs
 *                  the name server to pursue the query recursively.
 *                  Recursive query support is optional.
 *  
 *  RA              Recursion Available - this be is set or cleared in a
 *                  response, and denotes whether recursive query support is
 *                  available in the name server.
 *  
 *  Z               Reserved for future use.  Must be zero in all queries
 *                  and responses.
 *                      bit 2   - reserved (0)
 *                      bit 1   - ad
 *                      bit 0   - cd
 *  
 *  RCODE           Response code - this 4 bit field is set as part of
 *                  responses.  The values have the following
 *                  interpretation:
 *  
 *                  0               No error condition
 *                  1               Format error - The name server was
 *                                  unable to interpret the query.
 *                  2               Server failure - The name server was
 *                                  unable to process this query due to a
 *                                  problem with the name server.
 *                  3               Name Error - Meaningful only for
 *                                  responses from an authoritative name
 *                                  server, this code signifies that the
 *                                  domain name referenced in the query does
 *                                  not exist.
 *                  4               Not Implemented - The name server does
 *                                  not support the requested kind of query.
 *                  5               Refused - The name server refuses to
 *                                  perform the specified operation for
 *                                  policy reasons.  For example, a name
 *                                  server may not wish to provide the
 *                                  information to the particular requester,
 *                                  or a name server may not wish to perform
 *                                  a particular operation (e.g., zone
 *                                  transfer) for particular data.
 *                  6-15            Reserved for future use.
 *  
 *  QDCOUNT         an unsigned 16 bit integer specifying the number of
 *                  entries in the question section.
 *  
 *  ANCOUNT         an unsigned 16 bit integer specifying the number of
 *                  resource records in the answer section.
 *  
 *  NSCOUNT         an unsigned 16 bit integer specifying the number of name
 *                  server resource records in the authority records
 *                  section.
 *  
 *  ARCOUNT         an unsigned 16 bit integer specifying the number of
 *                  resource records in the additional records section.
 */
var Util    = require('util'),
    Utils   = require('./utils.js'),
    Unpack  = require('./unpack.js'),
    Pack    = require('./pack.js');

/** @brief  Create a new Header instance.
 *  @param  msg     The parent Message instance;
 *  @param  unpack  If provided, an Unpack instance to use in initializing the
 *                  new Header;
 */
function Header(msg, unpack)
{
    var self    = this;

    self.id      = null;
    self.qr      = 0;       // query(0), response(1)
    self.opcode  = 0;       // query(0), iquery(1), status(2), notify(3), ...
    self.aa      = 0;
    self.tc      = 0;
    self.rd      = 0;
    self.ra      = 0;
    self.z       = 0;
    self.ad      = 0;
    self.cd      = 0;
    self.rcode   = 0;       // ok(0), format error(1), server fail(2), ...

    self.qdCount = 0;
    self.anCount = 0;
    self.nsCount = 0;
    self.arCount = 0;

    /***************************************
     * Define a non-deletable, read-only,
     * non-enumerable reference to the
     * parent Message instance
     * {
     */
    Object.defineProperty(self, 'msg', {
        get:            function() { return msg; },
        configurable:   false,
        enumerable:     false
    });
    /* }
     ***************************************/

    if (unpack) { self.unpack( unpack ); }
}

/** @brief  Generate a string representation of this DNS header.
 *  @param  prefix      Any prefix string [ '' ];
 *  @param  lineLen     Number of characters per line [ 79 ];
 *  
 *  The first line of output ASSUMES 'prefix' characters have already been
 *  included.
 *
 *  @return The string representation.
 */
Header.prototype.toString  = function(prefix, lineLen) {
    prefix  = prefix  || '';
    lineLen = lineLen || 79;

    var self    = this,
        str     = '',
        keys    = Object.keys( self ),
        nChars  = prefix.length,
        first   = true,
        tmp;

    keys.forEach(function(key) {
        if (! self.hasOwnProperty(key))   { return; }
        if (! first)    { str += ", "; nChars += 2; }
        else            { first = false; }

        tmp = Util.format("%s:%d", key, self[key]);
        if ((nChars + tmp.length) >= lineLen)
        {
            str   += "\n"+ prefix;
            nChars = prefix.length;
        }
        str    += tmp;
        nChars += tmp.length;
    });

    str += "\n";

    return str;
};

/****************************************************************************
 * Unpacking (for incoming DNS messages)
 *
 */

/** @brief  Given an Unpack instance, (re)initialize this instance by unpacking
 *          Header information.
 *  @param  unpack  The Unpack instance;
 *
 *  @return true (success) | false (error, this.erro will be Error instance)
 */
Header.prototype.unpack = function(unpack) {
    var self    = this,
        minLen  = 12;

    if (! (unpack instanceof Unpack))
    {
        self.error = new Error("'unpack' MUST be an Unpack instance");
        return false;
    }

    if (unpack.remaining < minLen)
    {
        self.error =  new Error("HEADER requires at least "
                                            + minLen +" bytes");
        return false;
    }

    delete self.error;

    var start   = unpack.offset,
        flags;

    if ( ((self.id      = unpack.uint16()) === null) ||
         ((flags        = unpack.uint16()) === null) ||
         ((self.qdCount = unpack.uint16()) === null) ||
         ((self.anCount = unpack.uint16()) === null) ||
         ((self.nsCount = unpack.uint16()) === null) ||
         ((self.arCount = unpack.uint16()) === null) )
    {
        self.error = unpack.error;
        return false;
    }

    // Extract the flags
    self.qr       = (flags & 0x8000) >> 15;
    self.opcode   = (flags & 0x7800) >> 15;
    self.aa       = (flags & 0x0400) >> 10;
    self.tc       = (flags & 0x0200) >>  9;
    self.rd       = (flags & 0x0100) >>  8;
    self.ra       = (flags & 0x0080) >>  7;
    self.z        = (flags & 0x0040) >>  6;
    self.ad       = (flags & 0x0020) >>  5;
    self.cd       = (flags & 0x0010) >>  4;
    self.rcode    = (flags & 0x000f) >>  0;

    self.consumed = unpack.offset - start;

    return true;
};

/****************************************************************************
 * Packing (for outgoing DNS messages)
 *
 */

/** @brief  Given an Pack instance, pack this Header.
 *  @param  pack    The Pack instance;
 *
 *  @return true (success) | false (error, this.error will be Error instance)
 */
Header.prototype.pack  = function(pack) {
    var self    = this;

    if (! (pack instanceof Pack))
    {
        self.error = new Error("'pack' MUST be an Pack instance");
        return false;
    }

    var start   = pack.offset,
        flags   = ((self.qr     << 15) & 0x8000)
                | ((self.opcode << 15) & 0x7800)
                | ((self.aa     << 10) & 0x0400)
                | ((self.tc     <<  9) & 0x0200)
                | ((self.rd     <<  8) & 0x0100)
                | ((self.ra     <<  7) & 0x0080)
                | ((self.z      <<  6) & 0x0040)
                | ((self.ad     <<  5) & 0x0020)
                | ((self.cd     <<  4) & 0x0010)
                | ((self.rcode  <<  0) & 0x000f);
        /*
        flags   = ((self.qr     & 0x08) << 15)
                | ((self.opcode & 0x78) << 15)
                | ((self.aa     & 0x04) << 10)
                | ((self.tc     & 0x02) <<  9)
                | ((self.rd     & 0x01) <<  8)
                | ((self.ra     & 0x08) <<  7)
                | ((self.z      & 0x04) <<  6)
                | ((self.ad     & 0x02) <<  5)
                | ((self.cd     & 0x01) <<  4)
                | ((self.rcode  & 0x0f) <<  0);
        // */

console.log("Header: flags[ %s ]: qr[ %d ], opcode[ %d ], aa[ %d ], tc[ %d ], rd[ %d ], ra[ %d ], z[ %d ], ad[ %d ], cd[ %d ], rcode[ %d ]",
            Utils.int2hex(flags),
            self.qr, self.opcode, self.aa, self.tc, self.rd, self.ra,
            self.z,  self.ad,     self.cd, self.rcode);


    delete self.error;

    if ( (pack.uint16( self.id )      === null) ||
         (pack.uint16( flags )        === null) ||
         (pack.uint16( self.qdCount ) === null) ||
         (pack.uint16( self.anCount ) === null) ||
         (pack.uint16( self.nsCount ) === null) ||
         (pack.uint16( self.arCount ) === null) )
    {
        self.error = pack.error;
        return false;
    }

    self.produced = pack.offset - start;

    return true;
};

module.exports  = Header;
