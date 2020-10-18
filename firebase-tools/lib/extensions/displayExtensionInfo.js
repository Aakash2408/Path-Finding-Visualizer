"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.displayExtInstallInfo = void 0;
const utils = require("../utils");
const extensionsHelper_1 = require("./extensionsHelper");
const logger = require("../logger");
const marked = require("marked");
const error_1 = require("../error");
function displayExtInstallInfo(extensionName, source) {
    var _a, _b;
    const lines = [];
    lines.push(`**Name**: ${source.spec.displayName}`);
    const url = (_a = source.spec.author) === null || _a === void 0 ? void 0 : _a.url;
    const urlMarkdown = url ? `(**[${url}](${url})**)` : "";
    lines.push(`**Author**: ${(_b = source.spec.author) === null || _b === void 0 ? void 0 : _b.authorName} ${urlMarkdown}`);
    if (source.spec.description) {
        lines.push(`**Description**: ${source.spec.description}`);
    }
    if (lines.length > 0) {
        utils.logLabeledBullet(extensionsHelper_1.logPrefix, `information about ${extensionName}:`);
        const infoStr = lines.join("\n");
        const formatted = marked(infoStr).replace(/\n+$/, "\n");
        logger.info(formatted);
    }
    else {
        throw new error_1.FirebaseError("Error occurred during installation: cannot parse info from source spec", {
            context: {
                source: source,
                extensionName: extensionName,
            },
        });
    }
}
exports.displayExtInstallInfo = displayExtInstallInfo;
