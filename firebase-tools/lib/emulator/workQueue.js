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
exports.WorkQueue = void 0;
const utils = require("../utils");
const error_1 = require("../error");
const emulatorLogger_1 = require("./emulatorLogger");
const types_1 = require("./types");
class WorkQueue {
    constructor(mode = types_1.FunctionsExecutionMode.AUTO, maxParallelWork = WorkQueue.DEFAULT_MAX_PARALLEL) {
        this.mode = mode;
        this.maxParallelWork = maxParallelWork;
        this.logger = emulatorLogger_1.EmulatorLogger.forEmulator(types_1.Emulators.FUNCTIONS);
        this.queue = [];
        this.workRunningCount = 0;
        this.notifyQueue = () => { };
        this.notifyWorkFinish = () => { };
        this.stopped = true;
        if (maxParallelWork < 1) {
            throw new error_1.FirebaseError(`Cannot run Functions emulator with less than 1 parallel worker (${WorkQueue.MAX_PARALLEL_ENV}=${process.env[WorkQueue.MAX_PARALLEL_ENV]})`);
        }
    }
    submit(entry) {
        this.queue.push(entry);
        this.notifyQueue();
        this.logState();
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.stopped) {
                return;
            }
            this.stopped = false;
            while (!this.stopped) {
                if (!this.queue.length) {
                    yield new Promise((res) => {
                        this.notifyQueue = res;
                    });
                }
                if (this.workRunningCount >= this.maxParallelWork) {
                    this.logger.logLabeled("DEBUG", "work-queue", `waiting for work to finish (running=${this.workRunningCount})`);
                    yield new Promise((res) => {
                        this.notifyWorkFinish = res;
                    });
                }
                const workPromise = this.runNext();
                if (this.mode === types_1.FunctionsExecutionMode.SEQUENTIAL) {
                    yield workPromise;
                }
            }
        });
    }
    stop() {
        this.stopped = true;
    }
    flush(timeoutMs = 60000) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isWorking()) {
                return;
            }
            this.logger.logLabeled("BULLET", "functions", "Waiting for all functions to finish...");
            return new Promise((res, rej) => {
                const delta = 100;
                let elapsed = 0;
                const interval = setInterval(() => {
                    elapsed += delta;
                    if (elapsed >= timeoutMs) {
                        rej(new Error(`Functions work queue not empty after ${timeoutMs}ms`));
                    }
                    if (!this.isWorking()) {
                        clearInterval(interval);
                        res();
                    }
                }, delta);
            });
        });
    }
    getState() {
        return {
            queueLength: this.queue.length,
            workRunningCount: this.workRunningCount,
        };
    }
    isWorking() {
        const state = this.getState();
        return state.queueLength > 0 || state.workRunningCount > 0;
    }
    runNext() {
        return __awaiter(this, void 0, void 0, function* () {
            const next = this.queue.shift();
            if (next) {
                this.workRunningCount++;
                this.logState();
                try {
                    yield next();
                }
                catch (e) {
                    this.logger.log("DEBUG", e);
                }
                finally {
                    this.workRunningCount--;
                    this.notifyWorkFinish();
                    this.logState();
                }
            }
        });
    }
    logState() {
        this.logger.logLabeled("DEBUG", "work-queue", JSON.stringify(this.getState()));
    }
}
exports.WorkQueue = WorkQueue;
WorkQueue.MAX_PARALLEL_ENV = "FUNCTIONS_EMULATOR_PARALLEL";
WorkQueue.DEFAULT_MAX_PARALLEL = Number.parseInt(utils.envOverride(WorkQueue.MAX_PARALLEL_ENV, "50"));
