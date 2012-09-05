/** @file
 *
 *  A DNS Question entry (http://tools.ietf.org/html/rfc1035#section-4.1.2)
 *
 *                                      1  1  1  1  1  1
 *        0  1  2  3  4  5  6  7  8  9  0  1  2  3  4  5
 *      +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
 *      |                                               |
 *      /                     QNAME                     /
 *      /                                               /
 *      +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
 *      |                     QTYPE                     |
 *      +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
 *      |                     QCLASS                    |
 *      +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
 *  
 *  where:
 *  
 *  QNAME           a domain name represented as a sequence of labels, where
 *                  each label consists of a length octet followed by that
 *                  number of octets.  The domain name terminates with the
 *                  zero length octet for the null label of the root.  Note
 *                  that this field may be an odd number of octets; no
 *                  padding is used.
 *  
 *  QTYPE           a two octet code which specifies the type of the query.
 *                  The values for this field include all codes valid for a
 *                  TYPE field, together with some more general codes which
 *                  can match more than one type of RR.
 *   
 *  RFC 1035        Domain Implementation and Specification    November 1987
 *  
 *  
 *  QCLASS          a two octet code that specifies the class of the query.
 *                  For example, the QCLASS field is IN for the Internet.
 *      
 *
 */
var Utils   = require('./utils.js');

function Question(buf, offset, labelMap)
{
    this.qname  = null;
    this.qtype  = 0;
    this.qclass = 0;

    // The *minimum* number of *bytes* consumed by this class
    this.length = 5;

    if (buf && labelMap)    { this.parse(buf, offset, labelMap); }
}

/** @brief  Given the provided buffer, parse out the question information.
 *  @param  buf         The buffer from which to parse information;
 *  @param  offset      The starting offset within 'buf';
 *  @param  labelMap    A "global" map of offset/label
 *                      (maintained via parseName());
 *
 *  @return true (success) | false (error, this.erro will be Error instance)
 */
Question.prototype.parse    = function(buf, offset, labelMap) {
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
        self.error = new Error("QUESTION requires at least "
                                        + self.length +" bytes");
        return false;
    }

    res         = Utils.parseName(buf, offset, labelMap);
    self.qname  = res.name;
    offset     += res.bytes;

    if ((offset + 4) > nBytes)
    {
        self.error = new Error("QUESTION requires at least "
                                + (offset + 4 - nBytes) +" more bytes");
        return false;
    }

    self.qtype  = Utils.parseUInt16(buf, offset);    offset += 2;
    self.qclass = Utils.parseUInt16(buf, offset);    offset += 2;

    self.length = offset - start;

    return true;
};

module.exports  = Question;
