import { MYSQL_PROMPT, PG_PROMPT, SQLITE_PROMPT } from '@/prompt'
import type { ImagePart } from 'ai'
import { z } from 'zod'

export const DB_SCHEMA = z.object({
  results: z.object({
    sqlSchema: z.string(),
    tables: z.array(
      z.object({
        name: z.string(),
        numberOfColumns: z.number()
      })
    )
  })
})

export const prompts: Record<string, string> = {
  mysql: MYSQL_PROMPT,
  postgresql: PG_PROMPT,
  sqlite: SQLITE_PROMPT
}

export const createImagePart = (image: string): ImagePart => {
  const mediaType = image.match(/^data:([^;,]+)[;,]/)?.[1]

  return {
    type: 'image',
    image,
    ...(mediaType ? { mediaType } : {})
  }
}

export const getAIErrorResponse = (error: unknown) => {
  if (!error || typeof error !== 'object') {
    return {
      name: 'UnknownError',
      status: 500,
      headers: undefined,
      message: 'An error has ocurred with API Completions. Please try again.'
    }
  }

  const httpError = error as {
    name?: unknown
    status?: unknown
    headers?: unknown
  }
  const status = typeof httpError.status === 'number' ? httpError.status : 500

  return {
    name: typeof httpError.name === 'string' ? httpError.name : 'AIError',
    status,
    headers: httpError.headers,
    message:
      status === 401
        ? 'The provided API Key is invalid. Please enter a valid API Key.'
        : 'An error has ocurred with API Completions. Please try again.'
  }
}
