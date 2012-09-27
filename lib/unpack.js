/** @file
 *
 *  A class to perform unpacking of a DNS Message and its components from a
 *  buffer with consumption and error tracking.
 *
 */
var Util    = require('util'),
    Consts  = require('./consts.js');
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
        len     = 1;

    if ((self.offset + len) > self.buf.length)
    {
        // Beyond the end of the buffer.
        self.error = new Error("not enough data ("+ len +" bytes) to unpack "
                                +"uint8 @"+ self.offset);

        return null;
    }

    var val     = self.buf.readUInt8(self.offset);

    self.offset += len;

    return val;
};

/** @brief  Unpack a 16-bit unsigned integer.
 *
 *  @return The unpacked 16-bit unsigned integer (null on error).
 */
Unpack.prototype.uint16 = function() {
    var self    = this,
        len     = 2;

    if ((self.offset + len) > self.buf.length)
    {
        // Beyond the end of the buffer.
        self.error = new Error("not enough data ("+ len +" bytes) to unpack "
                                +"uint16 @"+ self.offset);

        return null;
    }

    var val     = self.buf.readUInt16BE(self.offset);

    self.offset += len;

    return val;
};

/** @brief  Unpack a 32-bit unsigned integer.
 *
 *  @return The unpacked 32-bit unsigned integer (null on error)
 */
Unpack.prototype.uint32 = function() {
    var self    = this,
        len     = 4;

    if ((self.offset + len) > self.buf.length)
    {
        // Beyond the end of the buffer.
        self.error = new Error("not enough data ("+ len +" bytes) to unpack "
                                +"uint32 @"+ self.offset);

        return null;
    }

    var val     = self.buf.readUInt32BE(self.offset);

    self.offset += len;

    return val;
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

/** @brief  Unpack 'length' bytes of a data.
 *  @param  len     The number of bytes of data to unpack.
 *
 *  @return The unpacked data (null on error)
 */
Unpack.prototype.data = function(len) {
    var self    = this,
        data;

    if (self.remaining < len)
    {
        self.error = new Error("not enough data to unpack "+ len +" bytes "
                                +"@"+ self.offset);
        return null;
    }

    data = self.buf.slice( self.offset, self.offset + len );

    self.offset += len;

    return data;
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

/** @brief  Unpack a label, comprised of an 8-bit length and length-specified
 *          octets.
 *
 *  @return A simple object of:
 *              {type:      Consts.LTYPE_STR.*,     Compression type
 *               offset:    starting-offset,
 *               val:       label/string}
 *          or null on error.
 */
Unpack.prototype.label = function() {
    var self    = this,
        res     = {
            type:   Consts.LTYPE_STR.LEN,
            offset: self.offset,
            val:    null
        },
        len     = self.uint8();

    /* :XXX: currently EDNS0 extensions are NOT handled:
     *          0x40    extended label type;
     *          0x41    label type bitstring;
     */
    if (len & Consts.LTYPE_STR.PTR)
    {
        // Pointer
        var ptr = ((len ^ Consts.LTYPE_STR.PTR) * 256) | self.uint8();

        res.type = Consts.LTYPE_STR.PTR;
        res.val  = (self.labelMap[ ptr ] ? self.labelMap[ ptr ] : '');
    }
    // Normal label
    else if (len < 1)
    {
        // root
        res.val = '.';
    }
    else if ( (res.val = self.str(len)) === null)
    {
        return null;
    }

    return res;
};

/** @brief  Unpack a character-string comprised of an 8-bit length followed by
 *          'length' octets.
 *
 *  @return The string (null on error)
 */
Unpack.prototype.charString = function() {
    var self    = this,
        len     = self.uint8();

    return self.str(len);
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
        info;

    do
    {
        if ( (info = self.label()) === null)
        {
            return null;
        }

        if (info.type === Consts.LTYPE_STR.PTR)
        {
            // Pointer  (end-of-name)
            labels.push( info.val );
            offsets.push( info.offset );
            break;
        }
        else if ( info.val === '.' )
        {
            /* root     (end-of-name) -- use an empty string so when processing
             *                           the labels below, we can exclude root
             *                           from the labelMap.
             */
            labels.push( '' );
            break;
        }

        labels.push(  info.val );
        offsets.push( info.offset );

    } while (self.offset < self.end);

    /*
    console.log("unpackName: [ %s ] %d labels: %j",
                Utils.buf2hex(self.buf.slice( start, self.offset )),
                labels.length, labels);
    // */

    /* Expand each level of this name, adding each to 'labelMap' according
     * to the offset associated with it (from above).
     */
    var fullName    = null;
    while (labels.length > 0)
    {
        var name    = labels.join('.');
            key     = offsets.shift();

        labels.shift();

        if (name.length < 1)
        {
            name = '.';
        }
        else if (! self.labelMap[ key ])
        {
            self.labelMap[ key ] = name;
        }

        if (! fullName)     { fullName = name; }
    }

    /*
    console.log("unpackName: [ %s ] == [ %s ], labelMap[ %j ]",
                Utils.buf2hex(self.buf.slice( start, self.offset )),
                fullName,
                self.labelMap);
    // */

    return fullName;
};

module.exports  = Unpack;
