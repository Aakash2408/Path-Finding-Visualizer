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
exports.FirestoreEmulator = void 0;
const chokidar = require("chokidar");
const fs = require("fs");
const clc = require("cli-color");
const path = require("path");
const api = require("../api");
const utils = require("../utils");
const downloadableEmulators = require("./downloadableEmulators");
const types_1 = require("../emulator/types");
const registry_1 = require("./registry");
const constants_1 = require("./constants");
class FirestoreEmulator {
    constructor(args) {
        this.args = args;
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            const functionsInfo = registry_1.EmulatorRegistry.getInfo(types_1.Emulators.FUNCTIONS);
            if (functionsInfo) {
                this.args.functions_emulator = `${functionsInfo.host}:${functionsInfo.port}`;
            }
            if (this.args.rules && this.args.projectId) {
                const rulesPath = this.args.rules;
                this.rulesWatcher = chokidar.watch(rulesPath, { persistent: true, ignoreInitial: true });
                this.rulesWatcher.on("change", (event, stats) => __awaiter(this, void 0, void 0, function* () {
                    yield new Promise((res) => setTimeout(res, 5));
                    utils.logLabeledBullet("firestore", "Change detected, updating rules...");
                    const newContent = fs.readFileSync(rulesPath, "utf8").toString();
                    const issues = yield this.updateRules(newContent);
                    if (issues) {
                        for (const issue of issues) {
                            utils.logWarning(this.prettyPrintRulesIssue(rulesPath, issue));
                        }
                    }
                    if (issues.some((issue) => issue.severity === types_1.Severity.ERROR)) {
                        utils.logWarning("Failed to update rules");
                    }
                    else {
                        utils.logLabeledSuccess("firestore", "Rules updated.");
                    }
                }));
            }
            return downloadableEmulators.start(types_1.Emulators.FIRESTORE, this.args);
        });
    }
    connect() {
        return Promise.resolve();
    }
    stop() {
        if (this.rulesWatcher) {
            this.rulesWatcher.close();
        }
        return downloadableEmulators.stop(types_1.Emulators.FIRESTORE);
    }
    getInfo() {
        const host = this.args.host || constants_1.Constants.getDefaultHost(types_1.Emulators.FIRESTORE);
        const port = this.args.port || constants_1.Constants.getDefaultPort(types_1.Emulators.FIRESTORE);
        return {
            name: this.getName(),
            host,
            port,
            pid: downloadableEmulators.getPID(types_1.Emulators.FIRESTORE),
        };
    }
    getName() {
        return types_1.Emulators.FIRESTORE;
    }
    updateRules(content) {
        const projectId = this.args.projectId;
        const { host, port } = this.getInfo();
        const body = {
            ignore_errors: true,
            rules: {
                files: [
                    {
                        name: "security.rules",
                        content,
                    },
                ],
            },
        };
        return api
            .request("PUT", `/emulator/v1/projects/${projectId}:securityRules`, {
            origin: `http://${host}:${port}`,
            data: body,
        })
            .then((res) => {
            if (res.body && res.body.issues) {
                return res.body.issues;
            }
            return [];
        });
    }
    prettyPrintRulesIssue(filePath, issue) {
        const relativePath = path.relative(process.cwd(), filePath);
        const line = issue.sourcePosition.line || 0;
        const col = issue.sourcePosition.column || 0;
        return `${clc.cyan(relativePath)}:${clc.yellow(line)}:${clc.yellow(col)} - ${clc.red(issue.severity)} ${issue.description}`;
    }
}
exports.FirestoreEmulator = FirestoreEmulator;
FirestoreEmulator.FIRESTORE_EMULATOR_ENV_ALT = "FIREBASE_FIRESTORE_EMULATOR_ADDRESS";
