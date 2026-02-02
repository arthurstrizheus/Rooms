# Section 179 Vehicle Limit Validation Implementation Guide

## Overview

This document describes the implementation of Section 179 vehicle limit validation in the Equipment Scheduler depreciation system. The system now automatically validates Section 179 deductions against IRS vehicle-specific caps without requiring runtime web lookups.

## Implementation Date

January 29, 2026

## Key Features

- ✅ Vehicle classification system (4 types)
- ✅ IRS-sourced Section 179 SUV caps by year (2018-2026)
- ✅ Server-side validation before saving equipment
- ✅ Automatic cap lookup from local JSON file
- ✅ Manual confirmation flags for edge cases
- ✅ Validation warnings stored with equipment
- ✅ Frontend dropdown for vehicle classification
- ✅ No runtime web scraping or API calls

## Architecture

### Vehicle Classification System

Four vehicle classes are supported:

1. **UNKNOWN** (default)
    - For non-vehicles or unclassified assets
    - Triggers warning if Section 179 is elected
    - Requires manual confirmation

2. **PASSENGER_AUTO**
    - Standard passenger automobiles
    - Subject to lower luxury vehicle limits (~$12k-20k)
    - Warning issued if Section 179 elected (typically minimal benefit)

3. **SUV_LIMITED_179**
    - SUVs with GVWR 6,000-14,000 lbs
    - Subject to mid-range Section 179 caps
    - Caps enforced: $28,900 (2023), $30,500 (2024), $31,300 (2025)

4. **HEAVY_TRUCK_NOT_LIMITED_179**
    - Heavy vehicles >14,000 lbs GVWR
    - Not subject to vehicle-specific caps
    - Can elect Section 179 up to cost basis (subject to overall limits)

### Data Storage

#### Database Schema

New columns in `Equipment-AssetTaxMeta` table:

- `vehicle_class` VARCHAR(32) NOT NULL DEFAULT 'UNKNOWN'
- `requires_manual_confirmation` BIT NOT NULL DEFAULT 0
- `validation_warnings_json` NVARCHAR(MAX) NULL

Migration: `backend/migrations/20260129_add_vehicle_fields_to_asset_tax_meta.sql`

#### IRS Caps Data

File: `backend/depreciation/rules/federal-vehicle-limits.json`

Contains year-by-year Section 179 SUV caps from official IRS sources:

```json
{
  "version": "2026.1",
  "lastUpdated": "2026-01-29",
  "limits": [
    {
      "taxYear": 2024,
      "suv179Cap": 30500,
      "source": "IRS Pub 946 (2024), Rev. Proc. 2023-34"
    },
    ...
  ]
}
```

### Backend Components

#### 1. Federal Limits Loader

**File**: `backend/depreciation/rules/federalLimitsLoader.js`

**Purpose**: Load and cache IRS vehicle limits without web calls

**Key Functions**:

- `loadFederalVehicleLimits()` - Load at startup from JSON
- `getSuv179CapForYear(taxYear)` - Lookup cap for specific year
- `clearCache()` - For testing/reloading

**Initialization**: Called in `backend/app.js` during startup after model sync

#### 2. Section 179 Validator

**File**: `backend/depreciation/validators/section179Validator.js`

**Purpose**: Validate Section 179 deductions against vehicle-specific rules

**Validation Logic**:

```javascript
function validateSection179(asset, taxMeta) {
    const result = {
        errors: [], // Blocking errors (prevent save)
        warnings: [], // Non-blocking warnings
        requiresManualConfirmation: false,
        maxAllowed: null, // Max Section 179 for this vehicle
    };

    // 1. Check Section 179 <= cost basis (always)
    // 2. Route by vehicle class:
    //    - SUV_LIMITED_179: Enforce IRS cap
    //    - PASSENGER_AUTO: Warning (minimal benefit)
    //    - HEAVY_TRUCK: Allow up to cost basis
    //    - UNKNOWN: Warning + manual confirmation

    return result;
}
```

