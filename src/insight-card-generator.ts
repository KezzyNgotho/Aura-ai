/**
 * Insight Card Generator
 * Creates beautiful shareable cards and social media content
 */

import { Insight, InsightType } from './types';

export interface InsightCard {
  title: string;
  imageUrl: string;
  text: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
}

export class InsightCardGenerator {
  private colorMap: Record<InsightType, { bg: string; accent: string }> = {
    [InsightType.FINANCE]: { bg: '#0f172a', accent: '#10b981' },
    [InsightType.LEARNING]: { bg: '#0f172a', accent: '#3b82f6' },
    [InsightType.BUSINESS]: { bg: '#0f172a', accent: '#f59e0b' },
    [InsightType.TRENDS]: { bg: '#0f172a', accent: '#8b5cf6' },
    [InsightType.PERSONAL]: { bg: '#0f172a', accent: '#ec4899' }
  };

  generateCard(insight: Insight, title?: string): InsightCard {
    const colors = this.colorMap[insight.type] || { bg: '#0f172a', accent: '#6366f1' };
    
    // Extract first 200 chars of recommendation
    const text = (insight.recommendation || '')
      .replace(/\*\*/g, '')
      .substring(0, 200)
      .trim() + '...';

    return {
      title: title || `${insight.type} Insight`,
      imageUrl: this._generateSVGImage(insight.type, colors.accent),
      text,
      backgroundColor: colors.bg,
      textColor: '#f1f5f9',
      accentColor: colors.accent
    };
  }

  generateSocialImage(insight: Insight, quote?: string): string {
    const colors = this.colorMap[insight.type] || { bg: '#0f172a', accent: '#6366f1' };
    const text = quote || insight.recommendation.split('\n')[0].substring(0, 100);

    // Generate SVG for social sharing
    const svg = `
      <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${colors.bg};stop-opacity:1" />
            <stop offset="100%" style="stop-color:#1a1f3a;stop-opacity:1" />
          </linearGradient>
        </defs>
        
        <rect width="1200" height="630" fill="url(#grad)"/>
        
        <circle cx="100" cy="100" r="80" fill="${colors.accent}" opacity="0.1"/>
        <circle cx="1100" cy="530" r="120" fill="${colors.accent}" opacity="0.1"/>
        
        <text x="600" y="280" font-size="48" font-weight="bold" fill="#f1f5f9" text-anchor="middle" font-family="Arial">
          ${text.substring(0, 60)}
        </text>
        
        <text x="600" y="380" font-size="24" fill="#cbd5e1" text-anchor="middle" font-family="Arial">
          ${insight.type}
        </text>
        
        <text x="600" y="570" font-size="20" fill="${colors.accent}" text-anchor="middle" font-family="Arial">
          ✨ Aura AI - Transparent Insights
        </text>
      </svg>
    `;

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  generateShortForm(insight: Insight): string {
    // Short-form content for social media (Twitter-like)
    const rec = insight.recommendation.split('\n')[0];
    const shortRec = rec.replace(/\*\*/g, '').substring(0, 140);

    return `💡 ${insight.type.charAt(0) + insight.type.slice(1).toLowerCase()}\n\n${shortRec}\n\n✨ via Aura AI`;
  }

  generateLongForm(insight: Insight, title: string): string {
    // Long-form content for LinkedIn/blog
    const exp = insight.explanation || {};
    
    let content = `# ${title}\n\n`;
    content += `**Category:** ${insight.type}\n\n`;
    content += `## Recommendation\n\n${insight.recommendation}\n\n`;
    
    if (exp.reasoning) {
      content += `## Reasoning\n\n${exp.reasoning}\n\n`;
    }

    if (exp.dataPoints && exp.dataPoints.length) {
      content += `## Key Data Points\n\n`;
      exp.dataPoints.forEach(dp => {
        content += `- ${dp}\n`;
      });
      content += '\n';
    }

    if (exp.alternatives && exp.alternatives.length) {
      content += `## Alternatives\n\n`;
      exp.alternatives.forEach(alt => {
        content += `- ${alt}\n`;
      });
      content += '\n';
    }

    if (exp.riskFactors && exp.riskFactors.length) {
      content += `## Key Risks\n\n`;
      exp.riskFactors.forEach(risk => {
        content += `- ${risk}\n`;
      });
    }

    return content;
  }

  private _generateSVGImage(type: InsightType, accentColor: string): string {
    const icons: Record<InsightType, string> = {
      [InsightType.FINANCE]: '💰',
      [InsightType.LEARNING]: '📚',
      [InsightType.BUSINESS]: '🚀',
      [InsightType.TRENDS]: '📈',
      [InsightType.PERSONAL]: '🎯'
    };

    const svg = `
      <svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="200" fill="#1e293b" rx="12"/>
        <circle cx="200" cy="100" r="60" fill="${accentColor}" opacity="0.2"/>
        <text x="200" y="120" font-size="72" text-anchor="middle" dominant-baseline="middle">
          ${icons[type] || '✨'}
        </text>
      </svg>
    `;

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }
}
