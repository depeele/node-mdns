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

    self.consumed   = 0;

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

    if (buf)    { self.unpack(buf, offset); }
}

/****************************************************************************
 * Unpacking (for incoming DNS messages)
 *
 */

/** @brief  Given a readable buffer, (re)initialize this instance by
 *          unpacking the contents of the buffer.
 *  @param  buf     The buffer from which to unpack;
 *  @param  offset  The starting offset within 'buf';
 *
 *  @return true (success) | false (error, this.error will be Error instance)
 */
Message.prototype.unpack  = function(buf, offset) {
    offset = offset || 0;

    var self        = this,
        start       = offset,
        sstart      = offset,
        idex;

    // Reset the internal state
    self.question   = [];
    self.answer     = [];
    self.authority  = [];
    self.additional = [];

    self.consumed   = 0;
    self.labelMap   = {};

    delete self.error;

    // Header
    sstart      = offset;
    self.header.unpack( buf, offset );
    if (self.header.error)
    {
        self.error = self.header.error;
        return false;
    }

    offset += self.header.consumed;

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
        offset += question.consumed;

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
        offset += answer.consumed;

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
        offset += authority.consumed;

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
        offset += additional.consumed;

        /*
        console.log("%d of %d additionals (%s - %s):\n%s",
                    idex+1, self.header.arCount,
                    Utils.int2hex(sstart), Utils.int2hex(offset - 1),
                    Util.inspect(additional, false, 20));
        console.log("labelMap: %j", self.labelMap);
        console.log("------------------------------------------------------");
        // */
    }

    self.consumed = offset - start;

    // Reset the labelMap
    self.labelMap = {};

    return true;
};

/** @brief  Unpack an 8-bit unsigned integer from the given buffer.
 *  @param  buf     The buffer;
 *  @param  offset  The offset into 'buf' [ 0 ];
 *
 *  @return The unpacked 8-bit unsigned integer
 */
Message.prototype.unpackUInt8 = function(buf, offset) {
    offset = offset || 0;

    return buf.readUInt8(offset);   //buf[offset];
};

/** @brief  Unpack a 16-bit unsigned integer from the given buffer.
 *  @param  buf     The buffer;
 *  @param  offset  The offset into 'buf' [ 0 ];
 *
 *  @return The unpacked 16-bit unsigned integer
 */
Message.prototype.unpackUInt16 = function(buf, offset) {
    offset = offset || 0;

    return buf.readUInt16BE(offset);
    //return (buf[offset] * 256) + buf[offset + 1];
};

/** @brief  Unpack a 32-bit unsigned integer from the given buffer.
 *  @param  buf     The buffer;
 *  @param  offset  The offset into 'buf' [ 0 ];
 *
 *  @return The unpacked 32-bit unsigned integer
 */
Message.prototype.unpackUInt32 = function(buf, offset) {
    offset = offset || 0;

    return buf.readUInt32BE(offset);
};

/** @brief  Unpack a 4-octet IPv4 address.
 *  @param  buf     The buffer from which to unpack the address;
 *  @param  offset  The offset into 'buf' [ 0 ];
 *
 *  @return An object containing:
 *              { value:    The unpacked address as a dot-separated string,
 *                bytes:    The number of bytes consumed }
 */
Message.prototype.unpackA = function(buf, offset) {
    var self    = this,
        nBytes  = buf.length;

    if ( (offset + 4) > nBytes)
    {
        self.error = new Error("'A' requires 4 bytes @ "+ offset);
        return -1;
    }

    return {
        value:  [self.unpackUInt8(buf, offset    ),
                 self.unpackUInt8(buf, offset + 1),
                 self.unpackUInt8(buf, offset + 2),
                 self.unpackUInt8(buf, offset + 3)
                ].join('.'),
        bytes:  4
    };
};

/** @brief  Unpack a 16-octet IPv6 address.
 *  @param  buf         The buffer from which to unpack the address;
 *  @param  offset      The offset into 'buf' [ 0 ];
 *
 *  @return An object containing:
 *              { value:    The unpacked address as a colon-separated string,
 *                bytes:    The number of bytes consumed }
 */
