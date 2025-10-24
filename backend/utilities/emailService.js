import nodemailer from 'nodemailer';
import QRCode from 'qrcode';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Generates a QR code and returns it as both Data URL and Buffer
 * @param {string} text The data to encode
 * @returns {Promise<{dataURL: string, buffer: Buffer}>}
 */
export const generateQRCode = async (text) => {
  try {
    const dataURL = await QRCode.toDataURL(text, {
      type: 'image/png',
      width: 300,
      margin: 2,
    });
    const buffer = await QRCode.toBuffer(text, {
      type: 'image/png',
      width: 300,
      margin: 2,
    });
    return { dataURL, buffer };
  } catch (err) {
    console.error('Error generating QR code:', err);
    throw new Error('Failed to generate QR code.');
  }
};

/**
 * Sends an email with embedded QR code
 * @param {string} toEmail Recipient email
 * @param {string} employeeCode Employee code
 * @param {Buffer} qrCodeBuffer QR code as Buffer
 */
export const sendQRCodeEmail = async (toEmail, employeeCode, qrCodeBuffer) => {
  try {
    if (!qrCodeBuffer) {
      throw new Error('QR Code Buffer is missing.');
    }

    const mailOptions = {
      from: `"College Registration" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: 'Welcome – Your QR Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to the Team</h2>
          <p>We're excited to have you join us.</p>
          <p>Your unique code is: <strong>${employeeCode}</strong></p>
          <p>Please scan the QR code below:</p>
          
          <div style="text-align: center; margin: 20px 0; padding: 10px; background: #f5f5f5;">
            <!-- CID reference matches the filename below -->
            <img src="cid:qrcode@college" alt="QR Code for ${employeeCode}" 
                 style="width: 200px; height: 200px; display: block; margin: 0 auto;">
            <p style="font-size: 12px; color: #666;">
              Can't see the QR code? Contact support for assistance.
            </p>
          </div>

          <p>If you have questions, please contact support.</p>
          <p style="color: #888;"><em>– The Registration Team</em></p>
        </div>
      `,
      attachments: [{
        filename: 'registration-qrcode.png',
        content: qrCodeBuffer,
        cid: 'qrcode@college' // same CID referenced in the html img src
      }]
    };

    await transporter.sendMail(mailOptions);
    console.log(`QR Code email sent to ${toEmail}`);
  } catch (error) {
    console.error('Error sending QR email:', error);
    throw new Error('Failed to send QR code email.');
  }
};