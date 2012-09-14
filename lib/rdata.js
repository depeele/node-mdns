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
 *                          ADDRESS     (32-bit internet IPv4 address)
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
 *                          ADDRESS     (32-bit internet IPv4 address)
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
 *      28      AAAA    host address
 *                          ADDRESS     (128-bit internet IPv6 address)
 *      47      NSEC    negative security
 *                          NNAME       (domain-name)
 *                          BITMAP      (variable length bitmap of octets)
 *      252     AXFR    zone transfer request
 *      253     MAILB   mailbox-related record request (MB, MG, MR)
 *      254     MAILA   mail agent RR request -- Obsoleted by mx
 *      255     *       request for all records
 */
var Util    = require('util'),
    Utils   = require('./utils.js'),
    Consts  = require('./consts.js'),
    Unpack  = require('./unpack.js');

/** @brief  Create a new RData instance.
 *  @param  msg     The parent Message instance;
 *  @param  config  If provided, an instance configuration object:
 *                      For unpacking:
 *                          unpack  Iinitialize the new instance using this
 *                                  Unpack instance;
 *
 *                      For initialization:
 *                          rr.type  specific key/value pairs
 */
function RData(rr, config)
{
    var self    = this;

    config = config || {};
    if (config instanceof Unpack)   { config = { unpack: config}; }


    /***************************************
     * Define a non-deletable, read-only,
     * non-enumerable reference to the
     * parent Resource Record instance
     * {
     */
    Object.defineProperty(self, 'rr', {
        get:            function()     { return rr; },
        set:            function(newRR){ rr = newRR; },
        configurable:   false,
        enumerable:     false
    });
    /* }
     ***************************************/

    if (config)
    {
        if (config.unpack)  { self.unpack( config.unpack ); }
        else                { self.init( config ); }
    }
}

/** @brief  Initialize this instance with the name/value pairs in the provide
 *          object.
 *  @param  obj     An object of name/value pairs;
 *
 *  @return this for a fluent interface.
 */
RData.prototype.init = function(obj) {
    var self    = this,
        keys    = Object.keys( self );

    // Remove any pre-existing name/value pairs.
    keys.forEach(function(key) {
        if (! self.hasOwnProperty(key))   { return; }

        delete self[ key ];
    });

    // Assign the new name/value pairs
    for (key in obj)
    {
        self[key] = obj[key];
    }

    return self;
};

/** @brief  Generate a string representation of this DNS RDATA.
 *  @param  prefix      Any prefix string [ '' ];
 *  @param  lineLen     Number of characters per line [ 79 ];
 *
 *  @return The string representation.
 */
RData.prototype.toString  = function(prefix, lineLen) {
    prefix  = prefix  || '';
    lineLen = lineLen || 79;

    var self    = this,
        str     = '',
        keys    = Object.keys( self ),
        nChars  = prefix.length,
        first   = true,
        tmp;

    keys.forEach(function(key) {
        if (! self.hasOwnProperty(key))   { return; }
        if (! first)    { str += ", "; nChars += 2; }
        else            { first = false; }

        var val = self[key];

        tmp = key +':';
        if (Buffer.isBuffer(val))
        {
            tmp += Utils.buf2hex(val, {noOffsets: true});
        }
        else
        {
            tmp += val.toString();
        }

        if ((nChars + tmp.length) >= lineLen)
        {
            str   += "\n"+ prefix;
            nChars = prefix.length;
        }
        str    += tmp;
        nChars += tmp.length;
    });

    str += "\n\n";

    return str;
};

/****************************************************************************
 * Unpacking (for incoming DNS messages)
 *
 */

/** @brief  Given an Unpack instance, (re)initialize this instance by unpacking
 *          RData information.
 *  @param  unpack  The Unpack instance;
 *
 *  @return true (success) | false (error, this.error will be Error instance)
 */
