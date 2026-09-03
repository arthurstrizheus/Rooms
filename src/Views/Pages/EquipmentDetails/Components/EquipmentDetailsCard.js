import { Grid } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SectionCard from "../../../Components/UI/SectionCard";
import DetailField from "../../../Components/UI/DetailField";

/**
 * Purchase / descriptive metadata. Renders nothing when there's nothing to say,
 * so the detail page doesn't show an empty card.
 */
const EquipmentDetailsCard = ({ equipment }) => {
    const hasContent =
        equipment?.brand_name ||
        equipment?.date_of_purchase ||
        equipment?.cost ||
        equipment?.description;

    if (!hasContent) return null;

    return (
        <SectionCard title="Details" icon={<InfoOutlinedIcon />}>
            <Grid container spacing={2.5}>
                <Grid item xs={12}>
                    <DetailField
                        label="Brand name"
                        value={equipment?.brand_name}
                        hideEmpty
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <DetailField
                        label="Date of purchase"
                        value={
                            equipment?.date_of_purchase
                                ? new Date(
                                      equipment.date_of_purchase,
                                  ).toLocaleDateString()
                                : null
                        }
                        hideEmpty
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <DetailField
                        label="Purchase cost"
                        value={
                            equipment?.cost
                                ? `$${parseFloat(equipment.cost).toFixed(2)}`
                                : null
                        }
                        hideEmpty
                    />
                </Grid>
                <Grid item xs={12}>
                    <DetailField
                        label="Notes"
                        value={equipment?.description}
                        hideEmpty
                    />
                </Grid>
            </Grid>
        </SectionCard>
    );
};

export default EquipmentDetailsCard;
