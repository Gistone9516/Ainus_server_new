/**
 * 이메일 서비스 (TASK-3-1)
 * NodeMailer를 사용한 SMTP 기반 이메일 전송
 * 지원: Gmail, SendGrid, 커스텀 SMTP 서버
 */

import nodemailer, { Transporter } from 'nodemailer';
import { getConfig } from '../config/environment';
import { Logger } from '../database/logger';
import { ExternalAPIException } from '../exceptions';
import path from 'path';
import fs from 'fs';
import ejs from 'ejs';

const logger = new Logger('EmailService');

/**
 * 이메일 전송 옵션
 */
export interface EmailOptions {
  to: string | string[];
  subject: string;
  template?: string;
  context?: Record<string, any>;
  html?: string;
  text?: string;
  cc?: string[];
  bcc?: string[];
}

/**
 * 이메일 결과
 */
export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: string;
}

/**
 * NodeMailer Transporter 싱글톤
 */
let transporter: Transporter | null = null;

/**
 * NodeMailer Transporter 초기화
 */
export function initializeEmailTransport(): Transporter {
  if (transporter) {
    return transporter;
  }

  const config = getConfig();

  // Gmail, SendGrid, 기타 SMTP 서버 지원
  transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure, // true for 465, false for other ports
    auth: {
      user: config.email.user,
      pass: config.email.password
    },
    // Gmail 특수 처리
    ...(config.email.host === 'smtp.gmail.com' && {
      service: 'gmail'
    })
  });

  logger.info('Email transport initialized', {
    host: config.email.host,
    port: config.email.port,
    user: config.email.user
  });

  return transporter;
}

/**
 * 이메일 템플릿 렌더링
 * @param templateName 템플릿 이름 (예: 'password-reset')
 * @param context 템플릿에 전달할 데이터
 */
export async function renderEmailTemplate(
  templateName: string,
  context: Record<string, any>
): Promise<string> {
  try {
    const templatePath = path.join(
      __dirname,
      `../templates/emails/${templateName}.html`
    );

    // 파일 존재 확인
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Email template not found: ${templateName}`);
    }

    const templateContent = fs.readFileSync(templatePath, 'utf-8');
    const html = ejs.render(templateContent, context) as string;

    return html;
  } catch (error) {
    logger.error(`Failed to render email template: ${templateName}`, error);
    throw new ExternalAPIException(
      `Failed to render email template (9002)`,
      'renderEmailTemplate',
      500
    );
  }
}

/**
 * 이메일 전송
 * @param options 이메일 옵션
 * @returns 전송 결과
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  try {
    const transport = initializeEmailTransport();
    const config = getConfig();

    // 템플릿이 지정된 경우 렌더링
    let html = options.html;
    if (options.template && options.context) {
      html = await renderEmailTemplate(options.template, options.context);
    }

    if (!html && !options.text) {
      throw new Error('Either html or text content is required');
    }

    const mailOptions = {
      from: `${config.email.name} <${config.email.from}>`,
      to: Array.isArray(options.to) ? options.to.join(',') : options.to,
      subject: options.subject,
      html: html || undefined,
      text: options.text || undefined,
      cc: options.cc,
      bcc: options.bcc
    };

    const result = await transport.sendMail(mailOptions);

    logger.info(`Email sent successfully`, {
      to: options.to,
      subject: options.subject,
      messageId: result.messageId
    });

    return {
      success: true,
      messageId: result.messageId,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to send email`, {
      to: options.to,
      subject: options.subject,
      error: errorMessage
    });

    throw new ExternalAPIException(
      `Failed to send email (9002)`,
      'sendEmail',
      500
    );
  }
}

/**
 * 비밀번호 재설정 이메일 전송
 * @param email 수신자 이메일
 * @param resetToken 재설정 토큰
 * @param resetLink 재설정 링크
 */
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  resetLink: string
): Promise<EmailResult> {
  return sendEmail({
    to: email,
    subject: '비밀번호 재설정 요청',
    template: 'password-reset',
    context: {
      resetLink,
      resetToken,
      expiresIn: '1시간',
      appName: 'Ainus'
    }
  });
}

/**
 * 이메일 인증 링크 전송
 * @param email 수신자 이메일
 * @param verificationToken 인증 토큰
 * @param verificationLink 인증 링크
 */
export async function sendEmailVerificationLink(
  email: string,
  verificationToken: string,
  verificationLink: string
): Promise<EmailResult> {
  return sendEmail({
    to: email,
    subject: '이메일 인증하기',
    template: 'email-verification',
    context: {
      verificationLink,
      verificationToken,
      expiresIn: '24시간',
      appName: 'Ainus'
    }
  });
}

/**
 * 의심스러운 로그인 알림 전송
 * @param email 수신자 이메일
 * @param location 로그인 위치
 * @param ipAddress IP 주소
 * @param device 디바이스 정보
 */
export async function sendSuspiciousLoginAlert(
  email: string,
  location: string,
  ipAddress: string,
  device: string
): Promise<EmailResult> {
  return sendEmail({
    to: email,
    subject: '의심스러운 로그인 시도 알림',
    template: 'suspicious-login',
    context: {
      location,
      ipAddress,
      device,
      timestamp: new Date().toLocaleString('ko-KR'),
      appName: 'Ainus',
      supportEmail: 'support@ainus.example.com'
    }
  });
}

/**
 * 이메일 연결 테스트
 */
export async function testEmailConnection(): Promise<boolean> {
  try {
    const transport = initializeEmailTransport();
    await transport.verify();
    logger.info('Email connection verified successfully');
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Email connection verification failed: ${errorMessage}`);
    return false;
  }
}
