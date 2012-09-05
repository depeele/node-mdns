/** @file
 *
 *  A DNS Resource Record Data item
 *      (http://tools.ietf.org/html/rfc1035#section-3.3)
 *
 *  Contained within a DNS Resource Record and identified by the TYPE of the
 *  resource record, an RDATA item must be parsed in order to locate any
 *  domain-names that would effect the name compression/label mapping.
 *
 *  Standard Types:
 *      1       A       host address
 *                          ADDRESS     (32-bit internet address)
 *      2       NS      authoritative name server
 *                          NSDNAME     (domain-name)
 *      3       MD      mail destination -- obsoleted by MX
 *                          MADNAME     (domain-name)
 *      4       MF      mail forwarder   -- obsoleted by MX
 *                          MADNAME     (domain-name)
 *      5       CNAME   canonical name for an alias
 *                          CNAME       (domain-name)
 *      6       SOA     start of a zone of authority
 *                          MNAME       (domain-name)
 *                          RNAME       (domain-name)
 *                          SERIAL      (32-bit unsigned integer)
 *                          REFRESH     (32-bit unsigned integer)
 *                          RETRY       (32-bit unsigned integer)
 *                          EXPIRE      (32-bit unsigned integer)
 *                          MINIMUM     (32-bit unsigned integer)
 *      7       MB      mailbox domain name     -- experimental
 *                          MADNAME     (domain-name)
 *      8       MG      mail group member       -- experimental
 *                          MGNAME      (domain-name)
 *      9       MR      mail rename domain name -- experimental
 *                          NEWNAME     (domain-name)
 *      10      NULL    null RR                 -- experimental
 *                          up to 65535 octets of data
 *      11      WKS     well known service description
 *                          ADDRESS     (32-bit internet address)
 *                          PROTOCOL    ( 8-bit IP protocol number)
 *                          BITMAP      (variable length bitmap of octets)
 *      12      PTR     domain name pointer
 *                          PTRDNAME    (domain-name)
 *      13      HINFO   host information
 *                          CPU         (string)
 *                          OS          (string)
 *      14      MINFO   mailbox or mail list information
 *                          RMAILBX     (domain-name)
 *                          EMAILBX     (domain-name)
 *      15      MX      mail exchange
 *                          PREFERENCE  (16-bit integer)
 *                          EXCHANGE    (domain-name)
 *      16      TXT     text strings
 *                          One or more (string)
 *      252     AXFR    zone transfer request
 *      253     MAILB   mailbox-related record request (MB, MG, MR)
 *      254     MAILA   mail agent RR request -- Obsoleted by mx
 *      255     *       request for all records
 */

/** @brief  Create a new RData instance.
 *  @param  rr      The parent Resource Record instance;
 *  @param  buf     If provided, an initialization buffer;
 *  @param  offset  If provided an offset into 'buf' to begin parsing [ 0 ];
 *  @param  length  If provided, the number  of bytes to use from 'buf'
 *                  [ buf.length ];
 */
function RData(rr, buf, offset, length)
{
    /***************************************
     * Define a non-deletable, read-only,
     * non-enumerable reference to the
     * parent Resource Record instance
     * {
     */
    Object.defineProperty(this, 'rr', {
        get:            function() { return rr; },
        configurable:   false,
        enumerable:     false
    });
    /* }
     ***************************************/

    if (buf)    { this.parse(buf, offset, length); }
}

/** @brief  Given the provided buffer, parse out the question information.
 *  @param  buf     The buffer from which to parse information;
 *  @param  offset  The starting offset within 'buf';
 *  @param  length  If provided, the number  of bytes to use from 'buf'
 *                  [ buf.length ];
 *
 *  @return true (success) | Error instance
 */
