import { NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { uptash } from '@/utils/rate-limit'
import { headers } from 'next/headers'

import { createImagePart, DB_SCHEMA, getAIErrorResponse, prompts } from '@/utils/ai'

const ratelimit =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN ? uptash : false

export async function POST(req: Request) {
  if (
    process.env.NODE_ENV === 'development' &&
    (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === '')
  ) {
    return NextResponse.json(
      {
        data: undefined,
        message: 'Missing OPENAI_API_KEY – make sure to add it to your .env file.'
      },
      { status: 400 }
    )
  }

  if (process.env.NODE_ENV === 'production') {
    if (ratelimit) {
      const ip = (await headers()).get('x-forwarded-for') ?? 'local'

      const { success } = await ratelimit.limit(ip)
      if (!success) {
        return NextResponse.json(
          { message: 'You have reached your request limit for the day.' },
          { status: 429 }
        )
      }
    }
  }

  const { prompt: base64, databaseFormat } = await req.json()

  try {
    const result = await generateObject({
      model: openai.chat('gpt-4.1-mini'),
      schema: DB_SCHEMA,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompts[databaseFormat] as string
            },
            createImagePart(base64)
          ]
        }
      ],
      temperature: 0.2
    })

    return NextResponse.json({
      data: result.object.results
    })
  } catch (error) {
    const { name, status, headers, message } = getAIErrorResponse(error)
    return NextResponse.json({ name, status, headers, message }, { status })
  }
}
