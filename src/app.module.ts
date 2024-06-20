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
import { lookupEmailAddress, parseCommaSeparated } from './utils';
import {
  digestSummary,
  makeDigestEmailSubject,
  makeKnockAcceptedEmailSubject,
  generateKnockAcceptedEmailContent,
  generateModeratorDigestEmailContent,
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

    const emailSubjectPrefix = process.env.EMAIL_SUBJECT_PREFIX;
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

    const getEmailAddressesForUserId = (
      userId: string,
      lookupData: LookUpEntry[],
    ): string[] => {
      if (isTestMode) {
        return [process.env.TEST_EMAIL_RECIPIENT];
      }

      const userIdNamePart = getNamePartFromUserId(userId);
      const emailAddress = lookupEmailAddress(userIdNamePart, lookupData);
      const emailAddresses: string[] = emailAddress
        ? [emailAddress]
        : parseCommaSeparated(process.env.EMAIL_FALLBACK_DOMAINS).map(
          /* eslint-disable prettier/prettier */
          (domain) => `${userIdNamePart}@${domain}`,
        );
      /* eslint-enable prettier/prettier */
      return emailAddresses;
    };

    const knockAcceptedCallback: KnockAcceptedCallback = async (
      userId: string,
      userDisplayName: string,
      roomName: string,
    ) => {
      const emailAddresses = getEmailAddressesForUserId(userId, []);
      await this.emailService.sendEmail(
        emailAddresses,
        makeKnockAcceptedEmailSubject(emailSubjectPrefix),
        generateKnockAcceptedEmailContent(userDisplayName, roomName),
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
        const emailAddresses = getEmailAddressesForUserId(
          modUserId,
          lookupData,
        );
        await this.emailService.sendEmail(
          emailAddresses,
          makeDigestEmailSubject(emailSubjectPrefix),
          generateModeratorDigestEmailContent(
            displayName,
            summary,
            process.env.FRONTEND_URL,
          ),
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
