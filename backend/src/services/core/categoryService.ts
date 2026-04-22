import { categoryRepository } from '@repositories/categoryRepository';
import { budgetLineRepository } from '@repositories/budgetLineRepository';
import { transactionRepository } from '@repositories/transactionRepository';
import { AppError } from '@middleware/errorHandler';
import type { Category, CreateCategoryData, UpdateCategoryData } from '@typings/core.types';

// ─── Onboarding Options ────────────────────────────────────────────────────────

export interface OnboardingOptions {
  region: 'CA' | 'US' | 'EU';
  isFreelancer: boolean;
  hasPets: boolean;
  hasKids: boolean;
  isStudent: boolean;
}

// ─── Category Definition Tree ─────────────────────────────────────────────────

interface SubDef {
  name: string;
  icon: string;
  conditional?: (o: OnboardingOptions) => boolean;
}

interface CatDef {
  name: string;
  icon: string;
  color: string;
  isIncome: boolean;
  conditional?: (o: OnboardingOptions) => boolean;
  subcategories: SubDef[];
}

const CATEGORY_DEFS: CatDef[] = [
  // ─── Income ─────────────────────────────────────────────────────────────────
  {
    name: 'Earned Income',
    icon: 'briefcase',
    color: '#22c55e',
    isIncome: true,
    subcategories: [
      { name: 'Salary / Wages', icon: 'banknote' },
      { name: 'Bonus', icon: 'gift' },
      { name: 'Commission', icon: 'percent' },
      { name: 'Tips', icon: 'wallet' },
    ],
  },
  {
    name: 'Freelance / Self-Employment',
    icon: 'laptop',
    color: '#15803d',
    isIncome: true,
    conditional: (o) => o.isFreelancer,
    subcategories: [
      { name: 'Client Payments', icon: 'file-text' },
      { name: 'Contract Work', icon: 'users' },
      { name: 'Consulting', icon: 'users' },
      { name: 'Royalties', icon: 'book-open' },
    ],
  },
  {
    name: 'Investment Income',
    icon: 'trending-up',
    color: '#0f766e',
    isIncome: true,
    subcategories: [
      { name: 'Dividends', icon: 'pie-chart' },
      { name: 'Interest', icon: 'percent' },
      { name: 'Capital Gains', icon: 'trending-up' },
      { name: 'Rental Income', icon: 'home' },
    ],
  },
  {
    name: 'Other Income',
    icon: 'plus-circle',
    color: '#14532d',
    isIncome: true,
    subcategories: [
      { name: 'Gifts Received', icon: 'gift' },
      { name: 'Refunds / Reimbursements', icon: 'undo-2' },
      { name: 'Tax Refund', icon: 'receipt' },
      { name: 'Cashback / Rewards', icon: 'award' },
      { name: 'Sale of Goods', icon: 'tag' },
    ],
  },
  // ─── Expense ─────────────────────────────────────────────────────────────────
  {
    name: 'Housing',
    icon: 'home',
    color: '#3b82f6',
    isIncome: false,
    subcategories: [
      { name: 'Rent / Mortgage', icon: 'key' },
      { name: 'Property Tax', icon: 'landmark' },
      { name: 'Home Insurance', icon: 'shield' },
      { name: 'HOA / Condo Fees', icon: 'building' },
      { name: 'Maintenance & Repairs', icon: 'wrench' },
      { name: 'Furniture & Decor', icon: 'sofa' },
    ],
  },
  {
    name: 'Utilities',
    icon: 'zap',
    color: '#14b8a6',
    isIncome: false,
    subcategories: [
      { name: 'Electricity', icon: 'lightbulb' },
      { name: 'Gas / Heating', icon: 'flame' },
      { name: 'Water & Sewer', icon: 'droplet' },
      { name: 'Internet', icon: 'wifi' },
      { name: 'Mobile Phone', icon: 'smartphone' },
      { name: 'Waste / Recycling', icon: 'trash-2' },
    ],
  },
  {
    name: 'Food',
    icon: 'utensils',
    color: '#5eead4',
    isIncome: false,
    subcategories: [
      { name: 'Groceries', icon: 'shopping-basket' },
      { name: 'Dining Out', icon: 'utensils-crossed' },
      { name: 'Coffee & Cafes', icon: 'coffee' },
      { name: 'Meal Kits', icon: 'repeat' },
      { name: 'Alcohol', icon: 'wine' },
    ],
  },
  {
    name: 'Transportation',
    icon: 'car',
    color: '#0f766e',
    isIncome: false,
    subcategories: [
      { name: 'Fuel / Gas', icon: 'fuel' },
      { name: 'Public Transit', icon: 'train' },
      { name: 'Vehicle Insurance', icon: 'shield-check' },
      { name: 'Vehicle Maintenance', icon: 'wrench' },
      { name: 'Parking & Tolls', icon: 'map-pin' },
      { name: 'Rideshare / Taxi', icon: 'car' },
      { name: 'Vehicle Payment', icon: 'credit-card' },
    ],
  },
  {
    name: 'Health & Wellness',
    icon: 'heart-pulse',
    color: '#ef4444',
    isIncome: false,
    subcategories: [
      { name: 'Medical / Doctor', icon: 'stethoscope' },
      { name: 'Dental', icon: 'smile' },
      { name: 'Vision & Pharmacy', icon: 'pill' },
      { name: 'Health Insurance', icon: 'shield' },
      { name: 'Fitness / Gym', icon: 'dumbbell' },
      { name: 'Therapy / Mental Health', icon: 'brain' },
    ],
  },
  {
    name: 'Shopping',
    icon: 'shopping-bag',
    color: '#eab308',
    isIncome: false,
    subcategories: [
      { name: 'Clothing', icon: 'shirt' },
      { name: 'Electronics', icon: 'monitor' },
      { name: 'Household Goods', icon: 'package' },
      { name: 'Personal Care', icon: 'sparkles' },
      { name: 'Gifts Given', icon: 'gift' },
      { name: 'Memberships', icon: 'badge-check' },
    ],
  },
  {
    name: 'Entertainment',
    icon: 'film',
    color: '#f97316',
    isIncome: false,
    subcategories: [
      { name: 'Streaming Services', icon: 'tv' },
      { name: 'Hobbies', icon: 'palette' },
      { name: 'Events & Tickets', icon: 'ticket' },
      { name: 'Books & Media', icon: 'book-open' },
      { name: 'Gaming', icon: 'gamepad-2' },
      { name: 'Software & Apps', icon: 'monitor' },
    ],
  },
  {
    name: 'Travel',
    icon: 'plane',
    color: '#fdba74',
    isIncome: false,
    subcategories: [
      { name: 'Flights', icon: 'plane-takeoff' },
      { name: 'Accommodation', icon: 'hotel' },
      { name: 'Travel Food', icon: 'utensils' },
      { name: 'Activities', icon: 'map' },
      { name: 'Travel Transport', icon: 'map-pinned' },
    ],
  },
  {
    name: 'Pets',
    icon: 'paw-print',
    color: '#8b5cf6',
    isIncome: false,
    conditional: (o) => o.hasPets,
    subcategories: [
      { name: 'Pet Food', icon: 'bone' },
      { name: 'Vet & Medical', icon: 'stethoscope' },
      { name: 'Grooming', icon: 'scissors' },
      { name: 'Pet Insurance', icon: 'shield' },
      { name: 'Supplies & Toys', icon: 'toy-brick' },
      { name: 'Boarding / Daycare', icon: 'house' },
    ],
  },
  {
    name: 'Kids & Family',
    icon: 'baby',
    color: '#c4b5fd',
    isIncome: false,
    conditional: (o) => o.hasKids,
    subcategories: [
      { name: 'Childcare / Daycare', icon: 'users' },
      { name: "Kids' Clothing", icon: 'shirt' },
      { name: "Kids' Activities", icon: 'bicycle' },
      { name: 'School Supplies', icon: 'pencil' },
      { name: 'Allowance', icon: 'piggy-bank' },
    ],
  },
  {
    name: 'Education',
    icon: 'graduation-cap',
    color: '#1d4ed8',
    isIncome: false,
    conditional: (o) => o.isStudent || o.hasKids,
    subcategories: [
      { name: 'Tuition', icon: 'building' },
      { name: 'Books & Supplies', icon: 'book-open' },
      { name: 'Student Fees', icon: 'receipt', conditional: (o) => o.isStudent },
      { name: 'Student Loan Interest', icon: 'percent', conditional: (o) => o.isStudent },
      { name: 'Courses & Certifications', icon: 'award', conditional: (o) => o.isStudent },
    ],
  },
  {
    name: 'Financial',
    icon: 'landmark',
    color: '#6b7280',
    isIncome: false,
    subcategories: [
      { name: 'Bank Fees', icon: 'banknote' },
      { name: 'Interest Charges', icon: 'percent' },
      { name: 'Professional Services', icon: 'briefcase' },
      { name: 'Charitable Donations', icon: 'heart-handshake' },
    ],
  },
  {
    name: 'Taxes',
    icon: 'receipt',
    color: '#b91c1c',
    isIncome: false,
    subcategories: [
      { name: 'Income Tax', icon: 'file-text', conditional: (o) => o.region !== 'US' },
      { name: 'Federal Income Tax', icon: 'file-text', conditional: (o) => o.region === 'US' },
      { name: 'State Income Tax', icon: 'map-pin', conditional: (o) => o.region === 'US' },
      { name: 'CPP', icon: 'landmark', conditional: (o) => o.region === 'CA' },
      { name: 'EI', icon: 'shield', conditional: (o) => o.region === 'CA' },
      { name: 'FICA', icon: 'landmark', conditional: (o) => o.region === 'US' },
      { name: 'Sales Tax (GST/HST/PST)', icon: 'percent', conditional: (o) => o.region === 'CA' },
      { name: 'Sales Tax', icon: 'percent', conditional: (o) => o.region === 'US' },
      { name: 'VAT', icon: 'percent', conditional: (o) => o.region === 'EU' },
      { name: 'Social Contributions', icon: 'landmark', conditional: (o) => o.region === 'EU' },
      { name: 'Self-Employment Tax', icon: 'briefcase', conditional: (o) => o.isFreelancer },
    ],
  },
  {
    name: 'Debt Payments',
    icon: 'credit-card',
    color: '#7f1d1d',
    isIncome: false,
    subcategories: [
      { name: 'Credit Card Payment', icon: 'credit-card' },
      { name: 'Vehicle Loan', icon: 'car' },
      { name: 'Student Loan', icon: 'graduation-cap', conditional: (o) => o.isStudent },
      { name: 'Personal Loan', icon: 'wallet' },
      { name: 'Line of Credit', icon: 'file-text' },
      { name: 'Other Debt', icon: 'wallet' },
    ],
  },
  {
    name: 'Transfers',
    icon: 'arrow-right-left',
    color: '#374151',
    isIncome: false,
    subcategories: [
      { name: 'Account Transfer', icon: 'arrow-right-left' },
      { name: 'Reimbursement', icon: 'undo-2' },
    ],
  },
  {
    name: 'Savings & Investments',
    icon: 'piggy-bank',
    color: '#374151',
    isIncome: false,
    subcategories: [
      { name: 'Emergency Fund', icon: 'shield-alert' },
      { name: 'Goal Savings', icon: 'target' },
      { name: 'Brokerage / General Investment', icon: 'trending-up' },
      { name: 'RRSP', icon: 'landmark', conditional: (o) => o.region === 'CA' },
      { name: 'TFSA', icon: 'piggy-bank', conditional: (o) => o.region === 'CA' },
      { name: 'FHSA', icon: 'home', conditional: (o) => o.region === 'CA' },
      { name: 'RESP', icon: 'graduation-cap', conditional: (o) => o.region === 'CA' && o.hasKids },
      { name: '401(k)', icon: 'landmark', conditional: (o) => o.region === 'US' },
      { name: 'Roth IRA', icon: 'piggy-bank', conditional: (o) => o.region === 'US' },
      { name: 'Traditional IRA', icon: 'piggy-bank', conditional: (o) => o.region === 'US' },
      { name: 'HSA', icon: 'heart-pulse', conditional: (o) => o.region === 'US' },
      {
        name: '529 Plan',
        icon: 'graduation-cap',
        conditional: (o) => o.region === 'US' && o.hasKids,
      },
      { name: 'Pension Contribution', icon: 'landmark', conditional: (o) => o.region === 'EU' },
    ],
  },
  {
    name: 'Uncategorized',
    icon: 'help-circle',
    color: '#111827',
    isIncome: false,
    subcategories: [
      { name: 'To Review', icon: 'alert-circle' },
      { name: 'Other', icon: 'more-horizontal' },
    ],
  },
];

