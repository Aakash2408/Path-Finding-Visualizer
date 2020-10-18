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
const rcGet = require("../remoteconfig/get");
const command_1 = require("../command");
const requireAuth_1 = require("../requireAuth");
const logger = require("../logger");
const getProjectId = require("../getProjectId");
const requirePermissions_1 = require("../requirePermissions");
const get_1 = require("../remoteconfig/get");
const Table = require("cli-table");
const fs = require("fs");
const util = require("util");
const tableHead = ["Entry Name", "Value"];
const MAX_DISPLAY_ITEMS = 20;
function checkValidNumber(versionNumber) {
    if (typeof Number(versionNumber) == "number") {
        return versionNumber;
    }
    return "null";
}
module.exports = new command_1.Command("remoteconfig:get")
    .description("get a Firebase project's Remote Config template")
    .option("-v, --version-number <versionNumber>", "grabs the specified version of the template")
    .option("-o, --output [filename]", "write config output to a filename (if omitted, will use the default file path)")
    .before(requireAuth_1.requireAuth)
    .before(requirePermissions_1.requirePermissions, ["cloudconfig.configs.get"])
    .action((options) => __awaiter(void 0, void 0, void 0, function* () {
    const template = yield rcGet.getTemplate(getProjectId(options), checkValidNumber(options.versionNumber));
    const table = new Table({ head: tableHead, style: { head: ["green"] } });
    if (template.conditions) {
        let updatedConditions = template.conditions
            .map((condition) => condition.name)
            .slice(0, MAX_DISPLAY_ITEMS)
            .join("\n");
        if (template.conditions.length > MAX_DISPLAY_ITEMS) {
            updatedConditions += "+more... \n";
        }
        table.push(["conditions", updatedConditions]);
    }
    const updatedParameters = get_1.parseTemplateForTable(template.parameters);
    table.push(["parameters", updatedParameters]);
    const updatedParameterGroups = get_1.parseTemplateForTable(template.parameterGroups);
    table.push(["parameterGroups", updatedParameterGroups]);
    table.push(["version", util.inspect(template.version, { showHidden: false, depth: null })]);
    const fileOut = !!options.output;
    if (fileOut) {
        const shouldUseDefaultFilename = options.output === true || options.output === "";
        const filename = shouldUseDefaultFilename
            ? options.config.get("remoteconfig.template")
            : options.output;
        const outTemplate = Object.assign({}, template);
        delete outTemplate.version;
        fs.writeFileSync(filename, JSON.stringify(outTemplate, null, 2));
    }
    else {
        logger.info(table.toString());
    }
    return template;
}));
