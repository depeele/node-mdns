/** @file
 *
 *  A class to perform packing of a DNS Message and its components into a
 *  buffer with consumption and error tracking.
 *
 */
var Util    = require('util'),
    Utils   = require('./utils.js');

/** @brief  A simple Error class indicating truncation.
 */
function TruncError(msg)
{
    if (msg)    { this.message = msg; }
}
TruncError.prototype             = new Error();
TruncError.prototype.constructor = TruncError;


/** @brief  The Pack class.
 */
function Pack(buf, offset, length)
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

/** @brief  Reset to a state to begin packing a new DNS Message.
 *
 */
Pack.prototype.beginMessage = function() {
    var self    = this;

    self.labelMap = {};

    return self;
};

/** @brief  Pack an 8-bit unsigned integer.
 *  @param  value   The value to pack;
 *
 *  @return The number of bytes packed (null on error).
 */
Pack.prototype.uint8 = function(value) {
    var self    = this,
        produce = 1;

    if ((self.offset + produce) > self.end)
    {
        self.error = new TruncError("truncated writing uint8 @ "+ self.offset);
        return null;
    }

    self.buf.writeUInt8(value, self.offset);

    self.offset += produce;

    return produce;
};

/** @brief  Pack a 16-bit unsigned integer.
 *  @param  value   The value to pack;
 *
 *  @return The number of bytes packed (null on error).
 */
Pack.prototype.uint16 = function(value) {
    var self    = this,
        produce = 2;

    if ((self.offset + produce) > self.end)
    {
        self.error = new TruncError("truncated writing uint16 @ "+ self.offset);
        return null;
    }

    self.buf.writeUInt16BE(value, self.offset);

    self.offset += produce;

    return produce;
};

/** @brief  Pack a 32-bit unsigned integer.
 *  @param  value   The value to pack;
 *
 *  @return The number of bytes packed (null on error).
 */
Pack.prototype.uint32 = function(value) {
    var self    = this,
        produce = 4;

    if ((self.offset + produce) > self.end)
    {
        self.error = new TruncError("truncated writing uint32 @ "+ self.offset);
        return null;
    }

    self.buf.writeUInt32BE(value, self.offset);

    self.offset += produce;

    return produce;
};

/** @brief  Pack the provided value (Buffer) as raw data.
 *  @param  value   The value (Buffer) to pack;
 *
 *  @return The number of bytes packed (null on error).
 */
Pack.prototype.data = function(value) {
    var self    = this;

    if (! Buffer.isBuffer(value))
    {
        self.error = new Error("'value' MUST be a Buffer");
        return null;
    }

    var produce = value.length;

    if ((self.offset + produce) > self.end)
    {
        self.error = new TruncError("truncated writing "+ produce
                                    +" bytes of data @ "+ self.offset);
        return null;
    }

    value.copy( self.buf, self.offset);

    self.offset += produce;

    return produce;
};

/** @brief  Pack a 4-octet IPv4 address.
 *  @param  value   The value (dot-separated string) to pack;
 *
 *  @return The number of bytes packed (null on error).
 */
Pack.prototype.A = function(value) {
    var self        = this,
        reqOctets   = 4,
        produce     = 4,
        parts       = value.split('.'),
        start       = self.offset,
        octet;

    if ((self.offset + produce) > self.end)
    {
        self.error = new Error("truncated writing A @ "+ self.offset);
        return null;
    }

    if (parts.length !== reqOctets)
    {
        self.error = new TruncError("invalid A address value '"+ value +"': "
                                    + "must be a 4-segment dotted octet");
        return null;
    }

    for (var idex = 0; idex < reqOctets; idex++)
    {
        octet = parseInt( parts[idex], 10 );
        if ( (self.uint8( octet )) === null)
        {
            return null;
        }
    }

    return self.offset - start;
};

/** @brief  Pack a 16-octet IPv6 address.
 *  @param  value   The value (colon-separated string) to pack;
 *
 *  @return The number of bytes packed (null on error).
 */
Pack.prototype.AAAA = function(value) {
    var self        = this,
        reqOctets   = 16,
        produce     = 16,
        parts       = value.split(':'),
        start       = self.offset,
        octet;

    if (parts.length !== reqOctets)
    {
        self.error = new Error("invalid AAAA address value '"+ value +"': "
                                + "must be a 16-segment coloned octet");
        return null;
    }

    if ((self.offset + produce) > self.end)
    {
        self.error = new TruncError("truncated writing AAAA @ "+ self.offset);
        return null;
    }

    for (var idex = 0; idex < reqOctets; idex++)
    {
        octet = parseInt( parts[idex], 16 );
        if ( (self.uint8( octet )) === null)
        {
            return null;
        }
    }

    return self.offset - start;
};

/** @brief  Pack a character-string.
 *  @param  value   The value to pack;
 *
 *  @return The number of bytes packed (null on error).
 */
Pack.prototype.charString  = function(value) {
    var self    = this,
                  /* Write the string beyond where the length will be place so
                   * we get an accurate length.
                   */
        len     = self.buf.write(value, self.offset + 1);

    if (len > 255)
    {
        this.error = new Error("character-string cannot exceed 255 bytes");
        return null;
    }

    if ((self.offset + len) > self.end)
    {
        self.error = new TruncError("truncated writing charString @ "
                                    + self.offset);
        return null;
    }

    // Now, go back and write the length octet
    self.uint8(len);

    self.offset += len;

    return len + 1;
};

/** @brief  Pack a domain-name as one or more labels, possibly ending with a
 *          compression pointer.
 *  @param  value           The value (dotted-name) to pack;
 *  @param  noCompression   If true, do NOT perform any compression on this
 *                          name [ false ];
 *
 *  This method uses and updates 'labelMap' to handle compressed labels that
 *  may be used further into the message.  The compressed labels reference
 *  offsets within the message to re-use a name that has already appeared
 *  within the message.
 *
 *  @return The number of bytes packed (null on error).
 */
Pack.prototype.domainName   = function(value, noCompression) {
    var self    = this,
        parts   = value.split('.'),
        start   = self.offset,
        ptr     = false;

    while (parts.length > 0)
    {
        var partial = parts.join('.'),
            part    = parts.shift(),
            so      = self.offset,
            len;

        if ((noCompression !== true) && self.labelMap[partial])
        {
            /* We have a match to a previously used name.  
             * Output a "pointer" to the previous name.
             */
            ptr = 0xC000 | (self.labelMap[partial] & 0x3FFF);
            len = self.uint16(ptr);
            if (len < 0)
            {
                if (! self.error)
                {
                    self.error = new TruncError();
                }

                if (self.error instanceof TruncError)
                {
                    self.error.message = "error writing domain-name length @ "
                                       + self.offset;
                }
                return null;
            }
            break;
        }

        // No match -- output this part of the name and move on.
        len = self.charString(part);
        if (len < 0)
        {
            if (! self.error)
            {
                self.error = new TruncError();
            }

            if (self.error instanceof TruncError)
            {
                self.error.message = "error writing domain-name part '"
                                   + part +"' @ "+ self.offset;
            }

            return null;
        }

        if ((noCompression !== true) &&
            (part.length > 0)        &&
            (self.labelMap[partial] === undefined))
        {
            self.labelMap[partial] = so;
        }
    }

    return self.offset - start;
};

module.exports  = {
    Pack:       Pack,
    TruncError: TruncError
};
