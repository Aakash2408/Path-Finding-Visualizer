"use strict";
const _ = require("lodash");
const { FirebaseError } = require("../../error");
function extractPattern(type, spec) {
    const glob = spec.source || spec.glob;
    const regex = spec.regex;
    if (glob && regex) {
        throw new FirebaseError("Cannot specify a " + type + " pattern with both a glob and regex.");
    }
    else if (glob) {
        return { glob: glob };
    }
    else if (regex) {
        return { regex: regex };
    }
    throw new FirebaseError("Cannot specify a " + type + " with no pattern (either a glob or regex required).");
}
module.exports = function (config) {
    const out = {};
    if (!config) {
        return out;
    }
    if (_.isArray(config.rewrites)) {
        out.rewrites = config.rewrites.map(function (rewrite) {
            const vRewrite = extractPattern("rewrite", rewrite);
            if (rewrite.destination) {
                vRewrite.path = rewrite.destination;
            }
            else if (rewrite.function) {
                vRewrite.function = rewrite.function;
            }
            else if (rewrite.dynamicLinks) {
                vRewrite.dynamicLinks = rewrite.dynamicLinks;
            }
            else if (rewrite.run) {
                vRewrite.run = Object.assign({ region: "us-central1" }, rewrite.run);
            }
            return vRewrite;
        });
    }
    if (_.isArray(config.redirects)) {
        out.redirects = config.redirects.map(function (redirect) {
            const vRedirect = extractPattern("redirect", redirect);
            vRedirect.location = redirect.destination;
            if (redirect.type) {
                vRedirect.statusCode = redirect.type;
            }
            return vRedirect;
        });
    }
    if (_.isArray(config.headers)) {
        out.headers = config.headers.map(function (header) {
            const vHeader = extractPattern("header", header);
            vHeader.headers = {};
            (header.headers || []).forEach(function (h) {
                vHeader.headers[h.key] = h.value;
            });
            return vHeader;
        });
    }
    if (_.has(config, "cleanUrls")) {
        out.cleanUrls = config.cleanUrls;
    }
    if (config.trailingSlash === true) {
        out.trailingSlashBehavior = "ADD";
    }
    else if (config.trailingSlash === false) {
        out.trailingSlashBehavior = "REMOVE";
    }
    if (_.has(config, "appAssociation")) {
        out.appAssociation = config.appAssociation;
    }
    if (_.has(config, "i18n")) {
        out.i18n = config.i18n;
    }
    return out;
};
