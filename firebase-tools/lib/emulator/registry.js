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
exports.EmulatorRegistry = void 0;
const types_1 = require("./types");
const error_1 = require("../error");
const portUtils = require("./portUtils");
const constants_1 = require("./constants");
const emulatorLogger_1 = require("./emulatorLogger");
class EmulatorRegistry {
    static start(instance) {
        return __awaiter(this, void 0, void 0, function* () {
            const description = constants_1.Constants.description(instance.getName());
            if (this.isRunning(instance.getName())) {
                throw new error_1.FirebaseError(`${description} is already running!`, {});
            }
            this.set(instance.getName(), instance);
            yield instance.start();
            const info = instance.getInfo();
            yield portUtils.waitForPortClosed(info.port, info.host);
        });
    }
    static stop(name) {
        return __awaiter(this, void 0, void 0, function* () {
            emulatorLogger_1.EmulatorLogger.forEmulator(name).logLabeled("BULLET", name, `Stopping ${constants_1.Constants.description(name)}`);
            const instance = this.get(name);
            if (!instance) {
                return;
            }
            yield instance.stop();
            this.clear(instance.getName());
        });
    }
    static stopAll() {
        return __awaiter(this, void 0, void 0, function* () {
            const stopPriority = {
                ui: 0,
                functions: 1,
                hosting: 2,
                database: 3.0,
                firestore: 3.1,
                pubsub: 3.2,
                auth: 3.3,
                hub: 4,
                logging: 5,
            };
            const emulatorsToStop = this.listRunning().sort((a, b) => {
                return stopPriority[a] - stopPriority[b];
            });
            for (const name of emulatorsToStop) {
                try {
                    yield this.stop(name);
                }
                catch (e) {
                    emulatorLogger_1.EmulatorLogger.forEmulator(name).logLabeled("WARN", name, `Error stopping ${constants_1.Constants.description(name)}`);
                }
            }
        });
    }
    static isRunning(emulator) {
        const instance = this.INSTANCES.get(emulator);
        return instance !== undefined;
    }
    static listRunning() {
        return types_1.ALL_EMULATORS.filter((name) => this.isRunning(name));
    }
    static listRunningWithInfo() {
        return this.listRunning()
            .map((emulator) => this.getInfo(emulator))
            .filter((info) => typeof info !== "undefined");
    }
    static get(emulator) {
        return this.INSTANCES.get(emulator);
    }
    static getInfo(emulator) {
        const instance = this.INSTANCES.get(emulator);
        if (!instance) {
            return undefined;
        }
        return instance.getInfo();
    }
    static getPort(emulator) {
        const instance = this.INSTANCES.get(emulator);
        if (!instance) {
            return undefined;
        }
        return instance.getInfo().port;
    }
    static set(emulator, instance) {
        this.INSTANCES.set(emulator, instance);
    }
    static clear(emulator) {
        this.INSTANCES.delete(emulator);
    }
}
exports.EmulatorRegistry = EmulatorRegistry;
EmulatorRegistry.INSTANCES = new Map();
