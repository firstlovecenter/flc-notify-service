import { Resend } from 'resend'
import { Response, Request } from 'express'
import { validateRequest } from './utils'
import { loadSecrets } from './secrets'

export const sendEmail = async (
  request: Request<any, any, any>,
  response: Response
) => {
  const SECRETS = await loadSecrets()
  const resend = new Resend(SECRETS.RESEND_API_KEY)

  const { from, to, text, html, subject, replyTo } = request.body

  // Validate required fields
  const invalidReq = validateRequest(request.body, ['from', 'to'])
  if (invalidReq) {
    return response.status(400).json({
      success: false,
      error: 'Validation error',
      message: invalidReq,
    })
  }

  // Validate content requirements
  if (!subject) {
    return response.status(400).json({
      success: false,
      error: 'Validation error',
      message: 'You must provide a subject',
    })
  }

  if (!text && !html) {
    return response.status(400).json({
      success: false,
      error: 'Validation error',
      message: 'You must provide either body text or HTML content',
    })
  }

  try {
    const res = await resend.emails.send({
      from: from || 'FL Accra Admin <no-reply@firstlovecenter.org>',
      to: to || 'test@email.com',
      subject,
      ...(text && { text }),
      ...(html && { html }),
      ...(replyTo && { replyTo }),
    })

    if (res.data && res.data.id) {
      return response.status(200).json({
        success: true,
        message: 'Email sent successfully',
        data: { id: res.data.id },
      })
    }

    // Handle errors from Resend
    if (res.error) {
      return response.status(502).json({
        success: false,
        error: 'Email provider error',
        message: res.error.message || 'Failed to send email',
      })
    }

    // For unexpected response formats
    return response.status(502).json({
      success: false,
      error: 'Email provider error',
      message: 'Unexpected response from email provider',
      data: res,
    })
  } catch (error) {
    console.error('Email sending error details:', error)

    // Handle specific errors
    if (error instanceof Error) {
      return response.status(500).json({
        success: false,
        error: 'Email delivery failed',
        message: error.message,
      })
    }

    // Fallback for unknown error types
    return response.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unknown error occurred while sending email',
    })
  }
}

export default sendEmail
