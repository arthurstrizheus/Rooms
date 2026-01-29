# Tax Rules Management System

## Overview

This system allows administrators to manage state and federal tax depreciation rules through the UI instead of manually editing `state-depreciation-rules.json`. The system preserves historical accuracy by using year ranges, ensuring that reports for past years use the tax rules that were in effect at that time.

## How It Works

### Year Range System

Each tax rule has:

- `effectiveFromTaxYear`: The first tax year this rule applies to
- `effectiveToTaxYear`: The last tax year this rule applies to (or `null` for ongoing rules)

**Example:**

```json
{
    "taxType": "STATE_BUSINESS_INCOME_OR_FRANCHISE",
    "effectiveFromTaxYear": 2018,
    "effectiveToTaxYear": 2026,
    "ruleType": "addback_bonus_plus_179_over_threshold",
    "section179Threshold": 25000
}
```

When generating a depreciation report:

- Report for 2024 uses rules where `2024` is between `effectiveFromTaxYear` and `effectiveToTaxYear`
- Report for 2027 uses rules that were added for 2027 (after closing the 2018-2026 range)
- Report for 2020 still uses the 2018-2026 rules (historical accuracy preserved)

### When Tax Laws Change

**Scenario:** Ohio changes its Section 179 threshold from $25,000 to $30,000 starting in 2027.

**Steps:**

1. **Close the existing range**: Set `effectiveToTaxYear: 2026` on the current rule
2. **Add new rule**: Create a new rule with `effectiveFromTaxYear: 2027, effectiveToTaxYear: null`

This ensures:

- Reports for 2018-2026 still use the $25,000 threshold
- Reports for 2027+ use the new $30,000 threshold
- Historical accuracy is maintained

## Using the UI

### Accessing Tax Rules Management

1. Navigate to **Depreciation Reports** page
2. Select an office from the dropdown
3. Click **"Manage Tax Rules"** button (only visible to admins)

### Three-Step Workflow

#### Step 1: View Current Rules

- See all active tax rules for the selected office
- Each rule shows:
    - Tax type (Federal or State)
    - Rule type (e.g., "Addback bonus + 179 over threshold")
    - Year range (e.g., "2018 - 2026" or "2018 - Ongoing")
    - Parameters (section179Threshold, spreadYears, etc.)
    - Government sources (URLs to tax authority documentation)

#### Step 2: Add New Rule

- Select tax type (Federal or State)
- Select rule type from dropdown
- Set year range:
    - **From Year**: First year this rule applies
    - **To Year**: Last year (leave blank for ongoing)
- Enter parameters based on rule type:
    - **Threshold rules**: Section 179 threshold amount
    - **Spread rules**: Number of years to spread depreciation
    - **Other rules**: Specific parameters as needed
- Add government source URLs (IRS publications, state tax authority pages)

**Validation:**

- System prevents overlapping year ranges
- If overlap detected, you'll see: _"Year range 2027-ongoing overlaps with existing range 2018-ongoing. Close the existing range by setting effectiveToTaxYear before adding a new range."_

#### Step 3: Close Existing Rule

- Select which tax type rule to close
- Enter the **End Year** (last year the current rule applies)
- This prepares the system to accept a new rule starting the following year

### Rule Types Available

1. **generally_no_addback**: State generally conforms to federal depreciation
2. **addback_bonus_plus_179_over_threshold**: State requires addback of federal bonus + Section 179 over a threshold
3. **addback_then_subtract_spread**: State requires addback then allows subtraction spread over multiple years
4. **recompute_depreciation_as_if_no_168k**: State requires recomputing depreciation without IRC Section 168(k) bonus
5. **proforma_difference_federal_asfiled_vs_without_decoupled**: Compare federal as-filed vs without decoupled provisions
6. **il_4562_reverse_federal_bonus**: Illinois-specific reversal of federal bonus depreciation
7. **texas_franchise_margin_based**: Texas franchise tax margin-based system

## Backend API

### Endpoints

- `GET /api/tax-rules` - Get all tax rules (all offices)
- `GET /api/tax-rules/rule-types` - Get available rule types with descriptions
- `GET /api/tax-rules/offices/:officeid` - Get rules for specific office
- `POST /api/tax-rules/offices/:officeid` - Add new rule to office
- `PUT /api/tax-rules/offices/:officeid/close` - Close existing year range

### Controller Functions

Located in: `backend/controllers/taxRulesController.js`

- `GetAllRules()`: Returns entire state-depreciation-rules.json
- `GetRuleTypes()`: Returns array of 7 available rule types
- `GetRulesByOffice(officeid)`: Returns rules for specific office
- `UpdateOfficeRules(officeid, newRule)`: Validates no overlap, adds new year range, updates version, clears cache
- `CloseYearRange(officeid, taxType, endYear)`: Sets effectiveToTaxYear on ongoing ranges

### Validation & Safety

**Overlap Detection:**

