/** @file
 *
 *  A DNS Resource Record (http://tools.ietf.org/html/rfc1035#section-4.1.3)
 *
 *                                      1  1  1  1  1  1
 *        0  1  2  3  4  5  6  7  8  9  0  1  2  3  4  5
 *      +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
 *      |                                               |
 *      /                                               /
 *      /                      NAME                     /
 *      |                                               |
 *      +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
 *      |                      TYPE                     |
 *      +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
 *      |                     CLASS                     |
 *      +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
 *      |                      TTL                      |
 *      |                                               |
 *      +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
 *      |                   RDLENGTH                    |
 *      +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--|
 *      /                     RDATA                     /
 *      /                                               /
 *      +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
 *  
 *  where:
 *  
 *  NAME            a domain name to which this resource record pertains.
 *  
 *  TYPE            two octets containing one of the RR type codes.  This
 *                  field specifies the meaning of the data in the RDATA
 *                  field.
 *                      (See RData for known types)
 *  
 *  CLASS           two octets which specify the class of the data in the
 *                  RDATA field.
 *                      1       IN      internet
 *                      2       CS      CSNET -- obsolete
 *                      3       CH      CHAOS
 *                      4       HS      Hesiod
 *
 *                    qclass is a superset of class values that adds:
 *                      255     *       any class
 *  
 *  TTL             a 32 bit unsigned integer that specifies the time
 *                  interval (in seconds) that the resource record may be
 *                  cached before it should be discarded.  Zero values are
 *                  interpreted to mean that the RR can only be used for the
 *                  transaction in progress, and should not be cached.
 *  
 *  RDLENGTH        an unsigned 16 bit integer that specifies the length in
 *                  octets of the RDATA field.
 *  
 *  RDATA           a variable length string of octets that describes the
 *                  resource.  The format of this information varies
 *                  according to the TYPE and CLASS of the resource record.
 *                  For example, the if the TYPE is A and the CLASS is IN,
 *                  the RDATA field is a 4 octet ARPA Internet address.
 *  
 *
 */
var Utils   = require('./utils.js'),
    RData   = require('./rdata.js');

function RR(buf, offset, labelMap)
{
    this.name     = null;
    this.type     = 0;
    this.class    = 0;
    this.ttl      = 0;
    this.rdlength = 0;
    this.rdata    = null;

    // The *minimum* number of *bytes* consumed by this class
    this.length = 11;

    if (buf && labelMap)    { this.parse(buf, offset, labelMap); }
}

/** @brief  Given the provided buffer, parse out the question information.
 *  @param  buf         The buffer from which to parse information;
 *  @param  offset      The starting offset within 'buf';
 *  @param  labelMap    A "global" map of offset/label
 *                      (maintained via parseName());
 *
 *  @return true (success) | Error instance
 */
RR.prototype.parse    = function(buf, offset, labelMap) {
    offset = offset || 0;

    var self    = this,
        start   = offset,
        nBytes  = buf.length,
        res;

    delete self.error;

    if (! Buffer.isBuffer(buf))
    {
        self.error = new Error("buf MUST be a Buffer");
        return false;
    }
    if (nBytes < self.length)
    {
        self.error = new Error("RR requires at least "
                                        + self.length +" bytes");
        return false;
    }

    res       = Utils.parseName(buf, offset, labelMap);
    self.name = res.name;

    /*
    console.log("RR: name[ %s ], ( %s - %s )",
                self.name,
                Utils.int2hex(offset), Utils.int2hex(offset + res.bytes - 1));
    // */

    offset   += res.bytes;

    if ((offset + 10) > nBytes)
    {
        /*
        console.log("*** RR: offset[ %s ], nBytes[ %d ]",
                    offset, nBytes);
        // */

        self.error = new Error("RR requires at least "
                                + (offset + 10 - nBytes) +" more bytes");
        return false;
    }

    self.type     = Utils.parseUInt16(buf, offset);    offset += 2;
    self.class    = Utils.parseUInt16(buf, offset);    offset += 2;
    self.ttl      = Utils.parseUInt32(buf, offset);    offset += 4;
    self.rdlength = Utils.parseUInt16(buf, offset);    offset += 2;

    /*
    console.log("RR: name[ %s ], type[ %d ], class[ %d ], ttl[ %d ], "
                    + "rdlen[ %d ] (%s - %s)",
                self.name, self.type, self.class, self.ttl, self.rdlength,
                Utils.int2hex(start), Utils.int2hex(offset - 1));
    // */

    if ((offset + self.rdlength) > nBytes)
    {
        /*
        console.log("*** RR: offset[ %s ], rdlen[ %d ], nBytes[ %d ]",
                    offset, self.rdlength, nBytes);
        // */

        self.error = new Error("RR missing "
                                + (offset + self.rdlength - nBytes)
                                +" of "+ self.rdlength +" bytes of RDATA");
        return false;
    }

    self.rdata  = new RData( self.type, offset, self.rdlength, buf,
                             labelMap );
    offset     += self.rdata.length;    //self.rdlength;

    self.length = offset - start;

    /*
    console.log("RR: name[ %s ], (%s - %s), length[ %d ]",
                self.name,
                Utils.int2hex(start), Utils.int2hex(offset - 1),
                self.length);
    // */

    return true;
};

module.exports  = RR;