**Error vs Warning**:

- **Errors**: Block save operation (e.g., exceeds IRS cap)
- **Warnings**: Allow save but flag for review (e.g., missing year)

#### 3. Equipment Controller Integration

**File**: `backend/controllers/equipmentController.js`

**Changes**:

- Import `validateSection179` from validator
- Added `vehicle_class` to `taxMetaFields` in Post/Update methods
- Call validator before saving AssetTaxMeta
- Return 400 error if validation errors exist
- Save `requires_manual_confirmation` and `validation_warnings_json` to database

**Validation Flow**:

```
User submits equipment with tax fields
  ↓
Controller extracts taxMetaFields (including vehicle_class)
  ↓
Call validateSection179(equipment, taxMetaFields)
  ↓
If errors.length > 0:
  ↳ Return 400 with error details
Else:
  ↳ Save with warnings and manual confirmation flag
```

### Frontend Components

#### 1. Equipment Form (Create/Edit)

**File**: `src/Views/Pages/Equipment/Equipment.js`

**Changes**:

- Added `vehicle_class` to formData state (default: "UNKNOWN")
- Added vehicle classification dropdown before Section 179 field
- Dropdown options match backend ENUM values
- Helper text explains caps for each vehicle type

#### 2. Equipment Details Form

**File**: `src/Views/Pages/EquipmentDetails/EquipmentDetails.js`

**Changes**:

- Same as Equipment.js: vehicle_class field and dropdown
- Loads existing vehicle_class from AssetTaxMeta when editing

#### UI Elements

```jsx
<TextField
    select
    label="Vehicle Classification (if applicable)"
    value={formData.vehicle_class}
    onChange={handleChange}
    helperText="Required for vehicles with Section 179 deduction. 
                Passenger autos have lower caps ($12k-20k). 
                SUVs 6,000-14,000 lbs have mid-range caps (~$28k-32k). 
                Heavy trucks >14,000 lbs have no special caps."
>
    <MenuItem value="UNKNOWN">Not a Vehicle / Unknown</MenuItem>
    <MenuItem value="PASSENGER_AUTO">Passenger Automobile</MenuItem>
    <MenuItem value="SUV_LIMITED_179">SUV (6,000-14,000 lbs GVWR)</MenuItem>
    <MenuItem value="HEAVY_TRUCK_NOT_LIMITED_179">
        Heavy Truck/Vehicle (&gt;14,000 lbs)
    </MenuItem>
</TextField>
```

## Validation Examples

### Example 1: Valid SUV Section 179

```
Asset: 2024 Ford F-250 (GVWR 10,000 lbs)
Vehicle Class: SUV_LIMITED_179
Cost Basis: $65,000
Section 179 Elected: $30,000
Placed in Service: 2024

Result: ✅ VALID
- $30,000 < $30,500 (2024 IRS cap)
- Saves successfully
```

### Example 2: Exceeds SUV Cap

```
Asset: 2024 Chevy Tahoe
Vehicle Class: SUV_LIMITED_179
Cost Basis: $75,000
Section 179 Elected: $35,000
Placed in Service: 2024

Result: ❌ ERROR
- $35,000 > $30,500 (2024 IRS cap)
- Returns 400 error
- Message: "Section 179 deduction ($35,000) exceeds IRS cap of
          $30,500 for SUVs placed in service in 2024."
```

### Example 3: Heavy Truck (No Cap)

```
Asset: 2025 Ford F-450 (GVWR 15,000 lbs)
Vehicle Class: HEAVY_TRUCK_NOT_LIMITED_179
Cost Basis: $85,000
Section 179 Elected: $85,000
Placed in Service: 2025

Result: ✅ VALID (with warning)
- Heavy trucks not subject to vehicle-specific caps
- Warning if > $100k about overall Section 179 limit
- Saves successfully
```

### Example 4: Unknown Classification

