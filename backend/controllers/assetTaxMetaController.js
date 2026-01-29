const { AssetTaxMeta, Equipment } = require("../models");

/**
 * Get asset tax meta by asset ID
 */
const GetByAssetId = async (req, res, next) => {
    try {
        const { assetId } = req.params;

        const taxMeta = await AssetTaxMeta.findOne({
            where: { asset_id: assetId },
        });

        if (!taxMeta) {
            return res
                .status(404)
                .json({ message: "Asset tax meta not found" });
        }

        res.json(taxMeta);
    } catch (err) {
        next(err);
    }
};

/**
 * Create or update asset tax meta
 */
const Upsert = async (req, res, next) => {
    try {
        const { assetId } = req.params;
        const data = req.body;

        // Verify asset exists
        const asset = await Equipment.findByPk(assetId);
        if (!asset) {
            return res.status(404).json({ message: "Asset not found" });
        }

        // Check if tax meta already exists
        let taxMeta = await AssetTaxMeta.findOne({
            where: { asset_id: assetId },
        });

        if (taxMeta) {
            // Update existing
            await taxMeta.update(data);
        } else {
            // Create new
            taxMeta = await AssetTaxMeta.create({
                asset_id: assetId,
                ...data,
            });
        }

        res.json(taxMeta);
    } catch (err) {
        next(err);
    }
};

/**
 * Delete asset tax meta
 */
const Delete = async (req, res, next) => {
    try {
        const { assetId } = req.params;

        const taxMeta = await AssetTaxMeta.findOne({
            where: { asset_id: assetId },
        });

        if (!taxMeta) {
            return res
                .status(404)
                .json({ message: "Asset tax meta not found" });
        }

        await taxMeta.destroy();

        res.json({ message: "Asset tax meta deleted successfully" });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    GetByAssetId,
    Upsert,
    Delete,
};
