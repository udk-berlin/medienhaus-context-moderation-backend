import { Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

import { AppService } from './app.service';
import { EmailService } from './email/email.service';
import { FileLoggerService } from './file-logger/file-logger.service';
import { DataService } from './data/data.service';
import { MatrixService } from './matrix/matrix.service';
import {
  ChildEvent,
  DigestCallback,
  KnockAcceptedCallback,
  KnockEvent,
} from './matrix/types';
import { getNamePartFromUserId } from './matrix/utils';
import { lookupEmailAddress } from './utils';
import {
  digestEmailSubject,
  digestIntro,
  digestOutro,
  digestSummary,
  emailIntro,
  knockAcceptedEmailSubject,
  knockEventAcceptedMessage,
  signature,
} from './email/utils';
import { LookUpEntry } from './data/types';

@Module({
  imports: [ConfigModule.forRoot()],
  providers: [AppService, EmailService, MatrixService, DataService],
})
export class AppModule implements OnApplicationShutdown {
  private readonly logger = new FileLoggerService(MatrixService.name);

  constructor(
    private readonly dataService: DataService,
    private readonly emailService: EmailService,
    private readonly matrixService: MatrixService,
  ) {
    this.logger.log('App initializing');

    const isTestMode = process.env.TEST_MODE === 'true';
    const testEmail = process.env.TEST_EMAIL_RECIPIENT;
    if (isTestMode && !testEmail) {
      this.logger.error('Test mode enabled but no test email address provided');
      process.exit(1);
    }

    const transportOptions: SMTPTransport.Options = {
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
    this.emailService.init(transportOptions).catch(() => {
      process.exit(1);
    });

    const getEmailAddressForUserId = (
      userId: string,
      lookupData: LookUpEntry[],
    ) => {
      if (isTestMode) {
        return process.env.TEST_EMAIL_RECIPIENT;
      }

      const userIdNamePart = getNamePartFromUserId(userId);
      let emailAddress = lookupEmailAddress(userIdNamePart, lookupData);
      if (!emailAddress) {
        emailAddress = `${userIdNamePart}@${process.env.EMAIL_FALLBACK_DOMAIN}`;
      }
    };

    const knockAcceptedCallback: KnockAcceptedCallback = async (
      userId: string,
      userDisplayName: string,
      roomName: string,
    ) => {
      const emailAddress = getEmailAddressForUserId(userId, []);

      const content = [
        emailIntro(userDisplayName),
        '',
        knockEventAcceptedMessage(roomName),
        '',
        signature(),
      ].join('\n');

      await this.emailService.sendEmail(
        emailAddress,
        knockAcceptedEmailSubject,
        content,
      );
    };

    const digestCallback: DigestCallback = async (
      roomIdsByModUser: Record<string, string[]>,
      knockEventsByRoom: Record<string, KnockEvent[]>,
      childEventsByRoom: Record<string, ChildEvent[]>,
    ) => {
      // load moderator email address lookup data
      const lookupData = this.dataService.getEmailLookupData();

      // send out digest email to every moderator
      for (const modUserId of Object.keys(roomIdsByModUser)) {
        const roomIds = roomIdsByModUser[modUserId] || [];

        const summary = digestSummary(
          roomIds,
          knockEventsByRoom,
          childEventsByRoom,
        );
        if (summary === '') {
          continue;
        }

        const displayName =
          await this.matrixService.getUserDisplayName(modUserId);
        const emailAddress = getEmailAddressForUserId(modUserId, lookupData);

        const content = [
          digestIntro(displayName),
          '',
          summary,
          '',
          digestOutro(),
          '',
          signature(),
        ].join('\n');

        await this.emailService.sendEmail(
          emailAddress,
          digestEmailSubject,
          content,
        );
      }
    };

    this.matrixService.createClient(process.env.MATRIX_SERVER_URL);
    this.matrixService
      .start(
        process.env.MATRIX_BOT_USER,
        process.env.MATRIX_BOT_PASSWORD,
        parseInt(process.env.EMAIL_DIGEST_INTERVAL_MINUTES, 10),
        knockAcceptedCallback,
        digestCallback,
      )
      .catch(() => {
        process.exit(1);
      });
  }

  onApplicationShutdown(signal?: string) {
    this.logger.log(`app shutting down (signal: ${signal})`);
  }
}
