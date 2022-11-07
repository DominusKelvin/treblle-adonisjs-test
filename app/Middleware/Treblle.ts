import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Config from '@ioc:Adonis/Core/Config'
import os from 'os'
import fetch from 'node-fetch'

function getRequestDuration(startTime) : number {
  const NS_PER_SEC = 1e9;
  const NS_TO_MICRO = 1e3;
  const diff = process.hrtime(startTime);

  const microseconds = (diff[0] * NS_PER_SEC + diff[1]) / NS_TO_MICRO;

  return Math.ceil(microseconds);
}


function generateFieldsToMask(additionalFieldsToMask = []) {
  const defaultFieldsToMask = [
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
  const fields = [...defaultFieldsToMask, ...additionalFieldsToMask];
  const fieldsToMask = fields.reduce((acc, field) => {
    acc[field] = true;
    return acc;
  }, {});
  return fieldsToMask;
}

function maskSensitiveValues(payload, fieldsToMask) {
  if (typeof payload === null) return null;
  if (typeof payload !== "object") return payload;
  if (Array.isArray(payload)) {
    return payload.map((val) =>
      maskSensitiveValues(val, fieldsToMask)
    );
  }

  let objectToMask = { ...payload };

  let safeObject = Object.keys(objectToMask).reduce(function (acc, propName) {
    if (typeof objectToMask[propName] === "string") {
      if (fieldsToMask[propName] === true) {
        acc[propName] = "*".repeat(objectToMask[propName].length);
      } else {
        acc[propName] = objectToMask[propName];
      }
    } else if (Array.isArray(objectToMask[propName])) {
      acc[propName] = objectToMask[propName].map((val) =>
        maskSensitiveValues(val, fieldsToMask)
      );
    } else if (typeof objectToMask[propName] === "object") {
      acc[propName] = maskSensitiveValues(
        objectToMask[propName],
        fieldsToMask
      );
    } else {
      acc[propName] = objectToMask[propName];
    }

    return acc;
  }, {});

  return safeObject;
}

export default class Treblle {
  public async handle({ request, response }: HttpContextContract, next: () => Promise<void>) {
    let originalResponseBody
    const originalSend = response.send
    response.send = function sendOverWrite(body) {
      originalSend.call(this, body)
      originalResponseBody = body
      // console.log(this.__treblle_body_response)
    }
    // code for middleware goes here. ABOVE THE NEXT CALL
    const requestStartTime = process.hrtime()
    const payload = request.all()
    const protocol = `${request.protocol()}/${request.request.httpVersion}`;
    const fieldsToMask = generateFieldsToMask(Config.get('treblle.additionalFieldsToMask'))
    const maskedRequestPayload = maskSensitiveValues(payload, fieldsToMask)
    let errors = []

    response.response.on('finish', function() {

      const maskedResponseBody = maskSensitiveValues(
        originalResponseBody,
        fieldsToMask
      );

      const trebllePayload = {
        api_key: Config.get('treblle.apiKey'),
        project_id: Config.get('treblle.projectId'),
        version: '0.0.1',
        sdk: "adonisjs",
        data: {
          server: {
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            os: {
              name: os.platform(),
              release: os.release(),
              architecture: os.arch()
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
            size: response.getHeader('Content-Length'),
            load_time: getRequestDuration(requestStartTime),
            body: maskedResponseBody ?? null
          },
          errors
        },
        showErrors: Config.get('treblle.showErrors')
      }

      // console.log(JSON.stringify(trebllePayload,null,2))

      // @ts-ignore
      fetch('https://rocknrolla.treblle.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': Config.get('treblle.apiKey')
        },
        body: JSON.stringify(trebllePayload)
      }).then(res => res.json())
      .then(data => console.log(data))
    })

    await next()
  }
}
