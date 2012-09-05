/** @file
 *
 *  A DNS message (http://tools.ietf.org/html/rfc1035#section-4.1)
 *
 *      +---------------------+
 *      |        Header       |
 *      +---------------------+
 *      |       Question      | the question for the name server
 *      +---------------------+
 *      |        Answer       | RRs answering the question
 *      +---------------------+
 *      |      Authority      | RRs pointing toward an authority
 *      +---------------------+
 *      |      Additional     | RRs holding additional information
 *      +---------------------+
 *
 */
var Util        = require('util'),
    Utils       = require('./utils.js'),
    Header      = require('./header.js'),
    Question    = require('./question.js'),
    RR          = require('./rr.js');

function Message(buf, offset)
{
    var self    = this;

    self.header     = new Header( self );
    self.question   = [];
    self.answer     = [];
    self.authority  = [];
    self.additional = [];

    self.length     = 0;

    /***************************************
     * Define a non-deletable, read-write,
     * non-enumerable 'labelMap'
     * {
     */
    var labelMap    = {};
    Object.defineProperty(this, 'labelMap', {
        get:            function()      { return labelMap; },
        set:            function(val)   { labelMap = val; },
        configurable:   false,
        enumerable:     false
    });
    /* }
     ***************************************/

    if (buf)    { self.parse(buf, offset); }
}

/** @brief  Given the provided buffer, parse out the DNS message.
 *  @param  buf     The buffer from which to parse message;
 *  @param  offset  The starting offset within 'buf';
 *
 *  @return true (success) | false (error, this.erro will be Error instance)
 */
Message.prototype.parse  = function(buf, offset) {
    offset = offset || 0;

    var self        = this,
        start       = offset,
        sstart      = offset,
        idex;

    delete self.error;

    // Header
    sstart      = offset;
    self.header.parse( buf, offset );
    if (self.header.error)
    {
        self.error = self.header.error;
        return false;
    }

    offset += self.header.length;

    // Question
    self.question = [];
    for (idex = 0; idex < self.header.qdCount; idex++)
    {
        sstart = offset;

        var question    = new Question( self, buf, offset );
        if (question.error)
        {
            self.error = question.error;
            return false;
        }

        self.question.push(question);
        offset += question.length;

        /*
        console.log("%d of %d questions (%s - %s):\n%s",
                    idex+1, self.header.qdCount,
                    Utils.int2hex(sstart), Utils.int2hex(offset - 1),
                    Util.inspect(self.question, false, 20));
        console.log("labelMap: %j", self.labelMap);
        console.log("------------------------------------------------------");
        // */
    }

    // Answer
    self.answer = [];
    for (idex = 0; idex < self.header.anCount; idex++)
    {
        sstart = offset;

        var answer  = new RR( self, buf, offset );
        if (answer.error)
        {
            self.error = answer.error;
            return false;
        }

        self.answer.push( answer );
        offset += answer.length;

        /*
        console.log("%d of %d answers (%s - %s):\n%s",
                    idex+1, self.header.anCount,
                    Utils.int2hex(sstart), Utils.int2hex(offset - 1),
                    Util.inspect(answer, false, 20));
        console.log("labelMap: %j", self.labelMap);
        console.log("------------------------------------------------------");
        // */
    }

    // Authority
    self.authority = [];
    for (idex = 0; idex < self.header.nsCount; idex++)
    {
        sstart = offset;

        var authority = new RR( self, buf, offset );
        if (authority.error)
        {
            self.error = authority.error;
            return false;
        }

        self.authority.push( authority );
        offset += authority.length;

        /*
        console.log("%d of %d authorities (%s - %s):\n%s",
                    idex+1, self.header.nsCount,
                    Utils.int2hex(sstart), Utils.int2hex(offset - 1),
                    Util.inspect(authority, false, 20));
        console.log("labelMap: %j", self.labelMap);
        console.log("------------------------------------------------------");
        // */
    }

    // Additional
    self.additional = [];
    for (idex = 0; idex < self.header.arCount; idex++)
    {
        sstart = offset;

        var additional  = new RR( self, buf, offset );
        if (additional.error)
        {
            self.error = additional.error;
            return false;
        }

        self.additional.push( additional );
        offset += additional.length;

        /*
        console.log("%d of %d additionals (%s - %s):\n%s",
                    idex+1, self.header.arCount,
                    Utils.int2hex(sstart), Utils.int2hex(offset - 1),
                    Util.inspect(additional, false, 20));
        console.log("labelMap: %j", self.labelMap);
        console.log("------------------------------------------------------");
        // */
    }

    self.length = offset - start;

    return true;
};

