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

  const { from, to, text, html, subject, replyTo, attachments } = request.body

  console.log('[EMAIL] Validating request...')

  // Validate required fields
  const invalidReq = validateRequest(request.body, ['from', 'to'])
  if (invalidReq) {
    console.log('[EMAIL] ❌ Validation failed:', invalidReq)
    return response.status(400).json({
      success: false,
      error: 'Validation error',
      message: invalidReq,
    })
  }

  console.log('[EMAIL] ✓ Required fields present (from, to)')

  // Validate content requirements
  if (!subject) {
    console.log('[EMAIL] ❌ Validation failed: Missing subject')
    return response.status(400).json({
      success: false,
      error: 'Validation error',
      message: 'You must provide a subject',
    })
  }

  if (!text && !html) {
    console.log('[EMAIL] ❌ Validation failed: Missing text or html content')
    return response.status(400).json({
      success: false,
      error: 'Validation error',
      message: 'You must provide either body text or HTML content',
    })
  }

  console.log('[EMAIL] ✓ Validation passed')
  console.log('[EMAIL] Sending email:', {
    from: from || 'FL Accra Admin<no-reply@updates.firstlovecenter.com>',
    to: to || 'test@email.com',
    subject,
    hasText: !!text,
    hasHtml: !!html,
    hasReplyTo: !!replyTo,
    attachmentCount: attachments?.length || 0,
  })

  try {
    const emailConfig: any = {
      from: from || 'FL Accra Admin<no-reply@updates.firstlovecenter.com>',
      to: to || 'test@email.com',
      subject,
      ...(text && { text }),
      ...(html && { html }),
      ...(replyTo && { replyTo }),
    }

    // Add attachments if provided
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      // Validate and process attachments
      const processedAttachments = attachments.map((attachment: any) => {
        if (!attachment.filename || !attachment.content) {
          throw new Error('Each attachment must have filename and content')
        }
        return {
          filename: attachment.filename,
          content: attachment.content, // Should be base64 encoded string
        }
      })
      emailConfig.attachments = processedAttachments
      console.log(
        '[EMAIL] Attachments included:',
        processedAttachments.map((a) => a.filename)
      )
    }

    const res = await resend.emails.send(emailConfig)

    if (res.data && res.data.id) {
      console.log('[EMAIL] ✓ Email sent successfully. ID:', res.data.id)
      return response.status(200).json({
        success: true,
        message: 'Email sent successfully',
        data: { id: res.data.id },
      })
    }

    // Handle errors from Resend
    if (res.error) {
      console.log('[EMAIL] ❌ Resend error:', res.error.message)
      return response.status(502).json({
        success: false,
        error: 'Email provider error',
        message: res.error.message || 'Failed to send email',
      })
    }

    // For unexpected response formats
    console.log('[EMAIL] ❌ Unexpected response:', res)
    return response.status(502).json({
      success: false,
      error: 'Email provider error',
      message: 'Unexpected response from email provider',
      data: res,
    })
  } catch (error) {
    console.error('[EMAIL] ❌ Email sending error:', error)

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
