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
    this.header     = new Header();
    this.question   = [];
    this.answer     = [];
    this.authority  = [];
    this.additional = [];

    this.length     = 0;

    if (buf)    { this.parse(buf, offset); }
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
        labelMap    = {},
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

        var question    = new Question( buf, offset, labelMap );
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
        console.log("labelMap: %j", labelMap);
        console.log("------------------------------------------------------");
        // */
    }

    // Answer
    self.answer = [];
    for (idex = 0; idex < self.header.anCount; idex++)
    {
        sstart = offset;

        var answer  = new RR( buf, offset, labelMap );
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
        console.log("labelMap: %j", labelMap);
        console.log("------------------------------------------------------");
        // */
    }

    // Authority
    self.authority = [];
    for (idex = 0; idex < self.header.nsCount; idex++)
    {
        sstart = offset;

        var authority = new RR( buf, offset, labelMap );
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
        console.log("labelMap: %j", labelMap);
        console.log("------------------------------------------------------");
        // */
    }

    // Additional
    self.additional = [];
    for (idex = 0; idex < self.header.arCount; idex++)
    {
        sstart = offset;

        var additional  = new RR( buf, offset, labelMap );
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
        console.log("labelMap: %j", labelMap);
        console.log("------------------------------------------------------");
        // */
    }

    self.length = offset - start;

    return true;
};

module.exports  = Message;
