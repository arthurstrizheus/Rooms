import Equipment from "./Equipment";

// The page now owns its own header, gutters and scrolling via PageHeader /
// PageContainer, so this wrapper is just the route entry point.
const EquipmentPage = ({ setLoading, loading }) => (
    <Equipment setLoading={setLoading} loading={loading} />
);

export default EquipmentPage;
