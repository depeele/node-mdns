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

/** @brief  Create a new Header instance.
 *  @param  msg     The parent Message instance;
 *  @param  buf     If provided, an initialization buffer;
 *  @param  offset  If provided an offset into 'buf' to begin parsing [ 0 ];
 */
function Header(msg, buf, offset)
{
    this.id      = null;
    this.qr      = 0;       // query(0), response(1)
    this.opcode  = 0;       // query(0), iquery(1), status(2), notify(3), ...
    this.aa      = 0;
    this.tc      = 0;
    this.rd      = 0;
    this.ra      = 0;
    this.z       = 0;
    this.ad      = 0;
    this.cd      = 0;
    this.rcode   = 0;       // ok(0), format error(1), server fail(2), ...

    this.qdCount = 0;
    this.anCount = 0;
    this.nsCount = 0;
    this.arCount = 0;

    /***************************************
     * Define a non-deletable, read-only,
     * non-enumerable reference to the
     * parent Message instance
     * {
     */
    Object.defineProperty(this, 'msg', {
        get:            function() { return msg; },
        configurable:   false,
        enumerable:     false
    });
    /* }
     ***************************************/

    if (buf)    { this.unpack(buf, offset); }
}

/** @brief  Given the provided buffer, unpack the Header.
 *  @param  buf     The buffer from which to unpack;
 *  @param  offset  The starting offset within 'buf';
 *
 *  @return true (success) | false (error, this.erro will be Error instance)
 */
Header.prototype.unpack = function(buf, offset) {
    var self    = this,
        minLen  = 12;

    if (! Buffer.isBuffer(buf))
    {
        self.error = new Error("buf MUST be a Buffer");
        return false;
    }
    if (buf.length < minLen)
    {
        self.error =  new Error("HEADER requires at least "
                                            + minLen +" bytes");
        return false;
    }

    offset = offset || 0;
    delete self.error;

    var msg     = self.msg,
        start   = offset,
        u16;

    self.id       = msg.unpackUInt16(buf, offset); offset += 2;

    u16           = msg.unpackUInt16(buf, offset); offset += 2;
    self.qr       = (u16 & 0x8000) >> 15;
    self.opcode   = (u16 & 0x7800) >> 15;
    self.aa       = (u16 & 0x0400) >> 10;
    self.tc       = (u16 & 0x0200) >>  9;
    self.rd       = (u16 & 0x0100) >>  8;
    self.ra       = (u16 & 0x0080) >>  7;
    self.z        = (u16 & 0x0040) >>  6;
    self.ad       = (u16 & 0x0020) >>  5;
    self.cd       = (u16 & 0x0010) >>  4;
    self.rcode    = (u16 & 0x000f) >>  0;

    self.qdCount  = msg.unpackUInt16(buf, offset); offset += 2;
    self.anCount  = msg.unpackUInt16(buf, offset); offset += 2;
    self.nsCount  = msg.unpackUInt16(buf, offset); offset += 2;
    self.arCount  = msg.unpackUInt16(buf, offset); offset += 2;

    self.consumed = offset - start;

    return true;
};

module.exports  = Header;
