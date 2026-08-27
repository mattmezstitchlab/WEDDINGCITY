/**
 * SECTION 4: BIDIRECTIONAL FINANCE HUB
 * 
 * React Integration + Cascade Visualization
 * 
 * Design Document
 */

# SECTION 4: Bidirectional Finance Hub

## Overview

Section 4 bridges the AIME architecture foundation (Sections 1-3) to React components, enabling the first user-visible feature: **bidirectional mutations that cascade across all projections in real-time**.

**Key Achievement**: When a user edits the vendor cost in Finance projection, Timeline, Documents, and Persons automatically update without page refresh.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│           REACT COMPONENTS (dumb)                   │
│  Finance Form → Timeline View → Documents List      │
└──────────────────────┬──────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────┐
│        HOOKS LAYER (bridging logic)                 │
│  useProjection, useMutation, useCascadePreview      │
└──────────────────────┬──────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────┐
│   ARCHITECTURE LAYER (business logic)               │
│  • QuerySystem: Read entities                       │
│  • MutationSystem: Validate + create DecisionRecord │
│  • CascadeEngine: Identify impacted projections     │
│  • ProjectionSyncSystem: Update all views           │
└─────────────────────────────────────────────────────┘
```

## The Bidirectional Mutation Flow

### Example: User edits vendor cost

```
ME (User)
  └─ "DJ Martin now costs €1,500"
        ↓
useProjection('finance')
  └─ Components render current vendor data
        ↓
useFormWithCascades
  └─ User modifies form, clicks "Save"
        ↓
useCascadePreview
  └─ Shows what will change:
     • Finance: Updates vendor.cost
     • Timeline: Recalculates phase totals
     • Documents: Updates contract references
     • Persons: Changes budget context
        ↓
User confirms changes
  └─ Decision: "Confirmed by mattmez at 2026-08-27T21:30:00Z"
        ↓
useMutation()
  └─ Calls MutationSystem.mutateEntity()
     • Validates against DomainAdapter rules
     • Creates DecisionRecord with audit trail
     • Triggers CascadeEngine
        ↓
CascadeEngine
  └─ Identifies cascades from WEDDING_CASCADE_RULES:
     • If vendor.cost changes → update Budget in Finance
     • If Budget changes → update Phase.total in Timeline
     • If Phase.total changes → update cost_breakdown in Documents
        ↓
ProjectionSyncSystem
  └─ Executes cascades in dependency order:
     1. Update Finance projection
     2. Update Timeline projection
     3. Update Documents projection
     4. Update Persons projection (context only)
        ↓
useProjectionWatcher()
  └─ All components with subscriptions get notified
     • Finance form → shows new cost
     • Timeline → shows updated phase budget
     • Documents → shows updated contract total
     • Persons → shows new total per person
        ↓
AI (System)
  └─ User sees all changes applied instantly
     "Updated: Vendor cost, Phase budget, Contract total"
```

## React Hooks

### useProjection(projectionName, filters?)

Subscribe to a projection and get real-time updates.

```typescript
const { data, loading, error } = useProjection('finance', {
  status: 'pending',
  category: 'vendors'
});

// Renders list of pending vendor expenses
return data.map(item => <VendorRow key={item.id} vendor={item} />);
```

**What happens internally**:
- Subscribes to Finance projection via ProjectionSyncSystem
- When CascadeEngine updates Finance, component re-renders automatically
- No manual sync needed

### useMutation()

Execute a mutation and watch cascades execute.

```typescript
const { mutate, pending, cascades, error } = useMutation();

const handleSaveVendor = async (vendor, changes) => {
  try {
    const result = await mutate(vendor, changes);
    // All cascades executed, all projections synced
    showToast(`Updated ${result.cascades.length} related items`);
  } catch (err) {
    showError(err.message);
  }
};
```

### useCascadePreview(entity, changes)

Show user what WILL change before committing.

```typescript
const { preview, loading } = useCascadePreview(vendor, {
  content: { cost: 1500 }
});

