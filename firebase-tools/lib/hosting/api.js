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
exports.cleanAuthState = exports.getCleanDomains = exports.addAuthDomain = exports.createRelease = exports.cloneVersion = exports.deleteChannel = exports.updateChannelTtl = exports.createChannel = exports.listChannels = exports.getChannel = exports.normalizeName = void 0;
const error_1 = require("../error");
const api = require("../api");
const operationPoller = require("../operation-poller");
const expireUtils_1 = require("../hosting/expireUtils");
const auth_1 = require("../gcp/auth");
const ONE_WEEK_MS = 604800000;
var ReleaseType;
(function (ReleaseType) {
    ReleaseType["TYPE_UNSPECIFIED"] = "TYPE_UNSPECIFIED";
    ReleaseType["DEPLOY"] = "DEPLOY";
    ReleaseType["ROLLBACK"] = "ROLLBACK";
    ReleaseType["SITE_DISABLE"] = "SITE_DISABLE";
})(ReleaseType || (ReleaseType = {}));
var VersionStatus;
(function (VersionStatus) {
    VersionStatus["VERSION_STATUS_UNSPECIFIED"] = "VERSION_STATUS_UNSPECIFIED";
    VersionStatus["CREATED"] = "CREATED";
    VersionStatus["FINALIZED"] = "FINALIZED";
    VersionStatus["DELETED"] = "DELETED";
    VersionStatus["ABANDONED"] = "ABANDONED";
    VersionStatus["EXPIRED"] = "EXPIRED";
    VersionStatus["CLONING"] = "CLONING";
})(VersionStatus || (VersionStatus = {}));
var ServingConfig;
(function (ServingConfig) {
})(ServingConfig || (ServingConfig = {}));
function normalizeName(s) {
    return s.replace(/[/:_]/g, "-");
}
exports.normalizeName = normalizeName;
function getChannel(project = "-", site, channelId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const res = yield api.request("GET", `/v1beta1/projects/${project}/sites/${site}/channels/${channelId}`, {
                auth: true,
                origin: api.hostingApiOrigin,
            });
            return res.body;
        }
        catch (e) {
            if (e.status === 404) {
                return null;
            }
            throw e;
        }
    });
}
exports.getChannel = getChannel;
function listChannels(project = "-", site) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        const channels = [];
        let nextPageToken = "";
        for (;;) {
            try {
                const res = yield api.request("GET", `/v1beta1/projects/${project}/sites/${site}/channels`, {
                    auth: true,
                    origin: api.hostingApiOrigin,
                    query: { pageToken: nextPageToken, pageSize: 100 },
                });
                const c = (_a = res.body) === null || _a === void 0 ? void 0 : _a.channels;
                if (c) {
                    channels.push(...c);
                }
                nextPageToken = (_b = res.body) === null || _b === void 0 ? void 0 : _b.nextPageToken;
                if (!nextPageToken) {
                    return channels;
                }
            }
            catch (e) {
                if (e.status === 404) {
                    throw new error_1.FirebaseError(`could not find channels for site "${site}"`, {
                        original: e,
                    });
                }
                throw e;
            }
        }
    });
}
exports.listChannels = listChannels;
function createChannel(project = "-", site, channelId, ttlMillis = expireUtils_1.DEFAULT_DURATION) {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield api.request("POST", `/v1beta1/projects/${project}/sites/${site}/channels?channelId=${channelId}`, {
            auth: true,
            origin: api.hostingApiOrigin,
            data: {
                ttl: `${ttlMillis / 1000}s`,
            },
        });
        return res.body;
    });
}
exports.createChannel = createChannel;
function updateChannelTtl(project = "-", site, channelId, ttlMillis = ONE_WEEK_MS) {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield api.request("PATCH", `/v1beta1/projects/${project}/sites/${site}/channels/${channelId}`, {
            auth: true,
            origin: api.hostingApiOrigin,
            query: {
                updateMask: ["ttl"].join(","),
            },
            data: {
                ttl: `${ttlMillis / 1000}s`,
            },
        });
        return res.body;
    });
}
exports.updateChannelTtl = updateChannelTtl;
function deleteChannel(project = "-", site, channelId) {
    return __awaiter(this, void 0, void 0, function* () {
        yield api.request("DELETE", `/v1beta1/projects/${project}/sites/${site}/channels/${channelId}`, {
            auth: true,
            origin: api.hostingApiOrigin,
        });
    });
}
exports.deleteChannel = deleteChannel;
function cloneVersion(site, versionName, finalize = false) {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield api.request("POST", `/v1beta1/projects/-/sites/${site}/versions:clone?sourceVersion=${versionName}`, {
            auth: true,
            origin: api.hostingApiOrigin,
            data: {
                finalize,
            },
        });
        const name = res.body.name;
        const pollRes = yield operationPoller.pollOperation({
            apiOrigin: api.hostingApiOrigin,
            apiVersion: "v1beta1",
            operationResourceName: name,
            masterTimeout: 600000,
        });
        return pollRes;
    });
}
exports.cloneVersion = cloneVersion;
function createRelease(site, channel, version) {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield api.request("POST", `/v1beta1/projects/-/sites/${site}/channels/${channel}/releases?version_name=${version}`, {
            auth: true,
            origin: api.hostingApiOrigin,
        });
        return res.body;
    });
}
exports.createRelease = createRelease;
function addAuthDomain(project, url) {
    return __awaiter(this, void 0, void 0, function* () {
        const domains = yield auth_1.getAuthDomains(project);
        const domain = url.replace("https://", "");
        const authDomains = domains || [];
        if (authDomains.includes(domain)) {
            return authDomains;
        }
        authDomains.push(domain);
        return yield auth_1.updateAuthDomains(project, authDomains);
    });
}
exports.addAuthDomain = addAuthDomain;
function getCleanDomains(project, site) {
    return __awaiter(this, void 0, void 0, function* () {
        const channels = yield listChannels(project, site);
        const channelMap = channels
            .map((channel) => channel.url.replace("https://", ""))
            .reduce((acc, current) => {
            acc[current] = true;
            return acc;
        }, {});
        const siteMatch = new RegExp(`${site}--`, "i");
        const firebaseAppMatch = new RegExp(/firebaseapp.com$/);
        const domains = yield auth_1.getAuthDomains(project);
        const authDomains = [];
        domains.forEach((domain) => {
            const endsWithFirebaseApp = firebaseAppMatch.test(domain);
            if (endsWithFirebaseApp) {
                authDomains.push(domain);
                return;
            }
            const domainWithNoChannel = siteMatch.test(domain) && !channelMap[domain];
            if (domainWithNoChannel) {
                return;
            }
            authDomains.push(domain);
        });
        return authDomains;
    });
}
exports.getCleanDomains = getCleanDomains;
function cleanAuthState(project, site) {
    return __awaiter(this, void 0, void 0, function* () {
        const authDomains = yield getCleanDomains(project, site);
        return yield auth_1.updateAuthDomains(project, authDomains);
    });
}
exports.cleanAuthState = cleanAuthState;
