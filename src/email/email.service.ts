import { ConsoleLogger, Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import Mail from 'nodemailer/lib/mailer';

@Injectable()
export class EmailService {
  private logger = new ConsoleLogger(EmailService.name);
  private transportOptions: SMTPTransport.Options;
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transportOptions = {
      host: process.env.EMAIL_SERVER,
      port: parseInt(process.env.EMAIL_SERVER_PORT, 10),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      // activate for debugging:
      // debug: true,
      // logger: true,
    };
  }

  async init() {
    try {
      this.logger.log('Creating nodemailer transporter');
      this.transporter = nodemailer.createTransport(this.transportOptions);
      await this.verifyTransporter();
      return this.transporter;
    } catch (err) {
      this.logger.error(err);
      throw err;
    }
  }

  private async verifyTransporter() {
    this.logger.log('Verifying nodemailer transport connection');
    await this.transporter.verify();
  }

  async sendEmail(address: string, subject: string, content: string) {
    const opts: Mail.Options = {
      from: this.transportOptions.auth.user,
      to: address,
      subject,
      text: content,
      html: undefined, // TODO: implement
    };
    return this.transporter.sendMail(opts);
  }
}
