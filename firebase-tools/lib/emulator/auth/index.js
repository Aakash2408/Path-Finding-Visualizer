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
exports.AuthEmulator = void 0;
const utils = require("../../utils");
const constants_1 = require("../constants");
const types_1 = require("../types");
const server_1 = require("./server");
class AuthEmulator {
    constructor(args) {
        this.args = args;
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            const { host, port } = this.getInfo();
            const app = yield server_1.createApp(this.args.projectId);
            const server = app.listen(port, host);
            this.destroyServer = utils.createDestroyer(server);
        });
    }
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
        });
    }
    stop() {
        return this.destroyServer ? this.destroyServer() : Promise.resolve();
    }
    getInfo() {
        const host = this.args.host || constants_1.Constants.getDefaultHost(types_1.Emulators.AUTH);
        const port = this.args.port || constants_1.Constants.getDefaultPort(types_1.Emulators.AUTH);
        return {
            name: this.getName(),
            host,
            port,
        };
    }
    getName() {
        return types_1.Emulators.AUTH;
    }
}
exports.AuthEmulator = AuthEmulator;
