import { Card, CardContent, Typography, Divider, Grid } from "@mui/material";

const EquipmentDetailsCard = ({ equipment }) => {
    return (
        (equipment?.brand_name ||
            equipment?.date_of_purchase ||
            equipment?.cost ||
            equipment?.description) && (
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Details
                    </Typography>
                    <Divider sx={{ mb: 2 }} />

                    <Grid container spacing={2}>
                        {equipment?.brand_name && (
                            <Grid item xs={12}>
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                >
                                    Brand Name
                                </Typography>
                                <Typography variant="body1" sx={{ mt: 0.5 }}>
                                    {equipment?.brand_name}
                                </Typography>
                            </Grid>
                        )}
                        {equipment?.date_of_purchase && (
                            <Grid item xs={12} md={6}>
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                >
                                    Date of Purchase
                                </Typography>
                                <Typography variant="body1" sx={{ mt: 0.5 }}>
                                    {new Date(
                                        equipment?.date_of_purchase,
                                    ).toLocaleDateString()}
                                </Typography>
                            </Grid>
                        )}
                        {equipment?.cost && (
                            <Grid item xs={12} md={6}>
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                >
                                    Purchase Cost
                                </Typography>
                                <Typography variant="body1" sx={{ mt: 0.5 }}>
                                    {equipment?.cost
                                        ? `$${parseFloat(equipment.cost).toFixed(2)}`
                                        : null}
                                </Typography>
                            </Grid>
                        )}
                        {equipment?.description && (
                            <Grid item xs={12}>
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                >
                                    Notes
                                </Typography>
                                <Typography variant="body1" sx={{ mt: 0.5 }}>
                                    {equipment?.description}
                                </Typography>
                            </Grid>
                        )}
                    </Grid>
                </CardContent>
            </Card>
        )
    );
};

export default EquipmentDetailsCard;
