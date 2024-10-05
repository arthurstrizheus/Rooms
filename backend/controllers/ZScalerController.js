const axios = require("axios");

const PostBlockReqestSite = async (req, res) => {
    const body = req.body;
    try {
        const data = await axios.post(
            `https://${process.env.FRESHSERVICE_DOMAIN}/api/v2/tickets`, body ,
            {
                headers: {
                    'Authorization': 'Basic ' + btoa(process.env.FRESHSERVICE_API_KEY + ':x'),
                    'Content-Type': 'application/json'
                }
            }
        );        
        res.json(data?.data);
    } catch (err) {
        console.error('Error fetching room groups:', err);
        res.status(500).send('Server error');
    }
};

module.exports = {
    PostBlockReqestSite,
};
