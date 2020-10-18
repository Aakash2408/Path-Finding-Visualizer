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
const Table = require("cli-table");
const clc = require("cli-color");
const ora = require("ora");
const logger = require("../logger");
const requirePermissions_1 = require("../requirePermissions");
const getProjectNumber = require("../getProjectNumber");
const firedata = require("../gcp/firedata");
const types_1 = require("../emulator/types");
const commandUtils_1 = require("../emulator/commandUtils");
const previews_1 = require("../previews");
const getProjectId = require("../getProjectId");
const database_1 = require("../management/database");
function logInstances(instances) {
    if (instances.length === 0) {
        logger.info(clc.bold("No database instances found."));
        return;
    }
    const tableHead = ["Database Instance Name", "Location", "Type", "State"];
    const table = new Table({ head: tableHead, style: { head: ["green"] } });
    instances.forEach((db) => {
        table.push([db.name, db.location, db.type, db.state]);
    });
    logger.info(table.toString());
}
function logInstancesCount(count = 0) {
    if (count === 0) {
        return;
    }
    logger.info("");
    logger.info(`${count} database instance(s) total.`);
}
let cmd = new command_1.Command("database:instances:list")
    .description("list realtime database instances, optionally filtered by a specified location")
    .before(requirePermissions_1.requirePermissions, ["firebasedatabase.instances.list"])
    .before(commandUtils_1.warnEmulatorNotSupported, types_1.Emulators.DATABASE)
    .action((options) => __awaiter(void 0, void 0, void 0, function* () {
    const location = database_1.parseDatabaseLocation(options.location, database_1.DatabaseLocation.ANY);
    const spinner = ora("Preparing the list of your Firebase Realtime Database instances" +
        `${location === database_1.DatabaseLocation.ANY ? "" : ` for location: ${location}`}`).start();
    let instances;
    if (previews_1.previews.rtdbmanagement) {
        const projectId = getProjectId(options);
        try {
            instances = yield database_1.listDatabaseInstances(projectId, location);
        }
        catch (err) {
            spinner.fail();
            throw err;
        }
        spinner.succeed();
        logInstances(instances);
        logInstancesCount(instances.length);
        return instances;
    }
    const projectNumber = yield getProjectNumber(options);
    try {
        instances = yield firedata.listDatabaseInstances(projectNumber);
    }
    catch (err) {
        spinner.fail();
        throw err;
    }
    spinner.succeed();
    for (const instance of instances) {
        logger.info(instance.instance);
    }
    logger.info(`Project ${options.project} has ${instances.length} database instances`);
    return instances;
}));
if (previews_1.previews.rtdbmanagement) {
    cmd = cmd.option("-l, --location <location>", "(optional) location for the database instance, defaults to us-central1");
}
exports.default = cmd;
