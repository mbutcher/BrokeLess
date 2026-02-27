import { budgetService } from '@services/core/budgetService';
import { budgetRepository } from '@repositories/budgetRepository';

jest.mock('@repositories/budgetRepository');
const mockRepo = budgetRepository as jest.Mocked<typeof budgetRepository>;

const USER_ID = 'user-123';
const BUDGET_ID = 'budget-456';

const mockBudget = {
  id: BUDGET_ID,
  userId: USER_ID,
  name: 'February 2026',
  startDate: new Date('2026-02-01'),
  endDate: new Date('2026-02-28'),
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('budgetService.getBudget', () => {
  it('returns budget when found', async () => {
    mockRepo.findById.mockResolvedValue(mockBudget);
    const budget = await budgetService.getBudget(USER_ID, BUDGET_ID);
    expect(budget).toEqual(mockBudget);
  });

  it('throws 404 when not found', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(budgetService.getBudget(USER_ID, BUDGET_ID)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('budgetService.createBudget', () => {
  it('throws 422 when startDate >= endDate', async () => {
    await expect(
      budgetService.createBudget(USER_ID, {
        name: 'Bad',
        startDate: '2026-03-01',
        endDate: '2026-02-01',
      })
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('throws 422 when startDate equals endDate', async () => {
    await expect(
      budgetService.createBudget(USER_ID, {
        name: 'Bad',
        startDate: '2026-02-01',
        endDate: '2026-02-01',
      })
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('creates budget with valid dates', async () => {
    mockRepo.create.mockResolvedValue(mockBudget);
    const budget = await budgetService.createBudget(USER_ID, {
      name: 'February 2026',
      startDate: '2026-02-01',
      endDate: '2026-02-28',
    });
    expect(budget).toEqual(mockBudget);
    expect(mockRepo.create).toHaveBeenCalledWith({
      userId: USER_ID,
      name: 'February 2026',
      startDate: '2026-02-01',
      endDate: '2026-02-28',
    });
  });
});

describe('budgetService.updateBudget', () => {
  it('throws 404 when not found', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(
      budgetService.updateBudget(USER_ID, BUDGET_ID, { name: 'New' })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 422 when updated dates are invalid', async () => {
    mockRepo.findById.mockResolvedValue(mockBudget);
    await expect(
      budgetService.updateBudget(USER_ID, BUDGET_ID, { endDate: '2025-01-01' }) // before existing startDate
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('updates successfully', async () => {
    mockRepo.findById.mockResolvedValue(mockBudget);
    mockRepo.update.mockResolvedValue({ ...mockBudget, name: 'Updated' });
    const result = await budgetService.updateBudget(USER_ID, BUDGET_ID, { name: 'Updated' });
    expect(result.name).toBe('Updated');
  });
});

describe('budgetService.deleteBudget', () => {
  it('throws 404 when not found', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(budgetService.deleteBudget(USER_ID, BUDGET_ID)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('deletes budget', async () => {
    mockRepo.findById.mockResolvedValue(mockBudget);
    mockRepo.delete.mockResolvedValue();
    await budgetService.deleteBudget(USER_ID, BUDGET_ID);
    expect(mockRepo.delete).toHaveBeenCalledWith(BUDGET_ID, USER_ID);
  });
});

describe('budgetService.getBudgetProgress', () => {
  it('throws 404 when not found', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(budgetService.getBudgetProgress(USER_ID, BUDGET_ID)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('returns aggregated totals', async () => {
    const mockCategory = {
      id: 'cat-1',
      userId: USER_ID,
      name: 'Groceries',
      color: '#f59e0b',
      icon: null,
      isIncome: false,
      parentId: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockRepo.findById.mockResolvedValue(mockBudget);
    mockRepo.getBudgetProgress.mockResolvedValue([
      { category: mockCategory, allocated: 500, spent: 300, remaining: 200 },
      {
        category: { ...mockCategory, id: 'cat-2', name: 'Dining' },
        allocated: 200,
        spent: 250,
        remaining: -50,
      },
    ]);
    const result = await budgetService.getBudgetProgress(USER_ID, BUDGET_ID);
    expect(result.totalAllocated).toBe(700);
    expect(result.totalSpent).toBe(550);
    expect(result.totalRemaining).toBe(150);
    expect(result.categories).toHaveLength(2);
  });
});