RData.prototype.unpack   = function(unpack) {
    var self        = this,
        rr          = self.rr;

    if (! (unpack instanceof Unpack))
    {
        self.error = new Error("'unpack' MUST be an Unpack instance");
        return false;
    }

    var start       = unpack.offset,
        rdlength    = 0,
        key;

    delete self.error;

    rdlength = unpack.uint16();
    if ( (rdlength === null) || (unpack.remaining < rdlength) )
    {
        self.error = new Error("RDATA missing "
                                + rdlength +" bytes of RDATA @"
                                + unpack.offset);
        return false;
    }

    switch (rr.type)
    {
    /********************************************************************/
    case Consts.TYPE_STR.A:         // A        (IPv4 ADDRESS)
        if ( (self.a = unpack.A()) === null)
        {
            self.error = unpack.error;
            return false;
        }
        break;

    /********************************************************************/
    case Consts.TYPE_STR.NS:        // NS       (domain-name)
        key         = key || 'ns';
        // fall through

    case Consts.TYPE_STR.MD:        // MD       (domain-name)
    case Consts.TYPE_STR.MF:        // MF       (domain-name)
    case Consts.TYPE_STR.MB:        // MB       (domain-name)
        key         = key || 'ma';
        // fall through

    case Consts.TYPE_STR.CNAME:     // CNAME    (domain-name)
        key         = key || 'cname';
        // fall through

    case Consts.TYPE_STR.MG:        // MG       (domain-name)
        key         = key || 'mg';
        // fall through

    case Consts.TYPE_STR.MR:        // MR       (domain-name)
        key         = key || 'mr';
        // fall through

    case Consts.TYPE_STR.PTR:       // PTR      (domain-name)
        key         = key || 'ptr';

        if ( (self[key] = unpack.domainName()) === null)
        {
            self.error = unpack.error;
            return false;
        }
        break;

    /********************************************************************/
    case Consts.TYPE_STR.SOA:       /* SOA      (MNAME, RNAME, SERIAL,
                                     *           REFRESH, RETRY, EXPIRE,
                                     *           MINIMUM)
                                     */
        if ( ((self.mname   = unpack.domainName()) === null) ||
             ((self.rname   = unpack.domainName()) === null) ||
             ((self.serial  = unpack.uint32())     === null) ||
             ((self.refresh = unpack.uint32())     === null) ||
             ((self.retry   = unpack.uint32())     === null) ||
             ((self.expire  = unpack.uint32())     === null) ||
             ((self.minimum = unpack.uint32())     === null) )
        {
            self.error = unpack.error;
            return false;
        }
        break;

    /********************************************************************/
    case Consts.TYPE_STR.WKS:       /* WKS      (IPv4 ADDRESS, PROTOCOL,
                                     *           BITMAP)
                                     */
        if ( ((self.a        = unpack.A())         === null) ||
             ((self.protocol = unpack.uint8())     === null) ||
             ((self.bitmap   = unpack.remainder()) === null) )
        {
            self.error = unpack.error;
            return false;
        }
        break;

    /********************************************************************/
    case Consts.TYPE_STR.HINFO:     // HINFO    (OS, CPU)
        if ( ((self.os  = unpack.charString()) === null) ||
             ((self.cpu = unpack.charString()) === null) )
        {
            self.error = unpack.error;
            return false;
        }
        break;

    /********************************************************************/
    case Consts.TYPE_STR.MINFO:     // MINFO    (RMAILBX, EMAILBX)
        if ( ((self.rmailbx = unpack.domainName()) === null) ||
             ((self.emailbx = unpack.domainName()) === null) )
        {
            self.error = unpack.error;
            return false;
        }
        break;

    /********************************************************************/
    case Consts.TYPE_STR.MX:        // MX       (PREFERENCE, EXCHANGE)
        if ( ((self.preference = unpack.uint16())     === null) ||
             ((self.exchange   = unpack.domainName()) === null) )
        {
            self.error = unpack.error;
            return false;
        }
        break;

    /********************************************************************/
    case Consts.TYPE_STR.TXT:       // TXT      (strings)
        // [ len, data, ... ]
        var data;

        self.txt = [];
        while (unpack.remaining > 0)
        {
            if ( (data = unpack.charString()) === null)
            {
                self.error = unpack.error;
                return false;
            }
            self.txt.push( data );
        }
        break;

    /********************************************************************/
    case Consts.TYPE_STR.AAAA:      // AAAA     (IPv6 ADDRESS)
        if ( (self.aaaa = unpack.AAAA()) === null)
        {
            self.error = unpack.error;
            return false;
        }
        break;

    /********************************************************************/
    case Consts.TYPE_STR.NSEC:      // NSEC
        if ( ((self.nextDomainName = unpack.domainName()) === null) ||
             ((self.typeBitMaps    = unpack.remainder())  === null) )
        {
            self.error = unpack.error;
            return false;
        }
        break;

    /********************************************************************
     * RFC 2782: SRV Resource Record (RR type 33 / 0x21)
     *
     *  RR Name === _Service._Proto.Name
     *                                      1  1  1  1  1  1
     *        0  1  2  3  4  5  6  7  8  9  0  1  2  3  4  5
     *      +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
     *      |                   PRIORITY                    |
     *      +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--|
     *      |                     WEIGHT                    |
     *      +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--|
     *      |                      PORT                     |
     *      +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--|
     *      /              Target Domain Name               /
     *      /                                               /
     *      +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
     *
     */
    case Consts.TYPE_STR.SRV:       // SRV
        if ( ((self.priority = unpack.uint16())     === null) ||
             ((self.weight   = unpack.uint16())     === null) ||
             ((self.port     = unpack.uint16())     === null) ||
             ((self.target   = unpack.domainName()) === null) )
        {
            self.error = unpack.error;
            return false;
        }

        /* Split out the SRV-defined portions of the RR name
         *      [name-begin]._Service._Proto.name-end
         */
        var parts   = rr.name.split('.'),
            name    = [];
        while (parts.length > 0)
        {
            var part    = parts.shift();
            if (part[0] === '_')
            {
                if (self.service)   { self.protocol = part; }
                else                { self.service  = part; }
            }
            else
            {
                name.push( part );
            }
        }

        self.name = name.join('.');
        break;

    /********************************************************************
     * RFC 2671: OPT Resource Record (RR type 41 / 0x29)
     *
     *                                      1  1  1  1  1  1
     *        0  1  2  3  4  5  6  7  8  9  0  1  2  3  4  5
     *      +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
     *      |                   OPTION CODE                 |
     *      +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--|
     *      |                  OPTION LENGTH                |
     *      +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--|
     *      /                   OPTION DATA                 /
     *      /                                               /
     *      +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
     *
     */
    case Consts.TYPE_STR.OPT:       // OPT
        if ( ((self.code     = unpack.uint16())          === null) ||
             ((self.length   = unpack.uint16())          === null) ||
             ((self.data     = unpack.data(self.length)) === null) )
        {
            self.error = unpack.error;
            return false;
        }
        break;

    /********************************************************************/
    case Consts.TYPE_STR.NULL:      // NULL     (up to 65535 octets of data)
    case Consts.TYPE_STR.AXFR:      // AXFR
    case Consts.TYPE_STR.MAILB:     // MAILB
    case Consts.TYPE_STR.MAILA:     // MAILA
    case Consts.TYPE_STR.ANY:       // ANY
    default:
        if ( ((self.data = unpack.remainder())  === null) )
        {
            self.error = unpack.error;
            return false;
        }
        break;
    }

    self.consumed = unpack.offset - start;

    return true;
};

