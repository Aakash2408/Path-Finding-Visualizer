"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setAccountInfoImpl = exports.resetPassword = exports.CUSTOM_TOKEN_AUDIENCE = exports.authOperations = void 0;
const url_1 = require("url");
const jsonwebtoken_1 = require("jsonwebtoken");
const utils_1 = require("./utils");
const errors_1 = require("./errors");
const types_1 = require("../types");
const emulatorLogger_1 = require("../emulatorLogger");
const state_1 = require("./state");
exports.authOperations = {
    identitytoolkit: {
        getProjects,
        getRecaptchaParams,
        accounts: {
            createAuthUri,
            delete: deleteAccount,
            lookup,
            resetPassword,
            sendOobCode,
            sendVerificationCode,
            signInWithCustomToken,
            signInWithEmailLink,
            signInWithIdp,
            signInWithPassword,
            signInWithPhoneNumber,
            signUp,
            update: setAccountInfo,
        },
        projects: {
            queryAccounts,
            accounts: {
                _: signUp,
                delete: deleteAccount,
                lookup,
                query: queryAccounts,
                sendOobCode,
                update: setAccountInfo,
            },
        },
    },
    securetoken: {
        token: grantToken,
    },
    emulator: {
        projects: {
            accounts: {
                delete: deleteAllAccountsInProject,
            },
            config: {
                get: getEmulatorProjectConfig,
                update: updateEmulatorProjectConfig,
            },
            oobCodes: {
                list: listOobCodesInProject,
            },
            verificationCodes: {
                list: listVerificationCodesInProject,
            },
        },
    },
};
const PASSWORD_MIN_LENGTH = 6;
exports.CUSTOM_TOKEN_AUDIENCE = "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit";
function signUp(state, reqBody, ctx) {
    var _a;
    let provider;
    const updates = {
        lastLoginAt: Date.now().toString(),
    };
    if ((_a = ctx.security) === null || _a === void 0 ? void 0 : _a.Oauth2) {
        if (reqBody.idToken) {
            errors_1.assert(!reqBody.localId, "UNEXPECTED_PARAMETER : User ID");
        }
        updates.displayName = reqBody.displayName;
        updates.photoUrl = reqBody.photoUrl;
        updates.emailVerified = reqBody.emailVerified || false;
        if (reqBody.phoneNumber) {
            errors_1.assert(utils_1.isValidPhoneNumber(reqBody.phoneNumber), "INVALID_PHONE_NUMBER : Invalid format.");
            errors_1.assert(!state.getUserByPhoneNumber(reqBody.phoneNumber), "PHONE_NUMBER_EXISTS");
            updates.phoneNumber = reqBody.phoneNumber;
        }
        if (reqBody.disabled) {
            updates.disabled = true;
        }
    }
    else {
        errors_1.assert(!reqBody.localId, "UNEXPECTED_PARAMETER : User ID");
        if (reqBody.idToken || reqBody.password || reqBody.email) {
            updates.displayName = reqBody.displayName;
            updates.emailVerified = false;
            errors_1.assert(reqBody.email, "MISSING_EMAIL");
            errors_1.assert(reqBody.password, "MISSING_PASSWORD");
            provider = state_1.PROVIDER_PASSWORD;
        }
        else {
            provider = state_1.PROVIDER_ANONYMOUS;
        }
    }
    if (reqBody.email) {
        errors_1.assert(utils_1.isValidEmailAddress(reqBody.email), "INVALID_EMAIL");
        const email = utils_1.canonicalizeEmailAddress(reqBody.email);
        errors_1.assert(!state.getUserByEmail(email), "EMAIL_EXISTS");
        updates.email = email;
    }
    if (reqBody.password) {
        errors_1.assert(reqBody.password.length >= PASSWORD_MIN_LENGTH, `WEAK_PASSWORD : Password should be at least ${PASSWORD_MIN_LENGTH} characters`);
        updates.salt = "fakeSalt" + utils_1.randomId(20);
        updates.passwordHash = hashPassword(reqBody.password, updates.salt);
        updates.passwordUpdatedAt = Date.now();
        updates.validSince = utils_1.toUnixTimestamp(new Date()).toString();
    }
    let user;
    if (reqBody.idToken) {
        ({ user } = parseIdToken(state, reqBody.idToken));
    }
    if (!user) {
        if (reqBody.localId) {
            user = state.createUserWithLocalId(reqBody.localId, updates);
            errors_1.assert(user, "DUPLICATE_LOCAL_ID");
        }
        else {
            user = state.createUser(updates);
        }
    }
    else {
        user = state.updateUserByLocalId(user.localId, updates);
    }
    return Object.assign({ kind: "identitytoolkit#SignupNewUserResponse", localId: user.localId, displayName: user.displayName, email: user.email }, (provider ? issueTokens(state, user, provider) : {}));
}
function lookup(state, reqBody, ctx) {
    var _a;
    const users = [];
    if ((_a = ctx.security) === null || _a === void 0 ? void 0 : _a.Oauth2) {
        if (reqBody.initialEmail) {
            throw new errors_1.NotImplementedError("Lookup by initialEmail is not implemented.");
        }
        if (reqBody.localId) {
            for (const localId of reqBody.localId) {
                const maybeUser = state.getUserByLocalId(localId);
                if (maybeUser) {
                    users.push(maybeUser);
                }
            }
        }
        if (reqBody.email) {
            for (const email of reqBody.email) {
                const maybeUser = state.getUserByEmail(email);
                if (maybeUser) {
                    users.push(maybeUser);
                }
            }
        }
        if (reqBody.phoneNumber) {
            for (const phoneNumber of reqBody.phoneNumber) {
                const maybeUser = state.getUserByPhoneNumber(phoneNumber);
                if (maybeUser) {
                    users.push(maybeUser);
                }
            }
        }
        return {
            kind: "identitytoolkit#GetAccountInfoResponse",
            users,
        };
    }
    else {
        errors_1.assert(reqBody.idToken, "MISSING_ID_TOKEN");
        const { user } = parseIdToken(state, reqBody.idToken);
        users.push(redactPasswordHash(user));
    }
    return {
        kind: "identitytoolkit#GetAccountInfoResponse",
        users,
    };
}
function createAuthUri(state, reqBody) {
    var _a;
    const sessionId = reqBody.sessionId || utils_1.randomId(27);
    if (reqBody.providerId) {
        throw new errors_1.NotImplementedError("Sign-in with IDP is not yet supported.");
    }
    errors_1.assert(reqBody.identifier, "MISSING_IDENTIFIER");
    errors_1.assert(reqBody.continueUri, "MISSING_CONTINUE_URI");
    errors_1.assert(utils_1.isValidEmailAddress(reqBody.identifier), "INVALID_IDENTIFIER");
    const email = utils_1.canonicalizeEmailAddress(reqBody.identifier);
    errors_1.assert(utils_1.parseAbsoluteUri(reqBody.continueUri), "INVALID_CONTINUE_URI");
    const allProviders = [];
    const signinMethods = [];
    let registered = false;
    const users = state.getUsersByEmailOrProviderEmail(email);
    if (state.oneAccountPerEmail) {
        if (users.length) {
            registered = true;
            (_a = users[0].providerUserInfo) === null || _a === void 0 ? void 0 : _a.forEach(({ providerId }) => {
                if (providerId === state_1.PROVIDER_PASSWORD) {
                    allProviders.push(providerId);
                    if (users[0].passwordHash) {
                        signinMethods.push(state_1.PROVIDER_PASSWORD);
                    }
                    if (users[0].emailLinkSignin) {
                        signinMethods.push(state_1.SIGNIN_METHOD_EMAIL_LINK);
                    }
                }
                else if (providerId !== state_1.PROVIDER_PHONE) {
                    allProviders.push(providerId);
                    signinMethods.push(providerId);
                }
            });
        }
    }
    else {
        const user = users.find((u) => u.email);
        if (user) {
            registered = true;
            if (user.passwordHash || user.emailLinkSignin) {
                allProviders.push(state_1.PROVIDER_PASSWORD);
                if (users[0].passwordHash) {
                    signinMethods.push(state_1.PROVIDER_PASSWORD);
                }
                if (users[0].emailLinkSignin) {
                    signinMethods.push(state_1.SIGNIN_METHOD_EMAIL_LINK);
                }
            }
        }
    }
    return {
        kind: "identitytoolkit#CreateAuthUriResponse",
        registered,
        allProviders,
        sessionId,
        signinMethods,
    };
}
function deleteAccount(state, reqBody, ctx) {
    var _a;
    let user;
    if ((_a = ctx.security) === null || _a === void 0 ? void 0 : _a.Oauth2) {
        errors_1.assert(reqBody.localId, "MISSING_LOCAL_ID");
        const maybeUser = state.getUserByLocalId(reqBody.localId);
        errors_1.assert(maybeUser, "USER_NOT_FOUND");
        user = maybeUser;
    }
    else {
        errors_1.assert(reqBody.idToken, "MISSING_ID_TOKEN");
        user = parseIdToken(state, reqBody.idToken).user;
    }
    state.deleteUser(user);
    return {
        kind: "identitytoolkit#DeleteAccountResponse",
    };
}
function getProjects(state) {
    return {
        projectId: state.projectNumber,
        authorizedDomains: [
            "localhost",
        ],
    };
}
function getRecaptchaParams() {
    return {
        kind: "identitytoolkit#GetRecaptchaParamResponse",
        recaptchaStoken: "This-is-a-fake-token__Dont-send-this-to-the-Recaptcha-service__The-Auth-Emulator-does-not-support-Recaptcha",
        recaptchaSiteKey: "Fake-key__Do-not-send-this-to-Recaptcha_",
    };
}
function queryAccounts(state, reqBody) {
    var _a;
    if ((_a = reqBody.expression) === null || _a === void 0 ? void 0 : _a.length) {
        throw new errors_1.NotImplementedError("expression is not implemented.");
    }
    if (reqBody.returnUserInfo === false) {
        return {
            recordsCount: state.getUserCount().toString(),
        };
    }
    if (reqBody.limit) {
        throw new errors_1.NotImplementedError("limit is not implemented.");
    }
    reqBody.offset = reqBody.offset || "0";
    if (reqBody.offset !== "0") {
        throw new errors_1.NotImplementedError("offset is not implemented.");
    }
    if (!reqBody.order || reqBody.order === "ORDER_UNSPECIFIED") {
        reqBody.order = "ASC";
    }
    if (!reqBody.sortBy || reqBody.sortBy === "SORT_BY_FIELD_UNSPECIFIED") {
        reqBody.sortBy = "USER_ID";
    }
    let sortByField;
    if (reqBody.sortBy === "USER_ID") {
        sortByField = "localId";
    }
    else {
        throw new errors_1.NotImplementedError("Only sorting by USER_ID is implemented.");
    }
    const users = state.queryUsers({}, { order: reqBody.order, sortByField });
    return {
        recordsCount: users.length.toString(),
        userInfo: users,
    };
}
function resetPassword(state, reqBody) {
    var _a;
    errors_1.assert(reqBody.oobCode, "MISSING_OOB_CODE");
    const oob = state.validateOobCode(reqBody.oobCode);
    errors_1.assert(oob, "INVALID_OOB_CODE");
    if (reqBody.newPassword) {
        errors_1.assert(oob.requestType === "PASSWORD_RESET", "INVALID_OOB_CODE");
        errors_1.assert(reqBody.newPassword.length >= PASSWORD_MIN_LENGTH, `WEAK_PASSWORD : Password should be at least ${PASSWORD_MIN_LENGTH} characters`);
        state.deleteOobCode(reqBody.oobCode);
        const user = state.getUserByEmail(oob.email);
        errors_1.assert(user, "INVALID_OOB_CODE");
        const salt = "fakeSalt" + utils_1.randomId(20);
        const passwordHash = hashPassword(reqBody.newPassword, salt);
        state.updateUserByLocalId(user.localId, {
            emailVerified: true,
            passwordHash,
            salt,
            passwordUpdatedAt: Date.now(),
            validSince: utils_1.toUnixTimestamp(new Date()).toString(),
        }, { deleteProviders: (_a = user.providerUserInfo) === null || _a === void 0 ? void 0 : _a.map((info) => info.providerId) });
    }
    return {
        kind: "identitytoolkit#ResetPasswordResponse",
        requestType: oob.requestType,
        email: oob.requestType === "EMAIL_SIGNIN" ? undefined : oob.email,
    };
}
exports.resetPassword = resetPassword;
function sendOobCode(state, reqBody, ctx) {
    var _a;
    errors_1.assert(reqBody.requestType && reqBody.requestType !== "OOB_REQ_TYPE_UNSPECIFIED", "MISSING_REQ_TYPE");
    if (reqBody.returnOobLink) {
        errors_1.assert((_a = ctx.security) === null || _a === void 0 ? void 0 : _a.Oauth2, "INSUFFICIENT_PERMISSION");
    }
    if (reqBody.continueUrl) {
        errors_1.assert(utils_1.parseAbsoluteUri(reqBody.continueUrl), "INVALID_CONTINUE_URI: ((expected an absolute URI with valid scheme and host))");
    }
    let user;
    let email;
    let mode;
    switch (reqBody.requestType) {
        case "EMAIL_SIGNIN":
            mode = "signIn";
            errors_1.assert(reqBody.email, "MISSING_EMAIL");
            email = utils_1.canonicalizeEmailAddress(reqBody.email);
            break;
        case "PASSWORD_RESET":
            mode = "resetPassword";
            errors_1.assert(reqBody.email, "MISSING_EMAIL");
            email = utils_1.canonicalizeEmailAddress(reqBody.email);
            user = state.getUserByEmail(email);
            errors_1.assert(user, "EMAIL_NOT_FOUND");
            break;
        case "VERIFY_EMAIL":
            mode = "verifyEmail";
            user = parseIdToken(state, reqBody.idToken || "").user;
            errors_1.assert(user.email, "MISSING_EMAIL");
            email = user.email;
            break;
        default:
            throw new errors_1.NotImplementedError(reqBody.requestType);
    }
    if (reqBody.canHandleCodeInApp) {
        emulatorLogger_1.EmulatorLogger.forEmulator(types_1.Emulators.AUTH).log("WARN", "canHandleCodeInApp is unsupported in Auth Emulator. All OOB operations will complete via web.");
    }
    const { oobCode, oobLink } = state.createOob(email, reqBody.requestType, (oobCode) => {
        const url = utils_1.authEmulatorUrl(ctx.req);
        url.pathname = "/emulator/action";
        url.searchParams.set("mode", mode);
        url.searchParams.set("lang", "en");
        url.searchParams.set("oobCode", oobCode);
        url.searchParams.set("apiKey", "fake-api-key");
        if (reqBody.continueUrl) {
            url.searchParams.set("continueUrl", reqBody.continueUrl);
        }
        return url.toString();
    });
    if (reqBody.returnOobLink) {
        return {
            kind: "identitytoolkit#GetOobConfirmationCodeResponse",
            email,
            oobCode,
            oobLink,
        };
    }
    else {
        let message;
        switch (reqBody.requestType) {
            case "EMAIL_SIGNIN":
                message = `To sign in as ${email}, follow this link: ${oobLink}`;
                break;
            case "PASSWORD_RESET":
                message = `To reset the password for ${email}, follow this link: ${oobLink}&newPassword=NEW_PASSWORD_HERE`;
                break;
            case "VERIFY_EMAIL":
                message = `To verify the email address ${email}, follow this link: ${oobLink}`;
                break;
        }
        if (message) {
            emulatorLogger_1.EmulatorLogger.forEmulator(types_1.Emulators.AUTH).log("BULLET", message);
        }
        return {
            kind: "identitytoolkit#GetOobConfirmationCodeResponse",
            email,
        };
    }
}
function sendVerificationCode(state, reqBody) {
    errors_1.assert(reqBody.phoneNumber && utils_1.isValidPhoneNumber(reqBody.phoneNumber), "INVALID_PHONE_NUMBER : Invalid format.");
    const { sessionInfo, phoneNumber, code } = state.createVerificationCode(reqBody.phoneNumber);
    emulatorLogger_1.EmulatorLogger.forEmulator(types_1.Emulators.AUTH).log("BULLET", `To verify the phone number ${phoneNumber}, use the code ${code}.`);
    return {
        sessionInfo,
    };
}
function setAccountInfo(state, reqBody, ctx) {
    var _a;
    return setAccountInfoImpl(state, reqBody, { privileged: !!((_a = ctx.security) === null || _a === void 0 ? void 0 : _a.Oauth2) });
}
function setAccountInfoImpl(state, reqBody, { privileged = false } = {}) {
    var _a, _b;
    const unimplementedFields = [
        "provider",
        "upgradeToFederatedLogin",
        "captchaChallenge",
        "captchaResponse",
        "linkProviderUserInfo",
    ];
    for (const field of unimplementedFields) {
        if (field in reqBody) {
            throw new errors_1.NotImplementedError(`${field} is not implemented yet.`);
        }
    }
    if (!privileged) {
        errors_1.assert(reqBody.idToken || reqBody.oobCode, "INVALID_REQ_TYPE : Unsupported request parameters.");
        errors_1.assert(reqBody.customAttributes == null, "INSUFFICIENT_PERMISSION");
    }
    else {
        errors_1.assert(reqBody.localId, "MISSING_LOCAL_ID");
    }
    if (reqBody.customAttributes) {
        validateSerializedCustomClaims(reqBody.customAttributes);
    }
    reqBody.deleteAttribute = reqBody.deleteAttribute || [];
    for (const attr of reqBody.deleteAttribute) {
        if (attr === "PROVIDER" || attr === "RAW_USER_INFO") {
            throw new errors_1.NotImplementedError(`deleteAttribute: ${attr}`);
        }
    }
    const updates = {};
    let user;
    let signInProvider;
    if (reqBody.oobCode) {
        const oob = state.validateOobCode(reqBody.oobCode);
        errors_1.assert(oob, "INVALID_OOB_CODE");
        if (oob.requestType !== "VERIFY_EMAIL") {
            throw new errors_1.NotImplementedError(oob.requestType);
        }
        state.deleteOobCode(reqBody.oobCode);
        signInProvider = state_1.PROVIDER_PASSWORD;
        const maybeUser = state.getUserByEmail(oob.email);
        errors_1.assert(maybeUser, "INVALID_OOB_CODE");
        user = maybeUser;
        updates.emailVerified = true;
        if (oob.email !== user.email) {
            updates.email = oob.email;
        }
    }
    else {
        if (reqBody.idToken) {
            ({ user, signInProvider } = parseIdToken(state, reqBody.idToken));
            errors_1.assert(reqBody.disableUser == null, "OPERATION_NOT_ALLOWED");
        }
        else {
            errors_1.assert(reqBody.localId, "MISSING_LOCAL_ID");
            const maybeUser = state.getUserByLocalId(reqBody.localId);
            errors_1.assert(maybeUser, "USER_NOT_FOUND");
            user = maybeUser;
        }
        if (reqBody.email) {
            errors_1.assert(utils_1.isValidEmailAddress(reqBody.email), "INVALID_EMAIL");
            const newEmail = utils_1.canonicalizeEmailAddress(reqBody.email);
            if (newEmail !== user.email) {
                errors_1.assert(!state.getUserByEmail(newEmail), "EMAIL_EXISTS");
                updates.email = newEmail;
                updates.emailVerified = false;
            }
        }
        if (reqBody.password) {
            errors_1.assert(reqBody.password.length >= PASSWORD_MIN_LENGTH, `WEAK_PASSWORD : Password should be at least ${PASSWORD_MIN_LENGTH} characters`);
            updates.salt = "fakeSalt" + utils_1.randomId(20);
            updates.passwordHash = hashPassword(reqBody.password, updates.salt);
            updates.passwordUpdatedAt = Date.now();
            signInProvider = state_1.PROVIDER_PASSWORD;
        }
        if (reqBody.password || reqBody.validSince || updates.email) {
            updates.validSince = utils_1.toUnixTimestamp(new Date()).toString();
        }
        const fieldsToCopy = [
            "displayName",
            "photoUrl",
        ];
        if (privileged) {
            if (reqBody.disableUser != null) {
                updates.disabled = reqBody.disableUser;
            }
            if (reqBody.phoneNumber && reqBody.phoneNumber !== user.phoneNumber) {
                errors_1.assert(utils_1.isValidPhoneNumber(reqBody.phoneNumber), "INVALID_PHONE_NUMBER : Invalid format.");
                errors_1.assert(!state.getUserByPhoneNumber(reqBody.phoneNumber), "PHONE_NUMBER_EXISTS");
            }
            fieldsToCopy.push("emailVerified", "customAttributes", "createdAt", "lastLoginAt", "validSince");
        }
        for (const field of fieldsToCopy) {
            if (reqBody[field] != null) {
                utils_1.mirrorFieldTo(updates, field, reqBody);
            }
        }
        for (const attr of reqBody.deleteAttribute) {
            switch (attr) {
                case "USER_ATTRIBUTE_NAME_UNSPECIFIED":
                    continue;
                case "DISPLAY_NAME":
                    updates.displayName = undefined;
                    break;
                case "PHOTO_URL":
                    updates.photoUrl = undefined;
                    break;
                case "PASSWORD":
                    updates.passwordHash = undefined;
                    updates.salt = undefined;
                    break;
                case "EMAIL":
                    updates.email = undefined;
                    updates.emailVerified = undefined;
                    updates.emailLinkSignin = undefined;
                    break;
            }
        }
        if ((_a = reqBody.deleteProvider) === null || _a === void 0 ? void 0 : _a.includes(state_1.PROVIDER_PASSWORD)) {
            updates.email = undefined;
            updates.emailVerified = undefined;
            updates.emailLinkSignin = undefined;
            updates.passwordHash = undefined;
            updates.salt = undefined;
        }
        if ((_b = reqBody.deleteProvider) === null || _b === void 0 ? void 0 : _b.includes(state_1.PROVIDER_PHONE)) {
            updates.phoneNumber = undefined;
        }
    }
    user = state.updateUserByLocalId(user.localId, updates, {
        deleteProviders: reqBody.deleteProvider,
    });
    return redactPasswordHash(Object.assign({ kind: "identitytoolkit#SetAccountInfoResponse", localId: user.localId, emailVerified: user.emailVerified, providerUserInfo: user.providerUserInfo, email: user.email, displayName: user.displayName, photoUrl: user.photoUrl, passwordHash: user.passwordHash }, (updates.validSince && signInProvider ? issueTokens(state, user, signInProvider) : {})));
}
exports.setAccountInfoImpl = setAccountInfoImpl;
function signInWithCustomToken(state, reqBody) {
    var _a;
    errors_1.assert(reqBody.token, "MISSING_CUSTOM_TOKEN");
    let payload;
    if (reqBody.token.startsWith("{")) {
        try {
            payload = JSON.parse(reqBody.token);
        }
        catch (_b) {
            throw new errors_1.BadRequestError("INVALID_CUSTOM_TOKEN : ((Auth Emulator only accepts strict JSON or JWTs as fake custom tokens.))");
        }
    }
    else {
        const decoded = jsonwebtoken_1.decode(reqBody.token, { complete: true });
        errors_1.assert(decoded, "INVALID_CUSTOM_TOKEN : Invalid assertion format");
        if (decoded.header.alg !== "none") {
            emulatorLogger_1.EmulatorLogger.forEmulator(types_1.Emulators.AUTH).log("WARN", "Received a signed custom token. Auth Emulator does not validate JWTs and IS NOT SECURE");
        }
        errors_1.assert(decoded.payload.aud === exports.CUSTOM_TOKEN_AUDIENCE, `INVALID_CUSTOM_TOKEN : ((Invalid aud (audience): ${decoded.payload.aud} ` +
            "Note: Firebase ID Tokens / third-party tokens cannot be used with signInWithCustomToken.))");
        payload = decoded.payload;
    }
    const localId = (_a = coercePrimitiveToString(payload.uid)) !== null && _a !== void 0 ? _a : coercePrimitiveToString(payload.user_id);
    errors_1.assert(localId, "MISSING_IDENTIFIER");
    let claims = {};
    if ("claims" in payload) {
        validateCustomClaims(payload.claims);
        claims = payload.claims;
    }
    let user = state.getUserByLocalId(localId);
    const isNewUser = !user;
    const updates = {
        customAuth: true,
        lastLoginAt: Date.now().toString(),
    };
    if (user) {
        user = state.updateUserByLocalId(localId, updates);
    }
    else {
        user = state.createUserWithLocalId(localId, updates);
        if (!user) {
            throw new Error(`Internal assertion error: trying to create duplicate localId: ${localId}`);
        }
    }
    return Object.assign({ kind: "identitytoolkit#VerifyCustomTokenResponse", isNewUser }, issueTokens(state, user, state_1.PROVIDER_CUSTOM, claims));
}
function signInWithEmailLink(state, reqBody) {
    const userFromIdToken = reqBody.idToken ? parseIdToken(state, reqBody.idToken).user : undefined;
    errors_1.assert(reqBody.email, "MISSING_EMAIL");
    const email = utils_1.canonicalizeEmailAddress(reqBody.email);
    errors_1.assert(reqBody.oobCode, "MISSING_OOB_CODE");
    const oob = state.validateOobCode(reqBody.oobCode);
    errors_1.assert(oob && oob.requestType === "EMAIL_SIGNIN", "INVALID_OOB_CODE");
    errors_1.assert(email === oob.email, "INVALID_EMAIL : The email provided does not match the sign-in email address.");
    state.deleteOobCode(reqBody.oobCode);
    const updates = {
        email,
        emailVerified: true,
        emailLinkSignin: true,
        lastLoginAt: Date.now().toString(),
    };
    let user = state.getUserByEmail(email);
    const isNewUser = !user && !userFromIdToken;
    if (!user) {
        if (userFromIdToken) {
            user = state.updateUserByLocalId(userFromIdToken.localId, updates);
        }
        else {
            user = state.createUser(updates);
        }
    }
    else {
        errors_1.assert(!userFromIdToken || userFromIdToken.localId === user.localId, "EMAIL_EXISTS");
        user = state.updateUserByLocalId(user.localId, updates);
    }
    const tokens = issueTokens(state, user, state_1.PROVIDER_PASSWORD);
    return Object.assign({ kind: "identitytoolkit#EmailLinkSigninResponse", email, localId: user.localId, isNewUser }, tokens);
}
function signInWithIdp(state, reqBody) {
    var _a;
    if (reqBody.returnRefreshToken) {
        throw new errors_1.NotImplementedError("returnRefreshToken is not implemented yet.");
    }
    if (reqBody.pendingIdToken) {
        throw new errors_1.NotImplementedError("pendingIdToken is not implemented yet.");
    }
    const normalizedUri = getNormalizedUri(reqBody);
    const providerId = (_a = normalizedUri.searchParams.get("providerId")) === null || _a === void 0 ? void 0 : _a.toLowerCase();
    errors_1.assert(providerId, `INVALID_CREDENTIAL_OR_PROVIDER_ID : Invalid IdP response/credential: ${normalizedUri.toString()}`);
    const oauthIdToken = normalizedUri.searchParams.get("id_token") || undefined;
    const oauthAccessToken = normalizedUri.searchParams.get("access_token") || undefined;
    const claims = parseClaims(oauthIdToken) || parseClaims(oauthAccessToken);
    if (!claims) {
        if (oauthIdToken) {
            throw new errors_1.BadRequestError(`INVALID_IDP_RESPONSE : Unable to parse id_token: ${oauthIdToken} ((Auth Emulator only accepts strict JSON or JWTs as fake id_tokens.))`);
        }
        else if (oauthAccessToken) {
            if (providerId === "google.com" || providerId === "apple.com") {
                throw new errors_1.NotImplementedError(`The Auth Emulator only support sign-in with ${providerId} using id_token, not access_token. Please update your code to use id_token.`);
            }
            else {
                throw new errors_1.NotImplementedError(`The Auth Emulator does not support ${providerId} sign-in with credentials.`);
            }
        }
        else {
            throw new errors_1.NotImplementedError("The Auth Emulator only supports sign-in with credentials (id_token required).");
        }
    }
    let { response, rawId } = fakeFetchUserInfoFromIdp(providerId, claims);
    response.oauthAccessToken = oauthAccessToken;
    response.oauthIdToken = oauthIdToken;
    const userFromIdToken = reqBody.idToken ? parseIdToken(state, reqBody.idToken).user : undefined;
    const userMatchingProvider = state.getUserByProviderRawId(providerId, rawId);
    let accountUpdates;
    try {
        if (userFromIdToken) {
            errors_1.assert(!userMatchingProvider, "FEDERATED_USER_ID_ALREADY_LINKED");
            ({ accountUpdates, response } = handleLinkIdp(state, response, userFromIdToken));
        }
        else if (state.oneAccountPerEmail) {
            const userMatchingEmail = response.email ? state.getUserByEmail(response.email) : undefined;
            ({ accountUpdates, response } = handleIdpSigninEmailRequired(response, rawId, userMatchingProvider, userMatchingEmail));
        }
        else {
            ({ accountUpdates, response } = handleIdpSigninEmailNotRequired(response, userMatchingProvider));
        }
    }
    catch (err) {
        if (reqBody.returnIdpCredential && err instanceof errors_1.BadRequestError) {
            response.errorMessage = err.message;
            return response;
        }
        else {
            throw err;
        }
    }
    if (response.needConfirmation) {
        return response;
    }
    const providerUserInfo = {
        providerId,
        rawId,
        federatedId: rawId,
        displayName: response.displayName,
        photoUrl: response.photoUrl,
        email: response.email,
        screenName: response.screenName,
    };
    let user;
    if (response.isNewUser) {
        user = state.createUser(Object.assign(Object.assign({}, accountUpdates.fields), { lastLoginAt: Date.now().toString(), providerUserInfo: [providerUserInfo] }));
        response.localId = user.localId;
    }
    else {
        if (!response.localId) {
            throw new Error("Internal assertion error: localId not set for exising user.");
        }
        user = state.updateUserByLocalId(response.localId, Object.assign(Object.assign({}, accountUpdates.fields), { lastLoginAt: Date.now().toString() }), {
            upsertProviders: [providerUserInfo],
        });
    }
    if (user.email === response.email) {
        response.emailVerified = user.emailVerified;
    }
    Object.assign(response, issueTokens(state, user, providerId));
    return response;
}
function signInWithPassword(state, reqBody) {
    errors_1.assert(reqBody.email, "MISSING_EMAIL");
    errors_1.assert(reqBody.password, "MISSING_PASSWORD");
    if (reqBody.captchaResponse || reqBody.captchaChallenge) {
        throw new errors_1.NotImplementedError("captcha unimplemented");
    }
    if (reqBody.idToken || reqBody.pendingIdToken) {
        throw new errors_1.NotImplementedError("idToken / pendingIdToken is no longer in use and unsupported by the Auth Emulator.");
    }
    const email = utils_1.canonicalizeEmailAddress(reqBody.email);
    const user = state.getUserByEmail(email);
    errors_1.assert(user, "EMAIL_NOT_FOUND");
    errors_1.assert(user.passwordHash && user.salt, "INVALID_PASSWORD");
    errors_1.assert(user.passwordHash === hashPassword(reqBody.password, user.salt), "INVALID_PASSWORD");
    const tokens = issueTokens(state, user, state_1.PROVIDER_PASSWORD);
    return Object.assign({ kind: "identitytoolkit#VerifyPasswordResponse", registered: true, localId: user.localId, email, displayName: user.displayName, profilePicture: user.photoUrl }, tokens);
}
function signInWithPhoneNumber(state, reqBody) {
    let phoneNumber;
    if (reqBody.temporaryProof) {
        errors_1.assert(reqBody.phoneNumber, "MISSING_PHONE_NUMBER");
        const proof = state.validateTemporaryProof(reqBody.temporaryProof, reqBody.phoneNumber);
        errors_1.assert(proof, "INVALID_TEMPORARY_PROOF");
        ({ phoneNumber } = proof);
    }
    else {
        errors_1.assert(reqBody.sessionInfo, "MISSING_SESSION_INFO");
        errors_1.assert(reqBody.code, "MISSING_CODE");
        phoneNumber = verifyPhoneNumber(state, reqBody.sessionInfo, reqBody.code);
    }
    let user = state.getUserByPhoneNumber(phoneNumber);
    let isNewUser = false;
    const updates = {
        phoneNumber,
        lastLoginAt: Date.now().toString(),
    };
    try {
        const userFromIdToken = reqBody.idToken ? parseIdToken(state, reqBody.idToken).user : undefined;
        if (!user) {
            if (userFromIdToken) {
                user = state.updateUserByLocalId(userFromIdToken.localId, updates);
            }
            else {
                isNewUser = true;
                user = state.createUser(updates);
            }
        }
        else {
            errors_1.assert(!userFromIdToken || userFromIdToken.localId === user.localId, "PHONE_NUMBER_EXISTS");
            user = state.updateUserByLocalId(user.localId, updates);
        }
    }
    catch (err) {
        if (reqBody.temporaryProof || !(err instanceof errors_1.BadRequestError)) {
            throw err;
        }
        return Object.assign({}, state.createTemporaryProof(phoneNumber));
    }
    const tokens = issueTokens(state, user, state_1.PROVIDER_PHONE);
    return Object.assign({ isNewUser,
        phoneNumber, localId: user.localId }, tokens);
}
function grantToken(state, reqBody) {
    errors_1.assert(reqBody.grantType, "MISSING_GRANT_TYPE");
    errors_1.assert(reqBody.grantType === "refresh_token", "INVALID_GRANT_TYPE");
    errors_1.assert(reqBody.refreshToken, "MISSING_REFRESH_TOKEN");
    const refreshTokenRecord = state.validateRefreshToken(reqBody.refreshToken);
    errors_1.assert(refreshTokenRecord, "INVALID_REFRESH_TOKEN");
    const tokens = issueTokens(state, refreshTokenRecord.user, refreshTokenRecord.provider, refreshTokenRecord.extraClaims);
    return {
        id_token: tokens.idToken,
        access_token: tokens.idToken,
        expires_in: tokens.expiresIn,
        refresh_token: tokens.refreshToken,
        token_type: "Bearer",
        user_id: refreshTokenRecord.user.localId,
        project_id: state.projectNumber,
    };
}
function deleteAllAccountsInProject(state) {
    state.deleteAllAccounts();
    return {};
}
function getEmulatorProjectConfig(state) {
    return {
        signIn: {
            allowDuplicateEmails: !state.oneAccountPerEmail,
        },
    };
}
function updateEmulatorProjectConfig(state, reqBody) {
    var _a;
    const allowDuplicateEmails = (_a = reqBody.signIn) === null || _a === void 0 ? void 0 : _a.allowDuplicateEmails;
    if (allowDuplicateEmails != null) {
        state.oneAccountPerEmail = !allowDuplicateEmails;
    }
    return getEmulatorProjectConfig(state);
}
function listOobCodesInProject(state) {
    return {
        oobCodes: [...state.listOobCodes()],
    };
}
function listVerificationCodesInProject(state) {
    return {
        verificationCodes: [...state.listVerificationCodes()],
    };
}
function coercePrimitiveToString(value) {
    switch (typeof value) {
        case "string":
            return value;
        case "number":
        case "boolean":
            return value.toString();
        default:
            return undefined;
    }
}
function redactPasswordHash(user) {
    return user;
}
function hashPassword(password, salt) {
    return `fakeHash:salt=${salt}:password=${password}`;
}
function issueTokens(state, user, signInProvider, extraClaims = {}) {
    const expiresInSeconds = 60 * 60;
    const idToken = generateJwt(state.projectId, user, signInProvider, expiresInSeconds, extraClaims);
    const refreshToken = state.createRefreshTokenFor(user, signInProvider, extraClaims);
    return {
        idToken,
        refreshToken,
        expiresIn: expiresInSeconds.toString(),
    };
}
function parseIdToken(state, idToken) {
    const decoded = jsonwebtoken_1.decode(idToken, { complete: true });
    errors_1.assert(decoded, "INVALID_ID_TOKEN");
    if (decoded.header.alg !== "none") {
        emulatorLogger_1.EmulatorLogger.forEmulator(types_1.Emulators.AUTH).log("WARN", "Received a signed JWT. Auth Emulator does not validate JWTs and IS NOT SECURE");
    }
    const user = state.getUserByLocalId(decoded.payload.user_id);
    errors_1.assert(user, "USER_NOT_FOUND");
    errors_1.assert(!user.validSince || decoded.payload.iat >= parseInt(user.validSince), "TOKEN_EXPIRED");
    const signInProvider = decoded.payload.firebase.sign_in_provider;
    return { user, signInProvider };
}
function generateJwt(projectId, user, signInProvider, expiresInSeconds, extraClaims = {}) {
    const identities = {};
    if (user.email) {
        identities["email"] = [user.email];
    }
    if (user.providerUserInfo) {
        for (const providerInfo of user.providerUserInfo) {
            if (providerInfo.providerId &&
                providerInfo.providerId !== state_1.PROVIDER_PASSWORD &&
                providerInfo.rawId) {
                const ids = identities[providerInfo.providerId] || [];
                ids.push(providerInfo.rawId);
                identities[providerInfo.providerId] = ids;
            }
        }
    }
    const customAttributes = JSON.parse(user.customAttributes || "{}");
    const customPayloadFields = Object.assign(Object.assign(Object.assign({ name: user.displayName, picture: user.photoUrl }, customAttributes), extraClaims), { email: user.email, email_verified: user.emailVerified, phone_number: user.phoneNumber, provider_id: signInProvider === "anonymous" ? signInProvider : undefined, auth_time: utils_1.toUnixTimestamp(new Date()), user_id: user.localId, firebase: {
            identities,
            sign_in_provider: signInProvider,
        } });
    const jwtStr = jsonwebtoken_1.sign(customPayloadFields, "", {
        algorithm: "none",
        expiresIn: expiresInSeconds,
        subject: user.localId,
        issuer: `https://securetoken.google.com/${projectId}`,
        audience: projectId,
    });
    return jwtStr;
}
function verifyPhoneNumber(state, sessionInfo, code) {
    const verification = state.getVerificationCodeBySessionInfo(sessionInfo);
    errors_1.assert(verification, "INVALID_SESSION_INFO");
    errors_1.assert(verification.code === code, "INVALID_CODE");
    state.deleteVerificationCodeBySessionInfo(sessionInfo);
    return verification.phoneNumber;
}
const CUSTOM_ATTRIBUTES_MAX_LENGTH = 1000;
function validateSerializedCustomClaims(claims) {
    errors_1.assert(claims.length <= CUSTOM_ATTRIBUTES_MAX_LENGTH, "CLAIMS_TOO_LARGE");
    let parsed;
    try {
        parsed = JSON.parse(claims);
    }
    catch (_a) {
        throw new errors_1.BadRequestError("INVALID_CLAIMS");
    }
    validateCustomClaims(parsed);
}
const FORBIDDEN_CUSTOM_CLAIMS = [
    "iss",
    "aud",
    "sub",
    "iat",
    "exp",
    "nbf",
    "jti",
    "nonce",
    "azp",
    "acr",
    "amr",
    "cnf",
    "auth_time",
    "firebase",
    "at_hash",
    "c_hash",
];
function validateCustomClaims(claims) {
    errors_1.assert(typeof claims === "object" && claims != null && !Array.isArray(claims), "INVALID_CLAIMS");
    for (const reservedField of FORBIDDEN_CUSTOM_CLAIMS) {
        errors_1.assert(!(reservedField in claims), `FORBIDDEN_CLAIM : ${reservedField}`);
    }
}
function getNormalizedUri(reqBody) {
    errors_1.assert(reqBody.requestUri, "MISSING_REQUEST_URI");
    const normalizedUri = utils_1.parseAbsoluteUri(reqBody.requestUri);
    errors_1.assert(normalizedUri, "INVALID_REQUEST_URI");
    if (reqBody.postBody) {
        const postBodyParams = new url_1.URLSearchParams(reqBody.postBody);
        for (const key of postBodyParams.keys()) {
            normalizedUri.searchParams.set(key, postBodyParams.get(key));
        }
    }
    const fragment = normalizedUri.hash.replace(/^#/, "");
    if (fragment) {
        const fragmentParams = new url_1.URLSearchParams(fragment);
        for (const key of fragmentParams.keys()) {
            normalizedUri.searchParams.set(key, fragmentParams.get(key));
        }
        normalizedUri.hash = "";
    }
    return normalizedUri;
}
function parseClaims(idTokenOrJsonClaims) {
    if (!idTokenOrJsonClaims) {
        return undefined;
    }
    let claims;
    if (idTokenOrJsonClaims.startsWith("{")) {
        try {
            claims = JSON.parse(idTokenOrJsonClaims);
        }
        catch (_a) {
            throw new errors_1.BadRequestError(`INVALID_IDP_RESPONSE : Unable to parse id_token: ${idTokenOrJsonClaims} ((Auth Emulator failed to parse fake id_token as strict JSON.))`);
        }
    }
    else {
        const decoded = jsonwebtoken_1.decode(idTokenOrJsonClaims, { json: true });
        if (!decoded) {
            return undefined;
        }
        claims = decoded;
    }
    errors_1.assert(claims.sub, 'INVALID_IDP_RESPONSE : Invalid Idp Response: id_token missing required fields. ((Missing "sub" field. This field is required and must be a unique identifier.))');
    errors_1.assert(typeof claims.sub === "string", 'INVALID_IDP_RESPONSE : ((The "sub" field must be a string.))');
    return claims;
}
function fakeFetchUserInfoFromIdp(providerId, claims) {
    const rawId = claims.sub;
    const email = claims.email ? utils_1.canonicalizeEmailAddress(claims.email) : undefined;
    const emailVerified = !!claims.email_verified;
    const displayName = claims.name;
    const photoUrl = claims.picture;
    const response = {
        kind: "identitytoolkit#VerifyAssertionResponse",
        context: "",
        providerId,
        displayName,
        fullName: displayName,
        screenName: claims.screen_name,
        email,
        emailVerified,
        photoUrl,
    };
    let federatedId;
    switch (providerId) {
        case "google.com": {
            federatedId = `https://accounts.google.com/${rawId}`;
            let granted_scopes = "openid https://www.googleapis.com/auth/userinfo.profile";
            if (email) {
                granted_scopes += " https://www.googleapis.com/auth/userinfo.email";
            }
            response.firstName = claims.given_name;
            response.lastName = claims.family_name;
            response.rawUserInfo = JSON.stringify({
                granted_scopes,
                id: rawId,
                name: displayName,
                given_name: claims.given_name,
                family_name: claims.family_name,
                verified_email: emailVerified,
                locale: "en",
                email,
                picture: photoUrl,
            });
            break;
        }
        default:
            federatedId = rawId;
            response.rawUserInfo = JSON.stringify(claims);
            break;
    }
    response.federatedId = federatedId;
    return { response, rawId };
}
function handleLinkIdp(state, response, userFromIdToken) {
    if (state.oneAccountPerEmail && response.email) {
        const userMatchingEmail = state.getUserByEmail(response.email);
        errors_1.assert(!userMatchingEmail || userMatchingEmail.localId === userFromIdToken.localId, "EMAIL_EXISTS");
    }
    response.localId = userFromIdToken.localId;
    const fields = {};
    if (state.oneAccountPerEmail && response.email && !userFromIdToken.email) {
        fields.email = response.email;
        fields.emailVerified = response.emailVerified;
    }
    if (response.email &&
        response.emailVerified &&
        (fields.email || userFromIdToken.email) === response.email) {
        fields.emailVerified = true;
    }
    return { accountUpdates: { fields }, response };
}
function handleIdpSigninEmailNotRequired(response, userMatchingProvider) {
    if (userMatchingProvider) {
        return {
            response: Object.assign(Object.assign({}, response), { localId: userMatchingProvider.localId }),
            accountUpdates: {},
        };
    }
    else {
        return handleIdpSignUp(response, { emailRequired: false });
    }
}
function handleIdpSigninEmailRequired(response, rawId, userMatchingProvider, userMatchingEmail) {
    var _a, _b, _c;
    if (userMatchingProvider) {
        return {
            response: Object.assign(Object.assign({}, response), { localId: userMatchingProvider.localId }),
            accountUpdates: {},
        };
    }
    else if (userMatchingEmail) {
        if (response.emailVerified) {
            if ((_a = userMatchingEmail.providerUserInfo) === null || _a === void 0 ? void 0 : _a.some((info) => info.providerId === response.providerId && info.rawId !== rawId)) {
                response.emailRecycled = true;
            }
            response.localId = userMatchingEmail.localId;
            const accountUpdates = {
                fields: {},
            };
            if (!userMatchingEmail.emailVerified) {
                accountUpdates.fields.passwordHash = undefined;
                accountUpdates.fields.phoneNumber = undefined;
                accountUpdates.fields.validSince = utils_1.toUnixTimestamp(new Date()).toString();
                accountUpdates.deleteProviders = (_b = userMatchingEmail.providerUserInfo) === null || _b === void 0 ? void 0 : _b.map((info) => info.providerId);
            }
            accountUpdates.fields.dateOfBirth = response.dateOfBirth;
            accountUpdates.fields.displayName = response.displayName;
            accountUpdates.fields.language = response.language;
            accountUpdates.fields.photoUrl = response.photoUrl;
            accountUpdates.fields.screenName = response.screenName;
            accountUpdates.fields.emailVerified = true;
            return { response, accountUpdates };
        }
        else {
            response.needConfirmation = true;
            response.localId = userMatchingEmail.localId;
            response.verifiedProvider = (_c = userMatchingEmail.providerUserInfo) === null || _c === void 0 ? void 0 : _c.map((info) => info.providerId).filter((id) => id !== state_1.PROVIDER_PASSWORD && id !== state_1.PROVIDER_PHONE);
            return { response, accountUpdates: {} };
        }
    }
    else {
        return handleIdpSignUp(response, { emailRequired: true });
    }
}
function handleIdpSignUp(response, options) {
    const accountUpdates = {
        fields: {
            dateOfBirth: response.dateOfBirth,
            displayName: response.displayName,
            language: response.language,
            photoUrl: response.photoUrl,
            screenName: response.screenName,
        },
    };
    if (options.emailRequired && response.email) {
        accountUpdates.fields.email = response.email;
        accountUpdates.fields.emailVerified = response.emailVerified;
    }
    return {
        response: Object.assign(Object.assign({}, response), { isNewUser: true }),
        accountUpdates,
    };
}