export interface CategoryUsage {
  transactionCount: number;
  budgetLineCount: number;
}

class CategoryService {
  /**
   * Seeds the full category hierarchy for a new household based on onboarding answers.
   * Creates parent categories first (to get IDs), then batches subcategories.
   */
  async seedDefaultsForHousehold(householdId: string, opts: OnboardingOptions): Promise<void> {
    for (const def of CATEGORY_DEFS) {
      if (def.conditional && !def.conditional(opts)) continue;

      const parent = await categoryRepository.create({
        householdId,
        name: def.name,
        icon: def.icon,
        color: def.color,
        isIncome: def.isIncome,
      });

      const subs: CreateCategoryData[] = def.subcategories
        .filter((s) => !s.conditional || s.conditional(opts))
        .map((s) => ({
          householdId,
          name: s.name,
          icon: s.icon,
          isIncome: def.isIncome,
          parentId: parent.id,
        }));

      if (subs.length > 0) {
        await categoryRepository.createBatch(subs);
      }
    }
  }

  async listCategories(householdId: string): Promise<Category[]> {
    return categoryRepository.findAllForHousehold(householdId);
  }

  async getCategory(householdId: string, id: string): Promise<Category> {
    const category = await categoryRepository.findById(id, householdId);
    if (!category) throw new AppError('Category not found', 404);
    return category;
  }

