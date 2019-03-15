'use strict';
const fs = require('fs');
const url = require('url');
const path = require('path');
const DWebp = require('cwebp').DWebp;
const request = require('request');
const gm = require('gm').subClass({imageMagick: true});

let config = {};

const saveToCache = (url, fileName) => new Promise((resolve, reject) => {
    try {
        let targetPath = path.join(path.resolve(config.save_path), fileName);
        let w = fs.createWriteStream(targetPath);
        w.on('finish', e => {
            resolve(targetPath);
        });
        request.get(url).pipe(w);
    } catch (e) {
        reject(e);
    }
});

const webp2png = async (fileName) => {
    let directory = path.dirname(fileName);
    let newName = path.basename(fileName, '.webp') + '.png';
    let newPath = path.join(directory, newName);

    await (new DWebp(fileName, config.dwebp)).write(newPath);

    return newPath;
};

const resizePic = async (fileName, width, output) => new Promise((resolve, reject) => {
    gm(fileName).resize(width).write(output, err => {
        if (err) {
            reject(err);
        } else {
            resolve(output);
        }
    });
});

const png2gif = async (fileName) => new Promise((resolve, reject) => {
    let directory = path.dirname(fileName);
    let newName = path.basename(fileName, '.png') + '.gif';
    let newPath = path.join(directory, newName);

    gm(fileName).write(newPath, err => {
        if (err) {
            reject(err);
        } else {
            resolve(newPath);
        }
    })
});

module.exports = {
    saveToCache,
    webp2png,
    png2gif,
    resizePic,
    get config() { return config; },
    set config(v) { config = v; }
};
