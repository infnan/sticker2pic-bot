'use strict';

const logger = {
    output: (level, msg, obj) => {
        let date = new Date().toISOString();
        let output = `[${date.substring(0,10)} ${date.substring(11,19)}] [${level.toUpperCase()}] ${msg}`;
        if (level.toUpperCase() === 'ERROR') {
            console.error(output);
        } else {
            console.log(output);
        }
        if (obj) {
            console.dir(obj);
        }
    },
    debug: (msg, obj) => {
        logger.output('DEBUG', msg, obj);
    },
    info: (msg, obj) => {
        logger.output('INFO', msg, obj);
    },
    warn: (msg, obj) => {
        logger.output('WARN', msg, obj);
    },
    error: (msg, obj) => {
        logger.output('ERROR', msg, obj);
    },
};

module.exports = logger;
