/** @file
 *
 *  A class to perform unpacking of a DNS Message and its components from a
 *  buffer with consumption and error tracking.
 *
 */
var Util    = require('util'),
    Utils   = require('./utils.js');

function Unpack(buf, offset, length)
{
    var self    = this;

    self.buf      = buf;
    self.offset   = offset || 0;

    self.begin    = self.offset;
    self.end      = self.begin + (length || buf.length);

    self.labelMap = {};

    self.error    = null;

    /***************************************
     * Define a non-deletable, read-only,
     * non-enumerable properties.
     * {
     */
    Object.defineProperty(this, 'consumed', {
        get:            function() {
            return self.offset - self.begin;
        },
        configurable:   false,
        enumerable:     false
    });

    Object.defineProperty(this, 'remaining', {
        get:            function() {
            return self.end - self.offset;
        },
        configurable:   false,
        enumerable:     false
    });
    /* }
     ***************************************/
}

/** @brief  Reset to a state to begin unpacking a new DNS Message.
 *
 */
Unpack.prototype.beginMessage = function() {
    var self    = this;

    self.labelMap = {};

    return self;
};

/** @brief  Unpack an 8-bit unsigned integer.
 *
 *  @return The unpacked 8-bit unsigned integer (null on error).
 */
Unpack.prototype.uint8 = function() {
    var self    = this,
        val     = self.buf.readUInt8(self.offset);

    self.offset += 1;

    return val;
};

/** @brief  Unpack a 16-bit unsigned integer.
 *
 *  @return The unpacked 16-bit unsigned integer (null on error).
 */
Unpack.prototype.uint16 = function() {
    var self    = this,
        val     = self.buf.readUInt16BE(self.offset);

    self.offset += 2;

    return val;
};

/** @brief  Unpack a 32-bit unsigned integer.
 *
 *  @return The unpacked 32-bit unsigned integer (null on error)
 */
Unpack.prototype.uint32 = function() {
    var self    = this,
        val     = self.buf.readUInt32BE(self.offset);

    self.offset += 4;

    return val;
};

/** @brief  Unpack the remainder of the buffer as raw data.
 *
 *  @return The unpacked data (null on error)
 */
Unpack.prototype.remainder = function() {
    var self    = this,
        data    = self.buf.slice( self.offset );

    self.offset += data.length;

    return data;
};

/** @brief  Unpack 'length' bytes of a string.
 *  @param  len     The number of bytes of string to unpack.
 *
 *  @return The unpacked string (null on error)
 */
Unpack.prototype.str = function(len) {
    var self    = this,
        str;

    if (self.remaining < len)
    {
        self.error = new Error("not enough data ("+ len +" bytes) to unpack "
                                +"string @"+ self.offset);
        return null;
    }

    str = self.buf.toString('utf8', self.offset, self.offset + len );

    self.offset += len;

    return str;
};

/** @brief  Unpack a 4-octet IPv4 address.
 *
 *  @return The unpacked address as a dot-separated string (null on error)
 */
Unpack.prototype.A = function() {
    var self    = this;

    if (self.remaining < 4)
    {
        self.error = new Error("'A' requires 4 bytes @ "+ self.offset);
        return null;
    }

    return [ self.uint8(),
             self.uint8(),
             self.uint8(),
             self.uint8()
           ].join('.');
};

/** @brief  Unpack a 16-octet IPv6 address.
 *
 *  @return The unpacked address as a colon-separated string (null on error)
 */
Unpack.prototype.AAAA = function(buf, offset) {
    var self    = this;

    if (self.remaining < 16)
    {
        self.error = new Error("'AAAA' requires 16 bytes @ "+ self.offset);
        return null;
    }

    return [ Utils.octet2hex( self.uint8() ),
             Utils.octet2hex( self.uint8() ),
             Utils.octet2hex( self.uint8() ),
             Utils.octet2hex( self.uint8() ),

             Utils.octet2hex( self.uint8() ),
             Utils.octet2hex( self.uint8() ),
             Utils.octet2hex( self.uint8() ),
             Utils.octet2hex( self.uint8() ),

             Utils.octet2hex( self.uint8() ),
             Utils.octet2hex( self.uint8() ),
             Utils.octet2hex( self.uint8() ),
             Utils.octet2hex( self.uint8() ),

             Utils.octet2hex( self.uint8() ),
             Utils.octet2hex( self.uint8() ),
             Utils.octet2hex( self.uint8() ),
             Utils.octet2hex( self.uint8() )
           ].join(':');
};

/** @brief  Unpack a character-string comprised of an 8-bit length followed by
 *          'length' octets.
 *
 *  @return The string (null on error)
 */
Unpack.prototype.charString = function() {
    var self    = this,
        len     = self.uint8();

    if (self.remaining < len)
    {
        self.error = new Error("character-string requires "+ len +" bytes @ "
                                    + self.offset);
        return null;
    }

    var str = self.buf.toString('utf8', self.offset, self.offset + len );

    self.offset += len;

    return str;
};

/** @brief  Unpack a domain-name comprised of one or more labels.
 *
 *  This method uses and updates 'labelMap' to handle compressed labels that
 *  may appear further into the message.  The compressed labels reference
 *  offsets within the message to re-use a name that has already appeared
 *  within the message.
 *
 *  @return The domain-name as a dotted string (null on error)
 */
Unpack.prototype.domainName    = function() {
    var self    = this,
        labels  = [],
        offsets = [],
        start   = self.offset,
        label, so, len;

    do
    {
        so  = self.offset;
        len = self.uint8();

        /* :XXX: currently EDNS0 extensions are NOT handled:
         *          0x40    extended label type;
         *          0x41    label type bitstring;
         */
        if (len & 0xC0)
        {
            // Pointer (end-of-name)
            var ptr = ((len ^ 0xC0) * 256) | self.uint8();

            labels.push( (self.labelMap[ ptr ] ? self.labelMap[ ptr ] : '') );
            offsets.push( so );
            break;
        }

        // Normal label
        if (len < 1)
        {
            // root / end-of-name
            labels.push( '' );
            break;
        };

        if ( (label = self.str(len)) === null)
        {
            return null;
        }

        labels.push(  label );
        offsets.push( so );

    } while (self.offset < self.end);

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
                self.buf2hex(buf.slice( start, self.offset )), self.labelMap);
    // */

    return fullName;
};

module.exports  = Unpack;
