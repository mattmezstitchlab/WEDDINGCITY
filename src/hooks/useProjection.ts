/**
 * SECTION 4: Bidirectional Finance Hub
 * 
 * React Hooks Layer
 * 
 * Bridges ProjectionSyncSystem to React components, enabling:
 * - Bidirectional data binding (edit Finance → Timeline syncs automatically)
 * - Real-time cascade visualization (show what changes when user edits)
 * - Undo/redo via decision trail
 * - Validation before commit
 * 
 * Design principle: Components are dumb subscribers to projections.
 * All business logic lives in architecture layer (cascade, validation, etc).
 */

import { useEffect, useState, useCallback, useRef } from 'react';

/**
 * Hook: Subscribe to a projection
 * 
 * Returns current data + loading/error states
 */
export function useProjection<T = any>(
  projectionName: string,
  filters?: Record<string, any>
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // TODO: Subscribe to projection via ProjectionSyncSystem
    // Once available, would subscribe like:
    // const unsubscribe = projectionSync.subscribe(projectionName, filters, (newData) => {
    //   setData(newData);
    //   setLoading(false);
    // });
    // unsubscribeRef.current = unsubscribe;

    // For now, placeholder
    setData([]);
    setLoading(false);

    return () => {
      unsubscribeRef.current?.();
    };
  }, [projectionName, JSON.stringify(filters)]);

  return { data, loading, error };
}

/**
 * Hook: Perform a mutation and see cascades
 * 
 * Returns:
 * - mutate: Function to perform the mutation
 * - pending: Whether mutation is in progress
 * - cascades: List of entities that will change
 * - error: Any mutation error
 */
export function useMutation() {
  const [pending, setPending] = useState(false);
  const [cascades, setCascades] = useState<any[]>([]);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async (
      entity: any,
      changes: Partial<any>,
      options?: {
        preview?: boolean;
        validateOnly?: boolean;
      }
    ) => {
      setPending(true);
      setError(null);
      setCascades([]);

      try {
        // TODO: Call mutation system via MutationSystem.mutateEntity()
        // Would look like:
        // const result = await mutationSystem.mutateEntity(entity, changes, {
        //   preview: options?.preview,
        //   validateOnly: options?.validateOnly
        // });
        // setCascades(result.cascades);
        // return result;

        // For now, placeholder
        setPending(false);
        return { success: true, cascades: [] };
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        setPending(false);
        throw error;
      }
    },
    []
  );

  return { mutate, pending, cascades, error };
}

/**
 * Hook: Get single entity with decision trail
 * 
 * Useful for showing user:
 * - Current value
 * - Decision history
 * - Who changed it and when
 */
export function useEntity(entityId: string) {
  const [entity, setEntity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // TODO: Query entity via QuerySystem.queryEntitiesById()
    // For now, placeholder
    setEntity(null);
    setLoading(false);
  }, [entityId]);

  return { entity, loading, error };
}

/**
 * Hook: Query multiple entities with filters
 * 
 * Returns matching entities from AIME MEMORY
 */
export function useQuery(filters: Record<string, any> = {}) {
  const [entities, setEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // TODO: Query via QuerySystem.queryEntities()
    // For now, placeholder
    setEntities([]);
    setLoading(false);
  }, [JSON.stringify(filters)]);

  return { entities, loading, error };
}

/**
 * Hook: Preview cascades before committing
 * 
 * User edits form, we show what WILL change in other projections
 * User clicks "Confirm", we execute mutation and watch cascades
 */
export function useCascadePreview(entity: any, changes: Partial<any>) {
  const [preview, setPreview] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!entity || Object.keys(changes).length === 0) {
      setPreview([]);
      return;
    }

    setLoading(true);

    // TODO: Call mutation system with preview=true
    // Would fetch cascades WITHOUT committing

    setLoading(false);
  }, [entity, JSON.stringify(changes)]);

  return { preview, loading };
}

/**
 * Hook: Undo/Redo via decision trail
 * 
 * Every mutation records a DecisionRecord with is_reversible flag.
 * This enables undo/redo stack.
 */
export function useDecisionTrail(entityId: string) {
  const [trail, setTrail] = useState<any[]>([]);
  const [undoStack, setUndoStack] = useState<any[]>([]);
  const [redoStack, setRedoStack] = useState<any[]>([]);

  useEffect(() => {
    // TODO: Load decision trail from entity
    // For now, placeholder
  }, [entityId]);

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    // TODO: Reverse last decision via MutationSystem.reverseMutation()
  }, [undoStack]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    // TODO: Re-apply decision
  }, [redoStack]);

  return { trail, undo, redo, canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 };
}

/**
 * Hook: Watch projection changes in real-time
 * 
 * When user edits Finance AND Timeline is visible,
 * Timeline should update immediately without user refresh
 */
export function useProjectionWatcher(projectionNames: string[]) {
  const [changes, setChanges] = useState<any[]>([]);

  useEffect(() => {
    // TODO: Subscribe to ProjectionSyncSystem.onChanges()
    // For now, placeholder
  }, [projectionNames.join(',')]);

  return { changes };
}

/**
 * Hook: Handle form submission with cascade validation
 * 
 * Ensures user sees impacts before committing,
 * then executes mutation and watches cascades complete
 */
export function useFormWithCascades(entity: any) {
  const { mutate, pending, cascades, error } = useMutation();
  const { preview } = useCascadePreview(entity, {});

  const submitWithCascadePreview = useCallback(
    async (formData: Record<string, any>) => {
      if (!entity) throw new Error('No entity to mutate');

      // Step 1: Preview cascades
      const changes = {
        content: {
          ...entity.content,
          ...formData
        }
      };

      // Step 2: User reviews impacts shown in preview
      // TODO: Show modal/toast with cascade preview
      // This is where we'd show: "Changing vendor cost will update Timeline, Finance, Documents, Persons"

      // Step 3: User confirms
      // Step 4: Execute mutation
      const result = await mutate(entity, changes);

      // Step 5: Watch cascades execute
      // TODO: Show cascade progress to user
      // "Timeline updated... Documents updated... All synced!"

      return result;
    },
    [entity, mutate]
  );

  return { submit: submitWithCascadePreview, pending, cascades, error };
}

/**
 * Hook: Validation
 * 
 * Check if changes are valid before allowing commit
 * Validation rules come from ProjectionSchema + DomainAdapter
 */
export function useValidation(entity: any, changes: Partial<any>) {
  const [isValid, setIsValid] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // TODO: Call DomainAdapter.validate() for wedding domain
    // For now, placeholder
  }, [entity, JSON.stringify(changes)]);

  return { isValid, errors };
}
