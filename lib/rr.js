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
    Unpack  = require('./unpack.js'),
    RData   = require('./rdata.js');

/** @brief  Create a new Resource Record (RR) instance.
 *  @param  msg     The parent Message instance;
 *  @param  unpack  If provided, an Unpack instance to use in initializing the
 *                  new RR;
 */
function RR(msg, unpack)
{
    var self    = this;

    self.name     = null;
    self.type     = 0;
    self.typeStr  = '?';
    self.class    = 0;
    self.ttl      = 0;
    self.rdata    = null;

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

    if (unpack)
    {
        if (! (unpack instanceof Unpack))
        {
            self.error = new Error("'unpack' MUST be an Unpack instance");
            return self;
        }

        self.unpack(unpack);
    }
}

/****************************************************************************
 * Unpacking (for incoming DNS messages)
 *
 */

/** @brief  Given an Unpack instance, (re)initialize this instance by unpacking
 *          RR information.
 *  @param  unpack  The Unpack instance;
 *
 *  @return true (success) | false (error, this.error will be Error instance)
 */
RR.prototype.unpack   = function(unpack) {
    var self    = this,
        start   = unpack.offset,
        minLen  = 11;

    if (unpack.remaining < minLen)
    {
        self.error = new Error("RR requires at least "
                                        + minLen +" bytes");
        return false;
    }

    delete self.error;

    // (Re)construct the internal state
    if ( ((self.name  = unpack.domainName()) === null) ||
         ((self.type  = unpack.uint16())     === null) ||
         ((self.class = unpack.uint16())     === null) ||
         ((self.ttl   = unpack.uint32())     === null) )
    {
        self.error = unpack.error;
        return false;
    }

    self.typeStr  = RData.prototype.type2str(self.type);
    self.rdata    = new RData( self, unpack );
    if (self.rdata.error)
    {
        self.error = self.rdata.error;
        return false;
    }

    self.consumed = unpack.offset - start;

    return true;
};

/****************************************************************************
 * Packing (for outgoing DNS messages)
 *
 */

/** @brief  Given an Pack instance, pack this RR.
 *  @param  pack    The Pack instance;
 *
 *  @return true (success) | false (error, this.error will be Error instance)
 */
RR.prototype.pack  = function(pack) {
    var self    = this,
        start   = pack.offset;

    delete self.error;

    if ( (pack.domainName( self.name )   === null) ||
         (pack.uint16(     self.type )   === null) ||
         (pack.uint16(     self.class )  === null) ||
         (pack.uint32(     self.ttl )    === null) ||
         (self.rdata.pack( pack )        === false) )
    {
        self.error = pack.error;
        return false;
    }

    self.produced = pack.offset - start;

    return true;
};

module.exports  = RR;
