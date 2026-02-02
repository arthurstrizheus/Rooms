# Tax Depreciation System - Implementation Roadmap

## Current Status: Phase 1 Complete ✅

**Implemented:**

- Section 179 vehicle limit validation
- Vehicle classification (UNKNOWN, PASSENGER_AUTO, SUV_LIMITED_179, HEAVY_TRUCK)
- Database fields: vehicle_class, requires_manual_confirmation, validation_warnings_json
- Frontend UI for vehicle classification
- Admin interface for managing federal vehicle limits
- Validation error display to users

---

## Comprehensive Requirements Analysis

### Asset Profile

**Primary Use Case:** Equipment/machinery tracking system

- **Equipment Types:** Lab equipment, manufacturing machinery, computers, vehicles
- **Asset Category:** Personal property (not real estate/buildings)
- **Business Use:** Currently assumes 100% business use
- **Volume:** Individual asset tracking (not bulk/mass asset management)

---

## Phase 2: Critical Tax Rules (PRIORITY)

### 2.1 Bonus Depreciation Phase-Down ⚠️ URGENT

**Impact:** Directly affects depreciation calculations NOW (2024-2027)

**Status:** JSON created ✅ `bonus-depreciation-rates.json`

**Implementation Needed:**

1. Load bonus rates at startup (similar to vehicle limits)
2. Update depreciation calculation to use year-specific bonus %
3. Display bonus % when entering tax data (e.g., "2024: 60% bonus available")
4. Allow override for assets that don't qualify for bonus

**Files:**

- `backend/depreciation/rules/bonus-depreciation-rates.json` ✅ Created
- `backend/depreciation/rules/bonusRatesLoader.js` - Need to create
- `backend/depreciation/services/federalDepreciationService.js` - Update bonus calculation

**UI Changes:**

- Show available bonus % for placed-in-service year
- Add tooltip: "Bonus depreciation is 60% for 2024, phasing to 0% by 2027"

---

### 2.2 Section 179 Overall Limits

**Impact:** Current system only checks vehicle-specific caps, not overall $1.22M limit

**Status:** JSON created ✅ `section179-limits.json`

**Implementation Needed:**

1. Load §179 limits at startup
2. Add validation to check:
    - Individual asset §179 ≤ maxDeduction for year
    - Warning if user might hit phase-out threshold (informational only)
