const { verifyJWT } = require('./auth')

function verifyAdmin(req, res, next) {
  verifyJWT(req, res, () => {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Доступ только для администраторов' })
    }
    next()
  })
}

module.exports = { verifyAdmin }
