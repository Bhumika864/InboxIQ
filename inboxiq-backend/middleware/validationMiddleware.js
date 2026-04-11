const validateRequiredFields = (source = "body", fields = []) => {
  return (req, res, next) => {
    const data = req[source] || {};
    const missingFields = fields.filter((field) => {
      const value = data[field];
      return value === undefined || value === null || value === "";
    });

    if (missingFields.length > 0) {
      res.status(400);
      return next(
        new Error(`Missing required fields: ${missingFields.join(", ")}`)
      );
    }

    return next();
  };
};

module.exports = {
  validateRequiredFields,
};