```
Asset: 2024 Vehicle (not classified)
Vehicle Class: UNKNOWN
Section 179 Elected: $25,000

Result: ⚠️ WARNING (saves with manual confirmation)
- Saves with requires_manual_confirmation = true
- Warning: "Vehicle classification is UNKNOWN. Cannot verify
          Section 179 limits apply."
```

### Example 5: Passenger Auto

```
Asset: 2024 Tesla Model S
Vehicle Class: PASSENGER_AUTO
Section 179 Elected: $15,000

Result: ⚠️ WARNING (saves with manual confirmation)
- Passenger autos have luxury vehicle limits
- Warning about limited benefit
- Saves with requires_manual_confirmation = true
```

## Usage Workflow

### For Users (Equipment Managers)

1. **Creating Equipment with Tax Data**:
    - Fill in equipment details
    - Expand "Optional Tax Depreciation Fields" accordion
    - Enter placed in service date and cost basis
    - Select property class and method
    - **NEW**: Select vehicle classification from dropdown
    - Enter Section 179 amount (if applicable)
    - Click Save
    - If error: System blocks save and shows why
    - If warning: System saves but flags for review

2. **Editing Equipment**:
    - Same as create, but form pre-populates with existing data
    - Can change vehicle classification if initially wrong

### For Developers

1. **Adding New Tax Years**:
    - Edit `backend/depreciation/rules/federal-vehicle-limits.json`
    - Add new entry with taxYear, suv179Cap, and IRS source
    - Restart server (loads at startup)
    - No code changes needed

2. **Updating Caps for Existing Years**:
    - Edit JSON file with corrected cap
    - Include source documentation
    - Restart server
    - Existing equipment validated against new cap on next save

3. **Testing Validation**:

    ```javascript
    const {
        validateSection179,
        VEHICLE_CLASS,
    } = require("./validators/section179Validator");

    const asset = {
        /* equipment data */
    };
    const taxMeta = {
        vehicle_class: VEHICLE_CLASS.SUV_LIMITED_179,
        section179_elected: 32000,
        cost_basis: 70000,
        placed_in_service_date: "2024-06-15",
    };

    const result = validateSection179(asset, taxMeta);
    console.log(result.errors); // Should show cap exceeded
    ```

## API Response Format

### Success (No Errors)

```json
{
    "id": 123,
    "name": "2024 Ford F-250",
    "AssetTaxMeta": {
        "vehicle_class": "SUV_LIMITED_179",
        "section179_elected": 30000,
        "requires_manual_confirmation": false,
        "validation_warnings_json": null
    }
}
```

### Success (With Warnings)

```json
{
  "id": 124,
  "name": "2027 Future Vehicle",
  "AssetTaxMeta": {
    "vehicle_class": "SUV_LIMITED_179",
    "section179_elected": 28000,
    "requires_manual_confirmation": true,
    "validation_warnings_json": [
      "IRS Section 179 SUV cap for tax year 2027 is not defined in system.
       Deduction of $28,000 cannot be automatically validated."
    ]
  }
}
```

### Error (Validation Failed)

```json
{
  "message": "Section 179 validation failed",
  "errors": [
    "Section 179 deduction ($35,000) exceeds IRS cap of $30,500 for SUVs
     placed in service in 2024. See IRS Pub 946 for details."
  ],
  "warnings": []
}
```

## out for calibration Tasks

### Annual Updates (Required)

1. **Download IRS Publication 946** for new tax year
2. **Extract Section 179 SUV cap** from vehicle depreciation limits table
3. **Update federal-vehicle-limits.json**:
    ```json
    {
        "taxYear": 2027,
        "suv179Cap": 32000,
        "source": "IRS Pub 946 (2027), Rev. Proc. 2026-XX",
        "notes": "Inflation-adjusted from prior year"
    }
    ```
4. **Restart server** to load new caps
5. **Test** with sample data

### Quarterly Review (Recommended)

- Check for IRS guidance changes
- Review equipment with `requires_manual_confirmation = true`
- Verify UNKNOWN classifications and update to correct class