  async getCategoryUsage(householdId: string, id: string, userId: string): Promise<CategoryUsage> {
    const category = await categoryRepository.findById(id, householdId);
    if (!category) throw new AppError('Category not found', 404);
    const [transactionCount, budgetLineCount] = await Promise.all([
      budgetLineRepository.countTransactionsByCategoryId(userId, id),
      budgetLineRepository.countByCategoryId(userId, id),
    ]);
    return { transactionCount, budgetLineCount };
  }

  async createCategory(
    householdId: string,
    input: Omit<CreateCategoryData, 'householdId'>
  ): Promise<Category> {
    return categoryRepository.create({ ...input, householdId });
  }

  async updateCategory(
    householdId: string,
    id: string,
    input: UpdateCategoryData
  ): Promise<Category> {
    const existing = await categoryRepository.findById(id, householdId);
    if (!existing) throw new AppError('Category not found', 404);

    const updated = await categoryRepository.update(id, householdId, input);
    return updated!;
  }

  /**
   * Reassigns all transactions from one category to another, then archives the source.
   * `targetCategoryId` may be null to simply clear the category on those transactions.
   */
  async reassignAndArchive(
    householdId: string,
    id: string,
    userId: string,
    targetCategoryId: string | null
  ): Promise<{ reassigned: number }> {
    const existing = await categoryRepository.findById(id, householdId);
    if (!existing) throw new AppError('Category not found', 404);

    if (targetCategoryId) {
      const target = await categoryRepository.findById(targetCategoryId, householdId);
      if (!target) throw new AppError('Target category not found', 404);
    }

    const reassigned = await transactionRepository.reassignCategory(userId, id, targetCategoryId);
    await categoryRepository.softDelete(id, householdId);
    return { reassigned };
  }

  async archiveCategory(householdId: string, id: string): Promise<void> {
    const existing = await categoryRepository.findById(id, householdId);
    if (!existing) throw new AppError('Category not found', 404);
    if (!existing.isActive) throw new AppError('Category is already archived', 409);

    await categoryRepository.softDelete(id, householdId);
  }
}

export const categoryService = new CategoryService();
