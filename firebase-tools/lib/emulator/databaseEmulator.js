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
exports.DatabaseEmulator = void 0;
const chokidar = require("chokidar");
const clc = require("cli-color");
const fs = require("fs");
const path = require("path");
const http = require("http");
const api = require("../api");
const downloadableEmulators = require("./downloadableEmulators");
const types_1 = require("../emulator/types");
const constants_1 = require("./constants");
const registry_1 = require("./registry");
const emulatorLogger_1 = require("./emulatorLogger");
const error_1 = require("../error");
class DatabaseEmulator {
    constructor(args) {
        this.args = args;
        this.importedNamespaces = [];
        this.logger = emulatorLogger_1.EmulatorLogger.forEmulator(types_1.Emulators.DATABASE);
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            const functionsInfo = registry_1.EmulatorRegistry.getInfo(types_1.Emulators.FUNCTIONS);
            if (functionsInfo) {
                this.args.functions_emulator_host = functionsInfo.host;
                this.args.functions_emulator_port = functionsInfo.port;
            }
            if (this.args.rules) {
                for (const c of this.args.rules) {
                    if (!c.instance) {
                        this.logger.log("DEBUG", `args.rules=${JSON.stringify(this.args.rules)}`);
                        this.logger.logLabeled("WARN_ONCE", "database", "Could not determine your Realtime Database instance name, so rules hot reloading is disabled.");
                        continue;
                    }
                    const rulesPath = c.rules;
                    this.rulesWatcher = chokidar.watch(rulesPath, { persistent: true, ignoreInitial: true });
                    this.rulesWatcher.on("change", (event, stats) => __awaiter(this, void 0, void 0, function* () {
                        yield new Promise((res) => setTimeout(res, 5));
                        this.logger.logLabeled("BULLET", "database", `Change detected, updating rules for ${c.instance}...`);
                        const newContent = fs.readFileSync(rulesPath, "utf8").toString();
                        try {
                            yield this.updateRules(c.instance, newContent);
                            this.logger.logLabeled("SUCCESS", "database", "Rules updated.");
                        }
                        catch (e) {
                            this.logger.logLabeled("WARN", "database", this.prettyPrintRulesError(rulesPath, e));
                            this.logger.logLabeled("WARN", "database", "Failed to update rules");
                        }
                    }));
                }
            }
            return downloadableEmulators.start(types_1.Emulators.DATABASE, this.args);
        });
    }
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.args.rules) {
                for (const c of this.args.rules) {
                    if (!c.instance) {
                        continue;
                    }
                    yield this.updateRules(c.instance, fs.readFileSync(c.rules, "utf8").toString());
                }
            }
        });
    }
    stop() {
        return downloadableEmulators.stop(types_1.Emulators.DATABASE);
    }
    getInfo() {
        const host = this.args.host || constants_1.Constants.getDefaultHost(types_1.Emulators.DATABASE);
        const port = this.args.port || constants_1.Constants.getDefaultPort(types_1.Emulators.DATABASE);
        return {
            name: this.getName(),
            host,
            port,
            pid: downloadableEmulators.getPID(types_1.Emulators.DATABASE),
        };
    }
    getName() {
        return types_1.Emulators.DATABASE;
    }
    getImportedNamespaces() {
        return this.importedNamespaces;
    }
    importData(ns, fPath) {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.logLabeled("BULLET", "database", `Importing data from ${fPath}`);
            const readStream = fs.createReadStream(fPath);
            const { host, port } = this.getInfo();
            yield new Promise((resolve, reject) => {
                const req = http.request({
                    method: "PUT",
                    host,
                    port,
                    path: `/.json?ns=${ns}&disableTriggers=true&writeSizeLimit=unlimited`,
                    headers: {
                        Authorization: "Bearer owner",
                        "Content-Type": "application/json",
                    },
                }, (response) => {
                    if (response.statusCode === 200) {
                        this.importedNamespaces.push(ns);
                        resolve();
                    }
                    else {
                        this.logger.log("DEBUG", "Database import failed: " + response.statusCode);
                        response
                            .on("data", (d) => {
                            this.logger.log("DEBUG", d.toString());
                        })
                            .on("end", reject);
                    }
                });
                req.on("error", reject);
                readStream.pipe(req, { end: true });
            }).catch((e) => {
                throw new error_1.FirebaseError("Error during database import.", { original: e, exit: 1 });
            });
        });
    }
    updateRules(instance, content) {
        return __awaiter(this, void 0, void 0, function* () {
            const { host, port } = this.getInfo();
            try {
                yield api.request("PUT", `/.settings/rules.json?ns=${instance}`, {
                    origin: `http://${host}:${port}`,
                    headers: { Authorization: "Bearer owner" },
                    data: content,
                    json: false,
                });
            }
            catch (e) {
                if (e.context && e.context.body) {
                    throw e.context.body.error;
                }
                throw e.original;
            }
        });
    }
    prettyPrintRulesError(filePath, error) {
        const relativePath = path.relative(process.cwd(), filePath);
        return `${clc.cyan(relativePath)}:${error.trim()}`;
    }
}
exports.DatabaseEmulator = DatabaseEmulator;
