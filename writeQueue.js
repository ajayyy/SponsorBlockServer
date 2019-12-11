'use strict';

//used to queue objects to be written to the db
class WriteQueue {
    /**
     * @param {Statement} statement 
     * @param {Array} inputs 
     * @param {callback} callback
     */
    constructor(statement, inputs, callback) {
        this.statement = statement;
        this.inputs = inputs;
        this.callback = callback;
    }

    run() {
        return new Promise((resolve, reject) => {
            this.statement.run(this.inputs, (err) => this.end(err, resolve, reject));
        });
    }

    end(err, resolve, reject) {
        resolve();

        if (this.callback) {
            this.callback(err);
        }
    }
}

module.exports = {
    WriteQueue,
    addToWriteQueue
}

/**
 * Array of class write queue
 * 
 * @typedef WriteQueue[]
 */
var dbQueue = [];

//is a queue check currently running
var queueRunning = false;

/**
 * Adds an item to the write queue and starts the run function if needed.
 * 
 * @param {WriteQueue} item 
 */
function addToWriteQueue(item) {
    dbQueue.push(item);

    if (!queueRunning) {
        runThroughWriteQueue();
    }
}

async function runThroughWriteQueue() {
    queueRunning = true;

    while (dbQueue.length > 0) {
        await dbQueue[0].run();

        dbQueue.splice(0, 1);
    }

    queueRunning = false;
}