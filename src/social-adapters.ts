/**
 * Social Platform Integrations
 * Adapters for WhatsApp, Telegram, Discord, and Web
 */

import { Query, InsightType } from './types';

export interface PlatformMessage {
  userId: string;
  text: string;
  platform: 'whatsapp' | 'telegram' | 'discord' | 'web';
  metadata?: Record<string, unknown>;
}

export interface PlatformResponse {
  userId: string;
  text: string;
  buttons?: PlatformButton[];
  metadata?: Record<string, unknown>;
}

export interface PlatformButton {
  label: string;
  action: string;
  value?: string;
}

/**
 * WhatsApp Adapter
 */
export class WhatsAppAdapter {
  async parseMessage(webhookData: Record<string, unknown>): Promise<PlatformMessage | null> {
    try {
      // WhatsApp sends messages in a specific format
      // Extract from webhook payload
      const entry = (webhookData.entry as any[])?.[0];
      const change = entry?.changes?.[0];
      const message = change?.value?.messages?.[0];

      if (!message || message.type !== 'text') {
        return null;
      }

      return {
        userId: message.from,
        text: message.text.body,
        platform: 'whatsapp',
        metadata: {
          messageId: message.id,
          timestamp: message.timestamp,
          phoneNumber: message.from
        }
      };
    } catch (error) {
      console.error('WhatsApp parse error:', error);
      return null;
    }
  }

  async sendMessage(response: PlatformResponse): Promise<boolean> {
    try {
      // Send to WhatsApp Business API
      // Implementation would use your WhatsApp Business API credentials
      console.log(`[WhatsApp] Sending to ${response.userId}: ${response.text}`);
      return true;
    } catch (error) {
      console.error('WhatsApp send error:', error);
      return false;
    }
  }
}

/**
 * Telegram Adapter
 */
export class TelegramAdapter {
  async parseMessage(webhookData: Record<string, unknown>): Promise<PlatformMessage | null> {
    try {
      const message = (webhookData as any).message;

      if (!message || !message.text) {
        return null;
      }

      return {
        userId: message.from.id.toString(),
        text: message.text,
        platform: 'telegram',
        metadata: {
          chatId: message.chat.id,
          messageId: message.message_id,
          username: message.from.username,
          firstName: message.from.first_name
        }
      };
    } catch (error) {
      console.error('Telegram parse error:', error);
      return null;
    }
  }

  async sendMessage(response: PlatformResponse): Promise<boolean> {
    try {
      // Send via Telegram Bot API
      console.log(`[Telegram] Sending to ${response.userId}: ${response.text}`);
      
      // Format buttons for Telegram inline keyboard
      const replyMarkup = response.buttons ? {
        inline_keyboard: [
          response.buttons.map(btn => ({
            text: btn.label,
            callback_data: btn.action
          }))
        ]
      } : undefined;

      return true;
    } catch (error) {
      console.error('Telegram send error:', error);
      return false;
    }
  }
}

/**
 * Discord Adapter
 */
export class DiscordAdapter {
  async parseMessage(webhookData: Record<string, unknown>): Promise<PlatformMessage | null> {
    try {
      const data = webhookData as any;

      // Skip bot messages and messages without content
      if (data.author?.bot || !data.content) {
        return null;
      }

      return {
        userId: data.author.id,
        text: data.content,
        platform: 'discord',
        metadata: {
          guildId: data.guild_id,
          channelId: data.channel_id,
          messageId: data.id,
          username: data.author.username,
          discriminator: data.author.discriminator
        }
      };
    } catch (error) {
      console.error('Discord parse error:', error);
      return null;
    }
  }

  async sendMessage(response: PlatformResponse, channelId: string): Promise<boolean> {
    try {
      // Send via Discord API
      console.log(`[Discord] Sending to channel ${channelId}: ${response.text}`);
      
      // Format as Discord embed if needed
      const embeds = [{
        title: 'Aura-AI Insight',
        description: response.text,
        color: 0x7289da
      }];

      return true;
    } catch (error) {
      console.error('Discord send error:', error);
      return false;
    }
  }
}

/**
 * Web Adapter
 */
export class WebAdapter {
  async parseMessage(request: Request): Promise<PlatformMessage | null> {
    try {
      const data = await request.json() as any;

      if (!data.text || !data.userId) {
        return null;
      }

      return {
        userId: data.userId,
        text: data.text,
        platform: 'web',
        metadata: {
          ip: request.headers.get('cf-connecting-ip'),
          userAgent: request.headers.get('user-agent'),
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Web parse error:', error);
      return null;
    }
  }

  async sendMessage(response: PlatformResponse): Promise<boolean> {
    try {
      // For web, we'd typically send via WebSocket or SSE
      console.log(`[Web] Sending to ${response.userId}: ${response.text}`);
      return true;
    } catch (error) {
      console.error('Web send error:', error);
      return false;
    }
  }
}

/**
 * Platform Router - Routes messages to appropriate adapter
 */
export class PlatformRouter {
  private whatsapp: WhatsAppAdapter;
  private telegram: TelegramAdapter;
  private discord: DiscordAdapter;
  private web: WebAdapter;

  constructor() {
    this.whatsapp = new WhatsAppAdapter();
    this.telegram = new TelegramAdapter();
    this.discord = new DiscordAdapter();
    this.web = new WebAdapter();
  }

  async handleWebhook(
    platform: string,
    payload: Record<string, unknown>
  ): Promise<PlatformMessage | null> {
    switch (platform.toLowerCase()) {
      case 'whatsapp':
        return this.whatsapp.parseMessage(payload);
      case 'telegram':
        return this.telegram.parseMessage(payload);
      case 'discord':
        return this.discord.parseMessage(payload);
      default:
        console.warn(`Unknown platform: ${platform}`);
        return null;
    }
  }

  async handleWebRequest(request: Request): Promise<PlatformMessage | null> {
    return this.web.parseMessage(request);
  }

  async sendResponse(
    response: PlatformResponse,
    platform: 'whatsapp' | 'telegram' | 'discord' | 'web',
    metadata?: Record<string, unknown>
  ): Promise<boolean> {
    switch (platform) {
      case 'whatsapp':
        return this.whatsapp.sendMessage(response);
      case 'telegram':
        return this.telegram.sendMessage(response);
      case 'discord':
        return this.discord.sendMessage(response, metadata?.channelId as string);
      case 'web':
        return this.web.sendMessage(response);
      default:
        console.warn(`Unknown platform: ${platform}`);
        return false;
    }
  }
}
