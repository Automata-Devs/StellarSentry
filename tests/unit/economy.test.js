/**
 * Economy Service Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { economyService } from '../../src/services/economy.service.js';
import { memberRepository } from '../../src/database/repositories/MemberRepository.js';
import { guildRepository } from '../../src/database/repositories/GuildRepository.js';

// Mock repositories
vi.mock('../../src/database/repositories/MemberRepository.js');
vi.mock('../../src/database/repositories/GuildRepository.js');

describe('EconomyService', () => {
  const guildId = '123456789012345678';
  const userId = '111111111111111111';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getBalance', () => {
    it('should return balance for user', async () => {
      memberRepository.getOrCreate.mockResolvedValue({
        economy: { wallet: 100, bank: 50 },
      });

      const balance = await economyService.getBalance(guildId, userId);

      expect(balance).toEqual({
        wallet: 100,
        bank: 50,
        total: 150,
      });
    });

    it('should return zero balance for new user', async () => {
      memberRepository.getOrCreate.mockResolvedValue({
        economy: {},
      });

      const balance = await economyService.getBalance(guildId, userId);

      expect(balance).toEqual({
        wallet: 0,
        bank: 0,
        total: 0,
      });
    });
  });

  describe('addMoney', () => {
    it('should add money to wallet', async () => {
      memberRepository.addBalance.mockResolvedValue({
        economy: { wallet: 200, bank: 50 },
      });
      memberRepository.updateNetWorth.mockResolvedValue({});

      const balance = await economyService.addMoney(guildId, userId, 100, 'wallet');

      expect(balance).toEqual({
        wallet: 200,
        bank: 50,
        total: 250,
      });
      expect(memberRepository.addBalance).toHaveBeenCalledWith(guildId, userId, 100, 'wallet');
    });
  });

  describe('removeMoney', () => {
    it('should remove money from wallet', async () => {
      memberRepository.removeBalance.mockResolvedValue({
        economy: { wallet: 50, bank: 50 },
      });
      memberRepository.updateNetWorth.mockResolvedValue({});

      const balance = await economyService.removeMoney(guildId, userId, 50, 'wallet');

      expect(balance).toEqual({
        wallet: 50,
        bank: 50,
        total: 100,
      });
    });
  });

  describe('transfer', () => {
    it('should transfer money between users', async () => {
      const targetUserId = '222222222222222222';

      economyService.getBalance = vi.fn()
        .mockResolvedValueOnce({ wallet: 200, bank: 0, total: 200 }) // sender
        .mockResolvedValueOnce({ wallet: 50, bank: 0, total: 50 }); // receiver

      memberRepository.removeBalance.mockResolvedValue({});
      memberRepository.addBalance.mockResolvedValue({});
      memberRepository.updateNetWorth.mockResolvedValue({});

      const result = await economyService.transfer(guildId, userId, targetUserId, 100);

      expect(result).toEqual({ success: true, amount: 100 });
      expect(memberRepository.removeBalance).toHaveBeenCalledWith(guildId, userId, 100, 'wallet');
      expect(memberRepository.addBalance).toHaveBeenCalledWith(guildId, targetUserId, 100, 'wallet');
    });

    it('should fail if insufficient funds', async () => {
      economyService.getBalance = vi.fn()
        .mockResolvedValueOnce({ wallet: 50, bank: 0, total: 50 }); // sender has only 50

      await expect(economyService.transfer(guildId, userId, '222222222222222222', 100))
        .rejects.toThrow('Insufficient funds');
    });

    it('should fail if transferring to self', async () => {
      await expect(economyService.transfer(guildId, userId, userId, 100))
        .rejects.toThrow('Cannot transfer to yourself');
    });
  });

  describe('claimDaily', () => {
    it('should claim daily reward', async () => {
      guildRepository.getByGuildId.mockResolvedValue({
        economy: { dailyMin: 100, dailyMax: 500, dailyCooldown: 86400000 },
      });

      memberRepository.getOrCreate.mockResolvedValue({
        economy: { lastDaily: null, dailyStreak: 0 },
      });

      memberRepository.getOrCreate.mockReturnValueOnce(Promise.resolve({
        save: vi.fn().mockResolvedValue({}),
      }));

      const result = await economyService.claimDaily(guildId, userId);

      expect(result).toHaveProperty('amount');
      expect(result).toHaveProperty('streak');
      expect(result.amount).toBeGreaterThanOrEqual(100);
      expect(result.amount).toBeLessThanOrEqual(600); // max + streak bonus
    });

    it('should fail if on cooldown', async () => {
      guildRepository.getByGuildId.mockResolvedValue({
        economy: { dailyMin: 100, dailyMax: 500, dailyCooldown: 86400000 },
      });

      memberRepository.getOrCreate.mockResolvedValue({
        economy: { lastDaily: new Date(), dailyStreak: 5 },
      });

      await expect(economyService.claimDaily(guildId, userId))
        .rejects.toThrow('Daily already claimed');
    });
  });

  describe('work', () => {
    it('should work for money', async () => {
      guildRepository.getByGuildId.mockResolvedValue({
        economy: { workMin: 50, workMax: 300, workCooldown: 1800000 },
      });

      memberRepository.getOrCreate.mockResolvedValue({
        economy: { lastWork: null },
      });

      memberRepository.getOrCreate.mockReturnValueOnce(Promise.resolve({
        save: vi.fn().mockResolvedValue({}),
      }));

      const result = await economyService.work(guildId, userId);

      expect(result).toHaveProperty('amount');
      expect(result).toHaveProperty('job');
      expect(result.amount).toBeGreaterThanOrEqual(50);
      expect(result.amount).toBeLessThanOrEqual(300);
    });
  });

  describe('buyItem', () => {
    it('should buy item from shop', async () => {
      guildRepository.getByGuildId.mockResolvedValue({
        economy: {
          shop: [{
            itemId: 'item_1',
            name: 'Test Item',
            price: 100,
            roleId: null,
            stock: -1,
            maxPerUser: 1,
            sold: 0,
            hidden: false,
            requirements: { level: 0 },
          }],
        },
      });

      memberRepository.getOrCreate.mockResolvedValue({
        economy: { wallet: 500 },
        leveling: { level: 5 },
        inventory: [],
      });

      memberRepository.removeBalance.mockResolvedValue({});
      memberRepository.addInventoryItem.mockResolvedValue({});
      guildRepository.updateNestedSetting.mockResolvedValue({});

      const result = await economyService.buyItem(guildId, userId, 'item_1', 1);

      expect(result).toEqual({
        success: true,
        item: 'Test Item',
        quantity: 1,
        totalPrice: 100,
      });
    });

    it('should fail if insufficient funds', async () => {
      guildRepository.getByGuildId.mockResolvedValue({
        economy: {
          shop: [{
            itemId: 'item_1',
            name: 'Test Item',
            price: 1000,
            roleId: null,
            stock: -1,
            maxPerUser: 1,
            sold: 0,
          }],
        },
      });

      memberRepository.getOrCreate.mockResolvedValue({
        economy: { wallet: 500 },
      });

      await expect(economyService.buyItem(guildId, userId, 'item_1', 1))
        .rejects.toThrow('Insufficient funds');
    });
  });

  describe('getLeaderboard', () => {
    it('should return leaderboard', async () => {
      memberRepository.find.mockResolvedValue([
        { userId: '1', economy: { wallet: 1000, bank: 500, netWorth: 1500 } },
        { userId: '2', economy: { wallet: 500, bank: 200, netWorth: 700 } },
      ]);
      memberRepository.count.mockResolvedValue(2);

      const result = await economyService.getLeaderboard(guildId, 10, 1);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].rank).toBe(1);
      expect(result.data[0].netWorth).toBe(1500);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });
  });
});