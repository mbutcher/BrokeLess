import { categoryService } from '@services/core/categoryService';
import { categoryRepository } from '@repositories/categoryRepository';

jest.mock('@repositories/categoryRepository');
const mockRepo = categoryRepository as jest.Mocked<typeof categoryRepository>;

const USER_ID = 'user-123';
const HOUSEHOLD_ID = 'household-123';
const CAT_ID = 'cat-456';

const mockCategory = {
  id: CAT_ID,
  householdId: HOUSEHOLD_ID,
  name: 'Groceries',
  color: '#f59e0b',
  icon: 'shopping-cart',
  isIncome: false,
  parentId: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('categoryService.seedDefaultsForHousehold', () => {
  it('calls createBatch with 20 categories', async () => {
    mockRepo.createBatch.mockResolvedValue();
    await categoryService.seedDefaultsForHousehold(HOUSEHOLD_ID);
    expect(mockRepo.createBatch).toHaveBeenCalledTimes(1);
    const [categories] = mockRepo.createBatch.mock.calls[0] ?? [];
    expect(categories).toHaveLength(20);
    expect(categories?.every((c) => c.householdId === HOUSEHOLD_ID)).toBe(true);
    // 5 income + 15 expense categories
    const income = categories?.filter((c) => c.isIncome);
    const expense = categories?.filter((c) => !c.isIncome);
    expect(income).toHaveLength(5);
    expect(expense).toHaveLength(15);
  });
});

describe('categoryService.getCategory', () => {
  it('returns category when found', async () => {
    mockRepo.findById.mockResolvedValue(mockCategory);
    const cat = await categoryService.getCategory(USER_ID, CAT_ID);
    expect(cat).toEqual(mockCategory);
  });

  it('throws 404 when not found', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(categoryService.getCategory(USER_ID, CAT_ID)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('categoryService.archiveCategory', () => {
  it('throws 409 when already archived', async () => {
    mockRepo.findById.mockResolvedValue({ ...mockCategory, isActive: false });
    await expect(categoryService.archiveCategory(USER_ID, CAT_ID)).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('archives active category', async () => {
    mockRepo.findById.mockResolvedValue(mockCategory);
    mockRepo.softDelete.mockResolvedValue();
    await categoryService.archiveCategory(USER_ID, CAT_ID);
    expect(mockRepo.softDelete).toHaveBeenCalledWith(CAT_ID, USER_ID);
  });
});
