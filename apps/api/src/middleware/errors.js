export function notFound(_request, response) {
  response.status(404).json({ error: { code: 'NOT_FOUND', message: 'The requested resource was not found.' } });
}

export function errorHandler(error, _request, response, _next) {
  if (error?.status === 400 || error?.type === 'entity.parse.failed') {
    return response.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'Please check the submitted data.' } });
  }
  if (error?.name === 'ValidationError' || error?.name === 'CastError') {
    return response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Please check the submitted data.' } });
  }
  if (error?.code === 11000 && error?.keyPattern?.email) {
    return response.status(409).json({ error: { code: 'ACCOUNT_EXISTS', message: 'This account could not be created.' } });
  }
  if (error?.code === 11000) {
    return response.status(409).json({ error: { code: 'CONFLICT', message: 'This record already exists.' } });
  }
  console.error('API request failed:', error?.stack ?? error?.message ?? error?.name ?? 'UnknownError');
  return response.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' } });
}
