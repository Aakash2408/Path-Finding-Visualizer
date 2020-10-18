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
const controller = require("../emulator/controller");
const commandUtils = require("../emulator/commandUtils");
const logger = require("../logger");
const registry_1 = require("../emulator/registry");
const types_1 = require("../emulator/types");
const clc = require("cli-color");
const constants_1 = require("../emulator/constants");
const Table = require("cli-table");
function stylizeLink(url) {
    return clc.underline(clc.bold(url));
}
module.exports = new command_1.Command("emulators:start")
    .before(commandUtils.setExportOnExitOptions)
    .before(commandUtils.beforeEmulatorCommand)
    .description("start the local Firebase emulators")
    .option(commandUtils.FLAG_ONLY, commandUtils.DESC_ONLY)
    .option(commandUtils.FLAG_INSPECT_FUNCTIONS, commandUtils.DESC_INSPECT_FUNCTIONS)
    .option(commandUtils.FLAG_IMPORT, commandUtils.DESC_IMPORT)
    .option(commandUtils.FLAG_EXPORT_ON_EXIT, commandUtils.DESC_EXPORT_ON_EXIT)
    .action((options) => __awaiter(void 0, void 0, void 0, function* () {
    const killSignalPromise = commandUtils.shutdownWhenKilled(options);
    try {
        yield controller.startAll(options);
    }
    catch (e) {
        yield controller.cleanShutdown();
        throw e;
    }
    const reservedPorts = [];
    for (const internalEmulator of [types_1.Emulators.HUB, types_1.Emulators.LOGGING]) {
        const info = registry_1.EmulatorRegistry.getInfo(internalEmulator);
        if (info) {
            reservedPorts.push(info.port);
        }
    }
    const uiInfo = registry_1.EmulatorRegistry.getInfo(types_1.Emulators.UI);
    const uiUrl = `http://${uiInfo === null || uiInfo === void 0 ? void 0 : uiInfo.host}:${uiInfo === null || uiInfo === void 0 ? void 0 : uiInfo.port}`;
    const head = ["Emulator", "Host:Port"];
    if (uiInfo) {
        head.push(`View in ${constants_1.Constants.description(types_1.Emulators.UI)}`);
    }
    const successMessageTable = new Table();
    successMessageTable.push([
        `${clc.green("✔")}  All emulators ready! ` +
            (uiInfo
                ? `View status and logs at ${stylizeLink(uiUrl)}`
                : `It is now safe to connect your apps.`),
    ]);
    const emulatorsTable = new Table({
        head: head,
        style: {
            head: ["yellow"],
        },
    });
    emulatorsTable.push(...controller
        .filterEmulatorTargets(options)
        .map((emulator) => {
        const info = registry_1.EmulatorRegistry.getInfo(emulator);
        const emulatorName = constants_1.Constants.description(emulator).replace(/ emulator/i, "");
        const isSupportedByUi = types_1.EMULATORS_SUPPORTED_BY_UI.includes(emulator);
        if (!info) {
            return [emulatorName, "Failed to initialize (see above)", "", ""];
        }
        return [
            emulatorName,
            `${info === null || info === void 0 ? void 0 : info.host}:${info === null || info === void 0 ? void 0 : info.port}`,
            isSupportedByUi && uiInfo
                ? stylizeLink(`${uiUrl}/${emulator}`)
                : clc.blackBright("n/a"),
        ];
    })
        .map((col) => col.slice(0, head.length))
        .filter((v) => v));
    logger.info(`\n${successMessageTable}

${emulatorsTable}
${clc.blackBright("  Other reserved ports:")} ${reservedPorts.join(", ")}

Issues? Report them at ${stylizeLink("https://github.com/firebase/firebase-tools/issues")} and attach the *-debug.log files.
 `);
    yield killSignalPromise;
}));
