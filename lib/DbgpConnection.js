'use strict';

var net = require('net'),
    DbgpResponse = require('./DbgpResponse');

class DbgpConnection {
    constructor(debug) {
        this.connection = false;
        this.debug = debug;
    }

    close() {
        if (this.connection) {
            this.connection.end();
            this.debug.emit('stopped');
        }
    }

    onIncomingConnection(connection) {
        // Only allow one active debug connection
        if (this.connection)
            return connection.end();

        this.connection = connection;
        this.transactionId = 1;
        this.dataBuffer = '';
        this.commandQueue = [];

        let parent = this;

        this.connection.on('end', function () {
            parent.connection = false;
        });

        this.connection.on('data', function (data) {
            parent.onIncomingData(data);
        });
    }

    onIncomingData(data) {
        data = data.toString();

        // If this is not the last part of the data, buffer it
        if (data.charCodeAt(data.length - 1) !== 0)
            return this.dataBuffer += data;

        // If there's data buffered, combine with this last packet
        if (this.dataBuffer.length) {
            this.dataBuffer += data;

            data = this.dataBuffer;

            // Empty buffer
            this.dataBuffer = '';
        }

        // Process data
        this.processData(data);
    }

    processData(data) {
        var response = new DbgpResponse(this.debug, this, data);
        response.process();
    }

    isCommandPending(transactionId) {
        return transactionId in this.commandQueue;
    }

    getTransactionId() {
        return this.transactionId++;
    }

    sendCommand(command, parameters) {
        let that = this;
        let transactionId = this.getTransactionId();

        command = {
            command: command + ' -i ' + transactionId,
            transactionId: transactionId
        };

        if (parameters)
            command.command += ' ' + parameters;

        var responded = new Promise(function(resolve, reject) {
            command.resolve = resolve;
            command.reject = reject;

            that.commandQueue[transactionId] = command;

            // Check if we can send the command right away
            if (!that.isCommandPending(transactionId - 1)) {
                that.sendCommandToServer(transactionId);
            }
        });

        responded.then(function(response) {
            that.checkCommandQueue(response.transactionId);
        });

        return responded;
    }

    sendCommandToServer(transactionId) {
        // Fetch command from queue
        let command = this.commandQueue[transactionId];

        // Send the command to server
        this.connection.write(command.command + '\x00');
    }

    checkCommandQueue(transactionId) {
        delete this.commandQueue[transactionId];

        // Received a response, see if we have a pending command to send
        if (this.commandQueue[transactionId + 1])
            this.sendCommandToServer(transactionId + 1);
    }

    // Sends our supported features to server
    sendFeatures() {
        this.sendCommand('feature_set', '-n show_hidden -v ' + (this.debug.options.showHidden ? 1 : 0));
        this.sendCommand('feature_set', '-n max_children -v ' + this.debug.options.maxChildren);
        this.sendCommand('feature_set', '-n max_depth -v ' + this.debug.options.maxDepth);
        this.sendCommand('feature_set', '-n max_data -v ' + this.debug.options.maxData);
    }

    listen(port) {
        var that = this;

        this.server = net.createServer(function (connection) {
            that.onIncomingConnection(connection);
        });

        this.server.listen(port);
    }
}

module.exports = DbgpConnection;
