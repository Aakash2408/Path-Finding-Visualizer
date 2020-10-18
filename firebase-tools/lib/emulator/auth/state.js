"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectState = exports.SIGNIN_METHOD_EMAIL_LINK = exports.PROVIDER_CUSTOM = exports.PROVIDER_ANONYMOUS = exports.PROVIDER_PHONE = exports.PROVIDER_PASSWORD = void 0;
const utils_1 = require("./utils");
const cloudFunctions_1 = require("./cloudFunctions");
exports.PROVIDER_PASSWORD = "password";
exports.PROVIDER_PHONE = "phone";
exports.PROVIDER_ANONYMOUS = "anonymous";
exports.PROVIDER_CUSTOM = "custom";
exports.SIGNIN_METHOD_EMAIL_LINK = "emailLink";
class ProjectState {
    constructor(projectId) {
        this.projectId = projectId;
        this.users = new Map();
        this.localIdForEmail = new Map();
        this.localIdForPhoneNumber = new Map();
        this.localIdsForProviderEmail = new Map();
        this.userIdForProviderRawId = new Map();
        this.refreshTokens = new Map();
        this.refreshTokensForLocalId = new Map();
        this.oobs = new Map();
        this.verificationCodes = new Map();
        this.temporaryProofs = new Map();
        this.oneAccountPerEmail = true;
        this.authCloudFunction = new cloudFunctions_1.AuthCloudFunction(projectId);
    }
    get projectNumber() {
        return "12345";
    }
    createUser(props) {
        for (let i = 0; i < 10; i++) {
            const localId = utils_1.randomId(28);
            const user = this.createUserWithLocalId(localId, props);
            if (user) {
                return user;
            }
        }
        throw new Error("Cannot generate a random unique localId after 10 tries.");
    }
    createUserWithLocalId(localId, props) {
        if (this.users.has(localId)) {
            return undefined;
        }
        const timestamp = new Date();
        this.users.set(localId, {
            localId,
            createdAt: timestamp.getTime().toString(),
            lastLoginAt: timestamp.getTime().toString(),
        });
        const user = this.updateUserByLocalId(localId, props, {
            upsertProviders: props.providerUserInfo,
        });
        this.authCloudFunction.dispatch("create", user);
        return user;
    }
    deleteUser(user) {
        var _a, _b;
        this.users.delete(user.localId);
        if (user.email) {
            this.localIdForEmail.delete(user.email);
        }
        if (user.phoneNumber) {
            this.localIdForPhoneNumber.delete(user.phoneNumber);
        }
        const refreshTokens = this.refreshTokensForLocalId.get(user.localId);
        if (refreshTokens) {
            this.refreshTokensForLocalId.delete(user.localId);
            for (const refreshToken of refreshTokens) {
                this.refreshTokens.delete(refreshToken);
            }
        }
        for (const info of (_a = user.providerUserInfo) !== null && _a !== void 0 ? _a : []) {
            (_b = this.userIdForProviderRawId.get(info.providerId)) === null || _b === void 0 ? void 0 : _b.delete(info.rawId);
            if (info.email) {
                this.removeProviderEmailForUser(info.email, user.localId);
            }
        }
        this.authCloudFunction.dispatch("delete", user);
    }
    updateUserByLocalId(localId, fields, options = {}) {
        var _a, _b;
        const upsertProviders = (_a = options.upsertProviders) !== null && _a !== void 0 ? _a : [];
        const deleteProviders = (_b = options.deleteProviders) !== null && _b !== void 0 ? _b : [];
        const user = this.users.get(localId);
        if (!user) {
            throw new Error(`Internal assertion error: trying to update nonexistent user: ${localId}`);
        }
        const oldEmail = user.email;
        const oldPhoneNumber = user.phoneNumber;
        for (const field of Object.keys(fields)) {
            utils_1.mirrorFieldTo(user, field, fields);
        }
        if (oldEmail && oldEmail !== user.email) {
            this.localIdForEmail.delete(oldEmail);
        }
        if (user.email) {
            this.localIdForEmail.set(user.email, user.localId);
        }
        if (user.email && (user.passwordHash || user.emailLinkSignin)) {
            upsertProviders.push({
                providerId: exports.PROVIDER_PASSWORD,
                email: user.email,
                federatedId: user.email,
                rawId: user.email,
                displayName: user.displayName,
                photoUrl: user.photoUrl,
            });
        }
        else {
            deleteProviders.push(exports.PROVIDER_PASSWORD);
        }
        if (oldPhoneNumber && oldPhoneNumber !== user.phoneNumber) {
            this.localIdForPhoneNumber.delete(oldPhoneNumber);
        }
        if (user.phoneNumber) {
            this.localIdForPhoneNumber.set(user.phoneNumber, user.localId);
            upsertProviders.push({
                providerId: exports.PROVIDER_PHONE,
                federatedId: user.phoneNumber,
                rawId: user.phoneNumber,
            });
        }
        else {
            deleteProviders.push(exports.PROVIDER_PHONE);
        }
        return this.updateUserProviderInfo(user, upsertProviders, deleteProviders);
    }
    updateUserProviderInfo(user, upsertProviders, deleteProviders) {
        var _a, _b;
        const oldProviderEmails = getProviderEmailsForUser(user);
        if (user.providerUserInfo) {
            const updatedProviderUserInfo = [];
            for (const info of user.providerUserInfo) {
                if (deleteProviders.includes(info.providerId)) {
                    (_a = this.userIdForProviderRawId.get(info.providerId)) === null || _a === void 0 ? void 0 : _a.delete(info.rawId);
                }
                else {
                    updatedProviderUserInfo.push(info);
                }
            }
            user.providerUserInfo = updatedProviderUserInfo;
        }
        if (upsertProviders.length) {
            user.providerUserInfo = (_b = user.providerUserInfo) !== null && _b !== void 0 ? _b : [];
            for (const upsert of upsertProviders) {
                const providerId = upsert.providerId;
                let users = this.userIdForProviderRawId.get(providerId);
                if (!users) {
                    users = new Map();
                    this.userIdForProviderRawId.set(providerId, users);
                }
                users.set(upsert.rawId, user.localId);
                const index = user.providerUserInfo.findIndex((info) => info.providerId === upsert.providerId);
                if (index < 0) {
                    user.providerUserInfo.push(upsert);
                }
                else {
                    user.providerUserInfo[index] = upsert;
                }
            }
        }
        for (const email of getProviderEmailsForUser(user)) {
            oldProviderEmails.delete(email);
            let localIds = this.localIdsForProviderEmail.get(email);
            if (!localIds) {
                localIds = new Set();
                this.localIdsForProviderEmail.set(email, localIds);
            }
            localIds.add(user.localId);
        }
        for (const oldEmail of oldProviderEmails) {
            this.removeProviderEmailForUser(oldEmail, user.localId);
        }
        return user;
    }
    getUserByEmail(email) {
        const localId = this.localIdForEmail.get(email);
        if (!localId) {
            return undefined;
        }
        return this.getUserByLocalIdAssertingExists(localId);
    }
    getUserByLocalIdAssertingExists(localId) {
        const userInfo = this.getUserByLocalId(localId);
        if (!userInfo) {
            throw new Error(`Internal state invariant broken: no user with ID: ${localId}`);
        }
        return userInfo;
    }
    getUsersByEmailOrProviderEmail(email) {
        var _a;
        const users = [];
        const seenLocalIds = new Set();
        const localId = this.localIdForEmail.get(email);
        if (localId) {
            users.push(this.getUserByLocalIdAssertingExists(localId));
            seenLocalIds.add(localId);
        }
        for (const localId of (_a = this.localIdsForProviderEmail.get(email)) !== null && _a !== void 0 ? _a : []) {
            if (!seenLocalIds.has(localId)) {
                users.push(this.getUserByLocalIdAssertingExists(localId));
                seenLocalIds.add(localId);
            }
        }
        return users;
    }
    getUserByPhoneNumber(phoneNumber) {
        const localId = this.localIdForPhoneNumber.get(phoneNumber);
        if (!localId) {
            return undefined;
        }
        return this.getUserByLocalIdAssertingExists(localId);
    }
    removeProviderEmailForUser(email, localId) {
        const localIds = this.localIdsForProviderEmail.get(email);
        if (!localIds) {
            return;
        }
        localIds.delete(localId);
        if (localIds.size === 0) {
            this.localIdsForProviderEmail.delete(email);
        }
    }
    getUserByProviderRawId(provider, rawId) {
        var _a;
        const localId = (_a = this.userIdForProviderRawId.get(provider)) === null || _a === void 0 ? void 0 : _a.get(rawId);
        if (!localId) {
            return undefined;
        }
        return this.getUserByLocalIdAssertingExists(localId);
    }
    listProviderInfosByProviderId(provider) {
        var _a;
        const users = this.userIdForProviderRawId.get(provider);
        if (!users) {
            return [];
        }
        const infos = [];
        for (const localId of users.values()) {
            const user = this.getUserByLocalIdAssertingExists(localId);
            const info = (_a = user.providerUserInfo) === null || _a === void 0 ? void 0 : _a.find((info) => info.providerId === provider);
            if (!info) {
                throw new Error(`Internal assertion error: User ${localId} does not have providerInfo ${provider}.`);
            }
            infos.push(info);
        }
        return infos;
    }
    getUserByLocalId(localId) {
        return this.users.get(localId);
    }
    createRefreshTokenFor(userInfo, provider, extraClaims = {}) {
        const localId = userInfo.localId;
        const refreshToken = utils_1.randomBase64UrlStr(204);
        this.refreshTokens.set(refreshToken, { localId, provider, extraClaims });
        let refreshTokens = this.refreshTokensForLocalId.get(localId);
        if (!refreshTokens) {
            refreshTokens = new Set();
            this.refreshTokensForLocalId.set(localId, refreshTokens);
        }
        refreshTokens.add(refreshToken);
        return refreshToken;
    }
    validateRefreshToken(refreshToken) {
        const record = this.refreshTokens.get(refreshToken);
        if (!record) {
            return undefined;
        }
        return {
            user: this.getUserByLocalIdAssertingExists(record.localId),
            provider: record.provider,
            extraClaims: record.extraClaims,
        };
    }
    createOob(email, requestType, generateLink) {
        const oobCode = utils_1.randomBase64UrlStr(54);
        const oobLink = generateLink(oobCode);
        const oob = {
            email,
            requestType,
            oobCode,
            oobLink,
        };
        this.oobs.set(oobCode, oob);
        return oob;
    }
    validateOobCode(oobCode) {
        return this.oobs.get(oobCode);
    }
    deleteOobCode(oobCode) {
        return this.oobs.delete(oobCode);
    }
    listOobCodes() {
        return this.oobs.values();
    }
    createVerificationCode(phoneNumber) {
        const sessionInfo = utils_1.randomBase64UrlStr(226);
        const verification = {
            code: utils_1.randomDigits(6),
            phoneNumber,
            sessionInfo,
        };
        this.verificationCodes.set(sessionInfo, verification);
        return verification;
    }
    getVerificationCodeBySessionInfo(sessionInfo) {
        return this.verificationCodes.get(sessionInfo);
    }
    deleteVerificationCodeBySessionInfo(sessionInfo) {
        return this.verificationCodes.delete(sessionInfo);
    }
    listVerificationCodes() {
        return this.verificationCodes.values();
    }
    deleteAllAccounts() {
        this.users.clear();
        this.localIdForEmail.clear();
        this.localIdForPhoneNumber.clear();
        this.localIdsForProviderEmail.clear();
        this.userIdForProviderRawId.clear();
        this.refreshTokens.clear();
        this.refreshTokensForLocalId.clear();
    }
    getUserCount() {
        return this.users.size;
    }
    queryUsers(filter, sort) {
        const users = [];
        for (const user of this.users.values()) {
            filter;
            users.push(user);
        }
        users.sort((a, b) => {
            if (sort.sortByField === "localId") {
                if (a.localId < b.localId) {
                    return -1;
                }
                else if (a.localId > b.localId) {
                    return 1;
                }
            }
            return 0;
        });
        return sort.order === "DESC" ? users.reverse() : users;
    }
    createTemporaryProof(phoneNumber) {
        const record = {
            phoneNumber,
            temporaryProof: utils_1.randomBase64UrlStr(119),
            temporaryProofExpiresIn: "3600",
        };
        this.temporaryProofs.set(record.temporaryProof, record);
        return record;
    }
    validateTemporaryProof(temporaryProof, phoneNumber) {
        const record = this.temporaryProofs.get(temporaryProof);
        if (!record || record.phoneNumber !== phoneNumber) {
            return undefined;
        }
        return record;
    }
}
exports.ProjectState = ProjectState;
function getProviderEmailsForUser(user) {
    var _a;
    const emails = new Set();
    (_a = user.providerUserInfo) === null || _a === void 0 ? void 0 : _a.forEach(({ email }) => {
        if (email) {
            emails.add(email);
        }
    });
    return emails;
}