/** @brief  Convert first byte of the provided buffer to an 8-bit
 *          unsigned integer.
 *  @param  buf     The buffer;
 *  @param  offset  The offset into 'buf' [ 0 ];
 *
 *  @return The converted 8-bit unsigned integer
 */
Message.prototype.parseUInt8 = function(buf, offset) {
    offset = offset || 0;

    return buf.readUInt8(offset);   //buf[offset];
};

/** @brief  Convert first 2-bytes of the provided buffer to a 16-bit
 *          unsigned integer.
 *  @param  buf     The buffer;
 *  @param  offset  The offset into 'buf' [ 0 ];
 *
 *  @return The converted 16-bit unsigned integer
 */
Message.prototype.parseUInt16 = function(buf, offset) {
    offset = offset || 0;

    return buf.readUInt16BE(offset);
    //return (buf[offset] * 256) + buf[offset + 1];
};

/** @brief  Convert first 4-bytes of the provided buffer to a 32-bit
 *          unsigned integer.
 *  @param  buf     The buffer;
 *  @param  offset  The offset into 'buf' [ 0 ];
 *
 *  @return The converted 32-bit unsigned integer
 */
Message.prototype.parseUInt32 = function(buf, offset) {
    offset = offset || 0;

    return buf.readUInt32BE(offset);
};

/** @brief  Unpack a domain-name comprised of one or more labels.
 *  @param  buf         The buffer from which to parse the labels;
 *  @param  offset      The offset into 'buf' [ 0 ];
 *
 *  This method uses and updates 'labelMap' to handle compressed labels that
 *  may appear further into the message.  The compressed labels reference
 *  offsets within the message to re-use a name that has already appeared
 *  within the message.
 *
 *  @return An object containing:
 *              { name:     string,
 *                bytes:    The number of bytes consumed }
 */
Message.prototype.unpackName    = function(buf, offset) {
    offset = offset || 0;

    var self    = this,
        nBytes  = buf.length,
        labels  = [],
        offsets = [],
        start   = offset,
        so, len;

    /*
    console.log("parseName: [ %s ], labelMap[ %j ]",
                self.buf2hex(buf.slice( offset )), self.labelMap);
    // */

    do
    {
        so      = offset;
        len     = self.parseUInt8(buf, offset);
        /* :XXX: currently EDNS0 extensions:
         *          0x40    extended label type;
         *          0x41    label type bitstring;
         */
        if (len & 0xC0)
        {
            // Pointer (end-of-name)
            var ptr = self.parseUInt16(buf, offset) & 0x3FFF;

            labels.push( (self.labelMap[ ptr ] ? self.labelMap[ ptr ] : '') );
            offsets.push( so );
            offset += 2;
            break;
        }

        // Normal label
        offset += 1;
        if (len < 1)
        {
            // end-of-name
            break;
        };

        labels.push(  buf.toString('utf8', offset, offset + len ) );
        offsets.push( so );

        offset += len;

    } while (offset < nBytes);

    /* Expand each level of this name, adding each to 'labelMap' according
     * to the offset associated with it (from above).
     */
    var fullName    = null;
    while (labels.length > 0)
    {
        var name    = labels.join('.'),
            key     = offsets.shift();

        labels.shift();

        self.labelMap[ key ] = name;
        if (! fullName)     { fullName = name; }
    }

    /*
    console.log("parseName: [ %s ], labelMap[ %j ]",
                self.buf2hex(buf.slice( start, offset )), self.labelMap);
    // */

    return { name: fullName, bytes: offset - start };
};

module.exports  = Message;