3. Add note about taxable income limitation (can't validate without return data)

**Files:**

- `backend/depreciation/rules/section179-limits.json` ✅ Created
- `backend/depreciation/validators/section179Validator.js` - Update with overall limit check

**UI Changes:**

- Display max §179 for year (e.g., "2024 max: $1,220,000")
- Warning: "§179 limited to taxable income - verify with tax preparer"

---

### 2.3 Passenger Auto Limits (280F)

**Impact:** Completely separate from SUV caps, affects actual passenger cars

**Status:** JSON created ✅ `passenger-auto-limits.json`

**Implementation Needed:**

1. Load 280F limits at startup
2. Update PASSENGER_AUTO classification to use these limits
3. Apply year-by-year depreciation caps (not just first year)
4. Track which year of depreciation asset is in

**Files:**

- `backend/depreciation/rules/passenger-auto-limits.json` ✅ Created
- `backend/depreciation/validators/passengerAutoValidator.js` - Create new
- Update `section179Validator.js` to reference 280F for PASSENGER_AUTO

**Database:**

- Add `depreciation_year` field to track which year (1-4+) asset is in

**UI Changes:**

- For PASSENGER_AUTO: Show year-specific caps
- Example: "Year 1 max (with bonus): $20,400 | Year 1 (no bonus): $12,400"

---

## Phase 3: Depreciation Mechanics (IMPORTANT)

### 3.1 MACRS Conventions

**Impact:** Affects first-year depreciation calculation

**Current Assumption:** System likely uses half-year convention always

**Implementation Needed:**

1. Add `convention` field to AssetTaxMeta (already in migration ✅)
2. For personal property:
    - Default to 'half-year'
    - Implement mid-quarter trigger check (if >40% of basis placed in Q4)
3. For real property (if ever supported):
    - Use 'mid-month' convention

**Mid-Quarter Detection:**

- Requires year-level aggregation of all assets
- Check if total Q4 basis > 40% of total year basis
- If triggered, ALL assets use mid-quarter for that year

**Database:**

- ✅ Migration created with `convention` field

**UI Changes:**

- Add convention dropdown (optional, defaults to half-year)
- Warning: "Mid-quarter convention may apply if >40% of assets placed in Q4"

---

### 3.2 Disposal Tracking

**Impact:** Needed for gain/loss calculations and recapture

**Status:** Migration created ✅

**Implementation Needed:**

1. Add disposal date, sale proceeds, disposal method fields
2. UI to mark asset as disposed
3. Calculate:
    - Adjusted basis at disposal
    - Gain/loss on sale
    - §179 recapture if business use dropped <50%
    - Bonus recapture if sold within 5 years to related party

**Database:**

- ✅ Migration created with disposal_date, sale_proceeds, disposal_method

**UI Changes:**

- "Dispose Asset" button in equipment details
- Form: disposal date, method (sold/traded/scrapped/donated), proceeds

---

## Phase 4: Company-Level Settings (MEDIUM PRIORITY)

### 4.1 De Minimis Safe Harbor

**Impact:** Can expense items <$2,500 (or $5,000) instead of depreciating

**Implementation Needed:**

1. Add Office/Company settings table or JSON config
2. Fields:
    - `usesDeMinimisSafeHarbor: boolean`
    - `deMinimisThreshold: number` (2500 or 5000)
3. Check during asset save:
    - If cost < threshold and election in effect → flag as "expensable"
    - Show warning: "This asset may qualify for de minimis safe harbor expensing"

**Storage Options:**

- Add to Office model (if per-location)
- Create CompanySettings JSON file (if system-wide)

---

### 4.2 Accounting Treatment Flag

**Impact:** Distinguish between capital improvements vs repairs

**Implementation Needed:**

1. Add `accounting_treatment` field to AssetTaxMeta
    - Values: 'capitalize', 'expense', 'repair', 'out for calibration'
2. If 'expense' or 'repair' → don't include in depreciation report

**Database:**

- Add field in migration

**UI Changes:**

- Dropdown: "Accounting Treatment"
    - Capitalize and Depreciate (default)
    - Expense Immediately (repairs)
    - De Minimis Safe Harbor

---

## Phase 5: State Tax Rules (ONGOING)

### Current Status:

- State-specific tax rules management dialog exists ✅
- Rules stored per-office in database
- Can configure bonus/179 treatment by state

### Enhancement Needed:

- Ensure bonus depreciation rules reference year-specific federal rates
- Add state-level de minimis thresholds (some states have different limits)

---

## Database Schema Additions Summary

### AssetTaxMeta - New Fields (Migration: 20260129_add_comprehensive_tax_fields.sql)

```sql
-- Phase 2 additions
convention VARCHAR(20)              -- 'half-year', 'mid-quarter', 'mid-month'
disposal_date DATE
sale_proceeds DECIMAL(10, 2)
disposal_method VARCHAR(50)         -- 'sold', 'traded', 'scrapped', 'donated'
property_type VARCHAR(20)           -- 'personal_property', 'real_property'

-- Future Phase 4
accounting_treatment VARCHAR(20)    -- 'capitalize', 'expense', 'repair'
depreciation_year INT               -- Track which year (1, 2, 3...) for 280F limits
```

### CompanySettings Table (Future)

```sql
CREATE TABLE [Equipment-CompanySettings] (
    id INT PRIMARY KEY,
    uses_de_minimis_safe_harbor BIT DEFAULT 0,
    de_minimis_threshold DECIMAL(10, 2) DEFAULT 2500,
    default_convention VARCHAR(20) DEFAULT 'half-year',
    check_mid_quarter BIT DEFAULT 1,
    updated_at DATETIME,
    updated_by INT
);
```

---

## Implementation Priority

### Phase 2A: Immediate (Affects 2024/2025 Returns) 🔴

1. **Bonus depreciation loader** - 60% vs 40% matters NOW
2. **Section 179 overall limit check** - Users may exceed $1.22M
3. **Passenger auto 280F limits** - Separate validation needed

### Phase 2B: Short-term (1-2 weeks) 🟡

4. Convention field and mid-quarter detection
5. Disposal tracking (date, proceeds, method)

### Phase 3: Medium-term (1-2 months) 🟢

6. De minimis safe harbor settings
7. Accounting treatment classification
8. Depreciation year tracking for 280F

### Phase 4: Long-term (Future) ⚪

9. Recapture calculations (§179, bonus)
10. Gain/loss on disposal
11. Mixed-use asset support (partial business use %)

---

## Questions for User

1. **Asset Types Breakdown:**
    - What % are vehicles vs other equipment?
    - Do you track computers/IT equipment separately?
    - Any real property improvements (building upgrades)?

2. **Volume:**
    - How many assets placed in service per year?
    - Typical cost range ($1k-$10k, $10k-$100k, $100k+)?

3. **State Tax Scope:**
    - Which states matter most (Ohio, Florida, NC, GA from context)?
    - Do you need multi-state depreciation reports?

4. **Disposal Frequency:**
    - Do assets get sold/traded often?
    - Need to track trade-ins?

5. **De Minimis:**
    - Do you have an applicable financial statement (AFS)?
    - If yes → $5,000 threshold
    - If no → $2,500 threshold

---

## Technical Implementation Notes

### Bonus Depreciation Loader

```javascript
// backend/depreciation/rules/bonusRatesLoader.js
const getBonusPercentForYear = (taxYear) => {
    // Load from bonus-depreciation-rates.json
    // Return decimal (0.60 for 60%, 0.40 for 40%)
};
```

### Updated Depreciation Calculation

```javascript
// backend/depreciation/services/federalDepreciationService.js
function computeBonus(asset, taxYear) {
    if (!asset.bonus_eligible) return 0;

    const bonusRate = getBonusPercentForYear(taxYear); // 0.60, 0.40, etc.
    const placedYear = getPlacedInServiceYear(asset);

    if (taxYear !== placedYear) return 0; // Bonus only in year 1

    const basisAfter179 = asset.cost_basis - (asset.section179_elected || 0);
    return basisAfter179 * bonusRate;
}
```

### Section 179 Overall Limit Check

```javascript
// backend/depreciation/validators/section179Validator.js
const section179Limits = loadSection179Limits();
const yearLimits = section179Limits.limitsByYear[taxYear];

if (section179Amount > yearLimits.maxDeduction) {
    result.errors.push(
        `Section 179 deduction ($${section179Amount.toLocaleString()}) exceeds overall limit of $${yearLimits.maxDeduction.toLocaleString()} for ${taxYear}`,
    );
}

if (totalCompanyBasis > yearLimits.phaseoutThreshold) {
    result.warnings.push(
        `Company placed >$${yearLimits.phaseoutThreshold.toLocaleString()} in service. Section 179 may phase out. Verify with tax preparer.`,
    );
}
```

---

## Testing Checklist

### Phase 2A Tests

- [ ] 2024 asset with 60% bonus calculates correctly
- [ ] 2025 asset with 40% bonus calculates correctly
- [ ] Section 179 > $1,220,000 triggers error
- [ ] PASSENGER_AUTO with §179 uses 280F year 1 limit ($20,400 w/ bonus)
- [ ] SUV with §179 uses vehicle-specific cap ($30,500 for 2024)
- [ ] Heavy truck >14k lbs not limited by vehicle caps

### Phase 2B Tests

- [ ] Mid-quarter triggers when >40% placed in Q4
- [ ] Disposal date captures and prevents depreciation after disposal
- [ ] Gain/loss calculates: sale_proceeds - adjusted_basis

---

## Summary for User

**Implemented Today:**

1. ✅ Created bonus-depreciation-rates.json (2018-2027, phase-down to 0%)
2. ✅ Created section179-limits.json (overall limits + thresholds)
3. ✅ Created passenger-auto-limits.json (280F annual caps)
4. ✅ Created migration for disposal tracking & convention fields

**Next Steps (Phase 2A - Immediate Priority):**

1. Create bonusRatesLoader.js to load/cache bonus rates
2. Update federalDepreciationService.js to use year-specific bonus %
3. Update section179Validator.js to check overall $1.22M limit
4. Create passengerAutoValidator.js for 280F annual cap enforcement
5. Update UI to display:
    - Available bonus % for year
    - Max §179 for year
    - 280F limits for passenger autos

**Tell me:**

- Asset volume and types to tailor implementation
- Which phases to prioritize next
- Any questions on the roadmap

This sets up a production-ready system that handles the full IRS depreciation maze, not just vehicles! 🎯
