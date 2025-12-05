/**
 * Intelligent Squad Agent Service
 * AI-powered recommendations, analysis, and optimization for squads
 */

import { Squad, SquadMember, ContributionEntry } from './squad-service';

export interface MemberProfile {
  userId: string;
  totalContributions: number;
  averageQuality: number; // 0-100
  skillTags: string[];
  availability: number; // 0-100 (percentage available)
  specialization: string; // 'leader', 'specialist', 'generalist'
  reliability: number; // 0-100 (past completion rate)
  joinedSquadsCount: number;
  averageEarnings: number;
  recommendedRole: 'leader' | 'assistant' | 'contributor';
}

export interface SquadRecommendation {
  squadId: string;
  recommendation: string;
  healthScore: number; // 0-100
  issues: string[];
  suggestions: string[];
  estimatedProductivity: number; // 0-100
  recommendedActions: string[];
}

export interface MemberMatch {
  userId: string;
  matchScore: number; // 0-100
  reasoning: string;
  estimatedProductivity: number;
  suggestedRole: 'leader' | 'assistant' | 'contributor';
  complementarySkills: string[];
  potentialEarnings: number;
}

export interface ContributionAnalysis {
  userId: string;
  squadId: string;
  analysisScore: number; // 0-100
  qualityAssessment: string;
  effortLevel: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  recommendedRewardMultiplier: number;
  feedback: string;
}

export interface RewardOptimization {
  originalDistribution: Record<string, number>;
  optimizedDistribution: Record<string, number>;
  improvements: Record<string, number>; // user -> improvement percentage
  reasoning: string;
  totalEfficiencyGain: number; // 0-100
}

export class IntelligentSquadAgent {
  private kv: KVNamespace;

  constructor(kv: KVNamespace) {
    this.kv = kv;
  }

  /**
   * Analyze a member's profile and create intelligent recommendation
   */
  async analyzeMemberProfile(userId: string): Promise<MemberProfile> {
    // Get all contributions from user
    const contributions = await this.getAllUserContributions(userId);

    // Calculate metrics
    const totalContributions = contributions.length;
    const totalPoints = contributions.reduce((sum, c) => sum + c.points, 0);
    const averageQuality = this.calculateQualityScore(contributions);

    // Detect skills from contribution types
    const skillTags = this.detectSkills(contributions);

    // Get joined squads
    const squadsData = await this.kv.get(`squad:member:${userId}`, 'json');
    const joinedSquads = ((squadsData as string[]) || []).length;

    // Estimate availability (based on activity frequency)
    const availability = await this.estimateAvailability(userId, contributions);

    // Determine specialization
    const specialization = this.determineSpecialization(skillTags, contributions);

    // Calculate reliability
    const reliability = await this.calculateReliability(userId);

    // Get average earnings
    const averageEarnings = await this.getAverageEarnings(userId);

    // Recommend optimal role
    const recommendedRole = this.recommendRole(specialization, reliability, totalContributions);

    return {
      userId,
      totalContributions,
      averageQuality,
      skillTags,
      availability,
      specialization,
      reliability,
      joinedSquadsCount: joinedSquads,
      averageEarnings,
      recommendedRole
    };
  }

  /**
   * Analyze a squad's health and provide recommendations
   */
  async analyzeSquadHealth(squad: Squad): Promise<SquadRecommendation> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check squad composition
    const hasLeader = squad.members.some((m) => m.role === 'leader');
    const hasAssistants = squad.members.some((m) => m.role === 'assistant');
    const hasContributors = squad.members.some((m) => m.role === 'contributor');

    if (!hasLeader) issues.push('No leader assigned');
    if (squad.members.length === 1) issues.push('Single member - need more hands');

    // Check member activity
    for (const member of squad.members) {
      if (member.contributionScore === 0) {
        issues.push(`${member.userId} has not contributed yet`);
        suggestions.push(`Onboard ${member.userId} with a small task`);
      }
    }

    // Check balance of roles
    const rolesCount = {
      leader: squad.members.filter((m) => m.role === 'leader').length,
      assistant: squad.members.filter((m) => m.role === 'assistant').length,
      contributor: squad.members.filter((m) => m.role === 'contributor').length
    };

    if (rolesCount.assistant === 0 && squad.members.length > 2) {
      suggestions.push('Add an assistant role to improve coordination');
    }

    // Check earnings balance
    const earningsShares = squad.members.map((m) => m.earningsShare);
    const maxShare = Math.max(...earningsShares);
    const minShare = Math.min(...earningsShares);
    const shareVariance = maxShare - minShare;

