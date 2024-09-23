const { Office } = require('../models');

const GetAll = async (req, res) => {
    try {
        const data = await Office.findAll();
        res.json(data);
    } catch (err) {
        console.error('Error fetching room groups:', err);
        res.status(500).send('Server error');
    }
};

module.exports = {
    GetAll,
};
