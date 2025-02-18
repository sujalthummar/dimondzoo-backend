const mongoose = require('mongoose');

const metaTagSchema = new mongoose.Schema({
	page: {
        type: String,
        // required: true
    },
    meta_title: {
        type: String,
        // required: true
    },
    meta_description: {
        type: String,
        // required: true
    },
});

module.exports = mongoose.model('MetaTag', metaTagSchema);
