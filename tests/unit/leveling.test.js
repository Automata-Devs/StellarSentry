/**
 * Leveling Service Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { levelingService } from '../../src/services/leveling.service.js';
import { memberRepository } from '../../src/database/repositories/MemberRepository.js';
import { guildRepository } from '../../src/database/repositories/GuildRepository.js';

vi.mock('../../src/database/repositories/MemberRepository.js');
vi.mock('../../src/database/repositories/GuildRepository.js');

describe('LevelingService', () => {
  const guildId = '123456789012345678';
  const userId = '111111111111111111';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getXpForLevel', () => {
    it('should calculate XP for level 1', () => {
      const xp = levelingService.getXpForLevel(1);
      expect(xp).toBe(100);
    });

    it('should calculate XP for level 5', () => {
      // Formula: 100 * level^1.5
      // 100 * 5^1.5 = 100 * 11.18 = 1118
      const xp = levelingService.getXpForLevel(5);
      expect(xp).toBe(1118);
    });

    it('should calculate XP for level 10', () => {
      const xp = levelingService.getXpForLevel(10);
      // 100 * 10^1.5 = 100 * 31.62 = 3162
      expect(xp).toBe(3162);
    });
  });

  describe('getLevel', () => {
    it('should return level data for user', async () => {
      memberRepository.getOrCreate.mockResolvedValue({
        leveling: { level: 5, xp: 500, totalXp: 2500 },
      });

      memberRepository.count.mockResolvedValue(10);

      const level = await levelingService.getLevel(guildId, userId);

      expect(level).toEqual({
        level: 5,
        xp: 500,
        xpForNext: levelingService.getXpForLevel(6),
        progress: (500 / levelingService.getXpForLevel(6)) * 100,
        totalXp: 2500,
        rank: 11, // 10 users with higher XP + 1
      });
    });
  });

  describe('addXp', () => {
    it('should add XP and return leveled up status', async () => {
      guildRepository.getByGuildId.mockResolvedValue({
        leveling: { enabled: true, xpCooldown: 60 },
      });

      memberRepository.getOrCreate.mockResolvedValue({
        leveling: { level: 5, xp: 900, lastXpGain: null },
      });

      memberRepository.addXp.mockResolvedValue({
        leveling: { level: 6, xp: 0 },
      });

      const result = await levelingService.addXp(guildId, userId, 100);

      expect(result).toEqual({
        leveledUp: true,
        oldLevel: 5,
        newLevel: 6,
      });
    });

    it('should not level up if XP not enough', async () => {
      guildRepository.getByGuildId.mockResolvedValue({
        leveling: { enabled: true, xpCooldown: 60 },
      });

      memberRepository.getOrCreate.mockResolvedValue({
        leveling: { level: 5, xp: 100, lastXpGain: null },
      });

      memberRepository.addXp.mockResolvedValue({
        leveling: { level: 5, xp: 115 },
      });

      const result = await levelingService.addXp(guildId, userId, 15);

      expect(result).toEqual({
        leveledUp: false,
        oldLevel: 5,
        newLevel: 5,
      });
    });

    it('should respect cooldown', async () => {
      guildRepository.getByGuildId.mockResolvedValue({
        leveling: { enabled: true, xpCooldown: 60 },
      });

      memberRepository.getOrCreate.mockResolvedValue({
        leveling: { level: 5, xp: 100, lastXpGain: new Date() },
      });

      const result = await levelingService.addXp(guildId, userId, 15);

      expect(result).toEqual({
        leveledUp: false,
        reason: 'cooldown',
      });
    });

    it('should return false if leveling disabled', async () => {
      guildRepository.getByGuildId.mockResolvedValue({
        leveling: { enabled: false },
      });

      const result = await levelingService.addXp(guildId, userId, 15);

      expect(result).toEqual({ leveledUp: false });
    });
  });

  describe('setXp', () => {
    it('should set user XP', async () => {
      memberRepository.setLevel.mockResolvedValue({});

      const result = await levelingService.setXp(guildId, userId, 1000);

      expect(memberRepository.setLevel).toHaveBeenCalledWith(guildId, userId, 0, 1000);
    });
  });

  describe('setLevel', () => {
    it('should set user level', async () => {
      memberRepository.setLevel.mockResolvedValue({});

      const result = await levelingService.setLevel(guildId, userId, 10);

      expect(memberRepository.setLevel).toHaveBeenCalledWith(guildId, userId, 10, 0);
    });
  });

  describe('getLeaderboard', () => {
    it('should return leaderboard', async () => {
      memberRepository.find.mockResolvedValue([
        { userId: '1', leveling: { level: 50, xp: 1000, totalXp: 50000 } },
        { userId: '2', leveling: { level: 40, xp: 500, totalXp: 40000 } },
      ]);
      memberRepository.count.mockResolvedValue(2);

      const result = await levelingService.getLeaderboard(guildId, 10, 1);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].rank).toBe(1);
      expect(result.data[0].level).toBe(50);
      expect(result.total).toBe(2);
    });
  });

  describe('addRoleReward', () => {
    it('should add role reward', async () => {
      guildRepository.getByGuildId.mockResolvedValue({
        leveling: { roleRewards: [] },
      });
      guildRepository.updateNestedSetting.mockResolvedValue({});

      const result = await levelingService.addRoleReward(guildId, 10, 'role_123');

      expect(result).toEqual({ level: 10, roleId: 'role_123' });
    });

    it('should update existing role reward', async () => {
      guildRepository.getByGuildId.mockResolvedValue({
        leveling: { roleRewards: [{ level: 10, role: 'old_role' }] },
      });
      guildRepository.updateNestedSetting.mockResolvedValue({});

      const result = await levelingService.addRoleReward(guildId, 10, 'new_role');

      expect(result).toEqual({ level: 10, roleId: 'new_role' });
    });
  });

  describe('removeRoleReward', () => {
    it('should remove role reward', async () => {
      guildRepository.getByGuildId.mockResolvedValue({
        leveling: { roleRewards: [{ level: 10, role: 'role_123' }] },
      });
      guildRepository.updateNestedSetting.mockResolvedValue({});

      const result = await levelingService.removeRoleReward(guildId, 10);

      expect(result).toBe(true);
    });
  });
});