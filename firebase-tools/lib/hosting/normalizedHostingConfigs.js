"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizedHostingConfigs = void 0;
const cli_color_1 = require("cli-color");
const error_1 = require("../error");
function filterOnly(configs, onlyString) {
    if (!onlyString) {
        return configs;
    }
    let onlyTargets = onlyString.split(",");
    if (onlyTargets.includes("hosting")) {
        return configs;
    }
    onlyTargets = onlyTargets
        .filter((target) => target.startsWith("hosting:"))
        .map((target) => target.replace("hosting:", ""));
    return configs.filter((config) => onlyTargets.includes(config.target || config.site));
}
function normalizedHostingConfigs(cmdOptions, options = {}) {
    let configs = cmdOptions.config.get("hosting");
    if (!configs) {
        return [];
    }
    if (!Array.isArray(configs)) {
        if (!configs.target && !configs.site) {
            configs.site = cmdOptions.instance;
        }
        configs = [configs];
    }
    configs = filterOnly(configs, cmdOptions.only);
    if (options.resolveTargets) {
        configs.forEach((cfg) => {
            if (cfg.target) {
                const matchingTargets = cmdOptions.rc.requireTarget(cmdOptions.project, "hosting", cfg.target);
                if (matchingTargets.length > 1) {
                    throw new error_1.FirebaseError(`Hosting target ${cli_color_1.bold(cfg.target)} is linked to multiple sites, ` +
                        `but only one is permitted. ` +
                        `To clear, run:\n\n  firebase target:clear hosting ${cfg.target}`);
                }
                cfg.site = matchingTargets[0];
            }
            else if (!cfg.site) {
                throw new error_1.FirebaseError('Must supply either "site" or "target" in each "hosting" config.');
            }
        });
    }
    return configs;
}
exports.normalizedHostingConfigs = normalizedHostingConfigs;
