"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSMS = void 0;
const secrets_1 = require("./secrets");
const { default: axios } = require('axios');
const sendSMS = async (request, response) => {
    const { recipient, message, sender } = request.body;
    console.log('[SMS] Validating request...');
    // Validate required fields
    if (!recipient) {
        console.log('[SMS] ❌ Validation failed: Missing recipient');
        return response.status(400).json({
            success: false,
            error: 'Validation error',
            message: 'Missing recipient field',
        });
    }
    if (!message) {
        console.log('[SMS] ❌ Validation failed: Missing message');
        return response.status(400).json({
            success: false,
            error: 'Validation error',
            message: 'Missing message field',
        });
    }
    console.log('[SMS] ✓ Validation passed');
    // Format phone numbers if needed (add validation here if necessary)
    const recipients = Array.isArray(recipient) ? recipient : [recipient];
    console.log('[SMS] Recipients:', recipients);
    console.log('[SMS] Message length:', message.length);
    console.log('[SMS] Sender:', sender || 'FLC Admin');
    const SECRETS = await (0, secrets_1.loadSecrets)();
    const sendMessage = {
        method: 'post',
        url: `https://api.mnotify.com/api/sms/quick?key=${SECRETS.MNOTIFY_KEY}`,
        headers: {
            'content-type': 'application/json',
        },
        data: {
            recipient: SECRETS.TEST_PHONE_NUMBER
                ? [SECRETS.TEST_PHONE_NUMBER, '0594760323']
                : recipients,
            sender: sender || 'FLC Admin',
            message,
            is_schedule: 'false',
            schedule_date: '',
        },
    };
    console.log('[SMS] Sending SMS via MNotify...');
    try {
        const res = await axios(sendMessage);
        console.log('[SMS] MNotify response code:', res.data.code);
        if (res.data.code === '2000') {
            console.log('[SMS] ✓ SMS sent successfully');
            return response.status(200).json({
                success: true,
                message: 'SMS sent successfully',
                data: res.data,
            });
        }
        // API returned an error code
        console.log('[SMS] ❌ MNotify error:', res.data.message);
        return response.status(502).json({
            success: false,
            error: 'SMS provider error',
            message: `Failed to send SMS: ${res.data.message || 'Unknown provider error'}`,
            data: res.data,
        });
    }
    catch (error) {
        console.error('[SMS] ❌ SMS send error:', error);
        // Handle network errors or other axios errors
        if (axios.isAxiosError(error)) {
            return response.status(502).json({
                success: false,
                error: 'SMS provider connection error',
                message: error instanceof Error
                    ? error.message
                    : 'Failed to connect to SMS provider',
                data: error.response?.data,
            });
        }
        // Handle other unexpected errors
        return response.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error instanceof Error
                ? error.message
                : 'Unknown error occurred while sending SMS',
        });
    }
};
exports.sendSMS = sendSMS;
exports.default = exports.sendSMS;
