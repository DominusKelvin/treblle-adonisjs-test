import Env from '@ioc:Adonis/Core/Env'

export const apiKey: string =  Env.get('TREBLLE_API_KEY');

export const projectId: string  = Env.get('TREBLLE_PROJECT_ID');

export const additionalFieldsToMask: string [] = ['key']

export const showErrors: boolean = true
