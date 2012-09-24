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
 *  A DNS UPDATE message (RFC 2136 - Header.opcode === 5) has the same format,
 *  including the format of sections, but assigns different meanings to the
 *  sections:
 *
 *      +---------------------+
 *      |        Header       |
 *      +---------------------+
 *      |         Zone        | specifies the zone to be updated
 *      +---------------------+
 *      |     Prerequisite    | RRs which must (not) preexist
 *      +---------------------+
 *      |        Update       | RRs to be added or deleted
 *      +---------------------+
 *      |      Additional     | RRs holding additional information
 *      +---------------------+
 */
var Util        = require('util'),
    Utils       = require('./utils.js'),
    Pack        = require('./pack.js'),
    Unpack      = require('./unpack.js'),
    Consts      = require('./consts.js'),
    Header      = require('./header.js'),
    Question    = require('./question.js'),
    RR          = require('./rr.js'),
    RData       = require('./rdata.js');

/** @brief  Create a new Message instance.
 *  @param  config  If provided, an instance configuration object:
 *                      For unpacking:
 *                          unpack  Iinitialize the new instance by unpacking
 *                                  (Buffer or Unpack instance);
 *                          offset  If 'unpack' is a Buffer and 'offset' is
 *                                  provided, defines the initial offset within
 *                                  Buffer to begin unpacking [ 0 ];
 *
 *                      For initialization:
 *                          header      A Header instance or configuration
 *                                      data for a new instance;
 *                          question    A Question instance, configuration
 *                                      object, array of instances or array of
 *                                      configuration objects;
 *                          answer      An RR instance, configuration object,
 *                                      array of instances or array of
 *                                      configuration objects;
 *                          authority   An RR instance, configuration object,
 *                                      array of instances or array of
 *                                      configuration objects;
 *                          additional  An RR instance, configuration object,
 *                                      array of instances or array of
 *                                      configuration objects;
 */
function Message(config)
{
    var self    = this;

    config = config || {};
    if ((config instanceof Unpack) ||
        (Buffer.isBuffer(config)))
    {
        config = {unpack: config};
    }

    self.header     = null;
    self.question   = [];

    self.answer     = [];
    self.authority  = [];
    self.additional = [];

    self.consumed = 0;

    if (config.unpack)
    {
        self.unpack( config.unpack, config.offset || 0 );
    }
    else
    {
        if (config.header)
        {
            if (config.header instanceof Header)
            {
                config.header.msg = self;
                self.header = config.header;
            }
            else
            {
                self.header = new Header( self, config.header );
            }
        }
        else
        {
            self.header = new Header( self );
        }

        initArray('question',   Question);
        initArray('answer',     RR);
        initArray('authority',  RR);
        initArray('additional', RR);
    }

    return self;

    // Simple in-line helper
    function initArray(name, Cls)
    {
        if (! config[name]) { return; }

        if (config[name] instanceof Cls)
        {
            config[name].msg = self;
            self[name].push( config[name] );
        }
        else if (Array.isArray(config[name]))
        {
            config[name].forEach(function(item) {
                if (! (item instanceof Cls))
                {
                    item = new Cls(self, item);
                }

                self[name].push( item );
            });
        }

        switch (name)
        {
        case 'question':
            self.header.qdCount = self.question.length;
            break;

        case 'answer':
            self.header.anCount = self.answer.length;
            break;

        case 'authority':
            self.header.nsCount = self.authority.length;
            break;

        case 'additional':
            self.header.arCount = self.additional.length;
            break;
        }
    }
}

/** @brief  Has this message been truncated?
 *  
 *  @return true | false
 */
Message.prototype.isTruncated = function() {
    return (this.header.tc !== 0);
};

/** @brief  Set this message to truncated.
 *
 *  @return this for a fluent interface.
 */
Message.prototype.truncate = function() {
    this.header.tc = 1;

    return this;
};

/** @brief  Add a new Question to this DNS message.
 *  @param  qName   The domain-name of this question (string) OR a Question
 *                  instance;
 *  @param  qType   The question type                (integer or string);
 *  @param  qClass  The question class               (integer or string);
 *
 *  @return The new Question instance (null on error).
 */