```javascript
// Checks if new year range overlaps with existing ranges
for (const params of parametersByYear) {
    if (
        (fromYear >= existingFrom && fromYear <= existingTo) ||
        (toYear >= existingFrom && toYear <= existingTo) ||
        (fromYear <= existingFrom && toYear >= existingTo)
    ) {
        return res.status(400).json({
            success: false,
            message: `Year range ${fromYear}-${toYear} overlaps with existing range ${existingFrom}-${existingTo}`,
            suggestion:
                "Close the existing range by setting effectiveToTaxYear before adding a new range",
        });
    }
}
```

**Version Tracking:**

- state-depreciation-rules.json includes `version` field (YYYY-MM-DD format)
- Automatically updated when rules are modified
- Helps track when changes were made

**Cache Clearing:**

```javascript
delete require.cache[require.resolve("../depreciation/rules/ruleLoader")];
```

- After modifying state-depreciation-rules.json, cache is cleared
- Ensures next request loads updated rules

## File Structure

```
backend/
  controllers/
    taxRulesController.js     # CRUD operations for tax rules
  routes/
    taxRules.js               # Route definitions for /api/tax-rules
  depreciation/
    rules/
      ruleLoader.js                      # Read-only loader, finds applicable rule by year
      state-depreciation-rules.json      # Source of truth for state tax rules

src/
  Views/
    Pages/
      DepreciationReports/
        TaxRulesManagementDialog.js  # UI component (3-step wizard)
        DepreciationReports.js       # Parent page with "Manage Tax Rules" button
```

## Common Scenarios

### Scenario 1: New Tax Law Takes Effect

**Problem:** Florida changes depreciation spread from 7 years to 5 years starting in 2028.

**Solution:**

1. Open Tax Rules Management dialog for Florida office
2. Go to Step 3: Close Existing Rule
3. Select "STATE_BUSINESS_INCOME_OR_FRANCHISE"
4. Enter End Year: 2027
5. Click "Close Year Range"
6. Go to Step 2: Add New Rule
7. Select tax type: State
8. Select rule type: "Addback then subtract spread over multiple years"
9. From Year: 2028, To Year: (blank for ongoing)
10. Spread Years: 5
11. Add government sources (Florida DOR link)
12. Click "Add Rule"

Result: Reports for 2027 and earlier use 7-year spread, 2028+ use 5-year spread.

### Scenario 2: State Adopts Conformity

**Problem:** Maryland decides to conform to federal bonus depreciation starting in 2029.

**Solution:**

1. Close existing Maryland STATE_BUSINESS_INCOME_OR_FRANCHISE rule at 2028
2. Add new rule:
    - Rule type: "generally_no_addback"
    - From Year: 2029
    - To Year: (blank)
3. Add Maryland Comptroller URL as source

Result: Maryland reports for 2028 and earlier use old rules, 2029+ conform to federal.

### Scenario 3: Threshold Adjustment

**Problem:** Ohio increases Section 179 addback threshold from $25,000 to $50,000 in 2026.

**Solution:**

1. Close Ohio STATE rule at 2025
2. Add new rule:
    - Rule type: "Addback bonus + 179 over threshold"
    - From Year: 2026
    - Section 179 Threshold: 50000
    - Add Ohio DOR link

Result: Ohio reports use $25k threshold for years before 2026, $50k for 2026+.

## Government Source Management

Each rule includes `sources` array with URLs to official documentation:

```json
"sources": [
  "https://www.irs.gov/publications/p946",
  "https://tax.ohio.gov/business/ohio-business-taxes/depreciation"
]
```

**Best Practices:**

- Always include IRS Publication 946 for federal rules
- Link to state tax authority pages for state rules
- Include direct links to specific guidance (e.g., "Ohio Rev. Code Section 5733.04")
- Update sources when URLs change

## Security

- Only users with `admin` or `equipment_admin` flags can access Tax Rules Management
- All API endpoints require authentication via JWT token
- File system operations protected by backend validation
- Overlap detection prevents accidental data corruption

## Troubleshooting

### "Overlap detected" error

**Cause:** Trying to add a new rule that overlaps with an existing year range.

**Solution:** Close the existing rule first by setting its `effectiveToTaxYear`, then add the new rule.

### Report showing wrong rules

**Cause:** Cache not cleared after state-depreciation-rules.json modification.

**Solution:** Restart the backend server or manually clear the cache.

### Missing rule types in dropdown

**Cause:** Frontend not fetching from `/api/tax-rules/rule-types`.

**Solution:** Check console for API errors, verify route is registered in app.js.

## Future Enhancements

Potential improvements:

- Audit trail for rule changes (who, when, what changed)
- Rule comparison view (diff between old and new rules)
- Bulk import/export for migrating rules between environments
- Notification system when rules are about to expire
- Version rollback capability
- Rule validation against actual depreciation calculations (unit tests)

## Maintenance

**Annual Review:**

- Check IRS announcements for federal bonus depreciation phase-down updates
- Review state tax law changes in each state where offices are located
- Update rule types if new depreciation methods are introduced
- Verify government source URLs are still valid

**When Adding New Offices:**

- Research that state's depreciation rules
- Add initial rule with appropriate effectiveFromTaxYear
- Document sources in the rule
- Test with sample asset to verify calculations

**Backup:**

- `state-depreciation-rules.json` should be backed up regularly
- Consider version control for state-depreciation-rules.json (git)
- Before making changes, export current rules for safety
