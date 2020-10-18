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
exports.HubExport = void 0;
const path = require("path");
const fs = require("fs");
const http = require("http");
const api = require("../api");
const logger = require("../logger");
const types_1 = require("./types");
const registry_1 = require("./registry");
const error_1 = require("../error");
const hub_1 = require("./hub");
const downloadableEmulators_1 = require("./downloadableEmulators");
class HubExport {
    constructor(projectId, exportPath) {
        this.projectId = projectId;
        this.exportPath = exportPath;
    }
    static readMetadata(exportPath) {
        const metadataPath = path.join(exportPath, this.METADATA_FILE_NAME);
        if (!fs.existsSync(metadataPath)) {
            return undefined;
        }
        return JSON.parse(fs.readFileSync(metadataPath, "utf8").toString());
    }
    exportAll() {
        return __awaiter(this, void 0, void 0, function* () {
            const toExport = types_1.ALL_EMULATORS.filter(shouldExport);
            if (toExport.length === 0) {
                throw new error_1.FirebaseError("No running emulators support import/export.");
            }
            const metadata = {
                version: hub_1.EmulatorHub.CLI_VERSION,
            };
            if (shouldExport(types_1.Emulators.FIRESTORE)) {
                metadata.firestore = {
                    version: downloadableEmulators_1.getDownloadDetails(types_1.Emulators.FIRESTORE).version,
                    path: "firestore_export",
                    metadata_file: "firestore_export/firestore_export.overall_export_metadata",
                };
                yield this.exportFirestore(metadata);
            }
            if (shouldExport(types_1.Emulators.DATABASE)) {
                metadata.database = {
                    version: downloadableEmulators_1.getDownloadDetails(types_1.Emulators.DATABASE).version,
                    path: "database_export",
                };
                yield this.exportDatabase(metadata);
            }
            const metadataPath = path.join(this.exportPath, HubExport.METADATA_FILE_NAME);
            fs.writeFileSync(metadataPath, JSON.stringify(metadata, undefined, 2));
        });
    }
    exportFirestore(metadata) {
        return __awaiter(this, void 0, void 0, function* () {
            const firestoreInfo = registry_1.EmulatorRegistry.get(types_1.Emulators.FIRESTORE).getInfo();
            const firestoreHost = `http://${firestoreInfo.host}:${firestoreInfo.port}`;
            const firestoreExportBody = {
                database: `projects/${this.projectId}/databases/(default)`,
                export_directory: this.exportPath,
                export_name: metadata.firestore.path,
            };
            return api.request("POST", `/emulator/v1/projects/${this.projectId}:export`, {
                origin: firestoreHost,
                json: true,
                data: firestoreExportBody,
            });
        });
    }
    exportDatabase(metadata) {
        return __awaiter(this, void 0, void 0, function* () {
            const databaseEmulator = registry_1.EmulatorRegistry.get(types_1.Emulators.DATABASE);
            const { host, port } = databaseEmulator.getInfo();
            const databaseAddr = `http://${host}:${port}`;
            const inspectURL = `/.inspect/databases.json?ns=${this.projectId}`;
            const inspectRes = yield api.request("GET", inspectURL, { origin: databaseAddr, auth: true });
            const namespaces = inspectRes.body.map((instance) => instance.name);
            const namespacesToExport = [];
            for (const ns of namespaces) {
                const checkDataPath = `/.json?ns=${ns}&shallow=true&limitToFirst=1`;
                const checkDataRes = yield api.request("GET", checkDataPath, {
                    origin: databaseAddr,
                    auth: true,
                });
                if (checkDataRes.body !== null) {
                    namespacesToExport.push(ns);
                }
                else {
                    logger.debug(`Namespace ${ns} contained null data, not exporting`);
                }
            }
            for (const ns of databaseEmulator.getImportedNamespaces()) {
                if (!namespacesToExport.includes(ns)) {
                    logger.debug(`Namespace ${ns} was imported, exporting.`);
                    namespacesToExport.push(ns);
                }
            }
            if (!fs.existsSync(this.exportPath)) {
                fs.mkdirSync(this.exportPath);
            }
            const dbExportPath = path.join(this.exportPath, metadata.database.path);
            if (!fs.existsSync(dbExportPath)) {
                fs.mkdirSync(dbExportPath);
            }
            for (const ns of namespacesToExport) {
                const exportFile = path.join(dbExportPath, `${ns}.json`);
                const writeStream = fs.createWriteStream(exportFile);
                logger.debug(`Exporting database instance: ${ns} to ${exportFile}`);
                yield new Promise((resolve, reject) => {
                    http
                        .get({
                        host,
                        port,
                        path: `/.json?ns=${ns}&format=export`,
                        headers: { Authorization: "Bearer owner" },
                    }, (response) => {
                        response.pipe(writeStream, { end: true }).once("close", resolve);
                    })
                        .on("error", reject);
                });
            }
        });
    }
}
exports.HubExport = HubExport;
HubExport.METADATA_FILE_NAME = "firebase-export-metadata.json";
function shouldExport(e) {
    return types_1.IMPORT_EXPORT_EMULATORS.includes(e) && registry_1.EmulatorRegistry.isRunning(e);
}
