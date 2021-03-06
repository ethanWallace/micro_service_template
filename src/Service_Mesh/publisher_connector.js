const config = require("../config");
const amqp = require("amqplib/callback_api");

// object to hold connection for publisher
var publisherConnection = null;
var publishChannel = null;

async function publishMessageQueue(exchange, key, message){

    var retryDelay = 5000;

    if (publishChannel == null){
        publishChannel = await publisherConnection.createChannel();

        publishChannel.on("error", function(err) {
            // eslint-disable-next-line no-console
            console.error("[SMQ] channel error", err.message);
        });
        publishChannel.on("close", function() {
            // eslint-disable-next-line no-console
            console.info("[SMQ] channel '" + exchange + "' closed");
            setTimeout(function() {
                publishMessageQueue(exchange, key); 
            },retryDelay);
        }); 
    }
    try {
        await publishChannel.publish(exchange, key, new Buffer(JSON.stringify(message), {persistent:true}));
    } catch(err){
        // eslint-disable-next-line no-console
        console.error("[SMQ] error", err);
        publishChannel.close();
    }
}

// if the connection is closed or fails to be established at all, we will reconnect
function connectMessageQueuePublisher(){
  
    amqp.connect("amqp://" + config.rabbitMQ.user+ ":" + config.rabbitMQ.password + "@" + config.rabbitMQ.host +"?heartbeat=60", function(err, conn) {
        if (err) {
            // eslint-disable-next-line no-console
            console.error("[SMQ]", err.message);
            return setTimeout(connectMessageQueuePublisher, 5000);
        }
        conn.on("error", function(err) {
            if (err.message !== "Connection closing") {
                // eslint-disable-next-line no-console
                console.error("[SMQ conn error", err.message);
            }
        });
        conn.on("close", function() {
              // eslint-disable-next-line no-console
                console.error("[SMQ] reconnecting");
                return setTimeout(connectMessageQueuePublisher, 5000);
        });

        // eslint-disable-next-line no-console      
        console.info("[SMQ] connected");
        publisherConnection = conn;
    });
}

module.exports = {
    connectMessageQueuePublisher,
    publishMessageQueue
};