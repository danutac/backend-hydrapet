const jwt = require('jsonwebtoken');
const JWT_SECRET = '5hbJJF+uPFaAs2QVO/PQx+vB+WpX0HmAzrbqJoj';

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send({ error: 'Unauthorized.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Przechowujemy dane użytkownika w `req.user`
    next(); // Kontynuujemy przetwarzanie żądania
  } catch (err) {
    console.error('Error verifying token:', err);
    res.status(401).send({ error: 'Invalid token.' });
  }
};

module.exports = authenticate;
