const router = require('express').Router();

router.use('/weather', require('./weather'));
router.use('/generate-greeting', require('./generate-greeting'));
router.use('/batch-call', require('./batch-call'));
module.exports = router;