Message.prototype.addQuestion = function(qName, qType, qClass) {
    var self        = this,
        question;

    if (qName instanceof Question)
    {
        question     = qName;
        question.msg = self;
    }
    else
    {
        var intType     = (typeof qType === 'string'
                            ? Consts.str2type(qType)
                            : qType),
            intClass    = (typeof qClass === 'string'
                            ? Consts.str2class(qClass)
                            : qClass);

        if (intType === undefined)
        {
            self.error = new Error(Util.format("invalid qType %j", qType));
            return null;
        }
        if (intClass === undefined)
        {
            self.error = new Error(Util.format("invalid qClass %j", qClass));
            return null;
        }

        question = new Question( self, {
                    qname:  qName,
                    qtype:  intType,
                    qclass: intClass
                   });
    }

    self.question.push( question );

    self.header.qdCount = self.question.length;

    return question;
};

/** @brief  Add a new Resource Record to this DNS message.
 *  @param  type    The type of record ('answer', 'authority', 'additional');
 *  @param  rName   The domain-name of this record (string) or an RR instance;
 *  @param  rType   The record type                (integer or string);
 *  @param  rClass  The record class               (integer or string);
 *  @param  rTtl    The record time-to-live        (integer);
 *  @param  rData   If provided, an object of name/value pairs to
 *                  assign to the RData element of the new record;
 *
 *  @return The new RR instance (Error instance on error).
 */
Message.prototype.addRR = function(type, rName, rType, rClass, rTtl, rData) {
    var self        = this,
        rr;

    if (rName instanceof RR)
    {
        rr     = rName;
        rr.msg = self;
    }
    else
    {
        var intType     = (typeof rType === 'string'
                            ? Consts.str2type(rType)
                            : rType),
            intClass    = (typeof rClass === 'string'
                            ? Consts.str2class(rClass)
                            : rClass);

        if (intType === undefined)
        {
            self.error = new Error(Util.format("invalid rType %j", rType));
            return null;
        }
        if (intClass === undefined)
        {
            self.error = new Error(Util.format("invalid rClass %j", rClass));
            return null;
        }


        rr = new RR( self, {
                name:   rName,
                type:   intType,
                class:  intClass,
                ttl:    rTtl,
                rdata:  rData
             });
    }

    switch (type)
    {
    case 'answer':
        self.answer.push( rr );
        self.header.anCount = self.answer.length;
        break;

    case 'authority':
        self.authority.push( rr );
        self.header.nsCount = self.authority.length;
        break;

    case 'additional':
        self.additional.push( rr );
        self.header.arCount = self.additional.length;
        break;

    default:
        delete rr;
        rr = new Error("invalid type '"+ type +"'");
    }

    return rr;
};

/** @brief  Add a new Answer Record to this DNS message.
 *  @param  rName   The domain-name of this record (string) or an RR instance;
 *  @param  rType   The record type                (integer or string);
 *  @param  rClass  The record class               (integer or string);
 *  @param  rTtl    The record time-to-live        (integer);
 *  @param  rData   If provided, an object of name/value pairs to
 *                  assign to the RData element of the new record;
 *
 *  NOTE: This is a short-cut for addRR('answer', ...)
 *
 *  @return The new RR instance (Error instance on error).
 */
Message.prototype.addAnswer = function(rName, rType, rClass, rTtl, rData) {
    return this.addRR('answer', rName, rType, rClass, rTtl, rData);
};

/** @brief  Add a new Authority Record to this DNS message.
 *  @param  rName   The domain-name of this record (string) or an RR instance;
 *  @param  rType   The record type                (integer or string);
 *  @param  rClass  The record class               (integer or string);
 *  @param  rTtl    The record time-to-live        (integer);
 *  @param  rData   If provided, an object of name/value pairs to
 *                  assign to the RData element of the new record;
 *
 *  NOTE: This is a short-cut for addRR('authority', ...)
 *
 *  @return The new RR instance (Error instance on error).
 */
Message.prototype.addAuthority = function(rName, rType, rClass, rTtl, rData) {
    return this.addRR('authority', rName, rType, rClass, rTtl, rData);
};

/** @brief  Add a new Additional Record to this DNS message.
 *  @param  rName   The domain-name of this record (string) or an RR instance;
 *  @param  rType   The record type                (integer or string);
 *  @param  rClass  The record class               (integer or string);
 *  @param  rTtl    The record time-to-live        (integer);
 *  @param  rData   If provided, an object of name/value pairs to
 *                  assign to the RData element of the new record;
 *
 *  NOTE: This is a short-cut for addRR('authority', ...)
 *
 *  @return The new RR instance (Error instance on error).
 */