return (
  <Modal>
    <p>This will impact:</p>
    <ul>
      {preview.map(cascade => (
        <li key={cascade.id}>
          {cascade.projection}: {cascade.reason}
        </li>
      ))}
    </ul>
    <button onClick={handleConfirm}>Confirm</button>
  </Modal>
);
```

### useEntity(entityId)

Get single entity with complete decision trail.

```typescript
const { entity } = useEntity('vendor_dj');

return (
  <div>
    <h2>{entity.content.name}</h2>
    <p>Cost: €{entity.content.cost}</p>
    <DecisionTrail trail={entity.decision_trail} />
  </div>
);
```

**Shows decision history**:
- Who validated this cost
- When it was changed
- Original vs corrected values
- Reasons for changes

### useFormWithCascades(entity)

Complete form submission with cascade preview.

```typescript
const { submit, pending, cascades, error } = useFormWithCascades(vendor);

const handleSubmit = async (formData) => {
  await submit(formData);
  // User sees: "Timeline updated... Documents updated... All synced!"
};
```

## Test Suite

`__tests__/section4-bidirectional.test.ts` includes:

✅ Hook initialization tests
✅ Projection loading tests
✅ Mutation execution tests
✅ Cascade preview tests
✅ Validation tests
✅ Complete end-to-end flow tests
✅ Atomicity tests (all-or-nothing mutations)
✅ Undo/redo capability tests

## Implementation Checklist

- [x] Create React hooks layer (useProjection, useMutation, etc)
- [x] Define hook API contracts
- [x] Write comprehensive test suite
- [ ] Integration with ProjectionSyncSystem (requires Section 4 completion)
- [ ] Wire Finance component to useProjection('finance')
- [ ] Wire Timeline component to useProjection('timeline')
- [ ] Wire Documents component to useProjection('documents')
- [ ] Wire Persons component to useProjection('persons')
- [ ] Create cascade preview modal
- [ ] Create cascade progress indicator
- [ ] Test first end-to-end: Edit vendor cost → all 4 projections sync

## Key Design Decisions

### 1. Components are Dumb

Components only:
- Call hooks
- Render data
- Dispatch user events

Components DON'T:
- Implement validation logic
- Manage cascade rules
- Track decision trails
- Handle data consistency

All business logic stays in hooks + architecture.

### 2. Projections are Specs, Not Components

Projections (Timeline, Finance, Documents, Persons) are:
- Read/write/cascade rule definitions
- Not React components themselves
- Reusable across web/mobile/API/CLI

Different UI components can read same projection.

### 3. Cascades are Atomic

When user edits vendor cost:
- All 4 projections update together
- Or none update at all (if validation fails)
- No partial state possible

This ensures data consistency.

### 4. Decision Trail Enables Undo/Redo

Every mutation creates a DecisionRecord with:
- Who changed it
- When
- Original → corrected values
- Why
- is_reversible flag

Enables undo/redo, audit compliance, full transparency.

## Next Steps (Section 5 onwards)

1. **Section 5: ME↔AI Complete Loop**
   - Implement full AI comprehension display
   - Show "I understand X, which will impact Y, Z..."
   - User confirms or corrects
   - Decision recorded

2. **Section 6: Validation UI**
   - Real-time validation feedback
   - Business rule explanations
   - Suggestions

3. **Section 7-8: LABORATOIRE + Genealogy**
   - Research and architecture documentation
   - Project history visualization

## Success Metrics

After Section 4 is complete, we can verify:

- [ ] Edit vendor cost in Finance → Timeline auto-updates phase budget
- [ ] Edit timeline phase duration → Finance recalculates totals
- [ ] Edit document cost → Finance aggregates new total
- [ ] All changes have complete audit trail with decision_trail
- [ ] User can undo any change via decision_trail.is_reversible
- [ ] No manual sync between projections needed
- [ ] Performance: <100ms for mutation + cascade on 1000+ entities

This demonstrates the core AIME principle:
**ONE MEMORY, MANY PROJECTIONS, PERFECT CONSISTENCY**