Message.prototype.unpackAAAA = function(buf, offset) {
    var self    = this,
        nBytes  = buf.length;

    if ((offset + 16) > nBytes)
    {
        self.error = new Error("'AAAA' requires 16 bytes @ "+ offset);
        return false;
    }

    return {
        value:  [ Utils.octet2hex(msg.unpackUInt8(buf, offset     )),
                  Utils.octet2hex(msg.unpackUInt8(buf, offset +  1)),
                  Utils.octet2hex(msg.unpackUInt8(buf, offset +  2)),
                  Utils.octet2hex(msg.unpackUInt8(buf, offset +  3)),
                  Utils.octet2hex(msg.unpackUInt8(buf, offset +  4)),
                  Utils.octet2hex(msg.unpackUInt8(buf, offset +  5)),
                  Utils.octet2hex(msg.unpackUInt8(buf, offset +  6)),
                  Utils.octet2hex(msg.unpackUInt8(buf, offset +  7)),
                  Utils.octet2hex(msg.unpackUInt8(buf, offset +  8)),
                  Utils.octet2hex(msg.unpackUInt8(buf, offset +  9)),
                  Utils.octet2hex(msg.unpackUInt8(buf, offset + 10)),
                  Utils.octet2hex(msg.unpackUInt8(buf, offset + 11)),
                  Utils.octet2hex(msg.unpackUInt8(buf, offset + 12)),
                  Utils.octet2hex(msg.unpackUInt8(buf, offset + 13)),
                  Utils.octet2hex(msg.unpackUInt8(buf, offset + 14)),
                  Utils.octet2hex(msg.unpackUInt8(buf, offset + 15))
                ].join(':'),
        bytes:  16
    };
};

/** @brief  Unpack a character-string comprised of an 8-bit length and 'length'
 *          octets.
 *  @param  buf         The buffer from which to unpack the labels;
 *  @param  offset      The offset into 'buf' [ 0 ];
 *
 *  @return An object containing:
 *              { value:    string,
 *                bytes:    The number of bytes consumed }
 */
Message.prototype.unpackString  = function(buf, offset) {
    offset = offset || 0;

    var self    = this,
        len     = self.unpackUInt8(buf, offset);

    offset++;

    if ((offset + len) > buf.length)
    {
        self.error = 'invalid character-string length @'+ offset - 1;
        return false;
    }

    return {
        value:  buf.toString('utf8', offset, offset + len ),
        bytes:  len + 1,
    };
};

