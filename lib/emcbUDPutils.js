const logger = require("winston");
const crypto = require('crypto');

const {
    EMCB_UDP_HEADER_START_MASTER,
    EMCB_UDP_MESSAGE_CODES
} = require('./emcbUDPconstants.js')

function incrementSequenceNumber(seqNum, amount){
    seqNum += amount || 1
    if(seqNum > 0xFFFFFFFF){
        seqNum = 0
    }
    return seqNum
}

function parsePacketIntoApplicationLayer(msg){
    try{
        return {
            // header              : msg.slice(0,10),
            startByte           : msg.slice(0,4),
            sequenceNumber      : msg.readUInt32LE(4),
            messageCode         : msg.readUInt16LE(8),

            // body
            messageData         : msg.slice(10,-32),

            // footer
            cryptographicHash   : msg.slice(-32),

            // Data to check our signature against - essentially Buffer.concat([header, body])
            cryptographicHashedData : msg.slice(0,-32),
        }
    } catch(ex){
        console.error("Error parsing message into Application Layer")   //TODO: BUG: This should use our logger...  Need to figure out how to pass it around globally
        console.error(ex)
    }
}

function createEMCBudpBuffer(sequenceNumber, messageCode, messageData, signingKey){
    if(!Buffer.isBuffer(signingKey)){
        throw new Error("Invalid signingKey.  Expected signingKey to be type Buffer but got " + typeof signingKey)
    }

    // Allocate our immutable length header buffer
    var header = Buffer.alloc(10)

    // start with the "ETNM" Start bytes
    header.write(EMCB_UDP_HEADER_START_MASTER, 0)	 //0x45, 0x54, 0x4E, 0x4D

    // Add the Sequence Number
    header.writeUInt32LE(sequenceNumber, 4)

    // And the Message Code
    header.writeUInt16LE(messageCode, 8)

    // Create our body object and add our data to it, if it exists
    var body = Buffer.from((messageData ? messageData : ""))

    // Create our data object to sign
    var data = Buffer.concat([header, body])

    // Calculate our signature
    var signature = crypto
                    .createHmac('sha256', signingKey)
                    .update(data)
                    .digest()

    // Return the packet
    return Buffer.concat([data, signature])
};

function checkSignature(hashedData, receivedSignature, signingKey) {
        // Calculate our Expected Signature
    var expectedSig = crypto
                        .createHmac('sha256', signingKey)
                        .update(hashedData)
                        .digest()

    if(expectedSig.equals(receivedSignature)){
        return true;
    }

    // logger.warn("ERROR: Invalid Signature.  \nExpected " + expectedSig.toString('hex') + ".  \nReceived " + cyrptographicHash.toString('hex'))
    // Invalid signature
    return false
};

function hexify(data){
    return data.replace(/(.{2})/g,"$1 ").slice(0,-1).toUpperCase()
}

function packetToString(prefix, msg){
    var packet = parsePacketIntoApplicationLayer(msg)

    return `${prefix} ${prefix} ${prefix}\n"${hexify(msg.toString('hex'))}"
    ${prefix} Start        = "${hexify(msg.toString('hex').slice(0, 8)  )}"    = "${packet.startByte.toString()}"
    ${prefix} Sequence #   = "${hexify(msg.toString('hex').slice(8, 16) )}"    = 0x${packet.sequenceNumber.toString(16).toUpperCase()}
    ${prefix} Message Code = "${hexify(msg.toString('hex').slice(16,20) )}"          = ${EMCB_UDP_MESSAGE_CODES[packet.messageCode]} (0x${packet.messageCode.toString(16).toUpperCase()})
    ${prefix} Message Data = "${hexify(msg.toString('hex').slice(20,-64))}" (${packet.messageData.length} bytes)
    ${prefix} Crypto Hash  = "${hexify(msg.toString('hex').slice(   -64))}"\r\n`
};

module.exports.incrementSequenceNumber  = incrementSequenceNumber;
module.exports.createEMCBudpBuffer      = createEMCBudpBuffer;
module.exports.packetToString           = packetToString;
module.exports.checkSignature           = checkSignature;
module.exports.parsePacketIntoApplicationLayer = parsePacketIntoApplicationLayer
module.exports.parsers                  = require("./emcbUDPparser.js")
