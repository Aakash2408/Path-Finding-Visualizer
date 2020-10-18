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
const command_1 = require("../command");
const logger = require("../logger");
const requirePermissions_1 = require("../requirePermissions");
const getProjectNumber = require("../getProjectNumber");
const firedata = require("../gcp/firedata");
const commandUtils_1 = require("../emulator/commandUtils");
const types_1 = require("../emulator/types");
const previews_1 = require("../previews");
const database_1 = require("../management/database");
const getProjectId = require("../getProjectId");
let cmd = new command_1.Command("database:instances:create <instanceName>")
    .description("create a realtime database instance")
    .before(requirePermissions_1.requirePermissions, ["firebasedatabase.instances.create"])
    .before(commandUtils_1.warnEmulatorNotSupported, types_1.Emulators.DATABASE)
    .action((instanceName, options) => __awaiter(void 0, void 0, void 0, function* () {
    if (previews_1.previews.rtdbmanagement) {
        const projectId = getProjectId(options);
        const location = database_1.parseDatabaseLocation(options.location, database_1.DatabaseLocation.US_CENTRAL1);
        const instance = yield database_1.createInstance(projectId, instanceName, location);
        logger.info(`created database instance ${instance.name}`);
        return instance;
    }
    const projectNumber = yield getProjectNumber(options);
    const instance = yield firedata.createDatabaseInstance(projectNumber, instanceName);
    logger.info(`created database instance ${instance.instance}`);
    return instance;
}));
if (previews_1.previews.rtdbmanagement) {
    cmd = cmd.option("-l, --location <location>", "(optional) location for the database instance, defaults to us-central1");
}
exports.default = cmd;
