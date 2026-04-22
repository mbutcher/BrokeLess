import { categoryService, type OnboardingOptions } from '@services/core/categoryService';
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

const defaultOpts: OnboardingOptions = {
  region: 'CA',
  isFreelancer: false,
  hasPets: false,
  hasKids: false,
  isStudent: false,
};

describe('categoryService.seedDefaultsForHousehold', () => {
  it('creates top-level categories and their subcategories', async () => {
    mockRepo.create.mockResolvedValue({ ...mockCategory, id: 'parent-1' });
    mockRepo.createBatch.mockResolvedValue();

    await categoryService.seedDefaultsForHousehold(HOUSEHOLD_ID, defaultOpts);

    // Every call to create should be a top-level (no parentId)
    for (const call of mockRepo.create.mock.calls) {
      const [data] = call;
      expect(data.householdId).toBe(HOUSEHOLD_ID);
      expect(data.parentId).toBeUndefined();
    }

    // createBatch calls should all have parentId set
    for (const call of mockRepo.createBatch.mock.calls) {
      const [rows] = call;
      for (const row of rows ?? []) {
        expect(row.householdId).toBe(HOUSEHOLD_ID);
        expect(row.parentId).toBe('parent-1');
      }
    }
  });

  it('excludes conditional categories when opts do not match', async () => {
    mockRepo.create.mockResolvedValue({ ...mockCategory, id: 'parent-1' });
    mockRepo.createBatch.mockResolvedValue();

    const callsBefore = mockRepo.create.mock.calls.length;
    await categoryService.seedDefaultsForHousehold(HOUSEHOLD_ID, {
      ...defaultOpts,
      hasPets: false,
      hasKids: false,
      isFreelancer: false,
      isStudent: false,
    });
    const totalCalls = mockRepo.create.mock.calls.length - callsBefore;

    // Pets, Kids, Education, Freelance categories should be excluded
    const names = mockRepo.create.mock.calls.slice(callsBefore).map(([d]) => d.name);
    expect(names).not.toContain('Pets');
    expect(names).not.toContain('Kids & Family');
    expect(names).not.toContain('Education');
    expect(names).not.toContain('Freelance / Self-Employment');
    expect(totalCalls).toBeGreaterThan(0);
  });

  it('includes conditional categories when opts match', async () => {
    mockRepo.create.mockResolvedValue({ ...mockCategory, id: 'parent-1' });
    mockRepo.createBatch.mockResolvedValue();

    const callsBefore = mockRepo.create.mock.calls.length;
    await categoryService.seedDefaultsForHousehold(HOUSEHOLD_ID, {
      ...defaultOpts,
      hasPets: true,
      hasKids: true,
      isFreelancer: true,
      isStudent: true,
    });

    const names = mockRepo.create.mock.calls.slice(callsBefore).map(([d]) => d.name);
    expect(names).toContain('Pets');
    expect(names).toContain('Kids & Family');
    expect(names).toContain('Education');
    expect(names).toContain('Freelance / Self-Employment');
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
