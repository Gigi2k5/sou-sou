import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrevoClient } from '@getbrevo/brevo';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly client: BrevoClient | null;
  private readonly senderEmail: string;
  private readonly senderName: string;
  private readonly frontendUrl: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('BREVO_API_KEY');
    this.senderEmail =
      this.config.get<string>('BREVO_SENDER_EMAIL') ?? 'noreply@sousou.local';
    this.senderName = this.config.get<string>('BREVO_SENDER_NAME') ?? "Sou'Sou";
    this.frontendUrl =
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3100';

    if (apiKey) {
      this.client = new BrevoClient({ apiKey });
    } else {
      this.client = null;
      this.logger.warn(
        "BREVO_API_KEY non défini — les emails seront loggés au lieu d'être envoyés.",
      );
    }
  }

  async sendPasswordReset(
    to: string,
    name: string,
    token: string,
  ): Promise<void> {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;
    const subject = "Sou'Sou — Réinitialisation de ton mot de passe";
    const htmlContent = this.buildResetHtml(name, resetUrl);

    if (!this.client) {
      this.logger.log(`📧 [DEV] Reset email pour ${to}: ${resetUrl}`);
      return;
    }

    try {
      await this.client.transactionalEmails.sendTransacEmail({
        subject,
        htmlContent,
        sender: { name: this.senderName, email: this.senderEmail },
        to: [{ email: to, name }],
      });
      this.logger.log(`Reset email envoyé à ${to}`);
    } catch (err) {
      this.logger.error(
        `Échec envoi reset email à ${to}`,
        err instanceof Error ? err.stack : String(err),
      );
      throw err;
    }
  }

  private buildResetHtml(name: string, resetUrl: string): string {
    return `
<!DOCTYPE html>
<html lang="fr">
  <body style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; background:#F8FAFC; padding:32px; color:#1E293B;">
    <div style="max-width:560px; margin:0 auto; background:#FFFFFF; border-radius:16px; padding:32px;">
      <h1 style="color:#10B981; font-family: 'Newsreader', Georgia, serif; margin-top:0;">Sou'Sou</h1>
      <p>Salut ${this.escape(name)},</p>
      <p>Tu as demandé à réinitialiser ton mot de passe. Clique sur le bouton ci-dessous (valide pendant 1 heure) :</p>
      <p style="text-align:center; margin:32px 0;">
        <a href="${resetUrl}" style="background:#10B981; color:#FFFFFF; padding:14px 28px; border-radius:12px; text-decoration:none; font-weight:600;">
          Réinitialiser mon mot de passe
        </a>
      </p>
      <p style="font-size:13px; color:#717973;">
        Si tu n'es pas à l'origine de cette demande, ignore simplement cet email.
      </p>
      <p style="font-size:13px; color:#717973;">
        Lien direct : <a href="${resetUrl}" style="color:#10B981;">${resetUrl}</a>
      </p>
    </div>
  </body>
</html>`.trim();
  }

  private escape(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