/****************************************************************************
 * Packing (for outgoing DNS messages)
 *
 */

/** @brief  Given an Pack instance, pack this RData.
 *  @param  pack    The Pack instance;
 *
 *  @return true (success) | false (error, this.error will be Error instance)
 */
RData.prototype.pack  = function(pack) {
    var self        = this,
        rr          = self.rr,
        start       = pack.offset,
        end, val;

    delete self.error;

    // Skip over the 16-bit length, which will be written at the end.
    pack.offset += 2;

    /* :NOTE: Only RR types defined in RFC 1035 section 3.3
     *        (CNAME, MB, MD, MF, MG, MINFO, MR, MX, NS, PTR, SOA) may use
     *        domain-name compression.
     */
    switch (rr.type)
    {
    /********************************************************************/
    case Consts.TYPE_STR.A:         // A        (IPv4 ADDRESS)
        if ( pack.A( self.a ) === null )
        {
            self.error = pack.error;
            return false;
        }
        break;

    /********************************************************************/
    case Consts.TYPE_STR.NS:        // NS       (domain-name)
        val         = val || self.ns;
        // fall through

    case Consts.TYPE_STR.MD:        // MD       (domain-name)
    case Consts.TYPE_STR.MF:        // MF       (domain-name)
    case Consts.TYPE_STR.MB:        // MB       (domain-name)
        val         = val || self.ma;
        // fall through

    case Consts.TYPE_STR.CNAME:     // CNAME    (domain-name)
        val         = val || self.cname;
        // fall through

    case Consts.TYPE_STR.MG:        // MG       (domain-name)
        val         = val || self.mg;
        // fall through

    case Consts.TYPE_STR.MR:        // MR       (domain-name)
        val         = val || self.mr;
        // fall through

    case Consts.TYPE_STR.PTR:       // PTR      (domain-name)
        val         = val || self.ptr;

        if ( pack.domainName( val ) === null )
        {
            self.error = pack.error;
            return false;
        }
        break;

    /********************************************************************/
    case Consts.TYPE_STR.SOA:       /* SOA      (MNAME, RNAME, SERIAL,
                                     *           REFRESH, RETRY, EXPIRE,
                                     *           MINIMUM)
                                     */
        if ( (pack.domainName( self.mname )   === null ) ||
             (pack.domainName( self.rname )   === null ) ||
             (pack.uint32(     self.serial )  === null ) ||
             (pack.uint32(     self.refresh ) === null ) ||
             (pack.uint32(     self.retry )   === null ) ||
             (pack.uint32(     self.expire )  === null ) ||
             (pack.uint32(     self.minimum ) === null ) )
        {
            self.error = pack.error;
            return false;
        }
        break;

    /********************************************************************/
    case Consts.TYPE_STR.WKS:       /* WKS      (IPv4 ADDRESS, PROTOCOL,
                                     *           BITMAP)
                                     */
        if ( (pack.A(      self.a )        === null ) ||
             (pack.uint8(  self.protocol ) === null ) ||
             (pack.data(   self.bitmap )   === null ) )
        {
            self.error = pack.error;
            return false;
        }
        break;

    /********************************************************************/
    case Consts.TYPE_STR.HINFO:     // HINFO    (OS, CPU)
        if ( (pack.charString( self.os  ) === null) ||
             (pack.charString( self.cpu ) === null) )
        {
            self.error = pack.error;
            return false;
        }
        break;

    /********************************************************************/
    case Consts.TYPE_STR.MINFO:     // MINFO    (RMAILBX, EMAILBX)
        if ( (pack.domainName( self.rmailbx ) === null) ||
             (pack.domainName( self.emailbx ) === null) )
        {
            self.error = pack.error;
            return false;
        }
        break;

    /********************************************************************/
    case Consts.TYPE_STR.MX:        // MX       (PREFERENCE, EXCHANGE)
        if ( (pack.uint16(     self.preference )     === null) ||
             (pack.domainName( self.exchange   ) === null) )
        {
            self.error = pack.error;
            return false;
        }
        break;

    /********************************************************************/
    case Consts.TYPE_STR.TXT:       // TXT      (strings)
        // [ len, data, ... ]
        for (var idex = 0, len = self.txt.length; idex < len; idex++)
        {
            var data    = self.txt[ idex ];
            if (! data) { continue; }

            if (pack.charString( data ) === null)
            {
                self.error = pack.error;
                return false;
            }
        }
        break;

    /********************************************************************/
    case Consts.TYPE_STR.AAAA:      // AAAA     (IPv6 ADDRESS)
        if ( (pack.AAAA( self.aaaa ) === null) )
        {
            self.error = pack.error;
            return false;
        }
        break;

    /********************************************************************/
    case Consts.TYPE_STR.NSEC:      // NSEC
        if ( (pack.domainName( self.nextDomainName, false ) === null) ||
             (pack.data(       self.typeBitMaps )           === null) )
        {
            self.error = pack.error;
            return false;
        }
        break;

    /********************************************************************
     * RFC 2782: SRV Resource Record (RR type 33 / 0x21)
     *
     *  RR Name === _Service._Proto.Name
     *                                      1  1  1  1  1  1
     *        0  1  2  3  4  5  6  7  8  9  0  1  2  3  4  5
     *      +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
     *      |                   PRIORITY                    |
     *      +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--|
     *      |                     WEIGHT                    |
     *      +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--|
     *      |                      PORT                     |
     *      +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--|
     *      /              Target Domain Name               /
     *      /                                               /
     *      +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
     *
     */
    case Consts.TYPE_STR.SRV:       // SRV
        if ( (pack.uint16(     self.priority ) === null) ||
             (pack.uint16(     self.weight   ) === null) ||
             (pack.uint16(     self.port     ) === null) ||
             (pack.domainName( self.target   ) === null) )
        {
            self.error = pack.error;
            return false;
        }
        break;

    /********************************************************************
     * RFC 2671: OPT Resource Record (RR type 41 / 0x29)
     *
     *                                      1  1  1  1  1  1
     *        0  1  2  3  4  5  6  7  8  9  0  1  2  3  4  5
     *      +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
     *      |                   OPTION CODE                 |
     *      +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--|
     *      |                  OPTION LENGTH                |
     *      +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--|
     *      /                   OPTION DATA                 /
     *      /                                               /
     *      +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
     *
     */
    case Consts.TYPE_STR.OPT:       // OPT
        if ( (pack.uint16( self.code              ) === null) ||
             (pack.uint16( self.length            ) === null) ||
             (pack.data(   self.data, self.length ) === null) )
        {
            self.error = pack.error;
            return false;
        }
        break;

    /********************************************************************/
    case Consts.TYPE_STR.NULL:      // NULL     (up to 65535 octets of data)
    case Consts.TYPE_STR.AXFR:      // AXFR
    case Consts.TYPE_STR.MAILB:     // MAILB
    case Consts.TYPE_STR.MAILA:     // MAILA
    case Consts.TYPE_STR.ANY:       // ANY
    default:
        if ( (pack.data( self.data )  === null) )
        {
            self.error = pack.error;
            return false;
        }
        break;
    }

    end           = pack.offset;
    self.produced = end - start;

    // Now, go back and write the length (- 2 bytes consumed by the length)
    pack.offset = start;

    // :XXX: Do NOT include the size of the length
    if ( pack.uint16(self.produced - 2) === null )
    {
        return false;
    }

    pack.offset = end;

    return true;
};

module.exports  = RData;