    if (shareVariance > 30) {
      issues.push('Unbalanced earnings distribution - could reduce team morale');
      suggestions.push('Consider rebalancing earnings shares to be more fair');
    }

    // Calculate health score
    let healthScore = 100;
    healthScore -= issues.length * 10;
    healthScore -= squad.members.filter((m) => m.contributionScore === 0).length * 15;
    healthScore = Math.max(0, healthScore);

    // Estimate productivity
    const estimatedProductivity = this.estimateSquadProductivity(squad, rolesCount);

    // Recommended actions
    const recommendedActions = this.generateSquadActions(squad, issues, suggestions);

    return {
      squadId: squad.id,
      recommendation: this.generateSquadRecommendation(squad, healthScore),
      healthScore,
      issues,
      suggestions,
      estimatedProductivity,
      recommendedActions
    };
  }

  /**
   * Find members that would fit well in a squad
   */
  async findMemberMatches(squadNeeds: {
    requiredSkills: string[];
    desiredRoles: ('leader' | 'assistant' | 'contributor')[];
    availability: number;
    experienceLevel: 'junior' | 'mid' | 'senior';
  }): Promise<MemberMatch[]> {
    const matches: MemberMatch[] = [];

    // In production, would query a user database or reputation system
    // For now, return intelligent placeholder matches
    const possibleMatches = [
      {
        userId: 'agent_ai_001',
        skills: ['analysis', 'problem-solving', 'automation'],
        availability: 95,
        experience: 'senior'
      },
      {
        userId: 'agent_specialist_001',
        skills: ['design', 'marketing', 'content'],
        availability: 85,
        experience: 'mid'
      },
      {
        userId: 'agent_developer_001',
        skills: ['coding', 'architecture', 'devops'],
        availability: 90,
        experience: 'senior'
      }
    ];

    for (const candidate of possibleMatches) {
      const matchScore = this.calculateMemberMatchScore(candidate, squadNeeds);

      if (matchScore > 60) {
        matches.push({
          userId: candidate.userId,
          matchScore,
          reasoning: `Strong match: ${matchScore}% compatible with squad needs`,
          estimatedProductivity: matchScore * 0.8, // Scale down to productivity estimate
          suggestedRole: this.suggestRoleForCandidate(candidate, squadNeeds),
          complementarySkills: this.findComplementarySkills(candidate.skills, squadNeeds.requiredSkills),
          potentialEarnings: matchScore * 50 // Rough estimate
        });
      }
    }

    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Analyze a member's contribution and provide intelligent feedback
   */
  async analyzeContribution(
    squadId: string,
    userId: string,
    contribution: ContributionEntry
  ): Promise<ContributionAnalysis> {
    // Analyze effort based on contribution type and description
    const effortLevel = this.assessEffortLevel(contribution);
    const impact = this.assessImpact(contribution);

    // Calculate quality score (0-100)
    let analysisScore = 50;
    analysisScore += this.scoreEffort(effortLevel) * 30;
    analysisScore += this.scoreImpact(impact) * 40;
    analysisScore += (contribution.points / 10) * 20;
    analysisScore = Math.min(100, analysisScore);

    // Determine reward multiplier
    const recommendedRewardMultiplier = this.calculateRewardMultiplier(analysisScore, impact);

    // Generate feedback
    const feedback = this.generateContributionFeedback(
      contribution,
      analysisScore,
      effortLevel,
      impact
    );

    // Quality assessment
    const qualityAssessment = this.assessQuality(analysisScore);

    return {
      userId,
      squadId,
      analysisScore,
      qualityAssessment,
      effortLevel,
      impact,
      recommendedRewardMultiplier,
      feedback
    };
  }

  /**
   * Optimize reward distribution based on contribution quality
   */
  async optimizeRewardDistribution(
    squad: Squad,
    totalReward: number,
    contributions: Record<string, ContributionEntry[]>
  ): Promise<RewardOptimization> {
    const originalDistribution: Record<string, number> = {};
    const optimizedDistribution: Record<string, number> = {};
    const improvements: Record<string, number> = {};

    // Calculate original distribution (based on earnings share)
    for (const member of squad.members) {
      originalDistribution[member.userId] = (totalReward * member.earningsShare) / 100;
    }

    // Analyze each member's contributions
    const memberScores: Record<string, number> = {};
    let totalScore = 0;

    for (const member of squad.members) {
      const memberContributions = contributions[member.userId] || [];
      let memberScore = 0;

      for (const contrib of memberContributions) {
        memberScore += contrib.points;
      }

      // Bonus for consistent contribution
      if (memberContributions.length > 5) {
        memberScore *= 1.15;
      }

      memberScores[member.userId] = memberScore;
      totalScore += memberScore;
    }

    // Calculate optimized distribution
    let totalAllocated = 0;
    let efficiencyGain = 0;

    for (const member of squad.members) {
      if (totalScore > 0) {
        const scoreShare = memberScores[member.userId] / totalScore;
        optimizedDistribution[member.userId] = Math.round(totalReward * scoreShare);

        const improvement =
          ((optimizedDistribution[member.userId] - originalDistribution[member.userId]) /
            originalDistribution[member.userId]) *
          100;
        improvements[member.userId] = improvement;

        totalAllocated += optimizedDistribution[member.userId];
        efficiencyGain += Math.abs(improvement);
      } else {
        optimizedDistribution[member.userId] = originalDistribution[member.userId];
      }
    }

    // Ensure total matches
    const diff = totalReward - totalAllocated;
    if (diff !== 0 && Object.keys(optimizedDistribution).length > 0) {
      const topMember = Object.entries(optimizedDistribution).sort(
        ([, a], [, b]) => b - a
      )[0][0];
      optimizedDistribution[topMember] += diff;
    }

    return {
      originalDistribution,
      optimizedDistribution,
      improvements,
      reasoning: `Optimized based on ${Object.keys(contributions).length} members' ${Object.values(contributions).reduce((sum, a) => sum + a.length, 0)} contributions`,
      totalEfficiencyGain: Math.round(efficiencyGain / squad.members.length)
    };
  }

  /**
   * Predict squad success probability
   */
  async predictSquadSuccess(squad: Squad): Promise<number> {
    let successScore = 50;

    // Factor: Squad size
    if (squad.members.length >= 3 && squad.members.length <= 10) {
      successScore += 15;
    } else if (squad.members.length < 3) {
      successScore -= 10;
    }

    // Factor: Role distribution
    const roles = squad.members.map((m) => m.role);
    if (roles.includes('leader') && roles.includes('assistant') && roles.some((r) => r === 'contributor')) {
      successScore += 15;
    }

    // Factor: Member activity
    const activeMembers = squad.members.filter((m) => m.contributionScore > 0).length;
    successScore += (activeMembers / squad.members.length) * 20;

    // Factor: Age of squad
    const squadAge = new Date().getTime() - new Date(squad.createdAt).getTime();
    const daysOld = squadAge / (1000 * 60 * 60 * 24);
    if (daysOld > 7) successScore += 10;
    if (daysOld > 30) successScore += 15;

    return Math.min(100, successScore);
  }

  // ============ HELPER METHODS ============

  private async getAllUserContributions(userId: string): Promise<ContributionEntry[]> {
    // This would query across all squads in production
    // For now return empty (would be populated from KV)
    return [];
  }

  private calculateQualityScore(contributions: ContributionEntry[]): number {
    if (contributions.length === 0) return 0;
    const avgPoints = contributions.reduce((sum, c) => sum + c.points, 0) / contributions.length;
    return Math.min(100, avgPoints * 5);
  }

  private detectSkills(contributions: ContributionEntry[]): string[] {
    const typeMap: Record<string, string> = {
      solution: 'problem-solving',
      review: 'quality-assurance',
      message: 'communication',
      edit: 'editing'
    };

    const skills = new Set<string>();
    for (const contrib of contributions) {
      if (typeMap[contrib.type]) {
        skills.add(typeMap[contrib.type]);
      }
    }
    return Array.from(skills);
  }

  private async estimateAvailability(userId: string, contributions: ContributionEntry[]): Promise<number> {
    if (contributions.length === 0) return 50;
    // Higher contribution frequency = higher availability
    return Math.min(100, Math.max(20, (contributions.length / 100) * 100));
  }

  private determineSpecialization(
    skills: string[],
    contributions: ContributionEntry[]
  ): string {
    if (skills.length > 3) return 'generalist';
    if (skills.length === 1) return 'specialist';
    return 'generalist';
  }

  private async calculateReliability(userId: string): Promise<number> {
    // In production: check past task completions, deadlines met, etc.
    return 75;
  }

  private async getAverageEarnings(userId: string): Promise<number> {
    // In production: query earnings history
    return 100;
  }

  private recommendRole(
    specialization: string,
    reliability: number,
    totalContributions: number
  ): 'leader' | 'assistant' | 'contributor' {
    if (reliability > 85 && totalContributions > 10) return 'leader';
    if (reliability > 70 && totalContributions > 5) return 'assistant';
    return 'contributor';
  }

  private estimateSquadProductivity(
    squad: Squad,
    rolesCount: Record<string, number>
  ): number {
    let productivity = 50;
    productivity += rolesCount.leader * 10;
    productivity += rolesCount.assistant * 8;
    productivity += rolesCount.contributor * 5;
    return Math.min(100, productivity);
  }

  private generateSquadActions(
    squad: Squad,
    issues: string[],
    suggestions: string[]
  ): string[] {
    const actions = [];

    if (issues.includes('Single member - need more hands')) {
      actions.push('Recruit 2-3 more members for better productivity');
    }

    if (suggestions.some((s) => s.includes('Add an assistant'))) {
      actions.push('Promote a contributor to assistant role');
    }

    if (squad.status === 'active' && squad.taskCount === 0) {
      actions.push('Post first task to get team engaged');
    }

    return actions;
  }

  private generateSquadRecommendation(squad: Squad, healthScore: number): string {
    if (healthScore > 80) return 'Squad is healthy and productive';
    if (healthScore > 60) return 'Squad functioning well but could improve member engagement';
    if (healthScore > 40) return 'Squad needs attention - consider onboarding members or restructuring';
    return 'Squad at risk - urgent action needed to improve health';
  }

  private calculateMemberMatchScore(
    candidate: any,
    needs: any
  ): number {
    let score = 50;

    // Skill matching
    const matchedSkills = candidate.skills.filter((s: string) =>
      needs.requiredSkills.includes(s)
    ).length;
    score += (matchedSkills / needs.requiredSkills.length) * 30;

    // Availability matching
    score += (candidate.availability / 100) * 20;

    // Experience level matching
    const experienceMap = { junior: 30, mid: 70, senior: 100 };
    const expScore = experienceMap[candidate.experience as keyof typeof experienceMap] || 50;
    score += (expScore / 100) * 20;

    return Math.min(100, score);
  }

  private suggestRoleForCandidate(
    candidate: any,
    needs: any
  ): 'leader' | 'assistant' | 'contributor' {
    if (candidate.experience === 'senior') return 'leader';
    if (candidate.experience === 'mid') return 'assistant';
    return 'contributor';
  }

  private findComplementarySkills(candidateSkills: string[], requiredSkills: string[]): string[] {
    return candidateSkills.filter((s) => !requiredSkills.includes(s)).slice(0, 3);
  }

  private assessEffortLevel(contribution: ContributionEntry): 'low' | 'medium' | 'high' {
    if (contribution.points >= 10) return 'high';
    if (contribution.points >= 5) return 'medium';
    return 'low';
  }

  private assessImpact(contribution: ContributionEntry): 'low' | 'medium' | 'high' {
    if (contribution.type === 'solution') return 'high';
    if (contribution.type === 'review') return 'medium';
    return 'low';
  }

  private scoreEffort(level: string): number {
    const scores = { low: 0.5, medium: 0.75, high: 1.0 };
    return scores[level as keyof typeof scores] || 0.5;
  }

  private scoreImpact(level: string): number {
    const scores = { low: 0.5, medium: 0.75, high: 1.0 };
    return scores[level as keyof typeof scores] || 0.5;
  }

  private calculateRewardMultiplier(analysisScore: number, impact: string): number {
    let multiplier = 1.0;
    multiplier += (analysisScore / 100) * 0.5;
    if (impact === 'high') multiplier += 0.3;
    if (impact === 'medium') multiplier += 0.15;
    return Math.min(2.5, multiplier);
  }

  private generateContributionFeedback(
    contribution: ContributionEntry,
    score: number,
    effort: string,
    impact: string
  ): string {
    let feedback = `Great ${contribution.type}! `;
    if (score > 80) feedback += `Excellent quality work - keep it up!`;
    else if (score > 60) feedback += `Good contribution - some room for improvement`;
    else feedback += `Solid effort - consider taking on more challenging tasks`;
    return feedback;
  }

  private assessQuality(score: number): string {
    if (score > 85) return 'Exceptional - among the best';
    if (score > 70) return 'Good - meets expectations';
    if (score > 50) return 'Fair - acceptable quality';
    return 'Needs improvement';
  }
}