## Files Modified/Created

### Created Files

- `backend/depreciation/rules/federal-vehicle-limits.json`
- `backend/depreciation/rules/federalLimitsLoader.js`
- `backend/depreciation/validators/section179Validator.js`
- `backend/migrations/20260129_add_vehicle_fields_to_asset_tax_meta.sql`
- `backend/scripts/runMigration.js`
- `docs/SECTION_179_VEHICLE_LIMITS_GUIDE.md` (this file)

### Modified Files

- `backend/models/assetTaxMeta.js` - Added 3 columns
- `backend/controllers/equipmentController.js` - Added validation
- `backend/app.js` - Load federal limits at startup
- `src/Views/Pages/Equipment/Equipment.js` - Added vehicle_class dropdown
- `src/Views/Pages/EquipmentDetails/EquipmentDetails.js` - Added vehicle_class dropdown

## Testing Checklist

### Backend Tests (Manual)

- [ ] SUV with valid Section 179 (under cap) - should save
- [ ] SUV with excessive Section 179 (over cap) - should error
- [ ] Heavy truck with high Section 179 - should save with warning
- [ ] UNKNOWN vehicle with Section 179 - should save with manual confirmation
- [ ] Passenger auto with Section 179 - should save with warning
- [ ] Equipment without vehicle_class (defaults to UNKNOWN) - should work
- [ ] Missing placed_in_service_date - should trigger manual confirmation
- [ ] Future tax year (not in JSON) - should save with warning

### Frontend Tests (Manual)

- [ ] Vehicle classification dropdown displays correctly
- [ ] Helper text shows appropriate guidance
- [ ] Default value is "UNKNOWN"
- [ ] Existing equipment loads vehicle_class correctly
- [ ] Save operation shows validation errors inline
- [ ] Warnings are displayed (if applicable)

### Database Tests (Manual)

- [ ] Migration ran successfully
- [ ] vehicle_class column exists with correct CHECK constraint
- [ ] requires_manual_confirmation defaults to 0
- [ ] validation_warnings_json stores JSON correctly

## Known Limitations

1. **Business Use Percentage**: System assumes 100% business use. Partial business use (e.g., 80%) not yet implemented. Section 179 should be prorated in practice.

2. **Overall Section 179 Limits**: System validates vehicle-specific caps but does not enforce overall Section 179 limit (e.g., $1,220,000 in 2024). This is mentioned in warnings for heavy trucks.

3. **State Conformity**: System only validates federal Section 179. States may have different limits (e.g., Ohio $25k). State validation is separate.

4. **Listed Property Rules**: Passenger autos are listed property with additional use requirements (>50% business use, substantiation). System flags but does not enforce.

5. **Historical Data**: Caps only go back to 2018. Earlier years return null cap and trigger manual confirmation.

## Future Enhancements

1. **Display Max Allowed in UI**: Show "Max Allowed: $30,500" next to Section 179 field when vehicle_class is SUV_LIMITED_179

2. **Inline Warning Display**: Display validation_warnings_json as alerts in Equipment Details view

3. **Depreciation Report Integration**: Show requires_manual_confirmation flag in depreciation reports

4. **Business Use Percentage**: Add field for partial business use and adjust Section 179 limit accordingly

5. **Overall Limit Check**: Add validation against overall Section 179 limit for the tax year

6. **Jest Tests**: Create automated tests for section179Validator.js

## References

- **IRS Publication 946**: Depreciation guidelines and tables
- **Rev. Proc. 2023-34**: 2024 inflation adjustments
- **IRC Section 179**: Expense deduction statute
- **IRC Section 280F**: Luxury automobile limits

## Support

For questions or issues:

1. Check validation_warnings_json for guidance
2. Review IRS Pub 946 for tax year in question
3. Consult with tax professional for complex scenarios

---

**Document Version**: 1.0  
**Last Updated**: January 29, 2026  
**Author**: GitHub Copilot + Development Team
