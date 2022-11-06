"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Config_1 = __importDefault(global[Symbol.for('ioc.use')]("Adonis/Core/Config"));
const os_1 = __importDefault(require("os"));
const node_fetch_1 = __importDefault(require("node-fetch"));
function getRequestDuration(startTime) {
    const NS_PER_SEC = 1e9;
    const NS_TO_MICRO = 1e3;
    const diff = process.hrtime(startTime);
    const microseconds = (diff[0] * NS_PER_SEC + diff[1]) / NS_TO_MICRO;
    return Math.ceil(microseconds);
}
const fieldsToMask = [
    "password",
    "pwd",
    "secret",
    "password_confirmation",
    "passwordConfirmation",
    "cc",
    "card_number",
    "cardNumber",
    "ccv",
    "ssn",
    "credit_score",
    "creditScore",
];
function generateFieldsToMask(additionalFieldsToMask = []) {
    const fields = [...fieldsToMask, ...additionalFieldsToMask];
    const fieldsMap = fields.reduce((acc, field) => {
        acc[field] = true;
        return acc;
    }, {});
    return fieldsMap;
}
function maskSensitiveValues(payloadObject, fieldsToMaskMap) {
    if (typeof payloadObject === null)
        return null;
    if (typeof payloadObject !== "object")
        return payloadObject;
    if (Array.isArray(payloadObject)) {
        return payloadObject.map((val) => maskSensitiveValues(val, fieldsToMaskMap));
    }
    let objectToMask = { ...payloadObject };
    let safeObject = Object.keys(objectToMask).reduce(function (acc, propName) {
        if (typeof objectToMask[propName] === "string") {
            if (fieldsToMaskMap[propName] === true) {
                acc[propName] = "*".repeat(objectToMask[propName].length);
            }
            else {
                acc[propName] = objectToMask[propName];
            }
        }
        else if (Array.isArray(objectToMask[propName])) {
            acc[propName] = objectToMask[propName].map((val) => maskSensitiveValues(val, fieldsToMaskMap));
        }
        else if (typeof objectToMask[propName] === "object") {
            acc[propName] = maskSensitiveValues(objectToMask[propName], fieldsToMaskMap);
        }
        else {
            acc[propName] = objectToMask[propName];
        }
        return acc;
    }, {});
    return safeObject;
}
class Treblle {
    async handle({ request, response }, next) {
        const requestStartTime = process.hrtime();
        const payload = request.all();
        const protocol = `${request.protocol()}/${request.request.httpVersion}`;
        const fieldsToMask = generateFieldsToMask(Config_1.default.get('treblle.additionalFieldsToMask'));
        const maskedRequestPayload = maskSensitiveValues(payload, fieldsToMask);
        let errors = [];
        const trebllePayload = {
            api_key: Config_1.default.get('treblle.apiKey'),
            project_id: Config_1.default.get('treblle.projectId'),
            sdk: "adonisjs",
            data: {
                server: {
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    os: {
                        name: os_1.default.platform(),
                        release: os_1.default.release(),
                        architecture: os_1.default.arch()
                    },
                    software: null,
                    signature: null,
                    protocol,
                },
                language: {
                    name: 'node',
                    version: process.version
                },
                request: {
                    timestamp: new Date().toISOString().replace("T", " ").substr(0, 19),
                    ip: request.ip(),
                    url: request.completeUrl(),
                    user_agent: request.header('user-agent'),
                    method: request.method(),
                    headers: request.headers(),
                    body: maskedRequestPayload,
                },
                response: {
                    headers: response.getHeaders(),
                    code: response.getStatus(),
                    size: response.getHeader('Content_Length'),
                    load_time: getRequestDuration(requestStartTime)
                },
                errors
            },
            showErrors: Config_1.default.get('treblle.showErrors')
        };
        (0, node_fetch_1.default)('https://rocknrolla.treblle.com', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': Config_1.default.get('treblle.apiKey')
            },
            body: JSON.stringify(trebllePayload)
        }).then(res => res.json())
            .then(data => console.log(data));
        await next();
    }
}
exports.default = Treblle;
//# sourceMappingURL=Treblle.js.map