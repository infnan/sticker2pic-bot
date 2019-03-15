'use strict';

const Telegraf = require('telegraf');

const config = require('./config.json');
const file = require('./file.js');
const logger = require('./logger.js');

// **************************************************
//  Load Config
// **************************************************

let uid = [];
for (let n of config.uid || []) {
    if (n) {
        uid.push(n);
    }
}

if (config.url_prefix && !config.url_prefix.endsWith('/')) {
    config.url_prefix += '/';
}

file.config = config;

// **************************************************
//  Bot Init
// **************************************************

const tgBot = new Telegraf(config.bot_token, {
    telegram: {
        //        agent: myAgent,
    },
    username: config.bot_name,
});

tgBot.catch(err => {
    logger.error(`TelegramBot Error: ${err.message}`);
});

logger.info("TelegramBot started.");
tgBot.startPolling();


// **************************************************
//  Bot Loop
// **************************************************

const processCommand = async (command, param, context) => {
    let reply = '';
    if (command === 'uid') {
        reply = context.message.from.id;
        if (reply < 0) {
            reply = `GroupId = ${reply}`;
        } else {
            reply = `Your UserId = ${reply}`;
        }
    } else if (['webp', 'png', 'gif'].indexOf(command) > -1) {
        config.output[command] = !config.output[command];
        if (config.output[command]) {
            reply = `${command} Enabled.`;
        } else {
            reply = `${command} Disabled.`;
        }
    } else if (command === 'width') {
        let width = parseInt(param);
        if (isNaN(width) || width < 0) {
            width = 0;
        }
        config.max_width = width;
        if (width > 0) {
            reply = `Set max width = ${width}`;
        } else {
            reply = 'Resize disabled';
        }
    }

    return reply;
};

const processSticker = async message => {
    // 下载贴纸
    let fileId = message.sticker.file_id;
    let stickerSet = message.sticker.set_name;
    let fileName = `${stickerSet}-${fileId}`;

    let url = await tgBot.telegram.getFileLink(fileId);
    logger.debug('url = ' + url);
    let webpPath = await file.saveToCache(url, fileName + '.webp');
    logger.debug('webp = ' + webpPath);

    // 转成png
    let pngPath = await file.webp2png(webpPath);
    logger.debug('png = ' + pngPath);

    // 缩放
    if (config.max_width && config.max_width > 0 && message.sticker.width > config.max_width) {
        await file.resizePic(pngPath, config.max_width, pngPath);
    }

    // 转成gif
    let gifPath = await file.png2gif(pngPath);
    logger.debug('gif = ' + gifPath);

    // 发送链接
    let result = [];
    for (let ext of ['webp', 'png', 'gif']) {
        if (config.output[ext]) {
            result.push(`${config.url_prefix}${fileName}.${ext}`);
        }
    }

    return result;
};

tgBot.on('message', (ctx, next) => {
    try {
        let message = ctx.message;
        if (message) {
            //console.dir(ctx.message);

            if (message.text && message.text.startsWith('/')) {
                let [, cmd, , param] = ctx.message.text.match(/^\/([A-Za-z0-9_@]+)(\s+(.*)|\s*)$/u) || [];
                if (cmd) {
                    // 如果包含Bot名，判断是否为自己
                    let [, c, , n] = cmd.match(/^([A-Za-z0-9_]+)(|@([A-Za-z0-9_]+))$/u) || [];
                    if ((n && (n.toLowerCase() === config.bot_name.toLowerCase())) || !n) {
                        processCommand(c.toLowerCase(), param, ctx).then(result => {
                            if (result) {
                                ctx.reply(result, {
                                    reply_to_message_id: message.message_id
                                });
                            }
                        });
                    }
                }
            }

            if (message.sticker) {
                logger.info(`Receive [${message.sticker.emoji}] sticker from set ${message.sticker.set_name}, sender = ${message.from.first_name} ${message.from.last_name} (${message.from.user_name})`);
                if (!config.restriction || uid.indexOf(message.from.id.toString()) > -1) {
                    processSticker(message).then(result => {
                        ctx.reply(result.join('  '), {
                            reply_to_message_id: message.message_id
                        });
                    });
                }
            }
        }
    } catch (e) {
        logger.error('Error', e);
    }
    return next();
});
