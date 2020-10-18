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
exports.createApp = void 0;
const express = require("express");
const exegesisExpress = require("exegesis-express");
const errors_1 = require("exegesis/lib/errors");
const _ = require("lodash");
const emulatorLogger_1 = require("../emulatorLogger");
const types_1 = require("../types");
const operations_1 = require("./operations");
const state_1 = require("./state");
const apiSpec_1 = require("./apiSpec");
const errors_2 = require("./errors");
const utils_1 = require("./utils");
const lodash_1 = require("lodash");
const handlers_1 = require("./handlers");
const apiSpec = apiSpec_1.default;
const API_SPEC_PATH = "/emulator/openapi.json";
const AUTH_HEADER_PREFIX = "bearer ";
const SERVICE_ACCOUNT_TOKEN_PREFIX = "ya29.";
function specForRouter() {
    const paths = {};
    Object.entries(apiSpec.paths).forEach(([path, pathObj]) => {
        var _a;
        const servers = (_a = pathObj.servers) !== null && _a !== void 0 ? _a : apiSpec.servers;
        if (!servers || !servers.length) {
            throw new Error("No servers defined in API spec.");
        }
        const pathWithNamespace = servers[0].url.replace("https://", "/") + path;
        paths[pathWithNamespace] = pathObj;
    });
    return Object.assign(Object.assign({}, apiSpec), { paths, servers: undefined, "x-exegesis-controller": "auth" });
}
function specWithEmulatorServer(protocol, host) {
    const paths = {};
    Object.entries(apiSpec.paths).forEach(([path, pathObj]) => {
        const servers = pathObj.servers;
        if (servers) {
            pathObj = Object.assign(Object.assign({}, pathObj), { servers: serversWithEmulators(servers) });
        }
        paths[path] = pathObj;
    });
    if (!apiSpec.servers) {
        throw new Error("No servers defined in API spec.");
    }
    return Object.assign(Object.assign({}, apiSpec), { servers: serversWithEmulators(apiSpec.servers), paths });
    function serversWithEmulators(servers) {
        const result = [];
        for (const server of servers) {
            result.push({
                url: server.url ? server.url.replace("https://", "{EMULATOR}/") : "{EMULATOR}",
                variables: {
                    EMULATOR: {
                        default: host ? `${protocol}://${host}` : "",
                        description: "The protocol, hostname, and port of Firebase Auth Emulator.",
                    },
                },
            });
            if (server.url) {
                result.push(server);
            }
        }
        return result;
    }
}
function createApp(defaultProjectId, projectStateForId = new Map()) {
    return __awaiter(this, void 0, void 0, function* () {
        const app = express();
        app.set("json spaces", 2);
        app.use((req, res, next) => {
            res.set("Access-Control-Allow-Origin", "*");
            res.set("Access-Control-Allow-Headers", "*");
            res.set("Access-Control-Allow-Methods", "GET, HEAD, POST, PUT, DELETE, OPTIONS, PATCH");
            if (req.method === "OPTIONS") {
                res.end();
            }
            else {
                next();
            }
        });
        app.get("/", (req, res) => {
            return res.json({
                authEmulator: {
                    ready: true,
                    docs: "https://firebase.google.com/docs/emulator-suite",
                    apiSpec: API_SPEC_PATH,
                },
            });
        });
        app.get(API_SPEC_PATH, (req, res) => {
            res.json(specWithEmulatorServer(req.protocol, req.headers.host));
        });
        registerLegacyRoutes(app);
        handlers_1.registerHandlers(app, (apiKey) => getProjectStateById(getProjectIdByApiKey(apiKey)));
        const apiKeyAuthenticator = (ctx, info) => {
            if (info.in !== "query") {
                throw new Error('apiKey must be defined as in: "query" in API spec.');
            }
            if (!info.name) {
                throw new Error("apiKey param name is undefined in API spec.");
            }
            const key = ctx.req.query[info.name];
            if (typeof key === "string" && key.length > 0) {
                return { type: "success", user: getProjectIdByApiKey(key) };
            }
            else {
                return undefined;
            }
        };
        const oauth2Authenticator = (ctx) => {
            const authorization = ctx.req.headers["authorization"];
            if (!authorization || !authorization.toLowerCase().startsWith(AUTH_HEADER_PREFIX)) {
                return undefined;
            }
            const scopes = Object.keys(ctx.api.openApiDoc.components.securitySchemes.Oauth2.flows.authorizationCode.scopes);
            const token = authorization.substr(AUTH_HEADER_PREFIX.length);
            if (token.toLowerCase() === "owner") {
                return { type: "success", user: defaultProjectId, scopes };
            }
            else if (token.startsWith(SERVICE_ACCOUNT_TOKEN_PREFIX)) {
                emulatorLogger_1.EmulatorLogger.forEmulator(types_1.Emulators.AUTH).log("WARN", `Received service account token ${token}. Assuming that it owns project "${defaultProjectId}".`);
                return { type: "success", user: defaultProjectId, scopes };
            }
            throw new errors_2.UnauthenticatedError("Request had invalid authentication credentials. Expected OAuth 2 access token, login cookie or other valid authentication credential. See https://developers.google.com/identity/sign-in/web/devconsole-project.", [
                {
                    message: "Invalid Credentials",
                    domain: "global",
                    reason: "authError",
                    location: "Authorization",
                    locationType: "header",
                },
            ]);
        };
        const apis = yield exegesisExpress.middleware(specForRouter(), {
            controllers: { auth: toExegesisController(operations_1.authOperations, getProjectStateById) },
            authenticators: {
                apiKey: apiKeyAuthenticator,
                Oauth2: oauth2Authenticator,
            },
            autoHandleHttpErrors(err) {
                if (err.type === "entity.parse.failed") {
                    const message = `Invalid JSON payload received. ${err.message}`;
                    err = new errors_2.InvalidArgumentError(message, [
                        {
                            message,
                            domain: "global",
                            reason: "parseError",
                        },
                    ]);
                }
                if (err instanceof errors_1.ValidationError) {
                    const firstError = err.errors[0];
                    let details;
                    if (firstError.location) {
                        details = `${firstError.location.path} ${firstError.message}`;
                    }
                    else {
                        details = firstError.message;
                    }
                    err = new errors_2.InvalidArgumentError(`Invalid JSON payload received. ${details}`);
                }
                if (err.name === "HttpBadRequestError") {
                    err = new errors_2.BadRequestError(err.message, "unknown");
                }
                throw err;
            },
            validateDefaultResponses: true,
            onResponseValidationError({ errors }) {
                utils_1.logError(new Error(`An internal error occured when generating response. Details:\n${JSON.stringify(errors)}`));
                throw new errors_2.InternalError("An internal error occured when generating response.", "emulator-response-validation");
            },
            customFormats: {
                "google-datetime"() {
                    return true;
                },
                "google-fieldmask"() {
                    return true;
                },
                uint64() {
                    return true;
                },
                uint32() {
                    return true;
                },
            },
            plugins: [
                {
                    info: { name: "test" },
                    makeExegesisPlugin() {
                        return {
                            postSecurity(pluginContext) {
                                wrapValidateBody(pluginContext);
                                return Promise.resolve();
                            },
                            postController(ctx) {
                                if (ctx.res.statusCode === 401) {
                                    const requirements = ctx.api.operationObject.security;
                                    if (requirements === null || requirements === void 0 ? void 0 : requirements.some((req) => req.apiKey)) {
                                        throw new errors_2.PermissionDeniedError("The request is missing a valid API key.");
                                    }
                                    else {
                                        throw new errors_2.UnauthenticatedError("Request is missing required authentication credential. Expected OAuth 2 access token, login cookie or other valid authentication credential. See https://developers.google.com/identity/sign-in/web/devconsole-project.", [
                                            {
                                                message: "Login Required.",
                                                domain: "global",
                                                reason: "required",
                                                location: "Authorization",
                                                locationType: "header",
                                            },
                                        ]);
                                    }
                                }
                            },
                        };
                    },
                },
            ],
        });
        app.use(apis);
        app.use(() => {
            throw new errors_2.NotFoundError();
        });
        app.use(((err, req, res, next) => {
            let apiError;
            if (err instanceof errors_2.ApiError) {
                apiError = err;
            }
            else if (!err.status || err.status === 500) {
                apiError = new errors_2.UnknownError(err.message || "Unknown error", err.name || "unknown");
            }
            else {
                return res.status(err.status).json(err);
            }
            if (apiError.code === 500) {
                utils_1.logError(err);
            }
            return res.status(apiError.code).json({ error: apiError });
        }));
        return app;
        function getProjectIdByApiKey(apiKey) {
            apiKey;
            return defaultProjectId;
        }
        function getProjectStateById(projectId) {
            let state = projectStateForId.get(projectId);
            if (!state) {
                state = new state_1.ProjectState(projectId);
                projectStateForId.set(projectId, state);
            }
            return state;
        }
    });
}
exports.createApp = createApp;
function registerLegacyRoutes(app) {
    const relyingPartyPrefix = "/www.googleapis.com/identitytoolkit/v3/relyingparty/";
    const v1Prefix = "/identitytoolkit.googleapis.com/v1/";
    for (const [oldPath, newPath] of [
        ["createAuthUri", "accounts:createAuthUri"],
        ["deleteAccount", "accounts:delete"],
        ["emailLinkSignin", "accounts:signInWithEmailLink"],
        ["getAccountInfo", "accounts:lookup"],
        ["getOobConfirmationCode", "accounts:sendOobCode"],
        ["getProjectConfig", "projects"],
        ["getRecaptchaParam", "recaptchaParams"],
        ["publicKeys", "publicKeys"],
        ["resetPassword", "accounts:resetPassword"],
        ["sendVerificationCode", "accounts:sendVerificationCode"],
        ["setAccountInfo", "accounts:update"],
        ["setProjectConfig", "setProjectConfig"],
        ["signupNewUser", "accounts:signUp"],
        ["verifyAssertion", "accounts:signInWithIdp"],
        ["verifyCustomToken", "accounts:signInWithCustomToken"],
        ["verifyPassword", "accounts:signInWithPassword"],
        ["verifyPhoneNumber", "accounts:signInWithPhoneNumber"],
    ]) {
        app.all(`${relyingPartyPrefix}${oldPath}`, (req, _, next) => {
            req.url = `${v1Prefix}${newPath}`;
            next();
        });
    }
    app.post(`${relyingPartyPrefix}signOutUser`, () => {
        throw new errors_2.NotImplementedError(`signOutUser is not implemented in the Auth Emulator.`);
    });
    app.post(`${relyingPartyPrefix}downloadAccount`, () => {
        throw new errors_2.NotImplementedError(`downloadAccount is not implemented in the Auth Emulator.`);
    });
    app.post(`${relyingPartyPrefix}uploadAccount`, () => {
        throw new errors_2.NotImplementedError(`uploadAccount is not implemented in the Auth Emulator.`);
    });
}
function toExegesisController(ops, getProjectStateById) {
    const result = {};
    processNested(ops, "");
    return new Proxy(result, {
        get: (obj, prop) => {
            if (typeof prop !== "string" || prop in obj) {
                return obj[prop];
            }
            const stub = () => {
                throw new errors_2.NotImplementedError(`${prop} is not implemented in the Auth Emulator.`);
            };
            return stub;
        },
    });
    function processNested(nested, prefix) {
        Object.entries(nested).forEach(([key, value]) => {
            if (typeof value === "function") {
                result[`${prefix}${key}`] = toExegesisOperation(value);
            }
            else {
                processNested(value, `${prefix}${key}.`);
                if (typeof value._ === "function") {
                    result[`${prefix}${key}`] = toExegesisOperation(value._);
                }
            }
        });
    }
    function toExegesisOperation(operation) {
        return (ctx) => {
            var _a, _b, _c, _d;
            let targetProjectId = ctx.params.path.targetProjectId || ((_a = ctx.requestBody) === null || _a === void 0 ? void 0 : _a.targetProjectId);
            if (targetProjectId) {
                if ((_b = ctx.api.operationObject.security) === null || _b === void 0 ? void 0 : _b.some((sec) => sec.Oauth2)) {
                    errors_2.assert((_c = ctx.security) === null || _c === void 0 ? void 0 : _c.Oauth2, "INSUFFICIENT_PERMISSION : Only authenticated requests can specify target_project_id.");
                }
            }
            else {
                targetProjectId = ctx.user;
            }
            if (ctx.params.path.tenantId || ((_d = ctx.requestBody) === null || _d === void 0 ? void 0 : _d.tenantId)) {
                throw new errors_2.NotImplementedError("Multi-tenancy is unimplemented.");
            }
            return operation(getProjectStateById(targetProjectId), ctx.requestBody, ctx);
        };
    }
}
function wrapValidateBody(pluginContext) {
    const op = pluginContext._operation;
    if (op.validateBody && !op._authEmulatorValidateBodyWrapped) {
        const validateBody = op.validateBody.bind(op);
        op.validateBody = (body) => {
            return validateAndFixRestMappingRequestBody(validateBody, body, pluginContext.api);
        };
        op._authEmulatorValidateBodyWrapped = true;
    }
}
function validateAndFixRestMappingRequestBody(validate, body, api) {
    var _a, _b, _c;
    body = convertKeysToCamelCase(body);
    let result;
    let fixedErrors = false;
    const fixedPaths = new Set();
    do {
        result = validate(body);
        if (!result.errors)
            return result;
        fixedErrors = false;
        for (const error of result.errors) {
            const path = (_a = error.location) === null || _a === void 0 ? void 0 : _a.path;
            if (path && !fixedPaths.has(path) && ((_b = error.ajvError) === null || _b === void 0 ? void 0 : _b.message) === "should be string") {
                let schema = api.requestBodyMediaTypeObject.schema;
                if (schema.$ref) {
                    schema = _.get(api.openApiDoc, jsonPointerToPath(schema.$ref));
                }
                const schemaPath = jsonPointerToPath(error.ajvError.schemaPath);
                if (schemaPath[0] === "properties" &&
                    schemaPath[1] === "value" &&
                    schemaPath[schemaPath.length - 1] === "type") {
                    const enumValues = (_c = _.get(schema, schemaPath.slice(2, schemaPath.length - 1))) === null || _c === void 0 ? void 0 : _c.enum;
                    if (Array.isArray(enumValues)) {
                        const dataPath = jsonPointerToPath(path);
                        const value = _.get(body, dataPath);
                        const normalizedValue = enumValues[value];
                        if (normalizedValue) {
                            _.set(body, dataPath, normalizedValue);
                            fixedPaths.add(path);
                            fixedErrors = true;
                        }
                    }
                }
            }
        }
    } while (fixedErrors);
    return result;
}
function convertKeysToCamelCase(body) {
    if (body == null || typeof body !== "object")
        return body;
    if (Array.isArray(body)) {
        return body.map(convertKeysToCamelCase);
    }
    const result = Object.create(null);
    for (const key of Object.keys(body)) {
        result[lodash_1.camelCase(key)] = convertKeysToCamelCase(body[key]);
    }
    return result;
}
function jsonPointerToPath(pointer) {
    const path = pointer.split("/").map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"));
    if (path[0] === "#" || path[0] === "") {
        path.shift();
    }
    return path;
}
