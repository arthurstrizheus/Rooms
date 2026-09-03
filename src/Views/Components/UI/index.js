// Barrel for the shared design-system components.
//   import { PageHeader, SectionCard, StatusChip } from "Views/Components/UI";

export { default as PageHeader } from "./PageHeader";
export { default as PageContainer } from "./PageContainer";
export { default as SectionCard } from "./SectionCard";
export { default as StatCard } from "./StatCard";
export { default as StatusChip, statusTone, statusLabel } from "./StatusChip";
export { default as EmptyState } from "./EmptyState";
export { default as ResponsiveDialog } from "./ResponsiveDialog";
export { default as FilterBar } from "./FilterBar";
export { default as DetailField } from "./DetailField";

export {
    RiseIn,
    FadeIn,
    ScaleIn,
    Stagger,
    SlideUpTransition,
    GrowTransition,
    FadeTransition,
    hoverLift,
    shimmer,
} from "./motion";

export {
    CardSkeleton,
    CardGridSkeleton,
    RowSkeleton,
    StatRowSkeleton,
    DetailSkeleton,
} from "./Skeletons";
