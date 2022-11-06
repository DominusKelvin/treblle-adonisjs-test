import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Config from '@ioc:Adonis/Core/Config'
import os from 'os'

function getRequestDuration(startTime) {
  const NS_PER_SEC = 1e9;
  const NS_TO_MICRO = 1e3;
  const diff = process.hrtime(startTime);

  const microseconds = (diff[0] * NS_PER_SEC + diff[1]) / NS_TO_MICRO;

  return Math.ceil(microseconds);
}

// interface TrebllePayload {
//   api_key: string;
//   product_id: string;
// }

export default class Treblle {
  public async handle({ request, response }: HttpContextContract, next: () => Promise<void>) {
    // code for middleware goes here. ABOVE THE NEXT CALL
    const requestStartTime = process.hrtime()
    const payload = request.all()
    const protocol = `${request.protocol()}/${request.request.httpVersion}`;
    const trebllePayload = {
      api_key: Config.get('treblle.apiKey'),
      project_id: Config.get('treblle.projectId'),
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
      showErrors: Config.get('treblle.showErrors')
    }

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
    await next()
  }
}
