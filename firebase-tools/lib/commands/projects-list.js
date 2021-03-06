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
const clc = require("cli-color");
const ora = require("ora");
const Table = require("cli-table");
const command_1 = require("../command");
const projects_1 = require("../management/projects");
const requireAuth_1 = require("../requireAuth");
const logger = require("../logger");
const NOT_SPECIFIED = clc.yellow("[Not specified]");
function logProjectsList(projects, currentProjectId) {
    if (!projects.length) {
        return;
    }
    const tableHead = [
        "Project Display Name",
        "Project ID",
        "Project Number",
        "Resource Location ID",
    ];
    const table = new Table({ head: tableHead, style: { head: ["green"] } });
    projects.forEach(({ projectId, projectNumber, displayName, resources }) => {
        if (projectId === currentProjectId) {
            projectId = clc.cyan.bold(`${projectId} (current)`);
        }
        table.push([
            displayName || NOT_SPECIFIED,
            projectId,
            projectNumber,
            (resources && resources.locationId) || NOT_SPECIFIED,
        ]);
    });
    logger.info(table.toString());
}
function logProjectCount(arr = []) {
    if (!arr.length) {
        logger.info(clc.bold("No projects found."));
        return;
    }
    logger.info("");
    logger.info(`${arr.length} project(s) total.`);
}
module.exports = new command_1.Command("projects:list")
    .description("list all Firebase projects you have access to")
    .before(requireAuth_1.requireAuth)
    .action((options) => __awaiter(void 0, void 0, void 0, function* () {
    const spinner = ora("Preparing the list of your Firebase projects").start();
    let projects;
    try {
        projects = yield projects_1.listFirebaseProjects();
    }
    catch (err) {
        spinner.fail();
        throw err;
    }
    spinner.succeed();
    logProjectsList(projects, options.project);
    logProjectCount(projects);
    return projects;
}));