/** @brief  Unpack a domain-name comprised of one or more labels.
 *  @param  buf         The buffer from which to unpack the labels;
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
    console.log("unpackName: [ %s ], labelMap[ %j ]",
                self.buf2hex(buf.slice( offset )), self.labelMap);
    // */

    do
    {
        so      = offset;
        len     = self.unpackUInt8(buf, offset);
        /* :XXX: currently EDNS0 extensions:
         *          0x40    extended label type;
         *          0x41    label type bitstring;
         */
        if (len & 0xC0)
        {
            // Pointer (end-of-name)
            var ptr = self.unpackUInt16(buf, offset) & 0x3FFF;

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
    console.log("unpackName: [ %s ], labelMap[ %j ]",
                self.buf2hex(buf.slice( start, offset )), self.labelMap);
    // */

    return { name: fullName, bytes: offset - start };
};

/****************************************************************************
 * Packing (for outgoing DNS messages)
 *
 */

/** @brief  Write the current instance to the given writable buffer.
 *  @param  buf     The buffer into which the instance should be packed;
 *  @param  offset  The starting offset within 'buf';
 *
 *  @return The number of bytes packed (-1 on error).
 */
Message.prototype.pack  = function(buf, offset) {
    offset = offset || 0;

    var self        = this,
        start       = offset,
        item;

    // Reset the internal state
    self.produced   = 0;
    self.labelMap   = {};

    delete self.error;

    // Header
    if (self.header.pack( buf, offset ) < 0)
    {
        self.error = self.header.error;
        return -1;
    }
    offset += self.header.produced;

    // Question
    for (idex = 0; idex < self.header.qdCount; idex++)
    {
        item = self.question[idex];
        if (! item) { continue; }

        if (item.pack( buf, offset ) < 0)
        {
            self.error = item.error;
            return -1;
        }
        offset += item.produced;
    }

    // Answer
    for (idex = 0; idex < self.header.anCount; idex++)
    {
        item = self.answer[idex];
        if (! item) { continue; }

        if (item.pack( buf, offset ) < 0)
        {
            self.error = item.error;
            return -1;
        }
        offset += item.produced;
    }

    // Authority
    for (idex = 0; idex < self.header.nsCount; idex++)
    {
        item = self.authority[idex];
        if (! item) { continue; }

        if (item.pack( buf, offset ) < 0)
        {
            self.error = item.error;
            return -1;
        }
        offset += item.produced;
    }

    // Additional
    for (idex = 0; idex < self.header.arCount; idex++)
    {
        item = self.additional[idex];
        if (! item) { continue; }

        if (item.pack( buf, offset ) < 0)
        {
            self.error = item.error;
            return -1;
        }
        offset += item.produced;
    }

    self.produced = offset - start;
};

/** @brief  Write an 8-bit unsigned integer to the given buffer.
 *  @param  value   The value to write;
 *  @param  buf     The buffer;
 *  @param  offset  The offset into 'buf' [ 0 ];
 *
 *  @return The number of bytes packed (-1 on error).
 */
Message.prototype.packUInt8 = function(value, buf, offset) {
    offset = offset || 0;

    try {
        buf.writeUInt8(value, offset);
    } catch(e) {
        this.error = e;
        return -1;
    }

    return 1;
};

/** @brief  Write a 16-bit unsigned integer to the given buffer.
 *  @param  value   The value to write;
 *  @param  buf     The buffer;
 *  @param  offset  The offset into 'buf' [ 0 ];
 *
 *  @return The number of bytes packed (-1 on error).
 */
Message.prototype.packUInt16 = function(value, buf, offset) {
    offset = offset || 0;

    try {
        buf.writeUInt16BE(value, offset);
    } catch(e) {
        this.error = e;
        return -1;
    }

    return 2;
};

/** @brief  Write a 32-bit unsigned integer to the given buffer.
 *  @param  value   The value to write;
 *  @param  buf     The buffer;
 *  @param  offset  The offset into 'buf' [ 0 ];
 *
 *  @return The number of bytes packed (-1 on error).
 */
Message.prototype.packUInt32 = function(value, buf, offset) {
    offset = offset || 0;

    try {
        buf.readUInt32BE(offset);
    } catch(e) {
        this.error = e;
        return -1;
    }

    return 4;
};

/** @brief  Pack a character-string comprised of an 8-bit length and 'length'
 *          octets into the given buffer.
 *  @param  value   The value to write;
 *  @param  buf     The buffer to pack the labels into;
 *  @param  offset  The offset into 'buf' [ 0 ];
 *
 *  @return The number of bytes packed (-1 on error).
 */
Message.prototype.packString  = function(value, buf, offset) {
    offset = offset || 0;

    var self    = this,
        len     = buf.write(value, offset + 1);
    
    if (len > 255)
    {
        this.error = new Error("character-string cannot exceed 255 bytes");
        return -1;
    }

    // Now, go back and write the length octet
    self.packUInt8(len, buf, offset);

    return len + 1;
};

/** @brief  Pack a domain-name comprised of one or more labels.
 *  @param  value   The value (dotted-name) to write;
 *  @param  buf     The buffer from which to pack the labels;
 *  @param  offset  The offset into 'buf' [ 0 ];
 *
 *  This method uses and updates 'labelMap' to handle compressed labels that
 *  may be used further into the message.  The compressed labels reference
 *  offsets within the message to re-use a name that has already appeared
 *  within the message.
 *
 *  @return The number of bytes packed (-1 on error).
 */
Message.prototype.packName    = function(value, buf, offset) {
    offset = offset || 0;

    var self    = this,
        parts   = value.split('.'),
        so      = offset;

    while (parts.length > 0)
    {
        var partial = parts.join('.'),
            part    = parts.shift(),
            len;

        if (self.labelMap[partial])
        {
            /* We have a match to a previously used name.  
             * Output a "pointer" to the previous name.
             */
            value = 0xC000 | self.labelMap[partial];
            len   = self.packUInt16(value, buf, offset);
            if (len < 0)
            {
                return -1;
            }
            offset += len;
            break;
        }

        // No match -- output this part of the name and move on.
        len = self.packString(part, buf, offset);
        if (len < 0)
        {
            return -1;
        }

        self.labelMap[partial] = offset;

        offset += len;
    }

    // And a final 0x00 to finish the name
    len   = self.packUInt8(0x00, buf, offset);
    if (len < 0)
    {
        return -1;
    }
    offset += len;


    return offset - so;
};


module.exports  = Message;
