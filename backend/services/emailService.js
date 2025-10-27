import nodemailer from 'nodemailer';
import QRCode from 'qrcode';

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
 */
export const generateQRCode = async (text) => {
  try {
    const dataURL = await QRCode.toDataURL(text, {
      width: 300,
      margin: 2,
    });
    const buffer = await QRCode.toBuffer(text, {
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
 * Sends an email with embedded QR code for attendance
 */
export const sendQRCodeEmail = async (toEmail, employeeCode, qrCodeBuffer) => {
  try {
    if (!qrCodeBuffer) {
      throw new Error('QR Code Buffer is missing.');
    }

    const mailOptions = {
      from: `"Attendance System" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: 'Your Attendance QR Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Attendance QR Code</h2>
          <p>Here is your QR code for recording attendance.</p>
          <p>Your user code is: <strong>${employeeCode}</strong></p>
          <p>Scan this QR code to record your attendance:</p>
          
          <div style="text-align: center; margin: 20px 0; padding: 10px; background: #f5f5f5;">
            <img src="cid:qrcode@attendance" alt="QR Code for ${employeeCode}" 
                 style="width: 200px; height: 200px; display: block; margin: 0 auto;">
            <p style="font-size: 12px; color: #666;">
              This QR code expires in 1 hour.
            </p>
          </div>

          <p>If you have any questions, please contact support.</p>
          <p style="color: #888;"><em>– Attendance System</em></p>
        </div>
      `,
      attachments: [{
        filename: 'attendance-qrcode.png',
        content: qrCodeBuffer,
        cid: 'qrcode@attendance'
      }]
    };

    await transporter.sendMail(mailOptions);
    console.log(`QR Code email sent to ${toEmail}`);
  } catch (error) {
    console.error('Error sending QR email:', error);
    throw new Error('Failed to send QR code email.');
  }
};