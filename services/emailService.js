import nodemailer from 'nodemailer';

export class EmailService {
    /**
     * Get email transporter based on configuration
     * @returns {nodemailer.Transporter}
     */
    static getTransporter() {
        const emailService = process.env.EMAIL_SERVICE || 'smtp';

        if (emailService === 'sendgrid') {
            // SendGrid SMTP configuration
            return nodemailer.createTransport({
                host: 'smtp.sendgrid.net',
                port: 587,
                secure: false,
                auth: {
                    user: 'apikey',
                    pass: process.env.SENDGRID_API_KEY
                }
            });
        } else if (emailService === 'gmail') {
            // Gmail SMTP configuration
            return nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });
        } else {
            // Generic SMTP configuration
            return nodemailer.createTransport({
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: parseInt(process.env.SMTP_PORT) || 587,
                secure: false,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });
        }
    }

    /**
     * Send OTP email for password reset
     * @param {string} email - Recipient email
     * @param {string} otp - OTP code
     * @param {string} fullname - User's full name (optional)
     */
    static async sendOTPEmail(email, otp, fullname = 'User') {
        try {
            const transporter = this.getTransporter();
            
            const mailOptions = {
                from: `"${process.env.EMAIL_FROM_NAME || 'IntervAI Support'}" <${process.env.EMAIL_FROM || 'noreply@intervai.com'}>`,
                to: email,
                subject: 'Password Reset OTP - IntervAI',
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <style>
                            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                            .otp-box { background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
                            .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; }
                            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
                            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1>🔐 Password Reset Request</h1>
                            </div>
                            <div class="content">
                                <p>Hello ${fullname},</p>
                                <p>We received a request to reset your password for your IntervAI account.</p>
                                
                                <div class="otp-box">
                                    <p style="margin: 0; font-size: 14px; color: #666;">Your OTP Code:</p>
                                    <div class="otp-code">${otp}</div>
                                    <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">Valid for 10 minutes</p>
                                </div>

                                <p>Enter this code on the password reset page to continue.</p>

                                <div class="warning">
                                    <strong>⚠️ Security Notice:</strong>
                                    <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                                        <li>Never share this OTP with anyone</li>
                                        <li>IntervAI staff will never ask for your OTP</li>
                                        <li>This code expires in 10 minutes</li>
                                    </ul>
                                </div>

                                <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>

                                <p>Best regards,<br><strong>IntervAI Team</strong></p>
                            </div>
                            <div class="footer">
                                <p>This is an automated email. Please do not reply.</p>
                                <p>&copy; ${new Date().getFullYear()} IntervAI. All rights reserved.</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `,
                text: `
Hello ${fullname},

We received a request to reset your password for your IntervAI account.

Your OTP Code: ${otp}
(Valid for 10 minutes)

Enter this code on the password reset page to continue.

Security Notice:
- Never share this OTP with anyone
- IntervAI staff will never ask for your OTP
- This code expires in 10 minutes

If you didn't request a password reset, please ignore this email.

Best regards,
IntervAI Team
                `
            };

            const info = await transporter.sendMail(mailOptions);
            console.log(`[Email] OTP sent to ${email}, MessageID: ${info.messageId}`);
            return true;
        } catch (error) {
            console.error('[Email Send Error]', error);
            throw new Error('Failed to send email');
        }
    }

    /**
     * Send password change confirmation email
     * @param {string} email - Recipient email
     * @param {string} fullname - User's full name
     */
    static async sendPasswordChangeConfirmation(email, fullname = 'User') {
        try {
            const transporter = this.getTransporter();
            
            const mailOptions = {
                from: `"${process.env.EMAIL_FROM_NAME || 'IntervAI Support'}" <${process.env.EMAIL_FROM || 'noreply@intervai.com'}>`,
                to: email,
                subject: 'Password Changed Successfully - IntervAI',
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <style>
                            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                            .header { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                            .success-box { background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; }
                            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
                            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1>✅ Password Changed Successfully</h1>
                            </div>
                            <div class="content">
                                <p>Hello ${fullname},</p>
                                
                                <div class="success-box">
                                    <strong>Your password has been changed successfully!</strong>
                                </div>

                                <p>This email confirms that your IntervAI account password was recently changed.</p>

                                <p><strong>Change Details:</strong></p>
                                <ul>
                                    <li>Date: ${new Date().toLocaleString()}</li>
                                    <li>Account: ${email}</li>
                                </ul>

                                <div class="warning">
                                    <strong>⚠️ Didn't make this change?</strong><br>
                                    If you didn't change your password, please contact our support team immediately at support@intervai.com
                                </div>

                                <p>You can now log in to your account using your new password.</p>

                                <p>Best regards,<br><strong>IntervAI Team</strong></p>
                            </div>
                            <div class="footer">
                                <p>This is an automated email. Please do not reply.</p>
                                <p>&copy; ${new Date().getFullYear()} IntervAI. All rights reserved.</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `,
                text: `
Hello ${fullname},

Your password has been changed successfully!

This email confirms that your IntervAI account password was recently changed.

Change Details:
- Date: ${new Date().toLocaleString()}
- Account: ${email}

Didn't make this change?
If you didn't change your password, please contact our support team immediately at support@intervai.com

You can now log in to your account using your new password.

Best regards,
IntervAI Team
                `
            };

            const info = await transporter.sendMail(mailOptions);
            console.log(`[Email] Password change confirmation sent to ${email}, MessageID: ${info.messageId}`);
            return true;
        } catch (error) {
            console.error('[Email Send Error]', error);
            // Don't throw error for confirmation emails
            return false;
        }
    }
}
