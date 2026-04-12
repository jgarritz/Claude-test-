const router = require('express').Router();

router.use('/weather', require('./weather'));
router.use('/generate-greeting', require('./generate-greeting'));
module.exports = router;
