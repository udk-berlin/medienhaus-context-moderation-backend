import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import Mail from 'nodemailer/lib/mailer';
import { FileLoggerService } from '../file-logger/file-logger.service';

@Injectable()
export class EmailService {
  private logger = new FileLoggerService(EmailService.name);
  private transportOptions: SMTPTransport.Options;
  private transporter: nodemailer.Transporter;

  async init(transportOptions: SMTPTransport.Options) {
    this.transportOptions = transportOptions;
    try {
      this.logger.log('Creating nodemailer transporter');
      this.transporter = nodemailer.createTransport(this.transportOptions);
      await this.verifyTransporter();
      return this.transporter;
    } catch (err) {
      this.logger.error(`Failed to create nodemailer transporter: ${err}`);
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
    };
    try {
      this.logger.log(`Sending email to ${address}`);
      return this.transporter.sendMail(opts);
    } catch (err) {
      this.logger.error(`Failed to send email to ${address}: ${err}`);
    }
  }
}