Message.prototype.addAdditional = function(rName, rType, rClass, rTtl, rData) {
    return this.addRR('additional', rName, rType, rClass, rTtl, rData);
};

/** @brief  Generate a string representation of this DNS message.
 *
 *  @return The string representation.
 */
Message.prototype.toString  = function() {
    var self    = this,
        str     = '',
        idex, label, rec;

    str  = 'Header: ' + self.header.toString('      : ');

    str += Util.format("\n%d %s\n",
                       self.header.qdCount,
                       Utils.plural(self.header.qdCount, 'question'));
    for (idex = 0; idex < self.header.qdCount; idex++)
    {
        rec = self.question[idex];
        if (! rec)  { continue; }

        label = '  '+ (idex < 10 ? ' ' : '') + Util.format('%d: ', idex);

        str += label + rec.toString( label.replace(/[0-9]/g, ' ') );
    }


    // Resource Records
    //
    // Answers
    str    += Util.format("\n%d %s\n", self.header.anCount,
                          Utils.plural(self.header.anCount, 'answer'));
    for (idex = 0; idex < self.header.anCount; idex++)
    {
        rec = self.answer[idex];
        if (! rec)  { continue; }

        label =  '  '
              +  (idex < 10 ? ' ' : '')
              +  Util.format('%d: ', idex);

        str   += label + rec.toString( label.replace(/[0-9]/g, ' ') );
    }

    // Authorities
    str    += Util.format("\n%d %s\n", self.header.nsCount,
                          Utils.plural(self.header.nsCount, 'authority'));
    for (idex = 0; idex < self.header.nsCount; idex++)
    {
        rec = self.authority[idex];
        if (! rec)  { continue; }

        label =  '  '
              +  (idex < 10 ? ' ' : '')
              +  Util.format('%d: ', idex);

        str   += label + rec.toString( label.replace(/[0-9]/g, ' ') );
    }

    // Additionals
    str    += Util.format("\n%d %s\n", self.header.arCount,
                          Utils.plural(self.header.arCount, 'additional'));
    for (idex = 0; idex < self.header.arCount; idex++)
    {
        rec = self.additional[idex];
        if (! rec)  { continue; }

        label =  '  '
              +  (idex < 10 ? ' ' : '')
              +  Util.format('%d: ', idex);

        str   += label + rec.toString( label.replace(/[0-9]/g, ' ') );
    }

    return str;
};

/****************************************************************************
 * Unpacking (for incoming DNS messages)
 *
 */

/** @brief  Given a readable buffer (either as a Buffer or Unpack instance),
 *          (re)initialize this instance by unpacking the contents of the
 *          buffer.
 *  @param  buf     The buffer from which to unpack;
 *  @param  offset  The starting offset within 'buf';
 *
 *  @return true (success) | false (error, this.error will be Error instance)
 */
Message.prototype.unpack  = function(buf, offset) {
    var self    = this,
        unpack  = buf;

    if (Buffer.isBuffer(buf))
    {
        unpack = new Unpack(buf, offset || 0);
    }
    else if (! (buf instanceof Unpack))
    {
        self.error = new Error("'buf' must be a Buffer or Unpack instance.");
        return false;
    }

    // Reset the internal state
    unpack.beginMessage();

    self.header     = new Header( self, unpack );
    self.question   = [];

    self.answer     = [];
    self.authority  = [];
    self.additional = [];

    self.consumed   = 0;

    delete self.error;

    // Header
    if ((! self.header) || self.header.error)
    {
        self.error = self.header.error;
        return false;
    }
    self.consumed += self.header.consumed;

    // Question
    for (idex = 0; idex < self.header.qdCount; idex++)
    {
        var question    = new Question( self, unpack );
        if (question.error)
        {
            self.error = question.error;
            return false;
        }
        self.consumed += question.consumed;

        self.question.push(question);
    }

    // Resource Records
    //
    // Answers
    var rr;
    for (idex = 0; idex < self.header.anCount; idex++)
    {
        rr = new RR( self, unpack );
        if (rr.error)
        {
            self.error = rr.error;
            return false;
        }
        self.consumed += rr.consumed;

        self.answer.push( rr );
    }

    // Authorities
    for (idex = 0; idex < self.header.nsCount; idex++)
    {
        rr = new RR( self, unpack );
        if (rr.error)
        {
            self.error = rr.error;
            return false;
        }
        self.consumed += rr.consumed;

        self.authority.push( rr );
    }

    // Additionals
    for (idex = 0; idex < self.header.arCount; idex++)
    {
        rr = new RR( self, unpack );
        if (rr.error)
        {
            self.error = rr.error;
            return false;
        }
        self.consumed += rr.consumed;

        self.additional.push( rr );
    }

    //self.consumed = unpack.offset - unpack.begin;

    return true;
};