RData.prototype.parse    = function(buf, offset, length) {
    var self    = this;

    if (! Buffer.isBuffer(buf))
    {
        self.error = new Error("buf MUST be a Buffer (RData)");
        return false;
    }

    offset = offset || 0;
    delete self.error;

    var rr      = self.rr,
        msg     = rr.msg,
        key, res, len;

    switch (rr.type)
    {
    case 1:     // A        (ADDRESS)
        self.address = msg.parseUInt8(buf, offset)   +'.'+
                       msg.parseUInt8(buf, offset+1) +'.'+
                       msg.parseUInt8(buf, offset+2) +'.'+
                       msg.parseUInt8(buf, offset+3);
        offset += 4;
        break;

    case 2:     // NS       (domain-name)
        key         = key || 'nsdname';
        // fall through

    case 3:     // MD       (domain-name)
    case 4:     // MF       (domain-name)
    case 7:     // MB       (domain-name)
        key         = key || 'madname';
        // fall through

    case 5:     // CNAME    (domain-name)
        key         = key || 'cname';
        // fall through

    case 8:     // MG       (domain-name)
        key         = key || 'mgname';
        // fall through

    case 9:     // MR       (domain-name)
        key         = key || 'newname';
        // fall through

    case 12:    // PTR      (domain-name)
        key         = key || 'ptrdname';
        res         = msg.unpackName(buf, offset);

        self[ key ] = res.name; offset += res.bytes;
        break;

    case 6:     // SOA      (MNAME, RNAME, SERIAL, REFRESH, RETRY, EXPIRE,
                //           MINIMUM)
        res          = msg.unpackName(buf, offset);
        self.mname   = res.name;                        offset += res.bytes;

        res          = msg.unpackName(buf, offset);
        self.rname   = res.name;                        offset += res.bytes;

        self.serial  = msg.parseUInt32(buf, offset);  offset += 4;
        self.refresh = msg.parseUInt32(buf, offset);  offset += 4;
        self.retry   = msg.parseUInt32(buf, offset);  offset += 4;
        self.expire  = msg.parseUInt32(buf, offset);  offset += 4;
        self.minimum = msg.parseUInt32(buf, offset);  offset += 4;
        break;

    case 14:    // MINFO    (RMAILBX, EMAILBX)
        // RMAILBX
        res          = msg.unpackName(buf, offset);
        self.rmailbx = res.name;
        offset      += res.bytes;

        // EMAILBX
        res          = msg.unpackName(buf, offset);
        self.emailbx = res.name;
        offset      += res.bytes;
        break;

    case 15:    // MX       (PREFERENCE, EXCHANGE)
        // PREFERENCE
        self.preference = msg.parseUInt16(buf, offset); offset += 2;

        // EXCHANGE
        res             = msg.unpackName(buf, offset);
        self.exchange   = res.name;                     offset += res.bytes;
        break;

    case 16:    // TXT      (strings)
        // [ len, data, ... ]
        self.txt = [];
        while (offset < bufLen)
        {
            len = msg.parseUInt8(buf, offset);              offset++;
            self.txt.push(
                    buf.toString('utf8', offset,
                                         offset + len) );   offset += len;
        }
        break;

    case 11:    // WKS      (ADDRESS, PROTOCOL, BITMAP)
        self.address = msg.parseUInt8(buf, offset)   +'.'+
                       msg.parseUInt8(buf, offset+1) +'.'+
                       msg.parseUInt8(buf, offset+2) +'.'+
                       msg.parseUInt8(buf, offset+3);
        offset += 4;

        self.protocol = msg.parseUInt8(buf, offset);  offset++;
        self.bitmap   = buf.slice( offset );
        break;

    case 13:    // HINFO    (OS, CPU)
        len      = msg.parseUInt8(buf, offset);             offset++;
        self.os  = buf.toString('utf8', offset,
                                        offset + len);      offset += len;

        len      = msg.parseUInt8(buf, offset);             offset++;
        self.cpu = buf.toString('utf8', offset,
                                        offset + len);      offset += len;
        break;

    case 10:    // NULL     (up to 65535 octets of data)
    case 252:   // AXFR
    case 253:   // MAILB
    case 254:   // MAILA
    case 255:   // *
    default:
        self.data = buf.slice( offset );
        break;
    }

    self.consumed = length || buf.length;

    return true;
};

/** @brief  Given a Resource Record type, return the equivilent string.
 *  @param  type    The type [ this.rr.type ];
 *
 *  @return The matching string.
 */
RData.prototype.type2str = function(type) {
    type = type || this.rr.type;

    var str;

    switch (type)
    {
    case 1:     str = 'A';      break;
    case 2:     str = 'NS';     break;
    case 3:     str = 'MD';     break;
    case 4:     str = 'MF';     break;
    case 5:     str = 'CNAME';  break;
    case 7:     str = 'MB';     break;
    case 8:     str = 'MG';     break;
    case 9:     str = 'MR';     break;
    case 10:    str = 'NULL';   break;
    case 11:    str = 'WKS';    break;
    case 12:    str = 'PTR';    break;
    case 13:    str = 'HINFO';  break;
    case 14:    str = 'MINFO';  break;
    case 15:    str = 'MX';     break;
    case 16:    str = 'TXT';    break;

    case 252:   str = 'AXFR';   break;
    case 253:   str = 'MAILB';  break;
    case 254:   str = 'MAILA';  break;
    case 255:   str = '*';      break;

    default:    str = '???';    break;
    }

    return str;
};


module.exports  = RData;

