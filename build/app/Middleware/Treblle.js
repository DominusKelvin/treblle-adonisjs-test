"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Config_1 = __importDefault(global[Symbol.for('ioc.use')]("Adonis/Core/Config"));
const os_1 = __importDefault(require("os"));
function getRequestDuration(startTime) {
    const NS_PER_SEC = 1e9;
    const NS_TO_MICRO = 1e3;
    const diff = process.hrtime(startTime);
    const microseconds = (diff[0] * NS_PER_SEC + diff[1]) / NS_TO_MICRO;
    return Math.ceil(microseconds);
}
class Treblle {
    async handle({ request, response }, next) {
        const requestStartTime = process.hrtime();
        const payload = request.all();
        const protocol = `${request.protocol()}/${request.request.httpVersion}`;
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
                    body: payload,
                },
                response: {
                    headers: response.getHeaders(),
                    code: response.getStatus(),
                    size: response.getHeader('Content_Length'),
                    load_time: getRequestDuration(requestStartTime)
                },
                errors: []
            },
            showErrors: Config_1.default.get('treblle.showErrors')
        };
        fetch('https://rocknrolla.treblle.com', {
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