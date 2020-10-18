"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearCredentials = exports.getCredentialPathAsync = void 0;
const fs = require("fs");
const path = require("path");
const api = require("./api");
const configstore_1 = require("./configstore");
const logger = require("./logger");
function getCredentialPathAsync() {
    return __awaiter(this, void 0, void 0, function* () {
        const filePath = credFilePath();
        if (!filePath) {
            logger.debug("defaultcredentials: could not create path to default credentials file.");
            return undefined;
        }
        const cred = getCredential();
        if (!cred) {
            logger.debug("defaultcredentials: no credential available.");
            return undefined;
        }
        logger.debug(`defaultcredentials: writing to file ${filePath}`);
        return new Promise((res, rej) => {
            fs.writeFile(filePath, JSON.stringify(cred, undefined, 2), "utf8", (err) => {
                if (err) {
                    rej(err);
                }
                else {
                    res(filePath);
                }
            });
        });
    });
}
exports.getCredentialPathAsync = getCredentialPathAsync;
function clearCredentials() {
    const filePath = credFilePath();
    if (!filePath) {
        return;
    }
    if (!fs.existsSync(filePath)) {
        return;
    }
    fs.unlinkSync(filePath);
}
exports.clearCredentials = clearCredentials;
function getCredential() {
    const tokens = configstore_1.configstore.get("tokens");
    if (tokens && tokens.refresh_token) {
        return {
            client_id: api.clientId,
            client_secret: api.clientSecret,
            refresh_token: tokens.refresh_token,
            type: "authorized_user",
        };
    }
}
function credFilePath() {
    let configDir = undefined;
    if (process.platform.startsWith("win")) {
        configDir = process.env["APPDATA"];
    }
    else {
        const home = process.env["HOME"];
        if (home) {
            configDir = path.join(home, ".config");
        }
    }
    if (!configDir) {
        return undefined;
    }
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir);
    }
    const fbtConfigDir = path.join(configDir, "firebase");
    if (!fs.existsSync(fbtConfigDir)) {
        fs.mkdirSync(fbtConfigDir);
    }
    return path.join(fbtConfigDir, `${userEmailSlug()}_application_default_credentials.json`);
}
function userEmailSlug() {
    const user = configstore_1.configstore.get("user");
    const email = user && user.email ? user.email : "unknown_user";
    const slug = email.replace("@", "_").replace(".", "_");
    return slug;
}