/****************************************************************************
 * Packing (for outgoing DNS messages)
 *
 */

/** @brief  Write the current instance to the given writable buffer.
 *  @param  buf     The buffer into which the instance should be packed;
 *  @param  offset  The starting offset within 'buf';
 *
 *  @return true (success) | false (error, this.error will be Error instance)
 */
Message.prototype.pack  = function(buf, offset) {
    var self    = this,
        pack    = buf;

    if (Buffer.isBuffer(buf))
    {
        pack = new Pack.Pack(buf, offset || 0);
    }
    else if (! (buf instanceof Pack.Pack))
    {
        self.error = new Error("'buf' must be a Buffer or Pack instance.");
        return false;
    }

    // Reset the internal state
    pack.beginMessage();

    self.header.tc  = 0;    // NOT (yet) truncated
    self.produced   = 0;

    delete self.error;

    // Set the counts based upon what's been added
    self.header.qdCount = self.question.length;
    self.header.anCount = self.answer.length;
    self.header.nsCount = self.authority.length;
    self.header.arCount = self.additional.length;

    // Header
    var offsetHeader    = pack.offset;
    if (! self.header.pack( pack ))
    {
        self.error = self.header.error;
        return false;
    }
    self.produced += self.header.produced;

    // Counters for use if truncation occurs
    var qdCount     = 0,
        anCount     = 0,
        nsCount     = 0,
        arCount     = 0,
        offsetEnd   = pack.offset,
        item;

    // Question
    for (idex = 0; idex < self.header.qdCount; idex++)
    {
        item = self.question[idex];
        if (! item)                 { continue; }
        if (! item.pack( pack ))    { return packError(item); }

        self.produced += item.produced;
        offsetEnd      = pack.offset;
        qdCount++;
    }

    // Resource Records
    //
    // Answers
    for (idex=0;(idex < self.header.anCount) && (! self.isTruncated());idex++)
    {
        item = self.answer[ idex ];
        if (! item)                 { continue; }
        if (! item.pack( pack ))    { return packError(item); }

        self.produced += item.produced;
        offsetEnd      = pack.offset;
        anCount++;
    }

    // Authorities
    for (idex = 0; idex < self.header.nsCount; idex++)
    {
        item = self.authority[ idex ];
        if (! item)                 { continue; }
        if (! item.pack( pack ))    { return packError(item); }

        self.produced += item.produced;
        offsetEnd      = pack.offset;
        nsCount++;
    }

    // Additionals
    for (idex = 0; idex < self.header.arCount; idex++)
    {
        item = self.additional[ idex ];
        if (! item)                 { continue; }
        if (! item.pack( pack ))    { return packError(item); }

        self.produced += item.produced;
        offsetEnd      = pack.offset;
        arCount++;
    }

    //self.produced = pack.offset - pack.begin;

    return true;

    /****************************************************************
     * Handle a packing error, properly dealing with truncation.
     *
     */
    function packError(item)
    {
        self.error = item.error;

        if (! (item.error instanceof Pack.TruncError))
        {
            // NO truncation, just a raw error
            return false;
        }

        /************************************************************
         * Handle truncation
         *
         * Indicate truncation in the header
         */
        self.truncate();

        // Adjust our record counts based upon full records produced
        self.header.qdCount = qdCount;
        self.header.anCount = anCount;
        self.header.nsCount = nsCount;
        self.header.arCount = arCount;

        // Back-up and re-write the header
        pack.offset = offsetHeader;
        if (! self.header.pack( pack ))
        {
            self.error = self.header.error;
            return false;
        }

        // And move back to the end of the last full record
        pack.offset = offsetEnd;

        return false;
    }
};

module.exports  = Message;
